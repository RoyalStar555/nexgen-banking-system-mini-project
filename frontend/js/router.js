/**
 * Hash-based SPA Router for NexGen Banking
 * Manages view mounting, unmounting, URL synchronization, and sidebar active indicators.
 */
export class Router {
  constructor(outletElementId = 'app-content') {
    this.outlet = document.getElementById(outletElementId);
    this.routes = new Map();
    this.currentView = null;
    this.currentHash = null;

    window.addEventListener('hashchange', () => {
      this.navigate(window.location.hash);
    });
  }

  /**
   * Register a route and its view instance
   * @param {string} path e.g. '#/dashboard'
   * @param {object} viewInstance { mount: function, unmount: function }
   */
  register(path, viewInstance) {
    this.routes.set(path, viewInstance);
    return this;
  }

  /**
   * Navigate to a specific route hash
   */
  async navigate(hash) {
    const targetHash = (hash && this.routes.has(hash)) ? hash : '#/dashboard';
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
      // hashchange event will trigger navigate again
      return;
    }

    if (!this.outlet) {
      this.outlet = document.getElementById('app-content');
    }

    const nextView = this.routes.get(targetHash);
    if (!nextView) return;

    // Unmount active view
    if (this.currentView && typeof this.currentView.unmount === 'function') {
      try {
        this.currentView.unmount();
      } catch (err) {
        console.error('Error unmounting view:', err);
      }
    }

    // Clean outlet without innerHTML
    while (this.outlet && this.outlet.firstChild) {
      this.outlet.removeChild(this.outlet.firstChild);
    }

    this.currentHash = targetHash;
    this.currentView = nextView;

    // Update active nav indicators in sidebar
    this._updateActiveNav(targetHash);

    // Close mobile sidebar if open
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
    }
    if (backdrop && backdrop.classList.contains('active')) {
      backdrop.classList.remove('active');
    }

    // Mount next view
    if (this.outlet && typeof nextView.mount === 'function') {
      try {
        await nextView.mount(this.outlet);
      } catch (err) {
        console.error('Error mounting view:', err);
      }
    }
  }

  /**
   * Update active nav class on sidebar links
   */
  _updateActiveNav(hash) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach((link) => {
      const route = link.getAttribute('data-route') || link.getAttribute('href');
      if (route === hash) {
        link.classList.add('active');
        link.classList.add('nav-link-active');
      } else {
        link.classList.remove('active');
        link.classList.remove('nav-link-active');
      }
    });
  }

  /**
   * Initialize and trigger initial route
   */
  init() {
    const initialHash = window.location.hash || '#/dashboard';
    this.navigate(initialHash);
  }
}

export const router = new Router('app-content');
