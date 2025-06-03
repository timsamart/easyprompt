/**
 * Utility functions for PromptHub
 * Includes error handling, validation, and security utilities
 */

// Error handling system
class ErrorHandler {
  static logError(error, context = 'Unknown') {
    console.error(`[PromptHub Error - ${context}]:`, error);
    
    // Send to background script for centralized logging if needed
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        action: 'logError',
        error: {
          message: error.message,
          stack: error.stack,
          context
        }
      }).catch(() => {
        // Ignore messaging errors (e.g., when background script is not available)
      });
    }
  }

  static createError(message, code = 'GENERIC_ERROR') {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  static handleAsyncError(promise, context = 'Unknown') {
    return promise.catch(error => {
      this.logError(error, context);
      throw error;
    });
  }
}

// Input validation system
class Validator {
  static validatePrompt(prompt) {
    const errors = [];
    
    if (!prompt) {
      errors.push('Prompt data is required');
      return errors;
    }

    // Title validation
    if (!prompt.title || typeof prompt.title !== 'string') {
      errors.push('Prompt title is required');
    } else {
      const title = prompt.title.trim();
      if (title.length === 0) {
        errors.push('Prompt title cannot be empty');
      } else if (title.length > 100) {
        errors.push('Prompt title must be 100 characters or less');
      }
    }

    // Content validation
    if (!prompt.content || typeof prompt.content !== 'string') {
      errors.push('Prompt content is required');
    } else {
      const content = prompt.content.trim();
      if (content.length === 0) {
        errors.push('Prompt content cannot be empty');
      } else if (content.length > 10000) {
        errors.push('Prompt content must be 10,000 characters or less');
      }
    }

    return errors;
  }

  static validateChain(chain) {
    const errors = [];
    
    if (!chain) {
      errors.push('Chain data is required');
      return errors;
    }

    // Title validation
    if (!chain.title || typeof chain.title !== 'string') {
      errors.push('Chain title is required');
    } else {
      const title = chain.title.trim();
      if (title.length === 0) {
        errors.push('Chain title cannot be empty');
      } else if (title.length > 100) {
        errors.push('Chain title must be 100 characters or less');
      }
    }

    // Steps validation
    if (!Array.isArray(chain.steps)) {
      errors.push('Chain steps must be an array');
    } else if (chain.steps.length === 0) {
      errors.push('Chain must have at least one step');
    } else if (chain.steps.length > 20) {
      errors.push('Chain cannot have more than 20 steps');
    } else {
      // Validate each step ID
      chain.steps.forEach((stepId, index) => {
        if (!stepId || typeof stepId !== 'string') {
          errors.push(`Step ${index + 1} has invalid ID`);
        }
      });
    }

    return errors;
  }

  static validateDomainSelector(selector) {
    const errors = [];
    
    if (!selector) {
      errors.push('Domain selector data is required');
      return errors;
    }

    // Domain pattern validation
    if (!selector.domainPattern || typeof selector.domainPattern !== 'string') {
      errors.push('Domain pattern is required');
    } else {
      const pattern = selector.domainPattern.trim();
      if (pattern.length === 0) {
        errors.push('Domain pattern cannot be empty');
      } else if (pattern.length > 200) {
        errors.push('Domain pattern must be 200 characters or less');
      }
    }

    // CSS selector validation
    if (!selector.cssSelector || typeof selector.cssSelector !== 'string') {
      errors.push('CSS selector is required');
    } else {
      const cssSelector = selector.cssSelector.trim();
      if (cssSelector.length === 0) {
        errors.push('CSS selector cannot be empty');
      } else if (cssSelector.length > 500) {
        errors.push('CSS selector must be 500 characters or less');
      } else {
        // Test if CSS selector is valid
        try {
          document.querySelector(cssSelector);
        } catch (e) {
          errors.push('CSS selector syntax is invalid');
        }
      }
    }

    // Priority validation
    if (selector.priority !== undefined) {
      const priority = Number(selector.priority);
      if (isNaN(priority) || priority < 1 || priority > 100) {
        errors.push('Priority must be a number between 1 and 100');
      }
    }

    return errors;
  }

