/**
 * Content script for PromptHub
 * Handles text insertion at cursor position with domain-specific selectors
 */

// Store domain-specific selectors
let domainSelectors = [];

// Load domain selectors when the script initializes
loadDomainSelectors();

// Create feedback elements for insertion status
let feedbackOverlay = null;
let feedbackTimeout = null;

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
  // Create overlay if it doesn't exist
  createFeedbackOverlay();
  
  // Clear existing timeout
  if (feedbackTimeout) {
    clearTimeout(feedbackTimeout);
  }
  
  // Set content and show
  feedbackOverlay.innerHTML = message;
  feedbackOverlay.style.backgroundColor = isSuccess ? 'rgba(25, 135, 84, 0.9)' : 'rgba(220, 53, 69, 0.9)';
  feedbackOverlay.style.opacity = '1';
  
  // Hide after 4 seconds
  feedbackTimeout = setTimeout(() => {
    feedbackOverlay.style.opacity = '0';
  }, 4000);
}

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "insertText") {
    const result = insertTextAtCursor(request.text);
    sendResponse({ success: result.success, message: result.message });
  } else if (request.action === "reloadSelectors") {
    loadDomainSelectors().then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep the message channel open for async response
  }
  return true; // Keep the message channel open for async response
});

/**
 * Load domain-specific selectors from storage
 */
async function loadDomainSelectors() {
  try {
    const result = await chrome.storage.local.get('domainSelectors');
    domainSelectors = result.domainSelectors || [];
    
    // Sort by priority (highest first)
    domainSelectors.sort((a, b) => b.priority - a.priority);
    
    console.log('Loaded domain selectors:', domainSelectors);
  } catch (error) {
    console.error('Error loading domain selectors:', error);
    domainSelectors = [];
  }
}

/**
 * Insert text at the current cursor position
 * @param {string} text - Text to insert
 * @returns {object} - Result object with success status and message
 */
function insertTextAtCursor(text) {
  // Get the current domain
  const currentDomain = window.location.hostname;
  console.log('Current domain:', currentDomain);
  
  // Find matching domain configurations
  const matchingConfigs = findMatchingDomainConfigs(currentDomain);
  console.log('Matching domain configs:', matchingConfigs);
  
  let feedbackDetails = '';
  
  // First try using domain-specific selectors
  if (matchingConfigs.length > 0) {
    feedbackDetails += `<strong>Domain matches:</strong> ${currentDomain}<br>`;
    feedbackDetails += '<strong>Trying selectors:</strong><br>';
    
    for (const config of matchingConfigs) {
      feedbackDetails += `• ${config.cssSelector} (priority: ${config.priority})<br>`;
      const elements = document.querySelectorAll(config.cssSelector);
      
      if (elements.length === 0) {
        feedbackDetails += `  - No elements found<br>`;
        continue;
      }
      
      feedbackDetails += `  - Found ${elements.length} element(s)<br>`;
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (isEditableElement(element)) {
          element.focus();
          
          if (element.isContentEditable) {
            if (insertIntoContentEditable(element, text)) {
              showFeedback(`<div>Text inserted successfully!</div><div>Used selector: ${config.cssSelector}</div>`, true);
              return { success: true, message: `Text inserted using selector: ${config.cssSelector}` };
            }
          } else if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            if (insertIntoInputElement(element, text)) {
              showFeedback(`<div>Text inserted successfully!</div><div>Used selector: ${config.cssSelector}</div>`, true);
              return { success: true, message: `Text inserted using selector: ${config.cssSelector}` };
            }
          }
          feedbackDetails += `  - Element ${i+1} insertion failed<br>`;
        } else {
          feedbackDetails += `  - Element ${i+1} is not editable<br>`;
        }
      }
    }
  } else {
    feedbackDetails += `<strong>No domain configurations match:</strong> ${currentDomain}<br>`;
  }
  
  // If no domain-specific selectors matched or insertion failed, try the default approach
  feedbackDetails += '<strong>Trying default approach:</strong><br>';
  
  // First check if there's already an element with focus
  const activeElement = document.activeElement;
  
  if (activeElement && isEditableElement(activeElement)) {
    feedbackDetails += '• Trying active element<br>';
    
    if (activeElement.isContentEditable) {
      if (insertIntoContentEditable(activeElement, text)) {
        showFeedback('<div>Text inserted successfully!</div><div>Used active element</div>', true);
        return { success: true, message: 'Text inserted into active element' };
      }
    } else if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
      if (insertIntoInputElement(activeElement, text)) {
        showFeedback('<div>Text inserted successfully!</div><div>Used active element</div>', true);
        return { success: true, message: 'Text inserted into active element' };
      }
    }
    feedbackDetails += '  - Insertion into active element failed<br>';
  } else {
    feedbackDetails += '• No active editable element found<br>';
  }
  
  // If no focused element, try to find possible editable elements
  feedbackDetails += '• Trying to find editable elements<br>';
  const possibleElements = findPossibleEditableElements();
  feedbackDetails += `  - Found ${possibleElements.length} possible elements<br>`;
  
  for (let i = 0; i < possibleElements.length; i++) {
    const element = possibleElements[i];
    if (isEditableElement(element)) {
      element.focus();
      
      if (element.isContentEditable) {
        if (insertIntoContentEditable(element, text)) {
          showFeedback('<div>Text inserted successfully!</div><div>Used auto-detected element</div>', true);
          return { success: true, message: 'Text inserted into auto-detected element' };
        }
      } else if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        if (insertIntoInputElement(element, text)) {
          showFeedback('<div>Text inserted successfully!</div><div>Used auto-detected element</div>', true);
          return { success: true, message: 'Text inserted into auto-detected element' };
        }
      }
    }
  }
  
  // If we get here, insertion failed
  showFeedback(`<div>Text insertion failed!</div><div>${feedbackDetails}</div>`, false);
  return { success: false, message: 'Failed to insert text at cursor position' };
}

