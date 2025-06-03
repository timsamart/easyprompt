/**
 * Side Panel UI logic for PromptHub
 * Enhanced with error handling, validation, and security
 */
document.addEventListener('DOMContentLoaded', async function() {
  // UI Elements
  const promptsList = document.getElementById('prompts-list');
  const chainsList = document.getElementById('chains-list');
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

  // Clipboard functionality
  async function copyToClipboard(text, item = 'text') {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        // Use the modern Clipboard API
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or non-secure contexts
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

  // Enhanced button creation with icons
  function createActionButton(text, className, icon = '', onClick = null) {
    const button = SecurityUtils.createSafeElement('button', '', `action-btn ${className}`);
    
    if (icon) {
      const iconSpan = SecurityUtils.createSafeElement('span', icon, 'btn-icon');
      button.appendChild(iconSpan);
    }
    
    const textSpan = SecurityUtils.createSafeElement('span', text, 'btn-text');
    button.appendChild(textSpan);
    
    if (onClick) {
      button.addEventListener('click', onClick);
    }
    
    return button;
  }

  // Debounced search function
  const debouncedSearch = debounce(async function(query) {
    try {
      setLoadingState(true);
      await Promise.all([
        loadPrompts(query),
        loadChains(query)
      ]);
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
  
  // Close dialogs when clicking on X or outside
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
  
  // Add prompt
  addPromptBtn.addEventListener('click', function() {
    try {
      document.getElementById('prompt-dialog-title').textContent = 'Add New Prompt';
      document.getElementById('prompt-id').value = '';
      document.getElementById('prompt-title').value = '';
      document.getElementById('prompt-content').value = '';
      promptDialog.style.display = 'block';
    } catch (error) {
      ErrorHandler.logError(error, 'Add Prompt Dialog');
      UIFeedback.showError('Failed to open add prompt dialog');
    }
  });
  
  // Add chain
  addChainBtn.addEventListener('click', async function() {
    try {
      document.getElementById('chain-dialog-title').textContent = 'Create New Chain';
      document.getElementById('chain-id').value = '';
      document.getElementById('chain-title').value = '';
      document.getElementById('chain-steps').innerHTML = '<p class="empty-message">No steps added yet</p>';
      
      // Load prompts for selection
      await loadPromptSelector();
      
      chainDialog.style.display = 'block';
    } catch (error) {
      ErrorHandler.logError(error, 'Add Chain Dialog');
      UIFeedback.showError('Failed to open add chain dialog');
    }
  });
  
  // Add raw chain
  addRawChainBtn.addEventListener('click', function() {
    try {
      document.getElementById('raw-chain-title').value = '';
      document.getElementById('raw-content').value = '';
      rawChainDialog.style.display = 'block';
    } catch (error) {
      ErrorHandler.logError(error, 'Add Raw Chain Dialog');
      UIFeedback.showError('Failed to open raw chain dialog');
    }
  });
  
  // Save prompt
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
      
      await Storage.savePrompt(prompt);
      closeAllDialogs();
      await loadPrompts();
    }, 'Save Prompt', 'Prompt saved successfully!');
  });
  
  // Add step to chain
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
      
      // Reset selector
      selector.value = '';
    } catch (error) {
      ErrorHandler.logError(error, 'Add Step to Chain');
      UIFeedback.showError('Failed to add step to chain');
    }
  });
  
  // Save chain
  chainForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    await AsyncOp.withUserFeedback(async () => {
      const id = document.getElementById('chain-id').value;
      const title = document.getElementById('chain-title').value;
      
      // Collect steps
      const steps = [];
      document.querySelectorAll('.chain-step').forEach(step => {
        steps.push(step.dataset.promptId);
      });
      
      const chain = {
        id: id || undefined,
        title,
        steps
      };
      
      await Storage.saveChain(chain);
      closeAllDialogs();
      await loadChains();
    }, 'Save Chain', 'Chain saved successfully!');
  });
  
  // Process and save raw chain
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
      
      // Split the content by the delimiter
      const delimiterRegex = /\n---\n/g;
      const promptTexts = rawContent.split(delimiterRegex);
      
      if (promptTexts.length === 0) {
        throw ErrorHandler.createError(
          'No valid content found. Please check the format.',
          'INVALID_FORMAT'
        );
      }
      
      // Create a prompt for each section
      const promptIds = [];
      for (let i = 0; i < promptTexts.length; i++) {
        const promptText = promptTexts[i].trim();
        if (!promptText) continue;
        
        // Get the first line as title, rest as content
        const lines = promptText.split('\n');
        const promptTitle = lines[0].trim() || `${chainTitle} - Step ${i + 1}`;
        const promptContent = lines.slice(1).join('\n').trim();
        
        if (!promptContent) continue;
        
        // Create the prompt
        const prompt = {
          title: promptTitle,
          content: promptContent
        };
        
        const savedPrompt = await Storage.savePrompt(prompt);
        promptIds.push(savedPrompt.id);
      }
      
      if (promptIds.length === 0) {
        throw ErrorHandler.createError(
          'No valid prompts were created. Please check your input format.',
          'NO_PROMPTS_CREATED'
        );
      }
      
      // Create the chain with these prompts
      const chain = {
        title: chainTitle,
        steps: promptIds
      };
      
      await Storage.saveChain(chain);
      closeAllDialogs();
      await Promise.all([loadPrompts(), loadChains()]);
    }, 'Create Raw Chain', `Chain "${document.getElementById('raw-chain-title').value}" created successfully!`);
  });

  // Export functionality
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

  // Import functionality
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
      
      // Create detailed feedback message
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
      
      await Promise.all([loadPrompts(), loadChains()]);
    }, 'Import Data');

    // Reset file input
    e.target.value = '';
  });

  // Refresh functionality
  refreshBtn.addEventListener('click', async function() {
    await AsyncOp.withUserFeedback(async () => {
      setLoadingState(true);
      await Promise.all([loadPrompts(), loadChains()]);
    }, 'Refresh Data', 'Data refreshed!');
    setLoadingState(false);
  });

  // Initial load
  await AsyncOp.withErrorHandling(async () => {
    setLoadingState(true);
    await Promise.all([loadPrompts(), loadChains()]);
  }, 'Initial Load');
  setLoadingState(false);

  // Utility functions with enhanced error handling

  async function loadPrompts(query = '') {
    try {
      const prompts = query ? await Storage.searchPrompts(query) : await Storage.getPrompts();
      renderPromptsList(prompts);
    } catch (error) {
      ErrorHandler.logError(error, 'Load Prompts');
      UIFeedback.showError('Failed to load prompts');
      renderPromptsList([]); // Show empty list on error
    }
  }

  async function loadChains(query = '') {
    try {
      const chains = query ? await Storage.searchChains(query) : await Storage.getChains();
      await renderChainsList(chains);
    } catch (error) {
      ErrorHandler.logError(error, 'Load Chains');
      UIFeedback.showError('Failed to load chains');
      renderChainsList([]); // Show empty list on error
    }
  }

  function renderPromptsList(prompts) {
    try {
      if (!promptsList) {
        throw new Error('Prompts list container not found');
      }

      // Clear existing content
      promptsList.innerHTML = '';
      
      if (prompts.length === 0) {
        const emptyMsg = SecurityUtils.createSafeElement('p', 'No prompts found', 'empty-message');
        promptsList.appendChild(emptyMsg);
        return;
      }
      
      prompts.forEach(prompt => {
        const promptElement = createPromptElement(prompt);
        promptsList.appendChild(promptElement);
      });
    } catch (error) {
      ErrorHandler.logError(error, 'Render Prompts List');
      promptsList.innerHTML = '<p class="error-message">Failed to display prompts</p>';
    }
  }

  function createPromptElement(prompt) {
    // Create main container
    const listItem = SecurityUtils.createSafeElement('div', '', 'list-item');
    
    // Title
    const title = SecurityUtils.createSafeElement('div', prompt.title, 'list-item-title');
    
    // Description (truncated content)
    const truncatedContent = prompt.content.length > 100 
      ? prompt.content.substring(0, 100) + '...' 
      : prompt.content;
    const desc = SecurityUtils.createSafeElement('div', truncatedContent, 'list-item-desc');
    
    // Actions container
    const actions = SecurityUtils.createSafeElement('div', '', 'list-item-actions');
    
    // Insert button
    const insertBtn = createActionButton('Insert', 'insert-btn', '↓', () => insertPrompt(prompt.id));
    
    // Copy button
    const copyBtn = createActionButton('Copy', 'copy-btn', '⧉', () => copyToClipboard(prompt.content, 'Prompt'));
    
    // Edit button
    const editBtn = createActionButton('Edit', 'edit-btn', '✎', () => editPrompt(prompt.id));
    
    // Delete button
    const deleteBtn = createActionButton('Delete', 'delete-btn', '×', () => deletePrompt(prompt.id));
    
    // Assemble element
    actions.appendChild(insertBtn);
    actions.appendChild(copyBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    
    listItem.appendChild(title);
    listItem.appendChild(desc);
    listItem.appendChild(actions);
    
    return listItem;
  }

  async function renderChainsList(chains) {
    try {
      if (!chainsList) {
        throw new Error('Chains list container not found');
      }

      // Clear existing content
      chainsList.innerHTML = '';
      
      if (chains.length === 0) {
        const emptyMsg = SecurityUtils.createSafeElement('p', 'No chains found', 'empty-message');
        chainsList.appendChild(emptyMsg);
        return;
      }
      
      // Get all prompts for chain rendering
      const prompts = await Storage.getPrompts();
      const promptsMap = new Map(prompts.map(p => [p.id, p]));
      
      chains.forEach(chain => {
        const chainElement = createChainElement(chain, promptsMap);
        chainsList.appendChild(chainElement);
      });
    } catch (error) {
      ErrorHandler.logError(error, 'Render Chains List');
      chainsList.innerHTML = '<p class="error-message">Failed to display chains</p>';
    }
  }

  function createChainElement(chain, promptsMap) {
    // Create main container
    const listItem = SecurityUtils.createSafeElement('div', '', 'list-item chain-item');
    
    // Header with title and actions
    const header = SecurityUtils.createSafeElement('div', '', 'chain-header');
    
    const title = SecurityUtils.createSafeElement('div', chain.title, 'list-item-title');
    const stepCount = SecurityUtils.createSafeElement('span', 
      `${chain.steps.length} step${chain.steps.length !== 1 ? 's' : ''}`, 
      'step-count'
    );
    
    // Actions container
    const actions = SecurityUtils.createSafeElement('div', '', 'list-item-actions');
    
    // Insert button (starts the chain)
    const insertBtn = createActionButton('Start', 'insert-btn', '▶', () => insertChain(chain.id));
    
    // Copy button (copies all chain content)
    const copyBtn = createActionButton('Copy All', 'copy-btn', '⧉', () => copyChainContent(chain, promptsMap));
    
    // Edit button
    const editBtn = createActionButton('Edit', 'edit-btn', '✎', () => editChain(chain.id));
    
    // Delete button
    const deleteBtn = createActionButton('Delete', 'delete-btn', '×', () => deleteChain(chain.id));
    
    actions.appendChild(insertBtn);
    actions.appendChild(copyBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    
    header.appendChild(title);
    header.appendChild(stepCount);
    header.appendChild(actions);
    
    // Steps preview
    const stepsPreview = SecurityUtils.createSafeElement('div', '', 'chain-steps-preview');
    
    chain.steps.forEach((stepId, index) => {
      const prompt = promptsMap.get(stepId);
      if (prompt) {
        const stepElement = createStepPreviewElement(prompt, index + 1, chain.id, index);
        stepsPreview.appendChild(stepElement);
      } else {
        // Handle missing prompt
        const stepElement = SecurityUtils.createSafeElement('div', '', 'chain-step-preview error');
        const stepTitle = SecurityUtils.createSafeElement('span', 'Missing Prompt', 'step-title');
        stepElement.appendChild(stepTitle);
        stepsPreview.appendChild(stepElement);
      }
    });
    
    listItem.appendChild(header);
    listItem.appendChild(stepsPreview);
    
    return listItem;
  }

  function createStepPreviewElement(prompt, stepNumber, chainId, stepIndex) {
    const stepElement = SecurityUtils.createSafeElement('div', '', 'chain-step-preview');
    
    const stepNum = SecurityUtils.createSafeElement('span', stepNumber.toString(), 'step-number');
    const stepTitle = SecurityUtils.createSafeElement('span', prompt.title, 'step-title');
    
    // Action buttons container
    const stepActions = SecurityUtils.createSafeElement('div', '', 'step-actions');
    
    const insertStepBtn = createActionButton('Insert', 'step-insert-btn', '↓', () => insertChainStep(chainId, stepIndex));
    const copyStepBtn = createActionButton('Copy', 'step-insert-btn', '⧉', () => copyToClipboard(prompt.content, 'Step'));
    
    stepActions.appendChild(insertStepBtn);
    stepActions.appendChild(copyStepBtn);
    
    stepElement.appendChild(stepNum);
    stepElement.appendChild(stepTitle);
    stepElement.appendChild(stepActions);
    
    return stepElement;
  }

  // Copy entire chain content
  async function copyChainContent(chain, promptsMap) {
    try {
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

  async function insertPrompt(id) {
    await AsyncOp.withUserFeedback(async () => {
      const prompt = await Storage.getPromptById(id);
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
      const chain = await Storage.getChainById(id);
      if (!chain) {
        throw ErrorHandler.createError('Chain not found', 'CHAIN_NOT_FOUND');
      }
      
      if (chain.steps.length === 0) {
        throw ErrorHandler.createError('Chain has no steps', 'EMPTY_CHAIN');
      }
      
      // Insert first step
      await insertChainStep(id, 0);
    }, 'Start Chain', 'Chain started successfully!');
  }

  async function insertChainStep(chainId, stepIndex) {
    await AsyncOp.withUserFeedback(async () => {
      const chain = await Storage.getChainById(chainId);
      if (!chain) {
        throw ErrorHandler.createError('Chain not found', 'CHAIN_NOT_FOUND');
      }
      
      if (stepIndex >= chain.steps.length) {
        throw ErrorHandler.createError('Invalid step index', 'INVALID_STEP');
      }
      
      const promptId = chain.steps[stepIndex];
      const prompt = await Storage.getPromptById(promptId);
      
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
      
      // Store current chain state for future steps
      await chrome.storage.local.set({
        currentChain: {
          id: chainId,
          currentStep: stepIndex
        }
      });
    }, 'Insert Chain Step', `Step ${stepIndex + 1} inserted successfully!`);
  }

  async function editPrompt(id) {
    try {
      const prompt = await Storage.getPromptById(id);
      if (!prompt) {
        UIFeedback.showError('Prompt not found');
        return;
      }
      
      document.getElementById('prompt-dialog-title').textContent = 'Edit Prompt';
      document.getElementById('prompt-id').value = prompt.id;
      document.getElementById('prompt-title').value = prompt.title;
      document.getElementById('prompt-content').value = prompt.content;
      promptDialog.style.display = 'block';
    } catch (error) {
      ErrorHandler.logError(error, 'Edit Prompt');
      UIFeedback.showError('Failed to load prompt for editing');
    }
  }

  async function editChain(id) {
    try {
      const chain = await Storage.getChainById(id);
      if (!chain) {
        UIFeedback.showError('Chain not found');
        return;
      }
      
      document.getElementById('chain-dialog-title').textContent = 'Edit Chain';
      document.getElementById('chain-id').value = chain.id;
      document.getElementById('chain-title').value = chain.title;
      
      // Load chain steps
      const stepsContainer = document.getElementById('chain-steps');
      stepsContainer.innerHTML = '';
      
      if (chain.steps.length === 0) {
        stepsContainer.innerHTML = '<p class="empty-message">No steps added yet</p>';
      } else {
        const prompts = await Storage.getPrompts();
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
      await Storage.deletePrompt(id);
      await loadPrompts();
    }, 'Delete Prompt', 'Prompt deleted successfully!');
  }

  async function deleteChain(id) {
    if (!confirm('Are you sure you want to delete this chain? This action cannot be undone.')) {
      return;
    }
    
    await AsyncOp.withUserFeedback(async () => {
      await Storage.deleteChain(id);
      await loadChains();
    }, 'Delete Chain', 'Chain deleted successfully!');
  }

  async function loadPromptSelector() {
    try {
      const prompts = await Storage.getPrompts();
      const selector = document.getElementById('prompt-selector');
      
      // Clear existing options except the first one
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
      
      // Remove empty message if it exists
      const emptyMessage = stepsContainer.querySelector('.empty-message');
      if (emptyMessage) {
        emptyMessage.remove();
      }
      
      // Create step element
      const stepElement = SecurityUtils.createSafeElement('div', '', 'chain-step');
      stepElement.dataset.promptId = promptId;
      stepElement.draggable = true;
      
      // Step content
      const stepContent = SecurityUtils.createSafeElement('div', '', 'step-content');
      const dragHandle = SecurityUtils.createSafeElement('span', '⋮⋮', 'drag-handle');
      const stepTitle = SecurityUtils.createSafeElement('span', promptTitle, 'step-title');
      const removeBtn = SecurityUtils.createSafeElement('button', '×', 'remove-step');
      
      stepContent.appendChild(dragHandle);
      stepContent.appendChild(stepTitle);
      stepContent.appendChild(removeBtn);
      stepElement.appendChild(stepContent);
      
      // Event listeners
      removeBtn.addEventListener('click', () => {
        stepElement.remove();
        if (stepsContainer.children.length === 0) {
          stepsContainer.innerHTML = '<p class="empty-message">No steps added yet</p>';
        }
      });
      
      // Drag and drop handlers
      stepElement.addEventListener('dragstart', handleDragStart);
      stepElement.addEventListener('dragover', handleDragOver);
      stepElement.addEventListener('dragenter', handleDragEnter);
      stepElement.addEventListener('dragleave', handleDragLeave);
      stepElement.addEventListener('drop', handleDrop);
      stepElement.addEventListener('dragend', handleDragEnd);
      
      stepsContainer.appendChild(stepElement);
    } catch (error) {
      ErrorHandler.logError(error, 'Add Step to Chain Builder');
      UIFeedback.showError('Failed to add step to chain');
    }
  }

  // Drag and drop functions
  let draggedElement = null;

  function handleDragStart(e) {
    draggedElement = this;
    this.style.opacity = '0.5';
  }

  function handleDragOver(e) {
    e.preventDefault();
    return false;
  }

  function handleDragEnter(e) {
    this.classList.add('over');
  }

  function handleDragLeave(e) {
    this.classList.remove('over');
  }

  function handleDrop(e) {
    e.preventDefault();
    
    if (draggedElement !== this) {
      const stepsContainer = document.getElementById('chain-steps');
      const allSteps = [...stepsContainer.children];
      const draggedIndex = allSteps.indexOf(draggedElement);
      const targetIndex = allSteps.indexOf(this);
      
      if (draggedIndex < targetIndex) {
        stepsContainer.insertBefore(draggedElement, this.nextSibling);
      } else {
        stepsContainer.insertBefore(draggedElement, this);
      }
    }
    
    this.classList.remove('over');
    return false;
  }

  function handleDragEnd(e) {
    this.style.opacity = '';
    document.querySelectorAll('.chain-step').forEach(step => {
      step.classList.remove('over');
    });
    draggedElement = null;
  }
}); 