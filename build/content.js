/**
 * Content script for PromptHub
 * Handles text insertion at cursor position with domain-specific selectors
 * Enhanced with error handling and security
 */

// Store domain-specific selectors
let domainSelectors = [];

// Load domain selectors when the script initializes
loadDomainSelectors();

// Create feedback elements for insertion status
let feedbackOverlay = null;
let feedbackTimeout = null;

// Error logging for content script
function logError(error, context = 'Content Script') {
  console.error(`[PromptHub Content Error - ${context}]:`, error);
  
  // Send to background script for centralized logging
  try {
    chrome.runtime.sendMessage({
      action: 'logError',
      error: {
        message: error.message,
        stack: error.stack,
        context
      }
    }).catch(() => {
      // Ignore messaging errors
    });
  } catch (e) {
    // Ignore if messaging fails
  }
}

// Initialize feedback overlay
function createFeedbackOverlay() {
  if (feedbackOverlay) return;
  
  feedbackOverlay = document.createElement('div');
  feedbackOverlay.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    max-width: 400px;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 10000;
    transition: opacity 0.3s ease;
    opacity: 0;
    pointer-events: none;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  `;
  
  document.body.appendChild(feedbackOverlay);
}

// Show feedback message
function showFeedback(message, isSuccess = true) {
  try {
    // Create overlay if it doesn't exist
    createFeedbackOverlay();
    
    // Clear existing timeout
    if (feedbackTimeout) {
      clearTimeout(feedbackTimeout);
    }
    
    // Sanitize message content
    const sanitizedMessage = typeof message === 'string' ? message : 'Unknown message';
    
    // Set content and show
    feedbackOverlay.textContent = sanitizedMessage; // Use textContent for security
    feedbackOverlay.style.backgroundColor = isSuccess ? 'rgba(25, 135, 84, 0.9)' : 'rgba(220, 53, 69, 0.9)';
    feedbackOverlay.style.opacity = '1';
    
    // Hide after 4 seconds
    feedbackTimeout = setTimeout(() => {
      if (feedbackOverlay) {
        feedbackOverlay.style.opacity = '0';
      }
    }, 4000);
  } catch (error) {
    logError(error, 'Show Feedback');
  }
}

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === "insertText") {
      if (!request.text || typeof request.text !== 'string') {
        const error = new Error('Invalid text provided for insertion');
        logError(error, 'Insert Text Message');
        sendResponse({ success: false, message: error.message });
        return;
      }
      
      const result = insertTextAtCursor(request.text);
      sendResponse({ success: result.success, message: result.message });
    } else if (request.action === "reloadSelectors") {
      loadDomainSelectors().then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        logError(error, 'Reload Selectors');
        sendResponse({ success: false, message: error.message });
      });
      return true; // Keep the message channel open for async response
    } else if (request.action === "showError") {
      // Handle error display requests from background script
      if (request.message) {
        showFeedback(request.message, false);
      }
      sendResponse({ success: true });
    } else {
      logError(new Error(`Unknown action: ${request.action}`), 'Message Handler');
      sendResponse({ success: false, message: 'Unknown action' });
    }
  } catch (error) {
    logError(error, 'Message Handler');
    sendResponse({ success: false, message: error.message });
  }
  
  return true; // Keep the message channel open for async response
});

/**
 * Load domain-specific selectors from storage
 */
async function loadDomainSelectors() {
  try {
    const result = await chrome.storage.local.get('domainSelectors');
    domainSelectors = Array.isArray(result.domainSelectors) ? result.domainSelectors : [];
    
    // Sort by priority (highest first) and validate
    domainSelectors = domainSelectors
      .filter(selector => {
        if (!selector?.domainPattern || !selector?.cssSelector) {
          logError(new Error('Invalid domain selector structure'), 'Load Domain Selectors');
          return false;
        }
        return true;
      })
      .sort((a, b) => (b.priority || 10) - (a.priority || 10));
    
    console.log('Loaded domain selectors:', domainSelectors);
  } catch (error) {
    logError(error, 'Load Domain Selectors');
    domainSelectors = [];
  }
}

/**
 * Insert text at the current cursor position
 * @param {string} text - Text to insert
 * @returns {object} - Result object with success status and message
 */
function insertTextAtCursor(text) {
  try {
    // Validate input
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text provided');
    }
    
    // Sanitize text (basic protection)
    const sanitizedText = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    
    // Get the current domain
    const currentDomain = window.location.hostname;
    console.log('Current domain:', currentDomain);
    
    // Find matching domain configurations
    const matchingConfigs = findMatchingDomainConfigs(currentDomain);
    console.log('Matching domain configs:', matchingConfigs);
    
    let feedbackDetails = '';
    
    // First try using domain-specific selectors
    if (matchingConfigs.length > 0) {
      feedbackDetails += `Domain matches: ${currentDomain}\n`;
      feedbackDetails += 'Trying selectors:\n';
      
      for (const config of matchingConfigs) {
        feedbackDetails += `• ${config.cssSelector} (priority: ${config.priority})\n`;
        
        let elements;
        try {
          elements = document.querySelectorAll(config.cssSelector);
        } catch (selectorError) {
          logError(selectorError, `Invalid CSS Selector: ${config.cssSelector}`);
          feedbackDetails += `  - Invalid selector syntax\n`;
          continue;
        }
        
        if (elements.length === 0) {
          feedbackDetails += `  - No elements found\n`;
          continue;
        }
        
        feedbackDetails += `  - Found ${elements.length} element(s)\n`;
        
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          if (isEditableElement(element)) {
            element.focus();
            
            if (element.isContentEditable) {
              if (insertIntoContentEditable(element, sanitizedText)) {
                showFeedback(`Text inserted successfully! Used selector: ${config.cssSelector}`, true);
                return { success: true, message: `Text inserted using selector: ${config.cssSelector}` };
              }
            } else if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
              if (insertIntoInputElement(element, sanitizedText)) {
                showFeedback(`Text inserted successfully! Used selector: ${config.cssSelector}`, true);
                return { success: true, message: `Text inserted using selector: ${config.cssSelector}` };
              }
            }
            feedbackDetails += `  - Element ${i+1} insertion failed\n`;
          } else {
            feedbackDetails += `  - Element ${i+1} is not editable\n`;
          }
        }
      }
    } else {
      feedbackDetails += `No domain configurations match: ${currentDomain}\n`;
    }
    
    // If no domain-specific selectors matched or insertion failed, try the default approach
    feedbackDetails += 'Trying default approach:\n';
    
    // First check if there's already an element with focus
    const activeElement = document.activeElement;
    
    if (activeElement && isEditableElement(activeElement)) {
      feedbackDetails += '• Trying active element\n';
      
      if (activeElement.isContentEditable) {
        if (insertIntoContentEditable(activeElement, sanitizedText)) {
          showFeedback('Text inserted successfully! Used active element', true);
          return { success: true, message: 'Text inserted into active element' };
        }
      } else if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
        if (insertIntoInputElement(activeElement, sanitizedText)) {
          showFeedback('Text inserted successfully! Used active element', true);
          return { success: true, message: 'Text inserted into active element' };
        }
      }
      feedbackDetails += '  - Insertion into active element failed\n';
    } else {
      feedbackDetails += '• No active editable element found\n';
    }
    
    // If no focused element, try to find possible editable elements
    feedbackDetails += '• Trying to find editable elements\n';
    const possibleElements = findPossibleEditableElements();
    feedbackDetails += `  - Found ${possibleElements.length} possible elements\n`;
    
    for (let i = 0; i < possibleElements.length; i++) {
      const element = possibleElements[i];
      if (isEditableElement(element)) {
        element.focus();
        
        if (element.isContentEditable) {
          if (insertIntoContentEditable(element, sanitizedText)) {
            showFeedback('Text inserted successfully! Used auto-detected element', true);
            return { success: true, message: 'Text inserted into auto-detected element' };
          }
        } else if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
          if (insertIntoInputElement(element, sanitizedText)) {
            showFeedback('Text inserted successfully! Used auto-detected element', true);
            return { success: true, message: 'Text inserted into auto-detected element' };
          }
        }
      }
    }
    
    // If we get here, insertion failed
    const errorMessage = 'No suitable editable element found on this page';
    showFeedback(errorMessage, false);
    logError(new Error(feedbackDetails), 'Text Insertion Failed');
    return { success: false, message: errorMessage };
  } catch (error) {
    logError(error, 'Insert Text At Cursor');
    const errorMessage = `Failed to insert text: ${error.message}`;
    showFeedback(errorMessage, false);
    return { success: false, message: errorMessage };
  }
}

/**
 * Find domain configurations that match the current domain
 * @param {string} domain - Current domain
 * @returns {Array} - Matching configurations
 */
function findMatchingDomainConfigs(domain) {
  try {
    if (!domain) return [];
    
    return domainSelectors.filter(config => {
      try {
        return domainMatchesPattern(domain, config.domainPattern);
      } catch (error) {
        logError(error, `Domain Pattern Match: ${config.domainPattern}`);
        return false;
      }
    });
  } catch (error) {
    logError(error, 'Find Matching Domain Configs');
    return [];
  }
}

/**
 * Check if domain matches pattern (supports wildcards)
 * @param {string} domain - Domain to check
 * @param {string} pattern - Pattern to match against
 * @returns {boolean} - True if matches
 */
function domainMatchesPattern(domain, pattern) {
  if (!domain || !pattern) return false;
  
  // Convert pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')  // Escape dots
    .replace(/\*/g, '.*');  // Convert wildcards
  
  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(domain);
}

/**
 * Check if element is editable
 * @param {Element} element - Element to check
 * @returns {boolean} - True if editable
 */
function isEditableElement(element) {
  if (!element) return false;
  
  return element.isContentEditable || 
         element.tagName === 'TEXTAREA' || 
         (element.tagName === 'INPUT' && 
          ['text', 'search', 'email', 'password', 'tel', 'url'].includes(element.type));
}

/**
 * Insert text into content editable element
 * @param {Element} element - Target element
 * @param {string} text - Text to insert
 * @returns {boolean} - Success status
 */
function insertIntoContentEditable(element, text) {
  try {
    if (!element || !text) return false;
    
    // Focus the element
    element.focus();
    
    // Use execCommand if available
    if (document.execCommand) {
      const result = document.execCommand('insertText', false, text);
      if (result) return true;
    }
    
    // Fallback: use Selection API
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      return true;
    }
    
    // Last resort: append to element
    const textNode = document.createTextNode(text);
    element.appendChild(textNode);
    return true;
  } catch (error) {
    logError(error, 'Insert Into Content Editable');
    return false;
  }
}

/**
 * Insert text into input/textarea element
 * @param {Element} element - Target element
 * @param {string} text - Text to insert
 * @returns {boolean} - Success status
 */
function insertIntoInputElement(element, text) {
  try {
    if (!element || !text) return false;
    
    const startPos = element.selectionStart || 0;
    const endPos = element.selectionEnd || 0;
    const currentValue = element.value || '';
    
    // Insert text at cursor position
    const newValue = currentValue.substring(0, startPos) + text + currentValue.substring(endPos);
    element.value = newValue;
    
    // Set cursor position after inserted text
    const newCursorPos = startPos + text.length;
    element.setSelectionRange(newCursorPos, newCursorPos);
    
    // Trigger input event
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    element.dispatchEvent(inputEvent);
    
    return true;
  } catch (error) {
    logError(error, 'Insert Into Input Element');
    return false;
  }
}

/**
 * Find possible editable elements on the page
 * @returns {Array} - Array of potentially editable elements
 */
function findPossibleEditableElements() {
  try {
    const selectors = [
      'textarea',
      'input[type="text"]',
      'input[type="search"]',
      'input[type="email"]',
      'input[type="password"]',
      'input[type="tel"]',
      'input[type="url"]',
      '[contenteditable="true"]',
      '[contenteditable=""]'
    ];
    
    const elements = [];
    
    selectors.forEach(selector => {
      try {
        const found = document.querySelectorAll(selector);
        elements.push(...found);
      } catch (selectorError) {
        logError(selectorError, `Find Elements Selector: ${selector}`);
      }
    });
    
    // Remove duplicates and filter visible elements
    const uniqueElements = [...new Set(elements)];
    
    return uniqueElements.filter(element => {
      try {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               element.offsetWidth > 0 && 
               element.offsetHeight > 0;
      } catch (error) {
        logError(error, 'Filter Visible Elements');
        return true; // Include if we can't determine visibility
      }
    });
  } catch (error) {
    logError(error, 'Find Possible Editable Elements');
    return [];
  }
}

// Listen for storage changes to reload selectors when they are updated
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && changes.domainSelectors) {
    loadDomainSelectors();
  }
});