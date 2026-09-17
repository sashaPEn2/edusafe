const fs = require('fs');

// ═════════════════════════════════════════════════════════════
// 1. UNIFIED THEME CSS SYSTEM (LIGHT & DARK MODE)
// ═════════════════════════════════════════════════════════════
const coreThemeCss = `
  :root {
    --ink: #0f172a;
    --ink-soft: #334155;
    --accent: #0057d9;
    --accent-light: #2563eb;
    --accent-pale: #eff6ff;
    --teal: #0284c7;
    --teal-pale: #f0f9ff;
    --mint: #d1fae5;
    --green: #059669;
    --green-pale: #ecfdf5;
    --purple: #7c3aed;
    --purple-pale: #f5f3ff;
    --surface: #ffffff;
    --surface-2: #f8fafc;
    --surface-3: #f1f5f9;
    --border: #e2e8f0;
    --border-subtle: #f1f5f9;
    --text-muted: #64748b;
    --white: #ffffff;
    --hero-bg: #090e1a;
    --banner-bg: #0d1527;
    --footer-bg: #060a12;
    --card-bg: #ffffff;
    --card-border: #e2e8f0;
    --input-bg: #ffffff;
    --input-border: #cbd5e1;
    --shadow-sm: 0 1px 3px rgba(10,15,29,0.06);
    --shadow: 0 4px 16px rgba(10,15,29,0.08);
    --shadow-lg: 0 12px 32px rgba(10,15,29,0.12);
    --radius-sm: 8px;
    --radius: 14px;
    --radius-lg: 20px;
  }

  [data-theme="dark"] {
    --ink: #f8fafc;
    --ink-soft: #cbd5e1;
    --accent: #3b82f6;
    --accent-light: #60a5fa;
    --accent-pale: rgba(59, 130, 246, 0.16);
    --teal: #38bdf8;
    --teal-pale: rgba(56, 189, 248, 0.16);
    --mint: rgba(16, 185, 129, 0.2);
    --green: #34d399;
    --green-pale: rgba(52, 211, 153, 0.16);
    --purple: #a78bfa;
    --purple-pale: rgba(167, 139, 250, 0.16);
    --surface: #111827;
    --surface-2: #0b0f19;
    --surface-3: #1a233a;
    --border: #232f48;
    --border-subtle: #1e293b;
    --text-muted: #94a3b8;
    --white: #ffffff;
    --hero-bg: #070b14;
    --banner-bg: #0f1629;
    --footer-bg: #05080f;
    --card-bg: #131d31;
    --card-border: #23314d;
    --input-bg: #0f1629;
    --input-border: #2a3b5c;
    --shadow-sm: 0 1px 4px rgba(0,0,0,0.4);
    --shadow: 0 4px 20px rgba(0,0,0,0.5);
    --shadow-lg: 0 16px 48px rgba(0,0,0,0.65);
  }

  /* ─── THEME TOGGLE BUTTON ─── */
  .theme-toggle-btn {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--ink);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
  }
  .theme-toggle-btn:hover {
    background: var(--accent-pale);
    color: var(--accent);
    border-color: var(--accent-light);
    transform: rotate(15deg);
  }

  /* Dark mode overrides for cards & elements */
  [data-theme="dark"] .card,
  [data-theme="dark"] .role-card,
  [data-theme="dark"] .article-card,
  [data-theme="dark"] .scenario-card,
  [data-theme="dark"] .quiz-card,
  [data-theme="dark"] .info-card,
  [data-theme="dark"] .contact-strip,
  [data-theme="dark"] .form-wrap,
  [data-theme="dark"] .post-card,
  [data-theme="dark"] .video-card,
  [data-theme="dark"] .modal-box,
  [data-theme="dark"] .modal-content,
  [data-theme="dark"] .docs-card,
  [data-theme="dark"] .feedback-card,
  [data-theme="dark"] .choice-card,
  [data-theme="dark"] .why-item,
  [data-theme="dark"] .sdg-info-box,
  [data-theme="dark"] .bp-card,
  [data-theme="dark"] .q-card,
  [data-theme="dark"] .result-card,
  [data-theme="dark"] .stat-card,
  [data-theme="dark"] .post-body,
  [data-theme="dark"] .post-header,
  [data-theme="dark"] .question-card,
  [data-theme="dark"] .review-item,
  [data-theme="dark"] .mod-card,
  [data-theme="dark"] .glossary-card,
  [data-theme="dark"] .doc-card,
  [data-theme="dark"] .thanks-card {
    background: var(--card-bg) !important;
    border-color: var(--card-border) !important;
    color: var(--ink) !important;
  }

  [data-theme="dark"] .law-ref-box,
  [data-theme="dark"] .sol-box,
  [data-theme="dark"] .example-box,
  [data-theme="dark"] .info-box,
  [data-theme="dark"] .alert-note,
  [data-theme="dark"] .doc-link,
  [data-theme="dark"] .filter-btn,
  [data-theme="dark"] .tab-btn,
  [data-theme="dark"] .audience-tab,
  [data-theme="dark"] .sub-btn,
  [data-theme="dark"] .option-item,
  [data-theme="dark"] .option,
  [data-theme="dark"] .q-opt,
  [data-theme="dark"] .video-embed,
  [data-theme="dark"] .glossary-tag,
  [data-theme="dark"] .alphabet-btn {
    background: #0f1629 !important;
    border-color: #232f48 !important;
    color: var(--ink-soft) !important;
  }

  [data-theme="dark"] .option-item:hover,
  [data-theme="dark"] .option:hover,
  [data-theme="dark"] .q-opt:hover,
  [data-theme="dark"] .filter-btn:hover,
  [data-theme="dark"] .filter-btn.active,
  [data-theme="dark"] .alphabet-btn:hover,
  [data-theme="dark"] .alphabet-btn.active {
    background: rgba(59, 130, 246, 0.18) !important;
    border-color: var(--accent-light) !important;
    color: #93c5fd !important;
  }

  [data-theme="dark"] input,
  [data-theme="dark"] select,
  [data-theme="dark"] textarea {
    background: var(--input-bg) !important;
    border-color: var(--input-border) !important;
    color: var(--ink) !important;
  }

  [data-theme="dark"] .hero {
    background: var(--hero-bg) !important;
  }
  [data-theme="dark"] .why-visual,
  [data-theme="dark"] .cta {
    background: var(--banner-bg) !important;
  }
  [data-theme="dark"] footer {
    background: var(--footer-bg) !important;
    border-color: #1e293b !important;
  }

  [data-theme="dark"] .cpd-card {
    background: linear-gradient(135deg, #111d33 0%, #0d2238 100%) !important;
    border-color: #1d3557 !important;
  }
  [data-theme="dark"] .cpd-text-wrap h3 {
    color: #f8fafc !important;
  }
  [data-theme="dark"] .cpd-label {
    background: rgba(59, 130, 246, 0.2) !important;
    color: #93c5fd !important;
  }

  [data-theme="dark"] .mod-card-1 .mod-icon { background: rgba(59,130,246,0.15) !important; color: #60a5fa !important; }
  [data-theme="dark"] .mod-card-2 .mod-icon { background: rgba(14,165,199,0.15) !important; color: #38bdf8 !important; }
  [data-theme="dark"] .mod-card-3 .mod-icon { background: rgba(139,92,246,0.15) !important; color: #a78bfa !important; }
  [data-theme="dark"] .mod-card-4 .mod-icon { background: rgba(16,185,129,0.15) !important; color: #34d399 !important; }

  /* ─── BREADCRUMB BAR ─── */
  .breadcrumb-bar {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 0.65rem 0;
    font-size: 0.85rem;
    line-height: 1.4;
    position: relative;
    z-index: 50;
  }
  .breadcrumbs {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.45rem 0.6rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .breadcrumb-item {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: var(--text-muted);
  }
  .breadcrumb-item a {
    color: var(--text-muted);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    transition: color 0.15s ease;
    font-weight: 500;
  }
  .breadcrumb-item a:hover {
    color: var(--accent);
  }
  .breadcrumb-item a i {
    font-size: 0.82rem;
  }
  .breadcrumb-separator {
    color: var(--border);
    font-size: 0.65rem;
    display: inline-flex;
    align-items: center;
    user-select: none;
  }
  [data-theme="dark"] .breadcrumb-separator {
    color: #334155;
  }
  .breadcrumb-item.active {
    color: var(--ink);
    font-weight: 600;
  }
  [data-theme="dark"] .breadcrumb-bar {
    background: #0d1424;
    border-color: var(--border);
  }
  [data-theme="dark"] .breadcrumb-item a {
    color: #94a3b8;
  }
  [data-theme="dark"] .breadcrumb-item a:hover {
    color: var(--accent-light);
  }
  [data-theme="dark"] .breadcrumb-item.active {
    color: #f8fafc;
  }
`;

