/**
 * Settings page for PromptHub
 * Manages domain-specific selectors
 */
document.addEventListener('DOMContentLoaded', async function() {
  // UI elements
  const selectorsList = document.getElementById('selector-list');
  const addSelectorBtn = document.getElementById('add-selector-btn');
  const selectorDialog = document.getElementById('selector-dialog');
  const selectorForm = document.getElementById('selector-form');
  const addDefaultsBtn = document.createElement('button');

  // Add "Add Default Configurations" button
  addDefaultsBtn.className = 'add-btn secondary-btn';
  addDefaultsBtn.textContent = '+ Add Default Configurations';
  addDefaultsBtn.style.marginTop = '16px';
  document.querySelector('.settings-section').appendChild(addDefaultsBtn);

  // Close dialog when clicking on X or cancel
  document.querySelectorAll('.close-btn, .cancel-btn').forEach(elem => {
    elem.addEventListener('click', function() {
      selectorDialog.style.display = 'none';
    });
  });

  // Close dialog when clicking outside
  window.addEventListener('click', function(event) {
    if (event.target === selectorDialog) {
      selectorDialog.style.display = 'none';
    }
  });

  // Add new domain configuration
  addSelectorBtn.addEventListener('click', function() {
    document.getElementById('selector-dialog-title').textContent = 'Add Domain Configuration';
    document.getElementById('selector-id').value = '';
    document.getElementById('domain-pattern').value = '';
    document.getElementById('css-selector').value = '';
    document.getElementById('selector-priority').value = '10';
    selectorDialog.style.display = 'block';
  });
  
  // Add default configurations
  addDefaultsBtn.addEventListener('click', async function() {
    if (!confirm('This will add pre-configured selectors for common websites like ChatGPT, Claude, Bard/Gemini, etc. Continue?')) {
      return;
    }
    
    await addDefaultConfigurations();
    await loadSelectorConfigurations();
    
    showSuccessMessage('Default configurations added successfully');
  });

  // Save selector configuration
  selectorForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const id = document.getElementById('selector-id').value;
    const domainPattern = document.getElementById('domain-pattern').value.trim();
    const cssSelector = document.getElementById('css-selector').value.trim();
    const priority = parseInt(document.getElementById('selector-priority').value, 10);
    
    // Basic validation
    if (!domainPattern || !cssSelector || isNaN(priority)) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Create config object
    const config = {
      id: id || 'selector_' + Date.now(),
      domainPattern,
      cssSelector,
      priority
    };
    
    // Save to storage
    await saveSelectorConfig(config);
    
    // Close dialog and refresh list
    selectorDialog.style.display = 'none';
    await loadSelectorConfigurations();
    
    // Show success message
    showSuccessMessage(`Configuration for ${domainPattern} saved successfully`);
  });
  
  // Initial load
  await loadSelectorConfigurations();
  
  /**
   * Add default configurations for common websites
   */
  async function addDefaultConfigurations() {
    const defaultConfigs = [
      // Claude configurations
      {
        id: 'selector_claude_1',
        domainPattern: 'claude.ai',
        cssSelector: 'div[contenteditable="true"].ProseMirror',
        priority: 30
      },
      {
        id: 'selector_claude_2',
        domainPattern: '*.anthropic.com',
        cssSelector: 'div[contenteditable="true"].ProseMirror',
        priority: 30
      },
      {
        id: 'selector_claude_3',
        domainPattern: 'claude.ai',
        cssSelector: '.ProseMirror p[data-placeholder]',
        priority: 25
      },
      {
        id: 'selector_claude_4',
        domainPattern: 'claude.ai',
        cssSelector: '.ProseMirror',
        priority: 20
      },
      
      // ChatGPT configurations
      {
        id: 'selector_chatgpt_1',
        domainPattern: 'chat.openai.com',
        cssSelector: 'textarea[data-id="root"]',
        priority: 30
      },
      {
        id: 'selector_chatgpt_2',
        domainPattern: 'chat.openai.com',
        cssSelector: '#prompt-textarea',
        priority: 25
      },
      
      // Gemini/Bard configurations
      {
        id: 'selector_gemini_1',
        domainPattern: 'gemini.google.com',
        cssSelector: '[contenteditable="true"]',
        priority: 30
      },
      {
        id: 'selector_gemini_2',
        domainPattern: 'bard.google.com',
        cssSelector: '[contenteditable="true"]',
        priority: 30
      },
      
      // Microsoft Copilot
      {
        id: 'selector_copilot_1',
        domainPattern: 'copilot.microsoft.com',
        cssSelector: '[contenteditable="true"]',
        priority: 30
      }
    ];
    
    // Get existing configs
    const existingConfigs = await getSelectorConfigurations();
    const existingIds = new Set(existingConfigs.map(c => c.id));
    
    // Filter out configs that already exist
    const newConfigs = defaultConfigs.filter(c => !existingIds.has(c.id));
    
    // Save new configs
    for (const config of newConfigs) {
      await saveSelectorConfig(config);
    }
    
    return newConfigs.length;
  }
  
  /**
   * Load and display all selector configurations
   */
  async function loadSelectorConfigurations() {
    const configs = await getSelectorConfigurations();
    renderSelectorList(configs);
  }
  
  /**
   * Render the list of selector configurations
   */
  function renderSelectorList(configs) {
    selectorsList.innerHTML = '';
    
    if (configs.length === 0) {
      selectorsList.innerHTML = '<p class="empty-message">No domain configurations yet. Add one to get started.</p>';
      return;
    }
    
    // Sort by priority (descending)
    const sortedConfigs = [...configs].sort((a, b) => b.priority - a.priority);
    
    sortedConfigs.forEach(config => {
      const item = document.createElement('div');
      item.className = 'selector-item';
      item.innerHTML = `
        <div class="form-row">
          <div class="form-col">
            <strong>Domain Pattern:</strong> ${config.domainPattern}
          </div>
          <div class="form-col">
            <strong>Priority:</strong> ${config.priority}
          </div>
        </div>
        <div>
          <strong>CSS Selector:</strong> <code>${config.cssSelector}</code>
        </div>
        <div class="selector-actions">
          <button class="action-btn edit-btn" data-id="${config.id}">Edit</button>
          <button class="action-btn delete-btn" data-id="${config.id}">Delete</button>
        </div>
      `;
      
      selectorsList.appendChild(item);
      
      // Add event listeners
      item.querySelector('.edit-btn').addEventListener('click', function() {
        editSelectorConfig(config.id);
      });
      
      item.querySelector('.delete-btn').addEventListener('click', function() {
        deleteSelectorConfig(config.id);
      });
    });
  }
  
  /**
   * Edit a selector configuration
   */
  async function editSelectorConfig(id) {
    const configs = await getSelectorConfigurations();
    const config = configs.find(c => c.id === id);
    
    if (!config) return;
    
    document.getElementById('selector-dialog-title').textContent = 'Edit Domain Configuration';
    document.getElementById('selector-id').value = config.id;
    document.getElementById('domain-pattern').value = config.domainPattern;
    document.getElementById('css-selector').value = config.cssSelector;
    document.getElementById('selector-priority').value = config.priority;
    
    selectorDialog.style.display = 'block';
  }
  
  /**
   * Delete a selector configuration
   */
  async function deleteSelectorConfig(id) {
    if (!confirm('Are you sure you want to delete this configuration?')) {
      return;
    }
    
    const configs = await getSelectorConfigurations();
    const updatedConfigs = configs.filter(c => c.id !== id);
    
    await chrome.storage.local.set({ domainSelectors: updatedConfigs });
    await loadSelectorConfigurations();
    
    showSuccessMessage('Configuration deleted successfully');
  }
  
  /**
   * Save a selector configuration
   */
  async function saveSelectorConfig(newConfig) {
    const configs = await getSelectorConfigurations();
    
    // Check if this is an update or new configuration
    const existingIndex = configs.findIndex(c => c.id === newConfig.id);
    
    if (existingIndex !== -1) {
      configs[existingIndex] = newConfig;
    } else {
      configs.push(newConfig);
    }
    
    await chrome.storage.local.set({ domainSelectors: configs });
  }
  
  /**
   * Get all selector configurations from storage
   */
  async function getSelectorConfigurations() {
    const result = await chrome.storage.local.get('domainSelectors');
    return result.domainSelectors || [];
  }
  
  /**
   * Show a temporary success message
   */
  function showSuccessMessage(message) {
    const successMsg = document.createElement('div');
    successMsg.className = 'success-message';
    successMsg.textContent = message;
    document.body.appendChild(successMsg);
    
    setTimeout(() => {
      document.body.removeChild(successMsg);
    }, 2000);
  }
}); 