/**
 * Background script for Local Prompt Chains Vault
 * Handles context menu and extension state with enhanced error handling
 */

// Error logging for background script
function logError(error, context = 'Background') {
  console.error(`[Local Prompt Chains Vault Background Error - ${context}]:`, error);
}

function createError(message, code = 'GENERIC_ERROR') {
  const error = new Error(message);
  error.code = code;
  return error;
}

// Register the side panel
async function initializeSidePanel() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    logError(error, 'Initialize Side Panel');
  }
}

initializeSidePanel();

// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(function() {
  try {
    // Create the parent menu item
    chrome.contextMenus.create({
      id: 'prompt-vault-menu',
      title: 'Local Prompt Chains Vault',
      contexts: ['editable']
    });
    
    // Create sub-menu item for managing prompts
    chrome.contextMenus.create({
      id: 'manage-prompts',
      parentId: 'prompt-vault-menu',
      title: 'Manage Prompts...',
      contexts: ['editable']
    });
    
    // Create a separator
    chrome.contextMenus.create({
      id: 'separator',
      parentId: 'prompt-vault-menu',
      type: 'separator',
      contexts: ['editable']
    });
    
    // Add new context menu item for opening the side panel
    chrome.contextMenus.create({
      id: 'openPromptVault',
      title: 'Open Local Prompt Chains Vault',
      contexts: ['page', 'selection', 'editable']
    });
    
    // Load initial menu items
    updateContextMenu();
  } catch (error) {
    logError(error, 'Runtime Install');
  }
});

