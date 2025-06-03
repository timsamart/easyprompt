/**
 * Storage module for handling data storage and retrieval
 * Enhanced with error handling, validation, and security
 */
const Storage = {
    /**
     * Get all prompts from storage
     * @returns {Promise<Array>} Array of prompts
     */
    getPrompts: async function() {
      try {
        const result = await chrome.storage.local.get('prompts');
        const prompts = result.prompts || [];
        
        // Validate stored data integrity
        const validPrompts = prompts.filter(prompt => {
          const errors = Validator.validatePrompt(prompt);
          if (errors.length > 0) {
            ErrorHandler.logError(
              new Error(`Invalid prompt data: ${errors.join(', ')}`), 
              'Storage.getPrompts'
            );
            return false;
          }
          return true;
        });
        
        return validPrompts;
      } catch (error) {
        ErrorHandler.logError(error, 'Storage.getPrompts');
        throw ErrorHandler.createError('Failed to retrieve prompts', 'STORAGE_GET_PROMPTS_ERROR');
      }
    },
  
    /**
     * Get all chains from storage
     * @returns {Promise<Array>} Array of chains
     */
    getChains: async function() {
      try {
        const result = await chrome.storage.local.get('chains');
        const chains = result.chains || [];
        
        // Validate stored data integrity
        const validChains = chains.filter(chain => {
          const errors = Validator.validateChain(chain);
          if (errors.length > 0) {
            ErrorHandler.logError(
              new Error(`Invalid chain data: ${errors.join(', ')}`), 
              'Storage.getChains'
            );
            return false;
          }
          return true;
        });
        
        return validChains;
      } catch (error) {
        ErrorHandler.logError(error, 'Storage.getChains');
        throw ErrorHandler.createError('Failed to retrieve chains', 'STORAGE_GET_CHAINS_ERROR');
      }
    },
    
    /**
     * Get a prompt by ID
     * @param {string} id Prompt ID
     * @returns {Promise<Object|null>} Prompt object or null if not found
     */
    getPromptById: async function(id) {
      try {
        if (!id || typeof id !== 'string') {
          throw ErrorHandler.createError('Invalid prompt ID provided', 'INVALID_PROMPT_ID');
        }
        
        const prompts = await this.getPrompts();
        return prompts.find(prompt => prompt.id === id) || null;
      } catch (error) {
        ErrorHandler.logError(error, 'Storage.getPromptById');
        throw error;
      }
    },
    
    /**
     * Get a chain by ID
     * @param {string} id Chain ID
     * @returns {Promise<Object|null>} Chain object or null if not found
     */
    getChainById: async function(id) {
      try {
        if (!id || typeof id !== 'string') {
          throw ErrorHandler.createError('Invalid chain ID provided', 'INVALID_CHAIN_ID');
        }
        
        const chains = await this.getChains();
        return chains.find(chain => chain.id === id) || null;
      } catch (error) {
        ErrorHandler.logError(error, 'Storage.getChainById');
        throw error;
      }
    },
    
    /**
     * Save a prompt to storage
     * @param {Object} prompt Prompt object
     * @returns {Promise<Object>} Saved prompt with ID
     */
    savePrompt: async function(prompt) {
      try {
        // Validate input
        const validationErrors = Validator.validatePrompt(prompt);
        if (validationErrors.length > 0) {
          throw ErrorHandler.createError(
            `Validation failed: ${validationErrors.join(', ')}`, 
            'PROMPT_VALIDATION_ERROR'
          );
        }
        
        // Sanitize input data
        const sanitizedPrompt = {
          ...prompt,
          title: SecurityUtils.sanitizeText(prompt.title.trim()),
          content: SecurityUtils.sanitizeText(prompt.content.trim())
        };
        
        const prompts = await this.getPrompts();
        
        // If no ID, create a new prompt
        if (!sanitizedPrompt.id) {
          sanitizedPrompt.id = 'prompt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          sanitizedPrompt.created = Date.now();
          sanitizedPrompt.updated = Date.now();
          prompts.push(sanitizedPrompt);
        } else {
          // Update existing prompt
          const index = prompts.findIndex(p => p.id === sanitizedPrompt.id);
          if (index !== -1) {
            sanitizedPrompt.created = prompts[index].created || Date.now();
            sanitizedPrompt.updated = Date.now();
            prompts[index] = sanitizedPrompt;
          } else {
            // ID provided but doesn't exist, treat as new
            sanitizedPrompt.created = Date.now();
            sanitizedPrompt.updated = Date.now();
            prompts.push(sanitizedPrompt);
          }
        }
        
        // Check storage quota before saving
        await this._checkStorageQuota();
        
        await chrome.storage.local.set({ prompts });
        return sanitizedPrompt;
      } catch (error) {
        ErrorHandler.logError(error, 'Storage.savePrompt');
        throw error;
      }
    },
    
    /**
     * Save a chain to storage
     * @param {Object} chain Chain object
     * @returns {Promise<Object>} Saved chain with ID
     */
    saveChain: async function(chain) {
      try {
        // Validate input
        const validationErrors = Validator.validateChain(chain);
        if (validationErrors.length > 0) {
          throw ErrorHandler.createError(
            `Validation failed: ${validationErrors.join(', ')}`, 
            'CHAIN_VALIDATION_ERROR'
          );
        }
        
        // Validate that all step IDs exist
        const prompts = await this.getPrompts();
        const promptIds = new Set(prompts.map(p => p.id));
        
        const invalidSteps = chain.steps.filter(stepId => !promptIds.has(stepId));
        if (invalidSteps.length > 0) {
          throw ErrorHandler.createError(
            `Chain contains invalid prompt IDs: ${invalidSteps.join(', ')}`,
            'INVALID_CHAIN_STEPS'
          );
        }
        
        // Sanitize input data
        const sanitizedChain = {
          ...chain,
          title: SecurityUtils.sanitizeText(chain.title.trim()),
          steps: [...chain.steps] // Create copy of steps array
        };
        
        const chains = await this.getChains();
        
        // If no ID, create a new chain
        if (!sanitizedChain.id) {
          sanitizedChain.id = 'chain_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          sanitizedChain.created = Date.now();
          sanitizedChain.updated = Date.now();
          chains.push(sanitizedChain);
        } else {
          // Update existing chain
          const index = chains.findIndex(c => c.id === sanitizedChain.id);
          if (index !== -1) {
            sanitizedChain.created = chains[index].created || Date.now();
            sanitizedChain.updated = Date.now();
            chains[index] = sanitizedChain;
          } else {
            // ID provided but doesn't exist, treat as new
            sanitizedChain.created = Date.now();
            sanitizedChain.updated = Date.now();
            chains.push(sanitizedChain);
          }
        }
        
        // Check storage quota before saving
        await this._checkStorageQuota();
        
        await chrome.storage.local.set({ chains });
        return sanitizedChain;
      } catch (error) {
        ErrorHandler.logError(error, 'Storage.saveChain');
        throw error;
      }
    },
    
    /**
     * Delete a prompt by ID
     * @param {string} id Prompt ID
     * @returns {Promise<boolean>} Success status
     */
    deletePrompt: async function(id) {
      try {
        if (!id || typeof id !== 'string') {
          throw ErrorHandler.createError('Invalid prompt ID provided', 'INVALID_PROMPT_ID');
        }
        
        const prompts = await this.getPrompts();
        const initialLength = prompts.length;
        const newPrompts = prompts.filter(prompt => prompt.id !== id);
        
        if (newPrompts.length === initialLength) {
          throw ErrorHandler.createError('Prompt not found', 'PROMPT_NOT_FOUND');
        }
        
        // Also update any chains that use this prompt
        const chains = await this.getChains();
        const updatedChains = chains.map(chain => {
          const originalSteps = chain.steps.length;
          chain.steps = chain.steps.filter(stepId => stepId !== id);
          
          // Log if steps were removed
          if (chain.steps.length < originalSteps) {
            ErrorHandler.logError(
              new Error(`Removed deleted prompt ${id} from chain ${chain.id}`),
              'Storage.deletePrompt'
            );
          }
          
          return chain;
        });
        
        await chrome.storage.local.set({ 
          prompts: newPrompts,
          chains: updatedChains 
        });
        
        return true;
      } catch (error) {
        ErrorHandler.logError(error, 'Storage.deletePrompt');
        throw error;
      }
    },
    
    /**
     * Delete a chain by ID
     * @param {string} id Chain ID
     * @returns {Promise<boolean>} Success status
     */
    deleteChain: async function(id) {
      try {
        if (!id || typeof id !== 'string') {
          throw ErrorHandler.createError('Invalid chain ID provided', 'INVALID_CHAIN_ID');
        }
        
        const chains = await this.getChains();
        const initialLength = chains.length;
        const newChains = chains.filter(chain => chain.id !== id);
        
        if (newChains.length === initialLength) {
          throw ErrorHandler.createError('Chain not found', 'CHAIN_NOT_FOUND');
        }
        
        await chrome.storage.local.set({ chains: newChains });
        return true;
      } catch (error) {
        ErrorHandler.logError(error, 'Storage.deleteChain');
        throw error;
      }
    },
    
    /**
     * Search prompts by title or content
     * @param {string} query Search query
     * @returns {Promise<Array>} Matching prompts
     */
    searchPrompts: async function(query) {
      try {
        const validationError = Validator.validateSearchQuery(query);
        if (validationError) {
          throw ErrorHandler.createError(validationError, 'INVALID_SEARCH_QUERY');
        }
        
        if (!query || query.trim() === '') {
          return this.getPrompts();
        }
        
        const prompts = await this.getPrompts();
        const searchTerm = query.toLowerCase().trim();
        
        return prompts.filter(prompt => 
          prompt.title.toLowerCase().includes(searchTerm) || 
          prompt.content.toLowerCase().includes(searchTerm)
        );
      } catch (error) {
        ErrorHandler.logError(error, 'Storage.searchPrompts');
        throw error;
      }
    },
    
    /**
     * Search chains by title
     * @param {string} query Search query
     * @returns {Promise<Array>} Matching chains
     */
    searchChains: async function(query) {
      try {
        const validationError = Validator.validateSearchQuery(query);
        if (validationError) {
          throw ErrorHandler.createError(validationError, 'INVALID_SEARCH_QUERY');
        }
        
        if (!query || query.trim() === '') {
          return this.getChains();
        }
        
        const chains = await this.getChains();
        const searchTerm = query.toLowerCase().trim();
        
        return chains.filter(chain => 
          chain.title.toLowerCase().includes(searchTerm)
        );
      } catch (error) {
        ErrorHandler.logError(error, 'Storage.searchChains');
        throw error;
      }
    },

    /**
     * Get domain selectors from storage
     * @returns {Promise<Array>} Array of domain selectors
     */
    getDomainSelectors: async function() {
      try {
        const result = await chrome.storage.local.get('domainSelectors');
        const selectors = result.domainSelectors || [];
        
        // Validate stored data integrity
        const validSelectors = selectors.filter(selector => {
          const errors = Validator.validateDomainSelector(selector);
          if (errors.length > 0) {
            ErrorHandler.logError(
              new Error(`Invalid domain selector: ${errors.join(', ')}`), 
              'Storage.getDomainSelectors'
            );
            return false;
          }
          return true;
        });
        
        return validSelectors;
      } catch (error) {
        ErrorHandler.logError(error, 'Storage.getDomainSelectors');
        throw ErrorHandler.createError('Failed to retrieve domain selectors', 'STORAGE_GET_SELECTORS_ERROR');
      }
    },

    /**
     * Save domain selectors to storage
     * @param {Array} selectors Array of domain selectors
     * @returns {Promise<boolean>} Success status
     */
    saveDomainSelectors: async function(selectors) {
      try {
        if (!Array.isArray(selectors)) {
          throw ErrorHandler.createError('Domain selectors must be an array', 'INVALID_SELECTORS');
        }
        
        // Validate all selectors
        for (const selector of selectors) {
          const errors = Validator.validateDomainSelector(selector);
          if (errors.length > 0) {
            throw ErrorHandler.createError(
              `Invalid domain selector: ${errors.join(', ')}`,
              'SELECTOR_VALIDATION_ERROR'
            );
          }
        }
        
        // Sanitize selectors
        const sanitizedSelectors = selectors.map(selector => ({
          ...selector,
          domainPattern: SecurityUtils.sanitizeText(selector.domainPattern.trim()),
          cssSelector: SecurityUtils.sanitizeText(selector.cssSelector.trim())
        }));
        
        await chrome.storage.local.set({ domainSelectors: sanitizedSelectors });
        return true;
      } catch (error) {
        ErrorHandler.logError(error, 'Storage.saveDomainSelectors');
        throw error;
      }
    },

    /**
     * Check storage quota and warn if approaching limits
     * @private
     */
    _checkStorageQuota: async function() {
      try {
        if (chrome.storage.local.getBytesInUse) {
          const bytesInUse = await chrome.storage.local.getBytesInUse();
          const quota = chrome.storage.local.QUOTA_BYTES || 5242880; // 5MB default
          const usagePercent = (bytesInUse / quota) * 100;
          
          if (usagePercent > 90) {
            ErrorHandler.logError(
              new Error(`Storage usage critical: ${usagePercent.toFixed(1)}%`),
              'Storage._checkStorageQuota'
            );
            throw ErrorHandler.createError(
              'Storage quota nearly exceeded. Please delete some data.',
              'STORAGE_QUOTA_EXCEEDED'
            );
          } else if (usagePercent > 75) {
            ErrorHandler.logError(
              new Error(`Storage usage high: ${usagePercent.toFixed(1)}%`),
              'Storage._checkStorageQuota'
            );
          }
        }
      } catch (error) {
        // Only rethrow if it's a quota error
        if (error.code === 'STORAGE_QUOTA_EXCEEDED') {
          throw error;
        }
        // Log but don't fail for quota check errors
        ErrorHandler.logError(error, 'Storage._checkStorageQuota');
      }
    },

    /**
     * Export all data
     * @returns {Promise<Object>} Exported data
     */
    exportData: async function() {
      try {
        const [prompts, chains, domainSelectors] = await Promise.all([
          this.getPrompts(),
          this.getChains(),
          this.getDomainSelectors()
        ]);
        
        return {
          version: '1.0',
          exportDate: new Date().toISOString(),
          prompts,
          chains,
          domainSelectors
        };
      } catch (error) {
        ErrorHandler.logError(error, 'Storage.exportData');
        throw ErrorHandler.createError('Failed to export data', 'EXPORT_ERROR');
      }
    },

    /**
     * Import data with validation
     * @param {Object} data Data to import
     * @returns {Promise<Object>} Import results
     */
    importData: async function(data) {
      try {
        if (!data || typeof data !== 'object') {
          throw ErrorHandler.createError('Invalid import data', 'INVALID_IMPORT_DATA');
        }
        
        const results = {
          prompts: { imported: 0, skipped: 0, errors: [] },
          chains: { imported: 0, skipped: 0, errors: [] },
          domainSelectors: { imported: 0, skipped: 0, errors: [] }
        };
        
        // Import prompts
        if (Array.isArray(data.prompts)) {
          for (const prompt of data.prompts) {
            try {
              await this.savePrompt(prompt);
              results.prompts.imported++;
            } catch (error) {
              results.prompts.errors.push(`Prompt "${prompt?.title || 'Unknown'}": ${error.message}`);
              results.prompts.skipped++;
            }
          }
        }
        
        // Import chains
        if (Array.isArray(data.chains)) {
          for (const chain of data.chains) {
            try {
              await this.saveChain(chain);
              results.chains.imported++;
            } catch (error) {
              results.chains.errors.push(`Chain "${chain?.title || 'Unknown'}": ${error.message}`);
              results.chains.skipped++;
            }
          }
        }
        
        // Import domain selectors
        if (Array.isArray(data.domainSelectors)) {
          try {
            await this.saveDomainSelectors(data.domainSelectors);
            results.domainSelectors.imported = data.domainSelectors.length;
          } catch (error) {
            results.domainSelectors.errors.push(`Domain selectors: ${error.message}`);
            results.domainSelectors.skipped = data.domainSelectors.length;
          }
        }
        
        return results;
      } catch (error) {
        ErrorHandler.logError(error, 'Storage.importData');
        throw error;
      }
    }
  };