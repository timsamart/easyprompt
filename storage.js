/**
 * Storage module for handling data storage and retrieval
 */
const Storage = {
    /**
     * Get all prompts from storage
     * @returns {Promise<Array>} Array of prompts
     */
    getPrompts: function() {
      return new Promise((resolve) => {
        chrome.storage.local.get('prompts', function(result) {
          resolve(result.prompts || []);
        });
      });
    },
  
    /**
     * Get all chains from storage
     * @returns {Promise<Array>} Array of chains
     */
    getChains: function() {
      return new Promise((resolve) => {
        chrome.storage.local.get('chains', function(result) {
          resolve(result.chains || []);
        });
      });
    },
    
    /**
     * Get a prompt by ID
     * @param {string} id Prompt ID
     * @returns {Promise<Object|null>} Prompt object or null if not found
     */
    getPromptById: async function(id) {
      const prompts = await this.getPrompts();
      return prompts.find(prompt => prompt.id === id) || null;
    },
    
    /**
     * Get a chain by ID
     * @param {string} id Chain ID
     * @returns {Promise<Object|null>} Chain object or null if not found
     */
    getChainById: async function(id) {
      const chains = await this.getChains();
      return chains.find(chain => chain.id === id) || null;
    },
    
    /**
     * Save a prompt to storage
     * @param {Object} prompt Prompt object
     * @returns {Promise<Object>} Saved prompt with ID
     */
    savePrompt: async function(prompt) {
      const prompts = await this.getPrompts();
      
      // If no ID, create a new prompt
      if (!prompt.id) {
        prompt.id = 'prompt_' + Date.now();
        prompt.created = Date.now();
        prompts.push(prompt);
      } else {
        // Update existing prompt
        const index = prompts.findIndex(p => p.id === prompt.id);
        if (index !== -1) {
          prompts[index] = prompt;
        } else {
          prompts.push(prompt);
        }
      }
      
      await chrome.storage.local.set({ prompts });
      return prompt;
    },
    
    /**
     * Save a chain to storage
     * @param {Object} chain Chain object
     * @returns {Promise<Object>} Saved chain with ID
     */
    saveChain: async function(chain) {
      const chains = await this.getChains();
      
      // If no ID, create a new chain
      if (!chain.id) {
        chain.id = 'chain_' + Date.now();
        chain.created = Date.now();
        chains.push(chain);
      } else {
        // Update existing chain
        const index = chains.findIndex(c => c.id === chain.id);
        if (index !== -1) {
          chains[index] = chain;
        } else {
          chains.push(chain);
        }
      }
      
      await chrome.storage.local.set({ chains });
      return chain;
    },
    
    /**
     * Delete a prompt by ID
     * @param {string} id Prompt ID
     * @returns {Promise<boolean>} Success status
     */
    deletePrompt: async function(id) {
      const prompts = await this.getPrompts();
      const newPrompts = prompts.filter(prompt => prompt.id !== id);
      
      // Also update any chains that use this prompt
      const chains = await this.getChains();
      const updatedChains = chains.map(chain => {
        chain.steps = chain.steps.filter(stepId => stepId !== id);
        return chain;
      });
      
      await chrome.storage.local.set({ 
        prompts: newPrompts,
        chains: updatedChains 
      });
      
      return true;
    },
    
    /**
     * Delete a chain by ID
     * @param {string} id Chain ID
     * @returns {Promise<boolean>} Success status
     */
    deleteChain: async function(id) {
      const chains = await this.getChains();
      const newChains = chains.filter(chain => chain.id !== id);
      
      await chrome.storage.local.set({ chains: newChains });
      return true;
    },
    
    /**
     * Search prompts by title or content
     * @param {string} query Search query
     * @returns {Promise<Array>} Matching prompts
     */
    searchPrompts: async function(query) {
      if (!query) return this.getPrompts();
      
      const prompts = await this.getPrompts();
      query = query.toLowerCase();
      
      return prompts.filter(prompt => 
        prompt.title.toLowerCase().includes(query) || 
        prompt.content.toLowerCase().includes(query)
      );
    },
    
    /**
     * Search chains by title
     * @param {string} query Search query
     * @returns {Promise<Array>} Matching chains
     */
    searchChains: async function(query) {
      if (!query) return this.getChains();
      
      const chains = await this.getChains();
      query = query.toLowerCase();
      
      return chains.filter(chain => 
        chain.title.toLowerCase().includes(query)
      );
    }
  };