// Update context menu items based on stored prompts
async function updateContextMenu() {
  try {
    // First, remove any dynamic items that might exist
    await new Promise((resolve, reject) => {
      chrome.contextMenus.removeAll((result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });
    
    // Recreate the base menu structure
    chrome.contextMenus.create({
      id: 'prompt-vault-menu',
      title: 'Local Prompt Chains Vault',
      contexts: ['editable']
    });
    
    chrome.contextMenus.create({
      id: 'manage-prompts',
      parentId: 'prompt-vault-menu',
      title: 'Manage Prompts...',
      contexts: ['editable']
    });
    
    chrome.contextMenus.create({
      id: 'separator',
      parentId: 'prompt-vault-menu',
      type: 'separator',
      contexts: ['editable']
    });
    
    chrome.contextMenus.create({
      id: 'openPromptVault',
      title: 'Open Local Prompt Chains Vault',
      contexts: ['page', 'selection', 'editable']
    });
    
    // Now add the dynamic items
    const storage = await chrome.storage.local.get(['prompts', 'chains']);
    const prompts = storage.prompts || [];
    const chains = storage.chains || [];
    
    // Validate and filter prompts
    const validPrompts = prompts.filter(prompt => {
      if (!prompt?.id || !prompt?.title || !prompt?.content) {
        logError(new Error(`Invalid prompt data: ${JSON.stringify(prompt)}`), 'Context Menu Update');
        return false;
      }
      return true;
    });
    
    // Validate and filter chains
    const validChains = chains.filter(chain => {
      if (!chain?.id || !chain?.title || !Array.isArray(chain?.steps)) {
        logError(new Error(`Invalid chain data: ${JSON.stringify(chain)}`), 'Context Menu Update');
        return false;
      }
      return true;
    });
    
    // Limit to the top 5 prompts
    const topPrompts = validPrompts.slice(0, 5);
    
    // Add menu items for top prompts
    topPrompts.forEach(prompt => {
      try {
        chrome.contextMenus.create({
          id: 'prompt-' + prompt.id,
          parentId: 'prompt-vault-menu',
          title: prompt.title.length > 50 ? prompt.title.substring(0, 47) + '...' : prompt.title,
          contexts: ['editable']
        });
      } catch (error) {
        logError(error, `Create Context Menu for Prompt ${prompt.id}`);
      }
    });
    
    // Add a separator if there are chains to show
    if (validChains.length > 0) {
      chrome.contextMenus.create({
        id: 'chain-separator',
        parentId: 'prompt-vault-menu',
        type: 'separator',
        contexts: ['editable']
      });
    }
    
    // Add top chains (limited to 3)
    const topChains = validChains.slice(0, 3);
    topChains.forEach(chain => {
      try {
        chrome.contextMenus.create({
          id: 'chain-' + chain.id,
          parentId: 'prompt-vault-menu',
          title: '⛓️ ' + (chain.title.length > 45 ? chain.title.substring(0, 42) + '...' : chain.title),
          contexts: ['editable']
        });
      } catch (error) {
        logError(error, `Create Context Menu for Chain ${chain.id}`);
      }
    });
  } catch (error) {
    logError(error, 'Update Context Menu');
  }
}

// Listen for storage changes to update the context menu with debouncing
let updateTimeout;
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && (changes.prompts || changes.chains)) {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
      updateContextMenu();
    }, 500); // Debounce updates
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async function(info, tab) {
  try {
    if (info.menuItemId === 'manage-prompts') {
      // Open the side panel instead of popup
      if (!tab?.id) {
        throw createError('No valid tab found', 'NO_TAB');
      }
      await chrome.sidePanel.open({ tabId: tab.id });
      return;
    }
    
    // Handle prompt insertion
    if (info.menuItemId.startsWith('prompt-')) {
      const promptId = info.menuItemId.replace('prompt-', '');
      
      if (!promptId) {
        throw createError('Invalid prompt ID', 'INVALID_PROMPT_ID');
      }
      
      const storage = await chrome.storage.local.get('prompts');
      const prompts = storage.prompts || [];
      
      const prompt = prompts.find(p => p.id === promptId);
      if (!prompt) {
        throw createError('Prompt not found', 'PROMPT_NOT_FOUND');
      }
      
      if (!tab?.id) {
        throw createError('No valid tab found', 'NO_TAB');
      }
      
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'insertText',
          text: prompt.content
        });
        
        if (!response?.success) {
          throw createError(response?.message || 'Failed to insert text', 'INSERT_FAILED');
        }
      } catch (messageError) {
        if (messageError.message.includes('Could not establish connection')) {
          throw createError(
            'Could not connect to the page. Please refresh the page and try again.',
            'CONNECTION_FAILED'
          );
        }
        throw messageError;
      }
    }
    
    // Handle chain insertion
    if (info.menuItemId.startsWith('chain-')) {
      const chainId = info.menuItemId.replace('chain-', '');
      
      if (!chainId) {
        throw createError('Invalid chain ID', 'INVALID_CHAIN_ID');
      }
      
      const storage = await chrome.storage.local.get(['chains', 'prompts']);
      const chains = storage.chains || [];
      const prompts = storage.prompts || [];
      
      const chain = chains.find(c => c.id === chainId);
      if (!chain) {
        throw createError('Chain not found', 'CHAIN_NOT_FOUND');
      }
      
      if (!chain.steps || chain.steps.length === 0) {
        throw createError('Chain has no steps', 'EMPTY_CHAIN');
      }
      
      // Get the first prompt in the chain
      const firstStepId = chain.steps[0];
      const firstPrompt = prompts.find(p => p.id === firstStepId);
      
      if (!firstPrompt) {
        throw createError('First step prompt not found', 'FIRST_STEP_NOT_FOUND');
      }
      
      if (!tab?.id) {
        throw createError('No valid tab found', 'NO_TAB');
      }
      
      try {
        // Insert the first prompt
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'insertText',
          text: firstPrompt.content
        });
        
        if (!response?.success) {
          throw createError(response?.message || 'Failed to insert text', 'INSERT_FAILED');
        }
        
        // Store current chain state for future steps
        await chrome.storage.local.set({
          currentChain: {
            id: chain.id,
            currentStep: 0
          }
        });
      } catch (messageError) {
        if (messageError.message.includes('Could not establish connection')) {
          throw createError(
            'Could not connect to the page. Please refresh the page and try again.',
            'CONNECTION_FAILED'
          );
        }
        throw messageError;
      }
    }

    // Handle opening the side panel
    if (info.menuItemId === 'openPromptVault') {
      if (!tab?.id) {
        throw createError('No valid tab found', 'NO_TAB');
      }
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  } catch (error) {
    logError(error, `Context Menu Click - ${info.menuItemId}`);
    
    // Try to show user-friendly error message
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'showError',
          message: error.message || 'An error occurred'
        });
      } catch (messageError) {
        // If we can't send message to content script, log it
        logError(messageError, 'Error Message Send');
      }
    }
  }
});

// Listen for messages from content script or popup with enhanced error handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'openSidePanel') {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs && tabs[0]?.id) {
          chrome.sidePanel.open({ tabId: tabs[0].id }).catch(error => {
            logError(error, 'Open Side Panel Message');
            sendResponse({ success: false, error: error.message });
          });
        } else {
          const error = createError('No active tab found', 'NO_ACTIVE_TAB');
          logError(error, 'Open Side Panel Message');
          sendResponse({ success: false, error: error.message });
        }
      });
      return true; // Keep message channel open for async response
    }
    
    if (request.action === 'logError') {
      // Centralized error logging from other parts of the extension
      const context = request.error?.context || 'Unknown';
      const error = new Error(request.error?.message || 'Unknown error');
      if (request.error?.stack) {
        error.stack = request.error.stack;
      }
      logError(error, context);
      sendResponse({ success: true });
      return;
    }
    
    // Unknown action
    logError(new Error(`Unknown action: ${request.action}`), 'Message Handler');
    sendResponse({ success: false, error: 'Unknown action' });
  } catch (error) {
    logError(error, 'Message Handler');
    sendResponse({ success: false, error: error.message });
  }
  
  return true; // Keep the message channel open for async response
});