const themeHeadScript = `
  <script>
    (function() {
      // Fix: prevent "Cannot set property fetch of #<Window> which has only a getter"
      try {
        var _fetch = window.fetch;
        if (typeof _fetch === "function") {
          var currentFetch = _fetch;
          var defined = false;
          try {
            Object.defineProperty(window, "fetch", {
              get: function() { return currentFetch; },
              set: function(fn) { currentFetch = fn; },
              configurable: true,
              enumerable: true
            });
            defined = true;
          } catch(e1) {}
          if (!defined) {
            try {
              var proto = Object.getPrototypeOf(window) || Window.prototype;
              if (proto) {
                Object.defineProperty(proto, "fetch", {
                  get: function() { return currentFetch; },
                  set: function(fn) { currentFetch = fn; },
                  configurable: true,
                  enumerable: true
                });
              }
            } catch(e2) {}
          }
        }
      } catch(e) {}

      window.addEventListener("error", function(e) {
        if (e && e.message && e.message.indexOf("fetch") !== -1 && e.message.indexOf("getter") !== -1) {
          if (e.preventDefault) e.preventDefault();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        }
      }, true);

      try {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "dark" || (!savedTheme && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
          document.documentElement.setAttribute("data-theme", "dark");
        } else {
          document.documentElement.setAttribute("data-theme", "light");
        }
      } catch(e) {}
    })();
  </script>`;

console.log('Building all pages with unified styling, dark mode, and Glossary...');
