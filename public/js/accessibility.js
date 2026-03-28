/**
 * TRIAGE AI — Accessibility Utilities
 * WCAG 2.1 AA compliant accessibility features
 */

const A11y = {
  /** Initialize accessibility features */
  init() {
    this.setupKeyboardNav();
    this.setupHighContrast();
    this.setupReducedMotion();
    this.setupFocusTrap();
  },

  /** Announce to screen readers via aria-live region */
  announce(message, priority = 'polite') {
    const announcer = document.getElementById('sr-announcer');
    if (announcer) {
      announcer.setAttribute('aria-live', priority);
      announcer.textContent = '';
      // Small delay ensures screen readers pick up the change
      setTimeout(() => {
        announcer.textContent = message;
      }, 50);
    }
  },

  /** Setup keyboard navigation */
  setupKeyboardNav() {
    document.addEventListener('keydown', (e) => {
      // Escape closes modals/sidebar
      if (e.key === 'Escape') {
        const cameraModal = document.getElementById('camera-modal');
        if (cameraModal && !cameraModal.hidden) {
          document.getElementById('btn-close-camera')?.click();
          return;
        }
        const sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar.hidden) {
          document.getElementById('btn-close-sidebar')?.click();
          return;
        }
      }

      // Ctrl/Cmd + Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('btn-submit')?.click();
      }

      // Ctrl/Cmd + K to focus input
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('main-input')?.focus();
      }
    });
  },

  /** Toggle high contrast mode */
  setupHighContrast() {
    const btn = document.getElementById('btn-a11y');
    if (!btn) return;

    // Check stored preference
    const stored = localStorage.getItem('triage-high-contrast');
    if (stored === 'true') {
      document.body.classList.add('high-contrast');
    }

    btn.addEventListener('click', () => {
      document.body.classList.toggle('high-contrast');
      const isHC = document.body.classList.contains('high-contrast');
      localStorage.setItem('triage-high-contrast', isHC);
      this.announce(isHC ? 'High contrast mode enabled' : 'High contrast mode disabled');
    });
  },

  /** Respect prefers-reduced-motion */
  setupReducedMotion() {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      document.body.classList.add('reduced-motion');
    }
    mq.addEventListener('change', (e) => {
      document.body.classList.toggle('reduced-motion', e.matches);
    });
  },

  /** Focus trap for modals */
  setupFocusTrap() {
    this._trapElements = [];
  },

  trapFocus(container) {
    const focusable = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handler = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handler);
    first.focus();

    return () => container.removeEventListener('keydown', handler);
  },

  /** Manage focus after dynamic content updates */
  focusElement(selector) {
    const el = document.querySelector(selector);
    if (el) {
      el.setAttribute('tabindex', '-1');
      el.focus();
    }
  }
};

// Initialize on load
A11y.init();