/**
 * Find domain configurations that match the current domain
 * @param {string} domain - Current domain
 * @returns {Array} - Array of matching domain configurations
 */
function findMatchingDomainConfigs(domain) {
  return domainSelectors.filter(config => {
    return domainMatchesPattern(domain, config.domainPattern);
  });
}

/**
 * Check if a domain matches a pattern with wildcard support
 * @param {string} domain - Domain to check
 * @param {string} pattern - Pattern to match against (can include * wildcard)
 * @returns {boolean} - Whether the domain matches the pattern
 */
function domainMatchesPattern(domain, pattern) {
  // Escape special regex characters except *
  const escapedPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
    .replace(/\*/g, '.*'); // Replace * with .* for wildcard matching
  
  const regex = new RegExp(`^${escapedPattern}$`);
  return regex.test(domain);
}

/**
 * Check if an element is editable
 * @param {Element} element - DOM element to check
 * @returns {boolean} - Whether the element is editable
 */
function isEditableElement(element) {
  return element.isContentEditable || 
         element.tagName === 'TEXTAREA' || 
         (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'search'));
}

/**
 * Insert text into a contentEditable element
 * @param {Element} element - contentEditable element
 * @param {string} text - Text to insert
 * @returns {boolean} - Success status
 */
function insertIntoContentEditable(element, text) {
  try {
    // Try the execCommand method first (works in most browsers)
    if (document.execCommand('insertText', false, text)) {
      return true;
    }
    
    // Fallback method for browsers that don't support execCommand
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    range.deleteContents();
    
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    
    // Move cursor to end of inserted text
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    
    return true;
  } catch (error) {
    console.error("Error inserting text:", error);
    return false;
  }
}

/**
 * Insert text into an input or textarea element
 * @param {Element} element - Input element
 * @param {string} text - Text to insert
 * @returns {boolean} - Success status
 */
function insertIntoInputElement(element, text) {
  try {
    const startPos = element.selectionStart || 0;
    const endPos = element.selectionEnd || startPos;
    
    const beforeText = element.value.substring(0, startPos);
    const afterText = element.value.substring(endPos);
    
    element.value = beforeText + text + afterText;
    
    // Set cursor position after inserted text
    element.selectionStart = element.selectionEnd = startPos + text.length;
    
    // Trigger input event to notify the app about the change
    element.dispatchEvent(new Event('input', { bubbles: true }));
    
    return true;
  } catch (error) {
    console.error("Error inserting text:", error);
    return false;
  }
}

/**
 * Find possible editable elements on the page
 * This is a fallback for when we can't directly access the active element
 * @returns {Array} - Array of potential editable elements
 */
function findPossibleEditableElements() {
  // Look for elements that are likely to be input fields
  // Start with the most common ones for AI platforms
  
  // ChatGPT-like textareas
  const textareas = Array.from(document.querySelectorAll('textarea'));
  
  // Common input fields
  const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="search"]'));
  
  // contentEditable divs (used by many modern editors)
  const contentEditables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
  
  // Combine all potential elements with priority order
  return [...contentEditables, ...textareas, ...inputs];
}

// Listen for storage changes to reload selectors when they are updated
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && changes.domainSelectors) {
    loadDomainSelectors();
  }
});