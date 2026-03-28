/**
 * TRIAGE AI — Results Renderer
 * Renders structured triage responses as beautiful, accessible action cards
 */

const Renderer = {
  /**
   * Render the complete triage result
   * @param {Object} data - Triage response from the server
   */
  render(data) {
    const container = document.getElementById('results-container');
    if (!container) return;

    const triage = data.triage;
    container.innerHTML = '';

    // 1. Severity Header
    container.appendChild(this.renderSeverityHeader(triage));

    // 2. Summary
    if (triage.summary) {
      container.appendChild(this.renderSummary(triage.summary));
    }

    // 3. Emergency Contacts (shown first if critical)
    if (triage.severity === 'critical' && triage.emergency_contacts?.length) {
      container.appendChild(this.renderSection('🚨 Emergency Contacts', ''));
      container.appendChild(this.renderContacts(triage.emergency_contacts));
    }

    // 4. Action Items
    if (triage.actions?.length) {
      container.appendChild(this.renderSection('⚡ Action Plan', 'Prioritized steps to take'));
      container.appendChild(this.renderActions(triage.actions));
    }

    // 5. Key Findings
    if (triage.key_findings?.length) {
      container.appendChild(this.renderSection('🔍 Key Findings', ''));
      container.appendChild(this.renderFindings(triage.key_findings));
    }

    // 6. Warnings
    if (triage.warnings?.length) {
      container.appendChild(this.renderWarnings(triage.warnings));
    }

    // 7. Map (if location relevant)
    if (triage.location_relevant) {
      container.appendChild(this.renderSection('📍 Nearby Services', ''));
      container.appendChild(this.renderMap(triage));
    }

    // 8. Verifications
    if (triage.verifications?.length) {
      container.appendChild(this.renderSection('✅ Verification', 'Cross-checked with Google Search'));
      container.appendChild(this.renderVerifications(triage.verifications));
    }

    // 9. Emergency Contacts (if not critical, show after actions)
    if (triage.severity !== 'critical' && triage.emergency_contacts?.length) {
      container.appendChild(this.renderSection('📞 Emergency Contacts', ''));
      container.appendChild(this.renderContacts(triage.emergency_contacts));
    }

    // 10. Follow Up
    if (triage.follow_up?.length) {
      container.appendChild(this.renderSection('📋 Follow-Up Actions', ''));
      container.appendChild(this.renderFollowUp(triage.follow_up));
    }

    // 11. Metadata
    if (triage.metadata) {
      container.appendChild(this.renderMetadata(triage.metadata));
    }

    container.hidden = false;
  },

  // ── Component Renderers ────────────────────────────────────────

  renderSeverityHeader(triage) {
    const severity = triage.severity || 'normal';
    const icons = { critical: '🚨', urgent: '⚠️', normal: '✅' };
    const labels = { critical: 'CRITICAL', urgent: 'URGENT', normal: 'NORMAL' };

    const el = document.createElement('div');
    el.className = `severity-header severity-header--${severity}`;
    el.setAttribute('role', 'alert');

    // Add source badge if fallback was used
    const sourceBadge = triage.metadata?.source === 'local-fallback' 
      ? `
        <div class="source-badge">
          <span class="source-badge__icon">🧩</span>
          Local Intelligence Assessment
        </div>
      ` : '';

    el.innerHTML = `
      <div class="severity-badge severity-badge--${severity}" aria-hidden="true">
        ${icons[severity]}
      </div>
      <div class="severity-info">
        <h3 class="severity-info__title severity-info__title--${severity}">
          ${labels[severity]}: ${this.escapeHtml(triage.title || 'Assessment Complete')}
        </h3>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span class="severity-info__category">${this.escapeHtml(triage.category || 'general')}</span>
          ${sourceBadge}
        </div>
      </div>
      <div class="severity-info__time">
        <div>${new Date().toLocaleTimeString()}</div>
        <div>${new Date().toLocaleDateString()}</div>
      </div>
    `;
    return el;
  },

  renderSummary(summary) {
    const el = document.createElement('div');
    el.className = 'summary-card';
    el.innerHTML = `<p class="summary-card__text">${this.escapeHtml(summary)}</p>`;
    return el;
  },

  renderSection(title, subtitle) {
    const el = document.createElement('div');
    el.className = 'section-title';
    el.innerHTML = `
      <span>${title}</span>
      ${subtitle ? `<span style="font-weight:400; text-transform:none; letter-spacing:0; color: var(--text-tertiary);">— ${this.escapeHtml(subtitle)}</span>` : ''}
    `;
    return el;
  },

  renderActions(actions) {
    const list = document.createElement('div');
    list.className = 'actions-list';
    list.setAttribute('role', 'list');

    actions.forEach((action, i) => {
      const card = document.createElement('div');
      card.className = 'action-card';
      card.setAttribute('role', 'listitem');
      card.style.animationDelay = `${i * 80}ms`;

      const priorityClass = action.priority <= 4 ? `action-priority--${action.priority}` : 'action-priority--default';

      card.innerHTML = `
        <div class="action-priority ${priorityClass}" 
             role="checkbox" 
             aria-checked="false" 
             aria-label="Mark action ${action.priority} as done"
             tabindex="0"
             title="Click to mark as done">
          ${action.priority}
        </div>
        <div class="action-card__content">
          <div class="action-card__text">${this.escapeHtml(action.action)}</div>
          <div class="action-card__details">${this.escapeHtml(action.details || '')}</div>
          <div class="action-card__meta">
            ${action.timeframe ? `<span class="action-tag action-tag--timeframe">${this.escapeHtml(action.timeframe)}</span>` : ''}
            ${action.type ? `<span class="action-tag action-tag--type">${this.escapeHtml(action.type)}</span>` : ''}
          </div>
        </div>
      `;

      // Toggle completed
      const priorityBtn = card.querySelector('.action-priority');
      priorityBtn.addEventListener('click', () => {
        const isCompleted = card.classList.toggle('completed');
        priorityBtn.setAttribute('aria-checked', isCompleted);
        priorityBtn.innerHTML = isCompleted ? '✓' : action.priority;
        A11y.announce(isCompleted ? `Action ${action.priority} marked as done` : `Action ${action.priority} unmarked`);
      });
      priorityBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          priorityBtn.click();
        }
      });

      list.appendChild(card);
    });

    return list;
  },

  renderContacts(contacts) {
    const grid = document.createElement('div');
    grid.className = 'contacts-grid';

    contacts.forEach((contact) => {
      const card = document.createElement('div');
      card.className = 'contact-card';
      card.innerHTML = `
        <div class="contact-card__name">${this.escapeHtml(contact.name)}</div>
        <div class="contact-card__number">
          <a href="tel:${this.escapeHtml(contact.number)}" aria-label="Call ${this.escapeHtml(contact.name)} at ${this.escapeHtml(contact.number)}">
            ${this.escapeHtml(contact.number)}
          </a>
        </div>
        <div class="contact-card__relevance">${this.escapeHtml(contact.relevance || '')}</div>
      `;
      grid.appendChild(card);
    });

    return grid;
  },

  renderFindings(findings) {
    const list = document.createElement('div');
    list.className = 'findings-list';

    findings.forEach((finding) => {
      const item = document.createElement('div');
      item.className = 'finding-item';
      item.innerHTML = `
        <span class="finding-confidence finding-confidence--${finding.confidence || 'medium'}">
          ${this.escapeHtml(finding.confidence || 'medium')}
        </span>
        <div>
          <div class="finding-text">${this.escapeHtml(finding.finding)}</div>
          ${finding.source ? `<div class="finding-source">Source: ${this.escapeHtml(finding.source)}</div>` : ''}
        </div>
      `;
      list.appendChild(item);
    });

    return list;
  },

  renderWarnings(warnings) {
    const list = document.createElement('div');
    list.className = 'warnings-list';
    list.setAttribute('role', 'alert');

    warnings.forEach((warning) => {
      const item = document.createElement('div');
      item.className = 'warning-item';
      item.innerHTML = `
        <span class="warning-item__icon" aria-hidden="true">⚠️</span>
        <span>${this.escapeHtml(warning)}</span>
      `;
      list.appendChild(item);
    });

    return list;
  },

  renderMap(triage) {
    const container = document.createElement('div');
    container.className = 'map-container';
    container.id = 'map-display';

    // Use MapService to render
    setTimeout(() => {
      MapService.renderMap(container, triage);
    }, 100);

    return container;
  },

  renderVerifications(verifications) {
    const list = document.createElement('div');
    list.className = 'verifications-list';

    verifications.forEach((v) => {
      const item = document.createElement('div');
      item.className = 'verification-item';

      const statusLabel = v.verified === true ? 'Verified' :
                          v.verified === false ? 'Unverified' :
                          v.verified === 'partially' ? 'Partially Verified' : 'Unknown';

      item.innerHTML = `
        <div class="verification-header">
          <span class="verification-status verification-status--${v.verified}">
            ${this.escapeHtml(statusLabel)}
          </span>
          <span class="verification-claim">${this.escapeHtml(v.claim || '')}</span>
        </div>
        <div class="verification-summary">${this.escapeHtml(v.summary || '')}</div>
        ${v.confidence ? `<div class="verification-confidence">Confidence: ${(v.confidence * 100).toFixed(0)}%</div>` : ''}
      `;
      list.appendChild(item);
    });

    return list;
  },

  renderFollowUp(followUp) {
    const list = document.createElement('div');
    list.className = 'followup-list';

    followUp.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'followup-item';
      el.textContent = item;
      list.appendChild(el);
    });

    return list;
  },

  renderMetadata(metadata) {
    const el = document.createElement('div');
    el.className = 'metadata-bar';
    el.innerHTML = `
      <div class="metadata-item">
        <strong>Pipeline:</strong> ${(metadata.pipeline || []).join(' → ')}
      </div>
      <div class="metadata-item">
        <strong>Processing:</strong> ${metadata.processingTimeMs || 0}ms
      </div>
      <div class="metadata-item">
        <strong>Input:</strong> ${this.escapeHtml(metadata.inputType || 'text')}
      </div>
      <div class="metadata-item">
        <strong>Assessed By:</strong> ${this.escapeHtml(metadata.source === 'local-fallback' ? 'Local Intelligence' : 'Gemini 2.0 Flash')}
      </div>
      ${metadata.classification ? `
        <div class="metadata-item">
          <strong>Category:</strong> ${this.escapeHtml(metadata.classification.likelyCategory || 'general')}
        </div>
      ` : ''}
    `;
    return el;
  },

  // ── Utilities ──────────────────────────────────────────────────

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};
