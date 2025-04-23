/**
 * Content script for PromptHub
 * Handles text insertion at cursor position
 */

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "insertText") {
      const success = insertTextAtCursor(request.text);
      sendResponse({ success });
    }
    return true; // Keep the message channel open for async response
  });
  
  /**
   * Insert text at the current cursor position
   * @param {string} text - Text to insert
   * @returns {boolean} - Success status
   */
  function insertTextAtCursor(text) {
    // Get the active element (where cursor is)
    const activeElement = document.activeElement;
    
    if (activeElement && (isEditableElement(activeElement))) {
      // Handle different types of editable elements
      if (activeElement.isContentEditable) {
        return insertIntoContentEditable(activeElement, text);
      } else if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
        return insertIntoInputElement(activeElement, text);
      }
    }
    
    // If we couldn't insert directly, try to find the most likely element
    const possibleElements = findPossibleEditableElements();
    for (const element of possibleElements) {
      if (isEditableElement(element)) {
        element.focus();
        
        if (element.isContentEditable) {
          return insertIntoContentEditable(element, text);
        } else if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
          return insertIntoInputElement(element, text);
        }
      }
    }
    
    return false;
  }
  
  /**
   * Check if an element is editable
   * @param {Element} element - DOM element to check
   * @returns {boolean} - Whether the element is editable
   */
  function isEditableElement(element) {
    return element.isContentEditable || 
           element.tagName === 'TEXTAREA' || 
           (element.tagName === 'INPUT' && element.type === 'text');
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
    const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
    
    // contentEditable divs (used by many modern editors)
    const contentEditables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
    
    // Combine all potential elements with priority order
    return [...contentEditables, ...textareas, ...inputs];
  }