// Main JavaScript file for static router demo

class StaticRouterDemo {
  constructor() {
    this.init();
  }

  init() {
    console.log('🚀 Static Router Demo initialized');
    this.setupEventListeners();
    this.loadDynamicContent();
  }

  setupEventListeners() {
    // Add click handlers for demo buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn')) {
        this.handleButtonClick(e.target);
      }
    });

    // Add form submission handler
    const form = document.getElementById('demo-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit(e.target);
      });
    }
  }

  handleButtonClick(button) {
    const action = button.dataset.action;
    console.log(`🔘 Button clicked: ${action}`);

    switch (action) {
      case 'load-css':
        this.loadCSS();
        break;
      case 'load-js':
        this.loadJavaScript();
        break;
      case 'load-images':
        this.loadImages();
        break;
      case 'clear-cache':
        this.clearCache();
        break;
      default:
        console.log('Unknown action:', action);
    }
  }

  handleFormSubmit(form) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    console.log('📝 Form submitted:', data);
    
    // Show success message
    this.showMessage('Form submitted successfully!', 'success');
  }

  loadCSS() {
    console.log('🎨 Loading CSS files...');
    this.showMessage('CSS files loaded from static router', 'info');
  }

  loadJavaScript() {
    console.log('⚡ Loading JavaScript files...');
    this.showMessage('JavaScript files loaded from static router', 'info');
  }

  loadImages() {
    console.log('🖼️ Loading images...');
    this.showMessage('Images loaded from static router', 'info');
  }

  clearCache() {
    console.log('🧹 Clearing cache...');
    this.showMessage('Cache cleared successfully', 'success');
  }

  loadDynamicContent() {
    // Simulate loading content from static files
    setTimeout(() => {
      this.showMessage('Static files loaded successfully!', 'success');
    }, 1000);
  }

  showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new StaticRouterDemo();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StaticRouterDemo;
}
