/**
 * Background script for PromptHub
 * Handles context menu and extension state
 */

// Register the side panel
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(function() {
  // Create the parent menu item
  chrome.contextMenus.create({
    id: 'prompthub-menu',
    title: 'PromptHub',
    contexts: ['editable']
  });
  
  // Create sub-menu item for managing prompts
  chrome.contextMenus.create({
    id: 'manage-prompts',
    parentId: 'prompthub-menu',
    title: 'Manage Prompts...',
    contexts: ['editable']
  });
  
  // Create a separator
  chrome.contextMenus.create({
    id: 'separator',
    parentId: 'prompthub-menu',
    type: 'separator',
    contexts: ['editable']
  });
  
  // Add new context menu item for opening the side panel
  chrome.contextMenus.create({
    id: 'openPromptHub',
    title: 'Open PromptHub',
    contexts: ['page', 'selection', 'editable']
  });
  
  // Load initial menu items
  updateContextMenu();
});

// Update context menu items based on stored prompts
function updateContextMenu() {
  // First, remove any dynamic items that might exist
  chrome.contextMenus.removeAll(function() {
    // Recreate the base menu structure
    chrome.contextMenus.create({
      id: 'prompthub-menu',
      title: 'PromptHub',
      contexts: ['editable']
    });
    
    chrome.contextMenus.create({
      id: 'manage-prompts',
      parentId: 'prompthub-menu',
      title: 'Manage Prompts...',
      contexts: ['editable']
    });
    
    chrome.contextMenus.create({
      id: 'separator',
      parentId: 'prompthub-menu',
      type: 'separator',
      contexts: ['editable']
    });
    
    chrome.contextMenus.create({
      id: 'openPromptHub',
      title: 'Open PromptHub',
      contexts: ['page', 'selection', 'editable']
    });
    
    // Now add the dynamic items
    chrome.storage.local.get(['prompts', 'chains'], function(storage) {
      const prompts = storage.prompts || [];
      const chains = storage.chains || [];
      
      // Limit to the top 5 prompts
      const topPrompts = prompts.slice(0, 5);
      
      // Add menu items for top prompts
      topPrompts.forEach(prompt => {
        chrome.contextMenus.create({
          id: 'prompt-' + prompt.id,
          parentId: 'prompthub-menu',
          title: prompt.title,
          contexts: ['editable']
        });
      });
      
      // Add a separator if there are chains to show
      if (chains.length > 0) {
        chrome.contextMenus.create({
          id: 'chain-separator',
          parentId: 'prompthub-menu',
          type: 'separator',
          contexts: ['editable']
        });
      }
      
      // Add top chains (limited to 3)
      const topChains = chains.slice(0, 3);
      topChains.forEach(chain => {
        chrome.contextMenus.create({
          id: 'chain-' + chain.id,
          parentId: 'prompthub-menu',
          title: '⛓️ ' + chain.title,
          contexts: ['editable']
        });
      });
    });
  });
}

// Listen for storage changes to update the context menu
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && (changes.prompts || changes.chains)) {
    updateContextMenu();
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async function(info, tab) {
  if (info.menuItemId === 'manage-prompts') {
    // Open the side panel instead of popup
    chrome.sidePanel.open({ tabId: tab.id });
    return;
  }
  
  // Handle prompt insertion
  if (info.menuItemId.startsWith('prompt-')) {
    const promptId = info.menuItemId.replace('prompt-', '');
    const storage = await chrome.storage.local.get('prompts');
    const prompts = storage.prompts || [];
    
    const prompt = prompts.find(p => p.id === promptId);
    if (prompt) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'insertText',
        text: prompt.content
      });
    }
  }
  
  // Handle chain insertion
  if (info.menuItemId.startsWith('chain-')) {
    const chainId = info.menuItemId.replace('chain-', '');
    const storage = await chrome.storage.local.get(['chains', 'prompts']);
    const chains = storage.chains || [];
    const prompts = storage.prompts || [];
    
    const chain = chains.find(c => c.id === chainId);
    if (chain && chain.steps.length > 0) {
      // Get the first prompt in the chain
      const firstStepId = chain.steps[0];
      const firstPrompt = prompts.find(p => p.id === firstStepId);
      
      if (firstPrompt) {
        // Insert the first prompt
        chrome.tabs.sendMessage(tab.id, {
          action: 'insertText',
          text: firstPrompt.content
        });
        
        // Store current chain state for future steps
        chrome.storage.local.set({
          currentChain: {
            id: chain.id,
            currentStep: 0
          }
        });
      }
    }
  }

  // Handle opening the side panel
  if (info.menuItemId === 'openPromptHub') {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openSidePanel') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs && tabs[0]) {
        chrome.sidePanel.open({ tabId: tabs[0].id });
      }
    });
  }
  return true;
});