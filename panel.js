/**
 * Side Panel UI logic for PromptHub
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
  
  // Search functionality
  searchInput.addEventListener('input', function() {
    const query = this.value.trim();
    loadPrompts(query);
    loadChains(query);
  });
  
  // Close dialogs when clicking on X or outside
  document.querySelectorAll('.close-btn, .cancel-btn').forEach(elem => {
    elem.addEventListener('click', function() {
      promptDialog.style.display = 'none';
      chainDialog.style.display = 'none';
      rawChainDialog.style.display = 'none';
    });
  });
  
  window.addEventListener('click', function(event) {
    if (event.target === promptDialog) {
      promptDialog.style.display = 'none';
    }
    if (event.target === chainDialog) {
      chainDialog.style.display = 'none';
    }
    if (event.target === rawChainDialog) {
      rawChainDialog.style.display = 'none';
    }
  });
  
  // Add prompt
  addPromptBtn.addEventListener('click', function() {
    document.getElementById('prompt-dialog-title').textContent = 'Add New Prompt';
    document.getElementById('prompt-id').value = '';
    document.getElementById('prompt-title').value = '';
    document.getElementById('prompt-content').value = '';
    promptDialog.style.display = 'block';
  });
  
  // Add chain
  addChainBtn.addEventListener('click', async function() {
    document.getElementById('chain-dialog-title').textContent = 'Create New Chain';
    document.getElementById('chain-id').value = '';
    document.getElementById('chain-title').value = '';
    document.getElementById('chain-steps').innerHTML = '<p class="empty-message">No steps added yet</p>';
    
    // Load prompts for selection
    await loadPromptSelector();
    
    chainDialog.style.display = 'block';
  });
  
  // Add raw chain
  addRawChainBtn.addEventListener('click', function() {
    document.getElementById('raw-chain-title').value = '';
    document.getElementById('raw-content').value = '';
    rawChainDialog.style.display = 'block';
  });
  
  // Save prompt
  promptForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const id = document.getElementById('prompt-id').value;
    const title = document.getElementById('prompt-title').value;
    const content = document.getElementById('prompt-content').value;
    
    const prompt = {
      id: id || undefined,
      title,
      content
    };
    
    await Storage.savePrompt(prompt);
    promptDialog.style.display = 'none';
    loadPrompts();
  });
  
  // Add step to chain
  document.getElementById('add-step-btn').addEventListener('click', function() {
    const selector = document.getElementById('prompt-selector');
    const promptId = selector.value;
    
    if (!promptId) return;
    
    const promptText = selector.options[selector.selectedIndex].text;
    addStepToChainBuilder(promptId, promptText);
    
    // Reset selector
    selector.value = '';
  });
  
  // Save chain
  chainForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const id = document.getElementById('chain-id').value;
    const title = document.getElementById('chain-title').value;
    
    // Collect steps
    const steps = [];
    document.querySelectorAll('.chain-step').forEach(step => {
      steps.push(step.dataset.promptId);
    });
    
    if (steps.length === 0) {
      alert('Please add at least one step to the chain');
      return;
    }
    
    const chain = {
      id: id || undefined,
      title,
      steps
    };
    
    await Storage.saveChain(chain);
    chainDialog.style.display = 'none';
    loadChains();
  });
  
  // Process and save raw chain
  rawChainForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const chainTitle = document.getElementById('raw-chain-title').value;
    const rawContent = document.getElementById('raw-content').value;
    
    if (!chainTitle || !rawContent) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Split the content by the delimiter
    const delimiterRegex = /\n---\n/g;
    const promptTexts = rawContent.split(delimiterRegex);
    
    if (promptTexts.length === 0) {
      alert('No valid content found. Please check the format.');
      return;
    }
    
    // Create a prompt for each section
    const promptIds = [];
    for (let i = 0; i < promptTexts.length; i++) {
      const promptText = promptTexts[i].trim();
      if (!promptText) continue;
      
      // Get the first line as title, rest as content
      const lines = promptText.split('\n');
      const promptTitle = lines[0].trim() || `Prompt ${i + 1}`;
      const promptContent = lines.slice(1).join('\n').trim();
      
      if (!promptContent) continue;
      
      // Create the prompt
      const prompt = {
        id: undefined, // Will be assigned by Storage.savePrompt
        title: promptTitle,
        content: promptContent
      };
      
      const savedPrompt = await Storage.savePrompt(prompt);
      promptIds.push(savedPrompt.id);
    }
    
    if (promptIds.length === 0) {
      alert('No valid prompts were created. Please check your input format.');
      return;
    }
    
    // Create the chain with these prompts
    const chain = {
      id: undefined,
      title: chainTitle,
      steps: promptIds
    };
    
    await Storage.saveChain(chain);
    rawChainDialog.style.display = 'none';
    
    // Show success message
    const successMsg = document.createElement('div');
    successMsg.className = 'success-message';
    successMsg.textContent = `Created chain "${chainTitle}" with ${promptIds.length} prompts`;
    document.body.appendChild(successMsg);
    
    // Remove after 2 seconds
    setTimeout(() => {
      document.body.removeChild(successMsg);
    }, 2000);
    
    // Refresh chains list and switch to chains tab
    loadChains();
    setActiveTab('chains');
  });
  
  // Export data
  exportBtn.addEventListener('click', async function() {
    try {
      // Get all data from storage
      const data = await chrome.storage.local.get(['prompts', 'chains']);
      
      // Convert to JSON string
      const jsonString = JSON.stringify(data, null, 2);
      
      // Create blob and download link
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompthub_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'success-message';
      successMsg.textContent = 'Export completed successfully';
      document.body.appendChild(successMsg);
      
      // Remove after 2 seconds
      setTimeout(() => {
        document.body.removeChild(successMsg);
      }, 2000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error.message);
    }
  });
  
  // Trigger file input when Import button is clicked
  importBtn.addEventListener('click', function() {
    importFile.click();
  });
  
  // Handle file selection for import
  importFile.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const reader = new FileReader();
      
      reader.onload = async function(event) {
        try {
          const jsonData = JSON.parse(event.target.result);
          
          // Validate data structure
          if (!jsonData.prompts && !jsonData.chains) {
            throw new Error('Invalid data format. Missing prompts or chains data.');
          }
          
          // Get current data
          const currentData = await chrome.storage.local.get(['prompts', 'chains']);
          const currentPrompts = currentData.prompts || [];
          const currentChains = currentData.chains || [];
          
          // Confirm before importing
          const importPrompts = jsonData.prompts || [];
          const importChains = jsonData.chains || [];
          
          if (!confirm(`Import ${importPrompts.length} prompts and ${importChains.length} chains?
          
This will add to your existing ${currentPrompts.length} prompts and ${currentChains.length} chains.
(Note: Items with the same ID will be overwritten)`)) {
            return;
          }
          
          // Merge data (add new items, update existing ones by ID)
          const mergedPrompts = mergeById(currentPrompts, importPrompts);
          const mergedChains = mergeById(currentChains, importChains);
          
          // Save merged data
          await chrome.storage.local.set({
            prompts: mergedPrompts,
            chains: mergedChains
          });
          
          // Refresh UI
          loadPrompts();
          loadChains();
          
          // Show success message
          const successMsg = document.createElement('div');
          successMsg.className = 'success-message';
          successMsg.textContent = `Imported ${importPrompts.length} prompts and ${importChains.length} chains`;
          document.body.appendChild(successMsg);
          
          // Remove after 2 seconds
          setTimeout(() => {
            document.body.removeChild(successMsg);
          }, 2000);
        } catch (error) {
          console.error('Import parsing failed:', error);
          alert('Import failed: ' + error.message);
        }
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed: ' + error.message);
    }
    
    // Reset the file input for future imports
    this.value = '';
  });
  
  // Helper function to merge arrays by ID
  function mergeById(current, imported) {
    const merged = [...current];
    const ids = new Set(current.map(item => item.id));
    
    for (const item of imported) {
      if (ids.has(item.id)) {
        // Update existing item
        const index = merged.findIndex(i => i.id === item.id);
        if (index !== -1) {
          merged[index] = item;
        }
      } else {
        // Add new item
        merged.push(item);
      }
    }
    
    return merged;
  }
  
  // Load initial data
  loadPrompts();
  loadChains();
  
  // Function to load prompts list
  async function loadPrompts(query = '') {
    const prompts = await Storage.searchPrompts(query);
    renderPromptsList(prompts);
  }
  
  // Function to load chains list
  async function loadChains(query = '') {
    console.log('Loading chains...');
    try {
      const chains = await Storage.searchChains(query);
      console.log('Chains loaded:', chains);
      renderChainsList(chains);
    } catch (error) {
      console.error('Error loading chains:', error);
      chainsList.innerHTML = '<p class="empty-message">Error loading chains</p>';
    }
  }
  
  // Function to render prompts list
  function renderPromptsList(prompts) {
    promptsList.innerHTML = '';
    
    if (prompts.length === 0) {
      promptsList.innerHTML = '<p class="empty-message">No prompts found. Add one to get started!</p>';
      return;
    }
    
    prompts.forEach(prompt => {
      const item = document.createElement('div');
      item.className = 'list-item';
      
      const previewText = prompt.content.length > 50 
        ? prompt.content.substring(0, 50) + '...' 
        : prompt.content;
      
      item.innerHTML = `
        <div class="list-item-title">${prompt.title}</div>
        <div class="list-item-desc">${previewText}</div>
        <div class="list-item-actions">
          <button class="action-btn delete-btn" title="Delete" data-id="${prompt.id}">Delete</button>
          <button class="action-btn edit-btn" title="Edit" data-id="${prompt.id}">Edit</button>
          <button class="action-btn insert-btn" title="Insert" data-id="${prompt.id}">Insert</button>
          <button class="action-btn add-to-chain-btn" title="Add to Chain" data-id="${prompt.id}" data-title="${prompt.title}">+ Chain</button>
        </div>
      `;
      
      promptsList.appendChild(item);
      
      // Add event listeners
      item.querySelector('.insert-btn').addEventListener('click', function() {
        insertPrompt(prompt.id);
      });
      
      item.querySelector('.edit-btn').addEventListener('click', function() {
        editPrompt(prompt.id);
      });
      
      item.querySelector('.delete-btn').addEventListener('click', function() {
        deletePrompt(prompt.id);
      });
      
      // New button to add directly to a chain
      item.querySelector('.add-to-chain-btn').addEventListener('click', function() {
        addPromptToChain(prompt.id, prompt.title);
      });
    });
  }
  
  // Function to render chains list
  async function renderChainsList(chains) {
    const chainsList = document.getElementById('chains-list');
    chainsList.innerHTML = '';
    
    if (!chains || chains.length === 0) {
      chainsList.innerHTML = '<p class="empty-message">No chains available</p>';
      return;
    }
    
    // Get all prompts for reference
    const allPrompts = await Storage.getPrompts();
    const promptsById = {};
    allPrompts.forEach(prompt => {
      promptsById[prompt.id] = prompt;
    });
    
    chains.forEach(chain => {
      const item = document.createElement('div');
      item.className = 'list-item chain-item';
      
      const title = document.createElement('div');
      title.className = 'list-item-title';
      title.textContent = chain.title;
      
      const desc = document.createElement('div');
      desc.className = 'list-item-desc';
      desc.textContent = `${chain.steps.length} step${chain.steps.length !== 1 ? 's' : ''}`;
      
      const actions = document.createElement('div');
      actions.className = 'list-item-actions';
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'action-btn delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => deleteChain(chain.id));
      
      const editBtn = document.createElement('button');
      editBtn.className = 'action-btn edit-btn';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => editChain(chain.id));
      
      const insertBtn = document.createElement('button');
      insertBtn.className = 'action-btn insert-btn';
      insertBtn.textContent = 'Insert All';
      insertBtn.addEventListener('click', () => insertChain(chain.id));
      
      actions.appendChild(deleteBtn);
      actions.appendChild(editBtn);
      actions.appendChild(insertBtn);
      
      item.appendChild(title);
      item.appendChild(desc);
      item.appendChild(actions);
      
      // Add steps preview if the chain has steps
      if (chain.steps.length > 0) {
        const stepsPreview = document.createElement('div');
        stepsPreview.className = 'chain-steps-preview';
        
        chain.steps.forEach((stepId, index) => {
          const prompt = promptsById[stepId];
          if (prompt) {
            const stepPreview = document.createElement('div');
            stepPreview.className = 'chain-step-preview';
            
            const stepNumber = document.createElement('div');
            stepNumber.className = 'step-number';
            stepNumber.textContent = index + 1;
            
            const stepTitle = document.createElement('div');
            stepTitle.className = 'step-title';
            stepTitle.textContent = prompt.title;
            stepTitle.title = prompt.title; // Add tooltip for long titles
            
            const stepInsertBtn = document.createElement('button');
            stepInsertBtn.className = 'step-insert-btn';
            stepInsertBtn.textContent = 'Insert';
            stepInsertBtn.addEventListener('click', (e) => {
              e.stopPropagation(); // Prevent triggering parent click handlers
              insertChainStep(chain.id, index);
            });
            
            stepPreview.appendChild(stepNumber);
            stepPreview.appendChild(stepTitle);
            stepPreview.appendChild(stepInsertBtn);
            stepsPreview.appendChild(stepPreview);
          }
        });
        
        item.appendChild(stepsPreview);
      }
      
      chainsList.appendChild(item);
    });
  }
  
  // Function to insert prompt at cursor
  async function insertPrompt(id) {
    const prompt = await Storage.getPromptById(id);
    if (!prompt) return;
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs || tabs.length === 0) {
        showToast('No active tab found');
        return;
      }
      
      try {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'insertText',
          text: prompt.content
        }, response => {
          if (chrome.runtime.lastError) {
            console.error('Error sending message:', chrome.runtime.lastError);
            showToast('Error: Extension not connected to this page');
            return;
          }
          showToast(`Inserted prompt: ${prompt.title}`);
        });
      } catch (error) {
        console.error('Error sending message:', error);
        showToast('Error: Could not insert prompt');
      }
    });
  }
  
  // Function to insert chain at cursor
  async function insertChain(id) {
    const chain = await Storage.getChainById(id);
    if (!chain || chain.steps.length === 0) return;
    
    // For simplicity, just insert the first step
    const promptId = chain.steps[0];
    const prompt = await Storage.getPromptById(promptId);
    
    if (!prompt) return;
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs || tabs.length === 0) {
        showToast('No active tab found');
        return;
      }
      
      try {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'insertText',
          text: prompt.content
        }, response => {
          if (chrome.runtime.lastError) {
            console.error('Error sending message:', chrome.runtime.lastError);
            showToast('Error: Extension not connected to this page');
            return;
          }
          
          // Store chain state for future steps (in a real app, we'd track this)
          chrome.storage.local.set({
            currentChain: {
              id: chain.id,
              currentStep: 0
            }
          });
          
          showToast(`Inserted chain: ${chain.title}`);
        });
      } catch (error) {
        console.error('Error sending message:', error);
        showToast('Error: Could not insert chain');
      }
    });
  }
  
  // Function to show toast notifications
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'success-message';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Remove after 2 seconds
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 2000);
  }

  // Function to insert a specific step from a chain
  async function insertChainStep(chainId, stepIndex) {
    try {
      // Get the chain
      const chains = await Storage.getChains();
      const chain = chains.find(c => c.id === chainId);
      
      if (!chain) {
        showToast('Chain not found');
        return;
      }
      
      // Get the step prompt ID
      const promptId = chain.steps[stepIndex];
      if (!promptId) {
        showToast('Step not found');
        return;
      }
      
      // Get all prompts to find the step prompt
      const allPrompts = await Storage.getPrompts();
      const prompt = allPrompts.find(p => p.id === promptId);
      
      if (!prompt) {
        showToast('Prompt not found');
        return;
      }
      
      // Insert the prompt using Chrome messaging
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (!tabs || tabs.length === 0) {
          showToast('No active tab found');
          return;
        }
        
        try {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'insertText',
            text: prompt.content
          }, response => {
            if (chrome.runtime.lastError) {
              console.error('Error sending message:', chrome.runtime.lastError);
              showToast('Error: Extension not connected to this page');
              return;
            }
            showToast(`Inserted step ${stepIndex + 1}: ${prompt.title}`);
          });
        } catch (error) {
          console.error('Error sending message:', error);
          showToast('Error: Could not insert step');
        }
      });
    } catch (error) {
      console.error('Error inserting chain step:', error);
      showToast('Error inserting chain step');
    }
  }
  
  // Function to edit prompt
  async function editPrompt(id) {
    const prompt = await Storage.getPromptById(id);
    if (!prompt) return;
    
    document.getElementById('prompt-dialog-title').textContent = 'Edit Prompt';
    document.getElementById('prompt-id').value = prompt.id;
    document.getElementById('prompt-title').value = prompt.title;
    document.getElementById('prompt-content').value = prompt.content;
    
    promptDialog.style.display = 'block';
  }
  
  // Function to edit chain
  async function editChain(id) {
    const chain = await Storage.getChainById(id);
    if (!chain) return;
    
    document.getElementById('chain-dialog-title').textContent = 'Edit Chain';
    document.getElementById('chain-id').value = chain.id;
    document.getElementById('chain-title').value = chain.title;
    
    // Clear existing steps
    document.getElementById('chain-steps').innerHTML = '';
    
    // Load steps
    for (const promptId of chain.steps) {
      const prompt = await Storage.getPromptById(promptId);
      if (prompt) {
        addStepToChainBuilder(promptId, prompt.title);
      }
    }
    
    if (chain.steps.length === 0) {
      document.getElementById('chain-steps').innerHTML = '<p class="empty-message">No steps added yet</p>';
    }
    
    // Load prompts for selection
    await loadPromptSelector();
    
    chainDialog.style.display = 'block';
  }
  
  // Function to delete prompt
  async function deletePrompt(id) {
    if (confirm('Are you sure you want to delete this prompt?')) {
      await Storage.deletePrompt(id);
      loadPrompts();
    }
  }
  
  // Function to delete chain
  async function deleteChain(id) {
    if (confirm('Are you sure you want to delete this chain?')) {
      await Storage.deleteChain(id);
      loadChains();
    }
  }
  
  // Function to load prompts into selector
  async function loadPromptSelector() {
    const prompts = await Storage.getPrompts();
    const selector = document.getElementById('prompt-selector');
    
    // Clear existing options except the first one
    while (selector.options.length > 1) {
      selector.remove(1);
    }
    
    // Add prompts as options
    prompts.forEach(prompt => {
      const option = document.createElement('option');
      option.value = prompt.id;
      option.textContent = prompt.title;
      selector.appendChild(option);
    });
  }
  
  // Function to add a step to chain builder
  function addStepToChainBuilder(promptId, promptTitle) {
    const stepsContainer = document.getElementById('chain-steps');
    
    // Remove empty message if present
    const emptyMessage = stepsContainer.querySelector('.empty-message');
    if (emptyMessage) {
      emptyMessage.remove();
    }
    
    const step = document.createElement('div');
    step.className = 'chain-step';
    step.dataset.promptId = promptId;
    step.draggable = true;
    
    step.innerHTML = `
      <div class="drag-handle">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256">
          <path d="M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128ZM128,72a12,12,0,1,0-12-12A12,12,0,0,0,128,72Zm0,112a12,12,0,1,0,12,12A12,12,0,0,0,128,184ZM72,128a12,12,0,1,0-12-12A12,12,0,0,0,72,128Zm112,0a12,12,0,1,0-12-12A12,12,0,0,0,184,128ZM72,72a12,12,0,1,0-12-12A12,12,0,0,0,72,72Zm0,112a12,12,0,1,0,12,12A12,12,0,0,0,72,184Zm112,0a12,12,0,1,0,12,12A12,12,0,0,0,184,184Zm0-112a12,12,0,1,0-12-12A12,12,0,0,0,184,72Z"></path>
        </svg>
      </div>
      <span class="step-title">${promptTitle}</span>
      <span class="remove-step">×</span>
    `;
    
    stepsContainer.appendChild(step);
    
    // Add event listener to remove button
    step.querySelector('.remove-step').addEventListener('click', function() {
      step.remove();
      
      // Add empty message if no steps
      if (stepsContainer.children.length === 0) {
        stepsContainer.innerHTML = '<p class="empty-message">No steps added yet</p>';
      }
    });
    
    // Add drag event listeners
    step.addEventListener('dragstart', handleDragStart);
    step.addEventListener('dragover', handleDragOver);
    step.addEventListener('dragenter', handleDragEnter);
    step.addEventListener('dragleave', handleDragLeave);
    step.addEventListener('drop', handleDrop);
    step.addEventListener('dragend', handleDragEnd);
  }
  
  // Drag-and-drop handlers
  let dragSrcEl = null;
  
  function handleDragStart(e) {
    this.style.opacity = '0.4';
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
  }
  
  function handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
  }
  
  function handleDragEnter(e) {
    this.classList.add('over');
  }
  
  function handleDragLeave(e) {
    this.classList.remove('over');
  }
  
  function handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    
    if (dragSrcEl !== this) {
      // Get the container and all items
      const container = this.parentNode;
      const items = Array.from(container.querySelectorAll('.chain-step'));
      
      // Get positions in the list
      const fromIndex = items.indexOf(dragSrcEl);
      const toIndex = items.indexOf(this);
      
      // If dragging downwards, insert after the target
      if (fromIndex < toIndex) {
        container.insertBefore(dragSrcEl, this.nextSibling);
      } else {
        // If dragging upwards, insert before the target
        container.insertBefore(dragSrcEl, this);
      }
    }
    
    return false;
  }
  
  function handleDragEnd(e) {
    // Reset opacity
    this.style.opacity = '1';
    
    // Remove drag over highlights
    document.querySelectorAll('.chain-step').forEach(item => {
      item.classList.remove('over');
    });
  }
  
  // New function to quickly add a prompt to a chain
  async function addPromptToChain(promptId, promptTitle) {
    // Get existing chains for selection
    const chains = await Storage.getChains();
    
    if (chains.length === 0) {
      // No chains exist, directly open create chain dialog with this prompt
      document.getElementById('chain-dialog-title').textContent = 'Create New Chain';
      document.getElementById('chain-id').value = '';
      document.getElementById('chain-title').value = '';
      document.getElementById('chain-steps').innerHTML = '';
      
      // Add this prompt as the first step
      addStepToChainBuilder(promptId, promptTitle);
      
      // Load other prompts for selection
      await loadPromptSelector();
      
      chainDialog.style.display = 'block';
    } else {
      // Show a quick selection dialog for chains
      const chainSelector = document.createElement('div');
      chainSelector.className = 'quick-chain-selector';
      chainSelector.innerHTML = `
        <div class="selector-header">
          <h3>Add to Chain</h3>
          <span class="close-selector">&times;</span>
        </div>
        <div class="selector-content">
          <p>Select an existing chain or create a new one:</p>
          <div class="chain-options">
            ${chains.map(chain => `
              <div class="chain-option" data-id="${chain.id}">
                <span>${chain.title}</span>
              </div>
            `).join('')}
            <div class="chain-option create-new">
              <span>+ Create New Chain</span>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(chainSelector);
      
      // Add event listeners
      const closeBtn = chainSelector.querySelector('.close-selector');
      closeBtn.addEventListener('click', () => {
        document.body.removeChild(chainSelector);
      });
      
      // Option to create a new chain
      const createNewOption = chainSelector.querySelector('.create-new');
      createNewOption.addEventListener('click', async () => {
        document.body.removeChild(chainSelector);
        
        // Open chain dialog with this prompt
        document.getElementById('chain-dialog-title').textContent = 'Create New Chain';
        document.getElementById('chain-id').value = '';
        document.getElementById('chain-title').value = '';
        document.getElementById('chain-steps').innerHTML = '';
        
        // Add this prompt as the first step
        addStepToChainBuilder(promptId, promptTitle);
        
        // Load other prompts for selection
        await loadPromptSelector();
        
        chainDialog.style.display = 'block';
      });
      
      // Add to existing chain options
      const chainOptions = chainSelector.querySelectorAll('.chain-option:not(.create-new)');
      chainOptions.forEach(option => {
        option.addEventListener('click', async () => {
          const chainId = option.dataset.id;
          const chain = await Storage.getChainById(chainId);
          
          if (chain) {
            // Add this prompt to the chain
            chain.steps.push(promptId);
            await Storage.saveChain(chain);
            
            // Show success message
            const successMsg = document.createElement('div');
            successMsg.className = 'success-message';
            successMsg.textContent = `Added to "${chain.title}"`;
            document.body.appendChild(successMsg);
            
            // Remove after 2 seconds
            setTimeout(() => {
              document.body.removeChild(successMsg);
            }, 2000);
          }
          
          document.body.removeChild(chainSelector);
        });
      });
    }
  }

  // Add refresh button click handler
  refreshBtn.addEventListener('click', function() {
    loadPrompts();
    loadChains();
    showToast('Data refreshed');
  });
}); 