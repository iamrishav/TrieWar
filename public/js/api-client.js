/**
 * TRIAGE AI — API Client
 * Handles communication with the backend server
 */

const ApiClient = {
  BASE_URL: '',

  /**
   * Send input to the triage endpoint
   * @param {Object} payload - { text, image, inputType, location }
   * @returns {Object} Triage response
   */
  async triage(payload) {
    try {
      const response = await fetch(`${this.BASE_URL}/api/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Server error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please ensure the server is running.');
      }
      throw error;
    }
  },

  /**
   * Stream triage results via SSE
   * @param {Object} payload - { text, image, inputType, location }
   * @param {Function} onStage - Callback for each pipeline stage
   * @param {Function} onComplete - Callback when complete
   * @param {Function} onError - Error callback
   */
  async triageStream(payload, onStage, onComplete, onError) {
    try {
      const response = await fetch(`${this.BASE_URL}/api/triage/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.stage === 'complete') {
                onComplete(data.result);
              } else if (data.stage === 'error') {
                onError(new Error(data.error));
              } else {
                onStage(data);
              }
            } catch {
              // Skip malformed data
            }
          }
        }
      }
    } catch (error) {
      onError(error);
    }
  },

  /**
   * Check server health
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.BASE_URL}/api/health`);
      return await response.json();
    } catch {
      return { status: 'unavailable' };
    }
  }
};
