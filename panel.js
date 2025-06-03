/**
 * Side Panel UI logic for PromptHub - Card-based design
 * Enhanced with error handling, validation, and security
 */

// Mock data for testing when Chrome APIs are not available
const MOCK_DATA = {
  prompts: [
    {
      id: 'mock-1',
      title: 'Welcome Prompt',
      content: 'Hello! This is a sample prompt to demonstrate the PromptHub interface. You can use this to quickly insert pre-written text into any webpage.'
    },
    {
      id: 'mock-2',
      title: 'Meeting Follow-up',
      content: 'Hi [NAME], Thank you for taking the time to meet with me today. I wanted to follow up on our discussion about [TOPIC] and share some additional thoughts...'
    },
    {
      id: 'mock-3',
      title: 'Code Review Template',
      content: 'Code Review Summary:\n\n✅ What works well:\n- \n\n🔧 Areas for improvement:\n- \n\n💡 Suggestions:\n- \n\nOverall: Looking good! Please address the items above and we can merge.'
    },
    {
      id: 'mock-4',
      title: 'Email Signature',
      content: 'Best regards,\n[YOUR NAME]\n[YOUR TITLE]\n[COMPANY NAME]\n📧 [EMAIL]\n📱 [PHONE]'
    }
  ],
  chains: [
    {
      id: 'chain-1',
      title: 'Project Setup Chain',
      steps: ['mock-1', 'mock-2']
    },
    {
      id: 'chain-2',
      title: 'Complete Workflow',
      steps: ['mock-1', 'mock-3', 'mock-4']
    }
  ]
};

// Check if we're in Chrome extension context
function isExtensionContext() {
  return typeof chrome !== 'undefined' && 
         chrome.storage && 
         chrome.storage.local;
}

// Mock Storage class for testing
class MockStorage {
  static async getPrompts() {
    return [...MOCK_DATA.prompts];
  }
  
  static async getChains() {
    return [...MOCK_DATA.chains];
  }
  
  static async getPromptById(id) {
    return MOCK_DATA.prompts.find(p => p.id === id) || null;
  }
  
  static async getChainById(id) {
    return MOCK_DATA.chains.find(c => c.id === id) || null;
  }
  
  static async savePrompt(prompt) {
    const id = prompt.id || 'mock-' + Date.now();
    const savedPrompt = { ...prompt, id };
    console.log('Mock: Would save prompt:', savedPrompt);
    return savedPrompt;
  }
  
  static async saveChain(chain) {
    const id = chain.id || 'chain-' + Date.now();
    const savedChain = { ...chain, id };
    console.log('Mock: Would save chain:', savedChain);
    return savedChain;
  }
  
  static async deletePrompt(id) {
    console.log('Mock: Would delete prompt:', id);
    return true;
  }
  
  static async deleteChain(id) {
    console.log('Mock: Would delete chain:', id);
    return true;
  }
  