  static validateSearchQuery(query) {
    if (typeof query !== 'string') {
      return 'Search query must be a string';
    }
    if (query.length > 200) {
      return 'Search query must be 200 characters or less';
    }
    return null;
  }
}

// Security utilities
class SecurityUtils {
  static sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  static escapeHtml(str) {
    if (typeof str !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  static sanitizeText(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>]/g, '');
  }

  static createSafeElement(tagName, textContent = '', className = '') {
    const element = document.createElement(tagName);
    if (textContent) {
      element.textContent = textContent; // Safe text assignment
    }
    if (className) {
      element.className = className;
    }
    return element;
  }

  static validateJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      return { valid: true, data: parsed };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

// UI feedback utilities
class UIFeedback {
  static showError(message, container = null) {
    this.showMessage(message, 'error', container);
  }

  static showSuccess(message, container = null) {
    this.showMessage(message, 'success', container);
  }

  static showWarning(message, container = null) {
    this.showMessage(message, 'warning', container);
  }

  static showMessage(message, type = 'info', container = null) {
    // Create message element
    const messageEl = SecurityUtils.createSafeElement('div', '', `message message-${type}`);
    
    const textEl = SecurityUtils.createSafeElement('span', message);
    const closeBtn = SecurityUtils.createSafeElement('button', '×', 'message-close');
    
    messageEl.appendChild(textEl);
    messageEl.appendChild(closeBtn);

    // Add styles
    Object.assign(messageEl.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      maxWidth: '400px',
      padding: '12px 16px',
      borderRadius: '8px',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      zIndex: '10000',
      transition: 'opacity 0.3s ease',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '10px'
    });

    // Type-specific styles
    const typeStyles = {
      error: { backgroundColor: 'rgba(220, 53, 69, 0.9)', color: 'white' },
      success: { backgroundColor: 'rgba(25, 135, 84, 0.9)', color: 'white' },
      warning: { backgroundColor: 'rgba(255, 193, 7, 0.9)', color: 'black' },
      info: { backgroundColor: 'rgba(13, 110, 253, 0.9)', color: 'white' }
    };

    Object.assign(messageEl.style, typeStyles[type] || typeStyles.info);

    // Close button styles
    Object.assign(closeBtn.style, {
      background: 'none',
      border: 'none',
      color: 'inherit',
      fontSize: '18px',
      cursor: 'pointer',
      padding: '0',
      lineHeight: '1'
    });

    // Add to container or body
    const target = container || document.body;
    target.appendChild(messageEl);

    // Auto-remove after 5 seconds
    const autoRemove = setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 5000);

    // Close button functionality
    closeBtn.addEventListener('click', () => {
      clearTimeout(autoRemove);
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    });

    return messageEl;
  }

  static clearMessages(container = null) {
    const target = container || document.body;
    const messages = target.querySelectorAll('.message');
    messages.forEach(msg => {
      if (msg.parentNode) {
        msg.parentNode.removeChild(msg);
      }
    });
  }
}

// Async operation wrapper with error handling
class AsyncOp {
  static async withErrorHandling(operation, context = 'Operation') {
    try {
      return await operation();
    } catch (error) {
      ErrorHandler.logError(error, context);
      UIFeedback.showError(`${context} failed: ${error.message}`);
      throw error;
    }
  }

  static async withUserFeedback(operation, context = 'Operation', successMessage = null) {
    try {
      const result = await operation();
      if (successMessage) {
        UIFeedback.showSuccess(successMessage);
      }
      return result;
    } catch (error) {
      ErrorHandler.logError(error, context);
      UIFeedback.showError(`${context} failed: ${error.message}`);
      throw error;
    }
  }
}

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Export utilities
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ErrorHandler,
    Validator,
    SecurityUtils,
    UIFeedback,
    AsyncOp,
    debounce
  };
} 