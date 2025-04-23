/**
 * Side Panel UI logic for PromptHub
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
  
  // Search functionality
  searchInput.addEventListener('input', function() {
    const query = this.value.trim();
    if (promptsContent.classList.contains('active')) {
      loadPrompts(query);
    } else {
      loadChains(query);
    }
  });
  
  // Close dialogs when clicking on X or outside
  document.querySelectorAll('.close-btn, .cancel-btn').forEach(elem => {
    elem.addEventListener('click', function() {
      promptDialog.style.display = 'none';
      chainDialog.style.display = 'none';
    });
  });
  
  window.addEventListener('click', function(event) {
    if (event.target === promptDialog) {
      promptDialog.style.display = 'none';
    }
    if (event.target === chainDialog) {
      chainDialog.style.display = 'none';
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
  
  // Load initial data
  loadPrompts();
  setActiveTab('prompts');
  
  // Function to load prompts list
  async function loadPrompts(query = '') {
    const prompts = await Storage.searchPrompts(query);
    renderPromptsList(prompts);
  }
  
  // Function to load chains list
  async function loadChains(query = '') {
    const chains = await Storage.searchChains(query);
    renderChainsList(chains);
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
          <button class="action-btn delete-btn" data-id="${prompt.id}">🗑️</button>
          <button class="action-btn edit-btn" data-id="${prompt.id}">✎</button>
          <button class="action-btn insert-btn" data-id="${prompt.id}">↵</button>
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
    });
  }
  
  // Function to render chains list
  async function renderChainsList(chains) {
    chainsList.innerHTML = '';
    
    if (chains.length === 0) {
      chainsList.innerHTML = '<p class="empty-message">No chains found. Create one to get started!</p>';
      return;
    }
    
    for (const chain of chains) {
      const item = document.createElement('div');
      item.className = 'list-item';
      
      // Get prompt details for description
      const stepCount = chain.steps.length;
      let description;
      
      if (stepCount === 0) {
        description = 'Empty chain';
      } else {
        // Just show the number of steps
        description = `${stepCount} step${stepCount !== 1 ? 's' : ''}`;
      }
      
      item.innerHTML = `
        <div class="list-item-title">${chain.title}</div>
        <div class="list-item-desc">${description}</div>
        <div class="list-item-actions">
          <button class="action-btn delete-btn" data-id="${chain.id}">🗑️</button>
          <button class="action-btn edit-btn" data-id="${chain.id}">✎</button>
          <button class="action-btn insert-btn" data-id="${chain.id}">↵</button>
        </div>
      `;
      
      chainsList.appendChild(item);
      
      // Add event listeners
      item.querySelector('.insert-btn').addEventListener('click', function() {
        insertChain(chain.id);
      });
      
      item.querySelector('.edit-btn').addEventListener('click', function() {
        editChain(chain.id);
      });
      
      item.querySelector('.delete-btn').addEventListener('click', function() {
        deleteChain(chain.id);
      });
    }
  }
  
  // Function to insert prompt at cursor
  async function insertPrompt(id) {
    const prompt = await Storage.getPromptById(id);
    if (!prompt) return;
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'insertText',
        text: prompt.content
      });
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
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'insertText',
        text: prompt.content
      });
      
      // Store chain state for future steps (in a real app, we'd track this)
      chrome.storage.local.set({
        currentChain: {
          id: chain.id,
          currentStep: 0
        }
      });
    });
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
    
    step.innerHTML = `
      <span>${promptTitle}</span>
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
  }
}); 