  static async searchPrompts(query) {
    return MOCK_DATA.prompts.filter(p => 
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.content.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  static async searchChains(query) {
    return MOCK_DATA.chains.filter(c => 
      c.title.toLowerCase().includes(query.toLowerCase())
    );
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  // Determine which Storage to use
  const StorageProvider = isExtensionContext() ? Storage : MockStorage;
  
  if (!isExtensionContext()) {
    console.log('🔧 Chrome APIs not available - using mock data for testing');
    
    // Mock chrome APIs for testing
    window.chrome = {
      storage: { local: { get: () => {}, set: () => {} } },
      tabs: {
        query: () => Promise.resolve([{id: 1, url: 'https://example.com'}]),
        sendMessage: () => Promise.resolve({success: true})
      }
    };
    
    // Mock other required globals
    if (typeof UIFeedback === 'undefined') {
      window.UIFeedback = {
        showSuccess: (msg) => console.log('✅', msg),
        showError: (msg) => console.log('❌', msg),
        showWarning: (msg) => console.log('⚠️', msg),
        clearMessages: () => {}
      };
    }
    
    if (typeof ErrorHandler === 'undefined') {
      window.ErrorHandler = {
        logError: (error, context) => console.error(`[${context}]`, error),
        createError: (message, code) => new Error(`[${code}] ${message}`)
      };
    }
    
    if (typeof AsyncOp === 'undefined') {
      window.AsyncOp = {
        withUserFeedback: async (fn, operation, successMsg) => {
          try {
            await fn();
            if (successMsg) UIFeedback.showSuccess(successMsg);
          } catch (error) {
            ErrorHandler.logError(error, operation);
            UIFeedback.showError(`${operation} failed: ${error.message}`);
          }
        },
        withErrorHandling: async (fn, operation) => {
          try {
            await fn();
          } catch (error) {
            ErrorHandler.logError(error, operation);
            UIFeedback.showError(`${operation} failed: ${error.message}`);
          }
        }
      };
    }
    
    if (typeof SecurityUtils === 'undefined') {
      window.SecurityUtils = {
        escapeHtml: (text) => {
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        },
        createSafeElement: (tag, content, className) => {
          const el = document.createElement(tag);
          if (content) el.textContent = content;
          if (className) el.className = className;
          return el;
        }
      };
    }
    
    if (typeof debounce === 'undefined') {
      window.debounce = function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
          const later = () => {
            clearTimeout(timeout);
            func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
        };
      };
    }
  }

  // UI Elements
  const cardsContainer = document.getElementById('cards-container');
  const searchInput = document.getElementById('search-input');
  const addPromptBtn = document.getElementById('add-prompt-btn');
  const addChainBtn = document.getElementById('add-chain-btn');
  const addRawChainBtn = document.getElementById('add-raw-chain-btn');
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importFile = document.getElementById('import-file');
  const refreshBtn = document.getElementById('refresh-btn');
  
  // Dialogs
  const promptDialog = document.getElementById('prompt-dialog');
  const chainDialog = document.getElementById('chain-dialog');
  const rawChainDialog = document.getElementById('raw-chain-dialog');
  
  // Forms
  const promptForm = document.getElementById('prompt-form');
  const chainForm = document.getElementById('chain-form');
  const rawChainForm = document.getElementById('raw-chain-form');
  
  // Loading state management
  let isLoading = false;

  function setLoadingState(loading) {
    isLoading = loading;
    const container = document.querySelector('.content-container');
    if (loading) {
      container.classList.add('loading');
    } else {
      container.classList.remove('loading');
    }
  }

  // Function to initialize Feather icons
  function initializeIcons() {
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  }

  // Clipboard functionality
  async function copyToClipboard(text, item = 'text') {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (!successful) {
          throw new Error('Copy command failed');
        }
      }
      
      UIFeedback.showSuccess(`${item} copied to clipboard!`);
      return true;
    } catch (error) {
      ErrorHandler.logError(error, 'Copy to Clipboard');
      UIFeedback.showError(`Failed to copy ${item}: ${error.message}`);
      return false;
    }
  }

  // Generate deterministic icon class based on content (like Gravatar)
  function getPromptIcon(title, content = '') {
    // Create a simple hash from title and content
    const text = (title + content).toLowerCase();
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to positive number and get icon number (1-12)
    const iconCount = 12;
    const iconNum = (Math.abs(hash) % iconCount) + 1;
    return `prompt-icon-${iconNum}`;
  }

  // Create prompt card
  function createPromptCard(prompt) {
    const card = SecurityUtils.createSafeElement('div', '', 'card prompt-card');
    card.dataset.id = prompt.id;
    
    const iconClass = getPromptIcon(prompt.title, prompt.content);
    
    card.innerHTML = `
      <div class="card-header">
        <div class="card-icon ${iconClass}"></div>
        <div class="card-content">
          <h3 class="card-title">${SecurityUtils.escapeHtml(prompt.title)}</h3>
          <p class="card-description">${SecurityUtils.escapeHtml(prompt.content)}</p>
        </div>
      </div>
      <div class="card-actions">
        <button class="card-action-btn primary" data-action="insert" data-id="${prompt.id}">
          <i data-feather="arrow-down"></i>
          Insert
        </button>
        <button class="card-action-btn success" data-action="copy" data-content="${SecurityUtils.escapeHtml(prompt.content)}">
          <i data-feather="copy"></i>
          Copy
        </button>
        <button class="card-action-btn warning" data-action="edit" data-id="${prompt.id}">
          <i data-feather="edit-2"></i>
          Edit
        </button>
        <button class="card-action-btn danger" data-action="delete" data-id="${prompt.id}">
          <i data-feather="trash-2"></i>
          Delete
        </button>
      </div>
    `;
    
    // Add event listeners
    addCardEventListeners(card);
    
    return card;
  }

