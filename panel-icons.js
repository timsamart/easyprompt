// Initialize Feather icons when page loads
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  }, 200);
});

// Function to reinitialize icons after dynamic content changes
function initializeIcons() {
  if (typeof feather !== 'undefined') {
    feather.replace();
  }
} 