/**
 * Popup UI logic for PromptHub
 * Enhanced with error handling, validation, security, and clipboard functionality
 */
document.addEventListener('DOMContentLoaded', async function() {
    // UI Elements
    const promptsTab = document.getElementById('prompts-tab');
    const chainsTab = document.getElementById('chains-tab');
    const promptsContent = document.getElementById('prompts-content');
    const chainsContent = document.getElementById('chains-content');
    const promptsList = document.getElementById('prompts-list');
    const chainsList = document.getElementById('chains-list');
    const searchInput = document.getElementById('search-input');
    const addPromptBtn = document.getElementById('add-prompt-btn');
    const addChainBtn = document.getElementById('add-chain-btn');
    
    // Dialogs
    const promptDialog = document.getElementById('prompt-dialog');
    const chainDialog = document.getElementById('chain-dialog');
    
    // Forms
    const promptForm = document.getElementById('prompt-form');
    const chainForm = document.getElementById('chain-form');
    
    // Loading state management
    let isLoading = false;

    function setLoadingState(loading) {
      isLoading = loading;
      const container = document.querySelector('.content-container') || document.body;
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
        if (promptsContent.classList.contains('active')) {
          await loadPrompts(query);
        } else {
          await loadChains(query);
        }
      } catch (error) {
        ErrorHandler.logError(error, 'Search');
        UIFeedback.showError('Search failed. Please try again.');
      } finally {
        setLoadingState(false);
      }
    }, 300);

    // Tab switching
    promptsTab.addEventListener('click', function() {
      setActiveTab('prompts');
    });
    
    chainsTab.addEventListener('click', function() {
      setActiveTab('chains');
    });
    
    function setActiveTab(tabName) {
      promptsTab.classList.toggle('active', tabName === 'prompts');
      chainsTab.classList.toggle('active', tabName === 'chains');
      promptsContent.classList.toggle('active', tabName === 'prompts');
      chainsContent.classList.toggle('active', tabName === 'chains');
    }
    
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
      if (event.target === promptDialog || event.target === chainDialog) {
        closeAllDialogs();
      }
    });

    function closeAllDialogs() {
      promptDialog.style.display = 'none';
      chainDialog.style.display = 'none';
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
    document.getElementById('add-step-btn').addEventListener('click', function() {
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
    
    // Load initial data
    await AsyncOp.withErrorHandling(async () => {
      setLoadingState(true);
      await loadPrompts();
      setActiveTab('prompts');
    }, 'Initial Load');
    setLoadingState(false);
    
    // Function to load prompts list
    async function loadPrompts(query = '') {
      try {
        const prompts = query ? await Storage.searchPrompts(query) : await Storage.getPrompts();
        renderPromptsList(prompts);
      } catch (error) {
        ErrorHandler.logError(error, 'Load Prompts');
        UIFeedback.showError('Failed to load prompts');
        renderPromptsList([]);
      }
    }
    
    // Function to load chains list
    async function loadChains(query = '') {
      try {
        const chains = query ? await Storage.searchChains(query) : await Storage.getChains();
        await renderChainsList(chains);
      } catch (error) {
        ErrorHandler.logError(error, 'Load Chains');
        UIFeedback.showError('Failed to load chains');
        renderChainsList([]);
      }
    }
    
    // Function to render prompts list
    function renderPromptsList(prompts) {
      try {
        if (!promptsList) {
          throw new Error('Prompts list container not found');
        }

        // Clear existing content
        promptsList.innerHTML = '';
        
        if (prompts.length === 0) {
          const emptyMsg = SecurityUtils.createSafeElement('p', 'No prompts found. Add one to get started!', 'empty-message');
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
      const truncatedContent = prompt.content.length > 50 
        ? prompt.content.substring(0, 50) + '...' 
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

    // Function to render chains list
    async function renderChainsList(chains) {
      try {
        if (!chainsList) {
          throw new Error('Chains list container not found');
        }

        // Clear existing content
        chainsList.innerHTML = '';
        
        if (chains.length === 0) {
          const emptyMsg = SecurityUtils.createSafeElement('p', 'No chains found. Create one to get started!', 'empty-message');
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
      
      // Header with title and step count
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
      
      listItem.appendChild(header);
      
      return listItem;
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

    // Function to insert a prompt
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

    // Function to insert a chain
    async function insertChain(id) {
      await AsyncOp.withUserFeedback(async () => {
        const chain = await Storage.getChainById(id);
        if (!chain) {
          throw ErrorHandler.createError('Chain not found', 'CHAIN_NOT_FOUND');
        }
        
        if (chain.steps.length === 0) {
          throw ErrorHandler.createError('Chain has no steps', 'EMPTY_CHAIN');
        }
        
        // Get the first prompt in the chain
        const firstStepId = chain.steps[0];
        const firstPrompt = await Storage.getPromptById(firstStepId);
        
        if (!firstPrompt) {
          throw ErrorHandler.createError('First step prompt not found', 'FIRST_STEP_NOT_FOUND');
        }
        
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) {
          throw ErrorHandler.createError('No active tab found', 'NO_ACTIVE_TAB');
        }
        
        const response = await chrome.tabs.sendMessage(tabs[0].id, {
          action: 'insertText',
          text: firstPrompt.content
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
            id: chain.id,
            currentStep: 0
          }
        });
      }, 'Start Chain', 'Chain started successfully!');
    }

    // Function to edit a prompt
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

    // Function to edit a chain
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

    // Function to delete a prompt
    async function deletePrompt(id) {
      if (!confirm('Are you sure you want to delete this prompt? This action cannot be undone.')) {
        return;
      }
      
      await AsyncOp.withUserFeedback(async () => {
        await Storage.deletePrompt(id);
        await loadPrompts();
      }, 'Delete Prompt', 'Prompt deleted successfully!');
    }

    // Function to delete a chain
    async function deleteChain(id) {
      if (!confirm('Are you sure you want to delete this chain? This action cannot be undone.')) {
        return;
      }
      
      await AsyncOp.withUserFeedback(async () => {
        await Storage.deleteChain(id);
        await loadChains();
      }, 'Delete Chain', 'Chain deleted successfully!');
    }

    // Function to load prompt selector for chain creation
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

    // Function to add step to chain builder
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
        
        stepsContainer.appendChild(stepElement);
      } catch (error) {
        ErrorHandler.logError(error, 'Add Step to Chain Builder');
        UIFeedback.showError('Failed to add step to chain');
      }
    }
  });