  // Create chain card
  function createChainCard(chain, promptsMap) {
    const card = SecurityUtils.createSafeElement('div', '', 'card chain-card');
    card.dataset.id = chain.id;
    
    const stepCount = chain.steps.length;
    const validSteps = chain.steps.filter(stepId => promptsMap.has(stepId));
    
    card.innerHTML = `
      <button class="expand-btn" data-action="toggle">
        <i data-feather="chevron-down"></i>
      </button>
      <div class="card-header">
        <div class="card-icon">
          <i data-feather="link"></i>
          <div class="step-dots">${stepCount}</div>
        </div>
        <div class="card-content">
          <h3 class="card-title">${SecurityUtils.escapeHtml(chain.title)}</h3>
          <p class="card-description">${stepCount} step${stepCount !== 1 ? 's' : ''} • Click to expand and view steps</p>
        </div>
      </div>
      <div class="chain-steps">
        ${validSteps.map((stepId, index) => {
          const prompt = promptsMap.get(stepId);
          return `
            <div class="chain-step-item" data-action="insert-step" data-chain-id="${chain.id}" data-step-index="${index}">
              <div class="step-number-badge">${index + 1}</div>
              <div class="step-title">${SecurityUtils.escapeHtml(prompt.title)}</div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="card-actions">
        <button class="card-action-btn primary" data-action="start-chain" data-id="${chain.id}">
          <i data-feather="play"></i>
          Start
        </button>
        <button class="card-action-btn success" data-action="copy-chain" data-id="${chain.id}">
          <i data-feather="copy"></i>
          Copy All
        </button>
        <button class="card-action-btn warning" data-action="edit" data-id="${chain.id}">
          <i data-feather="edit-2"></i>
          Edit
        </button>
        <button class="card-action-btn danger" data-action="delete" data-id="${chain.id}">
          <i data-feather="trash-2"></i>
          Delete
        </button>
      </div>
    `;
    
    // Add event listeners
    addCardEventListeners(card);
    
    return card;
  }

  // Add event listeners to card buttons
  function addCardEventListeners(card) {
    card.addEventListener('click', async (e) => {
      const button = e.target.closest('[data-action]');
      if (!button) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const action = button.dataset.action;
      const id = button.dataset.id;
      
      switch (action) {
        case 'insert':
          await insertPrompt(id);
          break;
        case 'copy':
          await copyToClipboard(button.dataset.content, 'Prompt');
          break;
        case 'edit':
          if (card.classList.contains('prompt-card')) {
            await editPrompt(id);
          } else {
            await editChain(id);
          }
          break;
        case 'delete':
          if (card.classList.contains('prompt-card')) {
            await deletePrompt(id);
          } else {
            await deleteChain(id);
          }
          break;
        case 'start-chain':
          await insertChain(id);
          break;
        case 'copy-chain':
          await copyChainContent(id);
          break;
        case 'insert-step':
          await insertChainStep(button.dataset.chainId, parseInt(button.dataset.stepIndex));
          break;
        case 'toggle':
          toggleChainExpansion(card);
          break;
      }
      
      // Re-initialize icons after any action
      setTimeout(initializeIcons, 10);
    });
  }

  // Toggle chain expansion
  function toggleChainExpansion(card) {
    card.classList.toggle('expanded');
    setTimeout(initializeIcons, 10);
  }

  // Debounced search function
  const debouncedSearch = debounce(async function(query) {
    try {
      setLoadingState(true);
      await loadAllItems(query);
    } catch (error) {
      ErrorHandler.logError(error, 'Search');
      UIFeedback.showError('Search failed. Please try again.');
    } finally {
      setLoadingState(false);
    }
  }, 300);
  
  // Search functionality with debouncing
  searchInput.addEventListener('input', function() {
    const query = this.value.trim();
    debouncedSearch(query);
  });

  // Load and render all items (prompts and chains)
  async function loadAllItems(query = '') {
    try {
      const [prompts, chains] = await Promise.all([
        query ? StorageProvider.searchPrompts(query) : StorageProvider.getPrompts(),
        query ? StorageProvider.searchChains(query) : StorageProvider.getChains()
      ]);
      
      await renderAllItems(prompts, chains);
      setTimeout(initializeIcons, 10);
    } catch (error) {
      ErrorHandler.logError(error, 'Load All Items');
      UIFeedback.showError('Failed to load items');
      renderEmptyState();
    }
  }

  // Render all items in the unified container
  async function renderAllItems(prompts, chains) {
    try {
      if (!cardsContainer) {
        throw new Error('Cards container not found');
      }

      cardsContainer.innerHTML = '';
      
      if (prompts.length === 0 && chains.length === 0) {
        renderEmptyState();
        return;
      }
      
      // Get prompts map for chain rendering
      const allPrompts = await StorageProvider.getPrompts();
      const promptsMap = new Map(allPrompts.map(p => [p.id, p]));
      
      // Create all prompt cards
      prompts.forEach(prompt => {
        const promptCard = createPromptCard(prompt);
        cardsContainer.appendChild(promptCard);
      });
      
      // Create all chain cards
      chains.forEach(chain => {
        const chainCard = createChainCard(chain, promptsMap);
        cardsContainer.appendChild(chainCard);
      });
      
    } catch (error) {
      ErrorHandler.logError(error, 'Render All Items');
      cardsContainer.innerHTML = '<div class="error-message">Failed to display items</div>';
    }
  }

  // Render empty state
  function renderEmptyState() {
    cardsContainer.innerHTML = `
      <div class="empty-state">
        <h3>No prompts or chains yet</h3>
        <p>Get started by creating your first prompt or chain using the buttons above.</p>
      </div>
    `;
  }

  // Action functions
  async function insertPrompt(id) {
    await AsyncOp.withUserFeedback(async () => {
      const prompt = await StorageProvider.getPromptById(id);
      if (!prompt) {
        throw ErrorHandler.createError('Prompt not found', 'PROMPT_NOT_FOUND');
      }
      
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        throw ErrorHandler.createError('No active tab found', 'NO_ACTIVE_TAB');
      }
      
      const response = await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'insertText',
        text: prompt.content
      });
      
      if (!response?.success) {
        throw ErrorHandler.createError(
          response?.message || 'Failed to insert text',
          'INSERT_FAILED'
        );
      }
    }, 'Insert Prompt', 'Prompt inserted successfully!');
  }

  async function insertChain(id) {
    await AsyncOp.withUserFeedback(async () => {
      const chain = await StorageProvider.getChainById(id);
      if (!chain) {
        throw ErrorHandler.createError('Chain not found', 'CHAIN_NOT_FOUND');
      }
      
      if (chain.steps.length === 0) {
        throw ErrorHandler.createError('Chain has no steps', 'EMPTY_CHAIN');
      }
      
      await insertChainStep(id, 0);
    }, 'Start Chain', 'Chain started successfully!');
  }

  async function insertChainStep(chainId, stepIndex) {
    await AsyncOp.withUserFeedback(async () => {
      const chain = await StorageProvider.getChainById(chainId);
      if (!chain) {
        throw ErrorHandler.createError('Chain not found', 'CHAIN_NOT_FOUND');
      }
      
      if (stepIndex >= chain.steps.length) {
        throw ErrorHandler.createError('Invalid step index', 'INVALID_STEP');
      }
      
      const promptId = chain.steps[stepIndex];
      const prompt = await StorageProvider.getPromptById(promptId);
      
      if (!prompt) {
        throw ErrorHandler.createError(
          `Step ${stepIndex + 1} prompt not found`,
          'STEP_PROMPT_NOT_FOUND'
        );
      }
      
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        throw ErrorHandler.createError('No active tab found', 'NO_ACTIVE_TAB');
      }
      
      const response = await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'insertText',
        text: prompt.content
      });
      
      if (!response?.success) {
        throw ErrorHandler.createError(
          response?.message || 'Failed to insert text',
          'INSERT_FAILED'
        );
      }
      
      await chrome.storage.local.set({
        currentChain: {
          id: chainId,
          currentStep: stepIndex
        }
      });
    }, 'Insert Chain Step', `Step ${stepIndex + 1} inserted successfully!`);
  }

  async function copyChainContent(chainId) {
    try {
      const chain = await StorageProvider.getChainById(chainId);
      if (!chain) {
        UIFeedback.showError('Chain not found');
        return;
      }
      
      const allPrompts = await StorageProvider.getPrompts();
      const promptsMap = new Map(allPrompts.map(p => [p.id, p]));
      
      const validSteps = chain.steps
        .map(stepId => promptsMap.get(stepId))
        .filter(prompt => prompt);
      
      if (validSteps.length === 0) {
        UIFeedback.showWarning('No valid steps found in chain');
        return;
      }
      
      const chainContent = validSteps
        .map((prompt, index) => `Step ${index + 1}: ${prompt.title}\n${prompt.content}`)
        .join('\n\n---\n\n');
      
      await copyToClipboard(chainContent, 'Chain');
    } catch (error) {
      ErrorHandler.logError(error, 'Copy Chain Content');
      UIFeedback.showError('Failed to copy chain content');
    }
  }

  async function editPrompt(id) {
    try {
      const prompt = await StorageProvider.getPromptById(id);
      if (!prompt) {
        UIFeedback.showError('Prompt not found');
        return;
      }
      
      document.getElementById('prompt-dialog-title').textContent = 'Edit Prompt';
      document.getElementById('prompt-id').value = prompt.id;
      document.getElementById('prompt-title').value = prompt.title;
      document.getElementById('prompt-content').value = prompt.content;
      promptDialog.style.display = 'block';
      setTimeout(initializeIcons, 10);
    } catch (error) {
      ErrorHandler.logError(error, 'Edit Prompt');
      UIFeedback.showError('Failed to load prompt for editing');
    }
  }

  async function editChain(id) {
    try {
      const chain = await StorageProvider.getChainById(id);
      if (!chain) {
        UIFeedback.showError('Chain not found');
        return;
      }
      
      document.getElementById('chain-dialog-title').textContent = 'Edit Chain';
      document.getElementById('chain-id').value = chain.id;
      document.getElementById('chain-title').value = chain.title;
      
      const stepsContainer = document.getElementById('chain-steps');
      stepsContainer.innerHTML = '';
      
      if (chain.steps.length === 0) {
        stepsContainer.innerHTML = '<p class="empty-message">No steps added yet</p>';
      } else {
        const prompts = await StorageProvider.getPrompts();
        const promptsMap = new Map(prompts.map(p => [p.id, p]));
        
        chain.steps.forEach(stepId => {
          const prompt = promptsMap.get(stepId);
          if (prompt) {
            addStepToChainBuilder(prompt.id, prompt.title);
          }
        });
      }
      
      await loadPromptSelector();
      chainDialog.style.display = 'block';
      setTimeout(initializeIcons, 10);
    } catch (error) {
      ErrorHandler.logError(error, 'Edit Chain');
      UIFeedback.showError('Failed to load chain for editing');
    }
  }

  async function deletePrompt(id) {
    if (!confirm('Are you sure you want to delete this prompt? This action cannot be undone.')) {
      return;
    }
    
    await AsyncOp.withUserFeedback(async () => {
      await StorageProvider.deletePrompt(id);
      await loadAllItems();
    }, 'Delete Prompt', 'Prompt deleted successfully!');
  }

  async function deleteChain(id) {
    if (!confirm('Are you sure you want to delete this chain? This action cannot be undone.')) {
      return;
    }
    
    await AsyncOp.withUserFeedback(async () => {
      await StorageProvider.deleteChain(id);
      await loadAllItems();
    }, 'Delete Chain', 'Chain deleted successfully!');
  }

  // Dialog and form event handlers (keeping existing functionality)
  document.querySelectorAll('.close-btn, .cancel-btn').forEach(elem => {
    elem.addEventListener('click', function() {
      closeAllDialogs();
    });
  });
  
  window.addEventListener('click', function(event) {
    if (event.target === promptDialog || 
        event.target === chainDialog || 
        event.target === rawChainDialog) {
      closeAllDialogs();
    }
  });

  function closeAllDialogs() {
    promptDialog.style.display = 'none';
    chainDialog.style.display = 'none';
    rawChainDialog.style.display = 'none';
    UIFeedback.clearMessages();
  }
  
  // Button event listeners
  addPromptBtn.addEventListener('click', function() {
    try {
      document.getElementById('prompt-dialog-title').textContent = 'Add New Prompt';
      document.getElementById('prompt-id').value = '';
      document.getElementById('prompt-title').value = '';
      document.getElementById('prompt-content').value = '';
      promptDialog.style.display = 'block';
      setTimeout(initializeIcons, 10);
    } catch (error) {
      ErrorHandler.logError(error, 'Add Prompt Dialog');
      UIFeedback.showError('Failed to open add prompt dialog');
    }
  });

  addChainBtn.addEventListener('click', async function() {
    try {
      document.getElementById('chain-dialog-title').textContent = 'Create New Chain';
      document.getElementById('chain-id').value = '';
      document.getElementById('chain-title').value = '';
      document.getElementById('chain-steps').innerHTML = '<p class="empty-message">No steps added yet</p>';
      
      await loadPromptSelector();
      chainDialog.style.display = 'block';
      setTimeout(initializeIcons, 10);
    } catch (error) {
      ErrorHandler.logError(error, 'Add Chain Dialog');
      UIFeedback.showError('Failed to open add chain dialog');
    }
  });

  addRawChainBtn.addEventListener('click', function() {
    try {
      document.getElementById('raw-chain-title').value = '';
      document.getElementById('raw-content').value = '';
      rawChainDialog.style.display = 'block';
      setTimeout(initializeIcons, 10);
    } catch (error) {
      ErrorHandler.logError(error, 'Add Raw Chain Dialog');
      UIFeedback.showError('Failed to open raw chain dialog');
    }
  });

  // Form submissions
  promptForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    await AsyncOp.withUserFeedback(async () => {
      const id = document.getElementById('prompt-id').value;
      const title = document.getElementById('prompt-title').value;
      const content = document.getElementById('prompt-content').value;
      
      const prompt = {
        id: id || undefined,
        title,
        content
      };
      
      await StorageProvider.savePrompt(prompt);
      closeAllDialogs();
      await loadAllItems();
    }, 'Save Prompt', 'Prompt saved successfully!');
  });

  chainForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    await AsyncOp.withUserFeedback(async () => {
      const id = document.getElementById('chain-id').value;
      const title = document.getElementById('chain-title').value;
      
      const steps = [];
      document.querySelectorAll('.chain-step').forEach(step => {
        steps.push(step.dataset.promptId);
      });
      
      const chain = {
        id: id || undefined,
        title,
        steps
      };
      
      await StorageProvider.saveChain(chain);
      closeAllDialogs();
      await loadAllItems();
    }, 'Save Chain', 'Chain saved successfully!');
  });

  rawChainForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    await AsyncOp.withUserFeedback(async () => {
      const chainTitle = document.getElementById('raw-chain-title').value.trim();
      const rawContent = document.getElementById('raw-content').value.trim();
      
      if (!chainTitle) {
        throw ErrorHandler.createError('Chain title is required', 'MISSING_TITLE');
      }
      
      if (!rawContent) {
        throw ErrorHandler.createError('Content is required', 'MISSING_CONTENT');
      }
      
      const delimiterRegex = /\n---\n/g;
      const promptTexts = rawContent.split(delimiterRegex);
      
      if (promptTexts.length === 0) {
        throw ErrorHandler.createError(
          'No valid content found. Please check the format.',
          'INVALID_FORMAT'
        );
      }
      
      const promptIds = [];
      for (let i = 0; i < promptTexts.length; i++) {
        const promptText = promptTexts[i].trim();
        if (!promptText) continue;
        
        const lines = promptText.split('\n');
        const promptTitle = lines[0].trim() || `${chainTitle} - Step ${i + 1}`;
        const promptContent = lines.slice(1).join('\n').trim();
        
        if (!promptContent) continue;
        
        const prompt = {
          title: promptTitle,
          content: promptContent
        };
        
        const savedPrompt = await StorageProvider.savePrompt(prompt);
        promptIds.push(savedPrompt.id);
      }
      
      if (promptIds.length === 0) {
        throw ErrorHandler.createError(
          'No valid prompts were created. Please check your input format.',
          'NO_PROMPTS_CREATED'
        );
      }
      
      const chain = {
        title: chainTitle,
        steps: promptIds
      };
      
      await StorageProvider.saveChain(chain);
      closeAllDialogs();
      await loadAllItems();
    }, 'Create Raw Chain', `Chain "${document.getElementById('raw-chain-title').value}" created successfully!`);
  });

  // Export/Import/Refresh functionality
  exportBtn.addEventListener('click', async function() {
    await AsyncOp.withErrorHandling(async () => {
      const data = await Storage.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompthub-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      UIFeedback.showSuccess('Data exported successfully!');
    }, 'Export Data');
  });

  importBtn.addEventListener('click', function() {
    importFile.click();
  });

  importFile.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    await AsyncOp.withErrorHandling(async () => {
      const text = await file.text();
      const validation = SecurityUtils.validateJSON(text);
      
      if (!validation.valid) {
        throw ErrorHandler.createError(
          `Invalid JSON file: ${validation.error}`,
          'INVALID_JSON'
        );
      }

      const results = await Storage.importData(validation.data);
      
      let message = 'Import completed:\n';
      message += `• Prompts: ${results.prompts.imported} imported, ${results.prompts.skipped} skipped\n`;
      message += `• Chains: ${results.chains.imported} imported, ${results.chains.skipped} skipped\n`;
      message += `• Selectors: ${results.domainSelectors.imported} imported, ${results.domainSelectors.skipped} skipped`;
      
      if (results.prompts.errors.length > 0 || 
          results.chains.errors.length > 0 || 
          results.domainSelectors.errors.length > 0) {
        UIFeedback.showWarning(message);
        ErrorHandler.logError(
          new Error('Import had errors: ' + JSON.stringify(results)),
          'Import Data'
        );
      } else {
        UIFeedback.showSuccess(message);
      }
      
      await loadAllItems();
    }, 'Import Data');

    e.target.value = '';
  });

  refreshBtn.addEventListener('click', async function() {
    await AsyncOp.withUserFeedback(async () => {
      setLoadingState(true);
      await loadAllItems();
    }, 'Refresh Data', 'Data refreshed!');
    setLoadingState(false);
  });

  // Helper functions for chain building (keeping existing functionality)
  async function loadPromptSelector() {
    try {
      const prompts = await StorageProvider.getPrompts();
      const selector = document.getElementById('prompt-selector');
      
      const firstOption = selector.querySelector('option[value=""]');
      selector.innerHTML = '';
      if (firstOption) {
        selector.appendChild(firstOption);
      } else {
        const defaultOption = SecurityUtils.createSafeElement('option', 'Select a prompt to add...', '');
        defaultOption.value = '';
        selector.appendChild(defaultOption);
      }
      
      prompts.forEach(prompt => {
        const option = SecurityUtils.createSafeElement('option', prompt.title, '');
        option.value = prompt.id;
        selector.appendChild(option);
      });
    } catch (error) {
      ErrorHandler.logError(error, 'Load Prompt Selector');
      UIFeedback.showError('Failed to load prompts for selection');
    }
  }

  function addStepToChainBuilder(promptId, promptTitle) {
    try {
      const stepsContainer = document.getElementById('chain-steps');
      
      const emptyMessage = stepsContainer.querySelector('.empty-message');
      if (emptyMessage) {
        emptyMessage.remove();
      }
      
      const stepElement = SecurityUtils.createSafeElement('div', '', 'chain-step');
      stepElement.dataset.promptId = promptId;
      stepElement.draggable = true;
      
      const stepContent = SecurityUtils.createSafeElement('div', '', 'step-content');
      const dragHandle = SecurityUtils.createSafeElement('span', '⋮⋮', 'drag-handle');
      const stepTitle = SecurityUtils.createSafeElement('span', promptTitle, 'step-title');
      const removeBtn = SecurityUtils.createSafeElement('button', '×', 'remove-step');
      
      stepContent.appendChild(dragHandle);
      stepContent.appendChild(stepTitle);
      stepContent.appendChild(removeBtn);
      stepElement.appendChild(stepContent);
      
      removeBtn.addEventListener('click', () => {
        stepElement.remove();
        if (stepsContainer.children.length === 0) {
          stepsContainer.innerHTML = '<p class="empty-message">No steps added yet</p>';
        }
      });
      
      stepsContainer.appendChild(stepElement);
    } catch (error) {
      ErrorHandler.logError(error, 'Add Step to Chain Builder');
      UIFeedback.showError('Failed to add step to chain');
    }
  }

  document.getElementById('add-step-btn').addEventListener('click', async function() {
    try {
      const selector = document.getElementById('prompt-selector');
      const promptId = selector.value;
      
      if (!promptId) {
        UIFeedback.showWarning('Please select a prompt to add');
        return;
      }
      
      const promptText = selector.options[selector.selectedIndex].text;
      addStepToChainBuilder(promptId, promptText);
      
      selector.value = '';
    } catch (error) {
      ErrorHandler.logError(error, 'Add Step to Chain');
      UIFeedback.showError('Failed to add step to chain');
    }
  });

  // Initial load
  await AsyncOp.withErrorHandling(async () => {
    setLoadingState(true);
    await loadAllItems();
  }, 'Initial Load');
  setLoadingState(false);

  // Initialize Feather icons after initial load
  setTimeout(initializeIcons, 100);
}); 