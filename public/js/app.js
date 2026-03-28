/**
 * TRIAGE AI — Main Application
 * Orchestrates input handling, API communication, and results rendering
 */

const App = {
  history: [],
  isProcessing: false,

  /** Initialize the application */
  init() {
    InputHandler.init();
    this.setupSubmit();
    this.setupScenarios();
    this.setupHistory();
    this.loadHistory();

    // Request location permission early
    this.requestLocation();

    console.log(
      '%c🚨 TRIAGE AI %c— From Chaos to Clarity, Instantly',
      'color: #8b5cf6; font-size: 20px; font-weight: bold;',
      'color: #a1a1b5; font-size: 14px;'
    );
  },

  /** Setup submit button */
  setupSubmit() {
    const btnSubmit = document.getElementById('btn-submit');
    if (!btnSubmit) return;

    btnSubmit.addEventListener('click', () => this.handleSubmit());
  },

  /** Setup scenario buttons */
  setupScenarios() {
    document.querySelectorAll('.btn--scenario').forEach((btn) => {
      btn.addEventListener('click', () => {
        const scenario = btn.dataset.scenario;
        InputHandler.setText(scenario);
        // Auto-submit the scenario
        setTimeout(() => this.handleSubmit(), 300);
      });
    });
  },

  /** Setup history sidebar */
  setupHistory() {
    const btnHistory = document.getElementById('btn-history');
    const btnClose = document.getElementById('btn-close-sidebar');
    const sidebar = document.getElementById('sidebar');

    btnHistory?.addEventListener('click', () => {
      if (sidebar) sidebar.hidden = !sidebar.hidden;
    });

    btnClose?.addEventListener('click', () => {
      if (sidebar) sidebar.hidden = true;
    });
  },

  /** Request user location */
  async requestLocation() {
    try {
      this.userLocation = await MapService.getCurrentLocation();
    } catch {
      this.userLocation = null;
    }
  },

  /** Handle form submission */
  async handleSubmit() {
    if (this.isProcessing) return;

    const input = InputHandler.getInput();

    if (!input.text && !input.image) {
      this.showToast('Please provide some input — text, voice, image, or file.', 'error');
      document.getElementById('main-input')?.focus();
      return;
    }

    this.isProcessing = true;
    this.showLoading();

    const btnSubmit = document.getElementById('btn-submit');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.querySelector('span').textContent = 'Processing...';
    }

    A11y.announce('Processing your input through the triage pipeline. Please wait.');

    try {
      const payload = {
        text: input.text,
        image: input.image,
        inputType: input.inputType,
        location: this.userLocation,
      };

      // Use streaming endpoint for live pipeline updates
      await ApiClient.triageStream(
        payload,
        (stageData) => this.updatePipelineStage(stageData),
        (result) => this.handleResult(result, input),
        (error) => this.handleError(error)
      );
    } catch (error) {
      this.handleError(error);
    }
  },

  /** Show loading state */
  showLoading() {
    const results = document.getElementById('results');
    const loading = document.getElementById('loading');
    const container = document.getElementById('results-container');

    if (results) results.hidden = false;
    if (loading) loading.hidden = false;
    if (container) container.hidden = true;

    // Animate pipeline stages
    const stages = document.querySelectorAll('.loading__stage');
    const connectors = document.querySelectorAll('.loading__connector');

    stages.forEach((s) => {
      s.classList.remove('active', 'done');
    });
    connectors.forEach((c) => c.classList.remove('done'));

    // Simulate pipeline progression
    const stageNames = ['classifying', 'enriching', 'structuring', 'verifying'];
    stageNames.forEach((name, i) => {
      setTimeout(() => {
        const stage = document.querySelector(`.loading__stage[data-stage="${name}"]`);
        if (stage) {
          // Mark previous as done
          if (i > 0) {
            const prev = document.querySelector(`.loading__stage[data-stage="${stageNames[i - 1]}"]`);
            prev?.classList.remove('active');
            prev?.classList.add('done');
            if (connectors[i - 1]) connectors[i - 1].classList.add('done');
          }
          stage.classList.add('active');
        }
      }, i * 800);
    });

    // Scroll to results
    results?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  /** Update pipeline stage from SSE */
  updatePipelineStage(data) {
    const stage = document.querySelector(`.loading__stage[data-stage="${data.stage}"]`);
    if (stage) {
      stage.classList.add('active');
    }
  },

  /** Handle successful result */
  handleResult(data, input) {
    const loading = document.getElementById('loading');
    const container = document.getElementById('results-container');

    // Mark last stage as done
    document.querySelectorAll('.loading__stage').forEach((s) => {
      s.classList.remove('active');
      s.classList.add('done');
    });
    document.querySelectorAll('.loading__connector').forEach((c) => {
      c.classList.add('done');
    });

    // Small delay for visual effect
    setTimeout(() => {
      if (loading) loading.hidden = true;

      // Render results
      Renderer.render(data);

      // Reset submit button
      this.resetSubmit();

      // Save to history
      this.saveToHistory(input, data);

      // Announce severity to screen reader
      const severity = data.triage?.severity || 'normal';
      const title = data.triage?.title || 'Assessment complete';
      A11y.announce(`Triage complete. Severity: ${severity}. ${title}`, 'assertive');

      // Scroll to results
      container?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 500);
  },

  /** Handle errors */
  handleError(error) {
    console.error('Triage error:', error);

    const loading = document.getElementById('loading');
    if (loading) loading.hidden = true;

    this.resetSubmit();
    this.showToast(error.message || 'Something went wrong. Please try again.', 'error');
    A11y.announce('Error occurred during processing. Please try again.', 'assertive');
  },

  /** Reset submit button */
  resetSubmit() {
    this.isProcessing = false;
    const btnSubmit = document.getElementById('btn-submit');
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.querySelector('span').textContent = 'Triage';
    }
  },

  /** Save to history */
  saveToHistory(input, data) {
    const entry = {
      id: Date.now(),
      text: input.text?.substring(0, 100) || '(Image input)',
      severity: data.triage?.severity || 'normal',
      title: data.triage?.title || 'Assessment',
      timestamp: new Date().toISOString(),
      data: data,
    };

    this.history.unshift(entry);
    if (this.history.length > 20) this.history.pop();

    try {
      localStorage.setItem('triage-history', JSON.stringify(this.history));
    } catch {
      // localStorage may be full
    }

    this.renderHistory();
  },

  /** Load history from localStorage */
  loadHistory() {
    try {
      const stored = localStorage.getItem('triage-history');
      if (stored) {
        this.history = JSON.parse(stored);
        this.renderHistory();
      }
    } catch {
      this.history = [];
    }
  },

  /** Render history list */
  renderHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;

    list.innerHTML = '';

    if (this.history.length === 0) {
      list.innerHTML = '<p style="text-align:center; color: var(--text-tertiary); padding: 2rem;">No history yet</p>';
      return;
    }

    this.history.forEach((entry) => {
      const severityColors = {
        critical: 'var(--severity-critical)',
        urgent: 'var(--severity-urgent)',
        normal: 'var(--severity-normal)',
      };

      const item = document.createElement('div');
      item.className = 'history-item';
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.innerHTML = `
        <div class="history-item__title">
          <span class="history-item__severity" style="background: ${severityColors[entry.severity] || severityColors.normal}"></span>
          ${Renderer.escapeHtml(entry.title)}
        </div>
        <div class="history-item__time">${new Date(entry.timestamp).toLocaleString()}</div>
      `;

      item.addEventListener('click', () => {
        Renderer.render(entry.data);
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.hidden = true;
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
      });

      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          item.click();
        }
      });

      list.appendChild(item);
    });
  },

  /** Show toast notification */
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  },
};

// ── Start the app when DOM is ready ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
