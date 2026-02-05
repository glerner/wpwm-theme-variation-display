/* WPWM Theme Variation Display (colors + fonts) */
function wpwmThemeVariationDisplay() {
  console.log('WPWM-TVD: Script loaded', new Date().toISOString());

  const cfg = (window.__WPWM_TVD__) || {};
  const apiBase = cfg.pluginRestBase;

  console.log('WPWM-TVD: Config', cfg);

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  // WordPress Data Store identifiers
  // See: https://developer.wordpress.org/block-editor/reference-guides/data/
  const WP_STORE_CORE = 'core';                      // Core entities (posts, users, settings, global styles)
  const WP_STORE_EDIT_SITE = 'core/edit-site';       // Site Editor state and actions
  const WP_STORE_NOTICES = 'core/notices';           // Admin notices and snackbars

  // WordPress Entity types (used with getEditedEntityRecord, saveEditedEntityRecord)
  const WP_ENTITY_KIND_ROOT = 'root';
  const WP_ENTITY_NAME_GLOBAL_STYLES = 'globalStyles';

  // Plugin REST API endpoints (relative to wp-json/)
  const API_NAMESPACE = 'wpwm-tvd/v1';
  const API_ENDPOINT_VARIATIONS = 'variations';
  const API_ENDPOINT_CURRENT = 'current';
  const API_ENDPOINT_APPLY = 'apply';
  const API_ENDPOINT_LOG_ERROR = 'log-error';

  // DOM element IDs
  const DOM_ID_PANEL = 'wpwm-tvd-panel';
  const DOM_ID_ROOT = 'wpwm-tvd-root';

  // CSS class names (BEM-style)
  const CSS_CLASS_GRID = 'wpwm-tvd-grid';
  const CSS_CLASS_HEADER = 'wpwm-tvd-header';
  const CSS_CLASS_NOTE = 'wpwm-tvd-note';
  const CSS_CLASS_CARD = 'wpwm-tvd-card';
  const CSS_CLASS_VAR_PREFIX = 'wpwm-tvd-var--';
  const CSS_CLASS_MEDIA = 'wpwm-tvd-media';
  const CSS_CLASS_BODY = 'wpwm-tvd-body';
  const CSS_CLASS_TITLE = 'wpwm-tvd-title';
  const CSS_CLASS_CURRENT_BADGE = 'wpwm-tvd-current-badge';
  const CSS_CLASS_SWATCH = 'wpwm-tvd-swatch';
  const CSS_CLASS_SWATCH_LABEL = 'wpwm-tvd-swatch-label';
  const CSS_CLASS_SWATCHES = 'wpwm-tvd-swatches';
  const CSS_CLASS_FONTS = 'wpwm-tvd-fonts';
  const CSS_CLASS_FONTS_LABEL = 'wpwm-tvd-fonts-label';
  const CSS_CLASS_ACTIONS = 'wpwm-tvd-actions';
  const CSS_CLASS_MODAL_OVERLAY = 'wpwm-tvd-modal-overlay';
  const CSS_CLASS_MODAL = 'wpwm-tvd-modal';
  const CSS_CLASS_MODAL_HEADER = 'wpwm-tvd-modal-header';
  const CSS_CLASS_MODAL_TITLE = 'wpwm-tvd-modal-title';
  const CSS_CLASS_MODAL_CONTROLS = 'wpwm-tvd-modal-controls';
  const CSS_CLASS_THEME_TOGGLE = 'wpwm-tvd-theme-toggle';
  const CSS_CLASS_MODAL_CLOSE = 'wpwm-tvd-modal-close';
  const CSS_CLASS_PREVIEW_CONTENT = 'wpwm-tvd-preview-content';
  const CSS_CLASS_MODAL_NAV = 'wpwm-tvd-modal-nav';
  const CSS_CLASS_NAV_BTN = 'wpwm-tvd-nav-btn';
  const CSS_CLASS_COUNTER = 'wpwm-tvd-counter';

  // Site Editor CSS selectors (for detecting styles screen)
  const SITE_EDITOR_SELECTORS = [
    '.edit-site-style-variations',
    '.edit-site-style-variations__list',
    '.edit-site-sidebar__panel-tabs',
    '.edit-site-global-styles-sidebar',
    '.interface-complementary-area'
  ].join(', ');

  // Timing and limits
  const MAX_FONT_SAMPLES = 2;
  const SITE_EDITOR_MAX_ATTEMPTS = 100;  // ~10 seconds at 100ms intervals

  // Default colors
  const DEFAULT_WHITE_RGB = [255, 255, 255];
  const DEFAULT_BLACK_RGB = [0, 0, 0];
  const DEFAULT_LIGHT_TEXT = '#000';
  const DEFAULT_DARK_TEXT = '#fff';

  // Fallback colors for preview (when variation doesn't define them)
  const FALLBACK_COLORS = {
    primaryLight: '#7ad1ff',
    primaryDark: '#004f78',
    primaryLighter: '#b1e4ff',
    primaryDarker: '#003c5c',
    secondaryLight: '#fcbc41',
    secondaryDark: '#664402',
    secondaryLighter: '#fdd891',
    secondaryDarker: '#4e3401',
    tertiaryLight: '#fff9c4',
    tertiaryDark: '#f57f17',
    accentLight: '#ff7a45',
    accentDark: '#d84315',
    accentDarker: '#bf360c',
    errorLight: '#fecaca',
    errorDark: '#991b1b',
    noticeLight: '#fde68a',
    noticeDark: '#92400e',
    successLight: '#a7f3d0',
    successDark: '#065f46',
    bgLight: '#ffffff',
    bgDark: '#1a1a1a',
    textLight: '#1a1a1a',
    textDark: '#e0e0e0'
  };

  // Font stacks (fallback chains)
  const FONT_STACK_SANS = ' , "Noto Sans", "Liberation Sans", Roboto, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, "Segoe UI", sans-serif';
  const FONT_STACK_SERIF = 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';
  const FONT_STACK_MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

  // UI text
  const UI_TEXT = {
    noteText: 'Shows colors whether they are stored as color numbers or CSS variables. Shows fonts (if any) that are defined.',
    fontsLabel: 'Fonts:',
    selectBtn: 'Select',
    previewBtn: 'Preview',
    prevBtn: '← Previous',
    nextBtn: 'Next →',
    lightMode: '☀️ Light',
    darkMode: '🌙 Dark',
    closeBtn: '✕',
    currentBadge: ' (Current)'
  };

  // Notice types
  const NOTICE_TYPE_SNACKBAR = 'snackbar';

  // Global state
  let allVariations = [];
  let currentVariationSlug = null;

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Safely access deeply nested properties in an object.
   * Returns the value at the path, or defaultValue if any part is missing.
   * @param {Object} obj - The object to traverse
   * @param {string[]} keys - Array of property names to follow
   * @param {*} defaultValue - Value to return if path doesn't exist (default: undefined)
   * @returns {*} The value at the path or defaultValue
   */
  function getConfigPath(obj, keys, defaultValue) {
    let current = obj;
    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[key];
    }
    return current !== undefined ? current : defaultValue;
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  // --- Color helpers for reliable contrast decisions ---
  function parseRgbString(s) {
    const m = (s || '').match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/i);
    if (!m) return null;
    const r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10);
    const a = typeof m[4] !== 'undefined' ? Math.max(0, Math.min(1, parseFloat(m[4]))) : 1;
    return [r, g, b, a];
  }
  function rgbToLuminance([r, g, b]) {
    const [sr, sg, sb] = [r / 255, g / 255, b / 255];
    const lin = [sr, sg, sb].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  }
  function contrastRatioRGB(a, b) {
    const La = rgbToLuminance(a);
    const Lb = rgbToLuminance(b);
    const bright = Math.max(La, Lb);
    const dark = Math.min(La, Lb);
    return (bright + 0.05) / (dark + 0.05);
  }
  function oklchToRgb(oklchStr) {
    const match = oklchStr.match(/oklch\(\s*([0-9.]+)[,\s]+([0-9.]+)[,\s]+([0-9.]+)\s*\)/);
    if (!match) return null;
    const L = parseFloat(match[1]);
    const C = parseFloat(match[2]);
    const H = parseFloat(match[3]);
    const hRad = (H * Math.PI) / 180;
    const a = C * Math.cos(hRad);
    const b = C * Math.sin(hRad);
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;
    let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    let bVal = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
    const gammaCorrect = (val) => val <= 0.0031308 ? 12.92 * val : 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
    r = gammaCorrect(r);
    g = gammaCorrect(g);
    bVal = gammaCorrect(bVal);
    return [
      Math.max(0, Math.min(255, Math.round(r * 255))),
      Math.max(0, Math.min(255, Math.round(g * 255))),
      Math.max(0, Math.min(255, Math.round(bVal * 255)))
    ];
  }
  function colorStringToRgb(colorStr) {
    const colorString = (colorStr || '').trim();
    if (colorString.startsWith('oklch(')) {
      const rgb = oklchToRgb(colorString);
      return rgb || DEFAULT_BLACK_RGB;
    }
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorString)) {
      const hex = colorString.length === 4
        ? '#' + colorString[1] + colorString[1] + colorString[2] + colorString[2] + colorString[3] + colorString[3]
        : colorString;
      const n = parseInt(hex.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const tmp = document.createElement('div');
    tmp.style.color = colorString;
    document.body.appendChild(tmp);
    const rgb = getComputedStyle(tmp).color;
    tmp.remove();
    const parsed = parseRgbString(rgb);
    return parsed ? parsed.slice(0, 3) : DEFAULT_BLACK_RGB;
  }

  function compositeRGBAoverRGB(fgRGBA, bgRGB) {
    const [fr, fg, fb, fa = 1] = fgRGBA;
    const [br, bgGreen, bb] = bgRGB;
    const a = fa;
    const outR = Math.round(fr * a + br * (1 - a));
    const outG = Math.round(fg * a + bgGreen * (1 - a));
    const outB = Math.round(fb * a + bb * (1 - a));
    return [outR, outG, outB];
  }

  function whenStylesScreenReady(cb) {
    console.log('WPWM-TVD: Waiting for Site Editor styles screen...');
    const { subscribe } = wp.data;
    let attempts = 0;

    const unsub = subscribe(() => {
      attempts++;

      // Try multiple possible selectors for different WordPress versions
      const host = document.querySelector(SITE_EDITOR_SELECTORS);

      if (host) {
        console.log('WPWM-TVD: Site Editor styles screen found!', host.className);
        unsub();
        cb(host);
      } else if (attempts >= SITE_EDITOR_MAX_ATTEMPTS) {
        console.log('WPWM-TVD: Site Editor styles screen not found after', attempts, 'attempts');
        unsub();
      }
    });
  }

  function buildApiPath(endpoint) {
    let relBase = API_NAMESPACE;
    try {
      const u = new URL(apiBase, window.location.origin);
      relBase = u.pathname.replace(/^\/?/, '').replace(/^.*?wp-json\//, '');
    } catch (_e) { /* fallback to default relBase */ }
    return relBase.replace(/\/?$/, '') + '/' + endpoint;
  }

  async function fetchVariations() {
    try {
      const path = buildApiPath(API_ENDPOINT_VARIATIONS);
      const res = await window.wp.apiFetch({ path });
      return res.variations || [];
    } catch (e) { console.error('WPWM-TVD fetch error', e); return []; }
  }

  async function getCurrentVariation() {
    try {
      // Try Site Editor API first (only available in Site Editor context)
      if (window.wp && window.wp.data && window.wp.data.select) {
        const coreSel = window.wp.data.select(WP_STORE_CORE);
        if (coreSel && coreSel.getEditedEntityRecord) {
          const currentGlobalStylesId = coreSel.__experimentalGetCurrentGlobalStylesId
            ? coreSel.__experimentalGetCurrentGlobalStylesId()
            : null;
          if (currentGlobalStylesId) {
            const globalStyles = coreSel.getEditedEntityRecord(WP_ENTITY_KIND_ROOT, WP_ENTITY_NAME_GLOBAL_STYLES, currentGlobalStylesId);
            if (globalStyles && globalStyles.title) {
              // Try to match title to a variation slug
              const matchedVar = allVariations.find(v =>
                normalizeSlug(v.title) === normalizeSlug(globalStyles.title) ||
                normalizeSlug(v.slug) === normalizeSlug(globalStyles.title)
              );
              return matchedVar ? normalizeSlug(matchedVar.slug || matchedVar.title) : null;
            }
          }
        }
      }
    } catch (e) {
      console.log('WPWM-TVD: Site Editor API not available for current variation detection');
    }

    // Fallback: Use REST API (works in admin context)
    try {
      const path = buildApiPath(API_ENDPOINT_CURRENT);
      const response = await window.wp.apiFetch({ path });
      console.log('WPWM-TVD: Current variation from REST API:', response);
      return response.current;
    } catch (e) {
      console.log('WPWM-TVD: Could not detect current variation via REST API', e);
    }
    return null;
  }

  function createPanelStructure() {
    const panel = el('div', '', '');
    panel.id = DOM_ID_PANEL;
    const header = el('div', CSS_CLASS_HEADER);
    if (UI_TEXT.noteText) {
      const note = el('div', CSS_CLASS_NOTE, UI_TEXT.noteText);
      header.appendChild(note);
    }
    if (header.childNodes.length) {
      panel.appendChild(header);
    }
    const grid = el('div', CSS_CLASS_GRID);
    panel.appendChild(grid);
    return panel;
  }

  function mountPanel(afterEl) {
    let panel = document.getElementById(DOM_ID_PANEL);
    if (!panel) {
      panel = createPanelStructure();
      afterEl.parentElement.insertBefore(panel, afterEl.nextSibling);
    }
    return panel.querySelector('.' + CSS_CLASS_GRID);
  }

  function mountPanelInContainer(container) {
    let panel = document.getElementById(DOM_ID_PANEL);
    if (!panel) {
      panel = createPanelStructure();
      container.appendChild(panel);
    }
    return panel.querySelector('.' + CSS_CLASS_GRID);
  }

  function normalizeSlug(slugString) {
    return (slugString || '').toString().toLowerCase().trim().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function expandFontStack(fontFamily) {
    const raw = (fontFamily || '').toString().trim();
    if (!raw) return raw;
    const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
    if (!parts.length) return raw;

    const last = parts[parts.length - 1].replace(/^['"]|['"]$/g, '').toLowerCase();
    if (last === 'sans-serif') {
      parts.pop();
      return (parts.length ? parts.join(', ') + ', ' : '') + FONT_STACK_SANS;
    }
    if (last === 'serif') {
      parts.pop();
      return (parts.length ? parts.join(', ') + ', ' : '') + FONT_STACK_SERIF;
    }
    if (last === 'monospace') {
      parts.pop();
      return (parts.length ? parts.join(', ') + ', ' : '') + FONT_STACK_MONO;
    }

    return raw;
  }

  function rewriteAndSanitizeCss(css, scopeClass) {
    if (!css) return '';
    try {
      // Scope common roots to the card-specific class
      let out = css
        .replace(/:root\s*,\s*\.editor-styles-wrapper/g, '.' + scopeClass)
        .replace(/:root(?![\w-])/g, '.' + scopeClass)
        .replace(/\.editor-styles-wrapper/g, '.' + scopeClass);
      // Drop self-referential variable assignments like: --x: var(--x)
      out = out.replace(/(--[a-z0-9-_]+)\s*:\s*var\(\s*\1\s*\)\s*;?/gi, '');
      return out;
    } catch (_e) { return css; }
  }

  function createColorSwatch(paletteItem) {
    const sw = document.createElement('div');
    sw.className = CSS_CLASS_SWATCH;
    sw.style.background = (paletteItem.color || 'transparent');
    const colorSlug = (paletteItem.slug || paletteItem.name || '').toString();
    sw.title = colorSlug;
    sw.dataset.slug = colorSlug.toLowerCase();
    const label = document.createElement('div');
    label.className = CSS_CLASS_SWATCH_LABEL;
    label.textContent = colorSlug;
    sw.appendChild(label);
    return sw;
  }

  function renderSwatches(variation) {
    const swWrap = el('div', CSS_CLASS_SWATCHES);
    swWrap.style.display = 'flex';
    swWrap.style.height = '100%';
    swWrap.style.width = '100%';
    const varPalette = getConfigPath(variation.config, ['settings', 'color', 'palette'], []);
    if (varPalette.length) {
      varPalette.forEach(paletteItem => {
        if (!paletteItem) return;
        swWrap.appendChild(createColorSwatch(paletteItem));
      });
    }
    return swWrap;
  }

  function renderFontSamples(variation) {
    const fontsBox = el('div', CSS_CLASS_FONTS);
    const ff = getConfigPath(variation.config, ['settings', 'typography', 'fontFamilies'], []);
    const stylesFF = getConfigPath(variation.config, ['styles', 'typography', 'fontFamily']);
    const hasAnyFonts = (ff && ff.length) || !!stylesFF;
    if (hasAnyFonts) {
      fontsBox.appendChild(el('div', CSS_CLASS_FONTS_LABEL, UI_TEXT.fontsLabel));
    }
    if (ff.length) {
      const row = el('div', 'font-row');
      ff.slice(0, MAX_FONT_SAMPLES).forEach(fontItem => {
        const fontSample = el('div', 'sample', fontItem.name || fontItem.slug || 'Font');
        const fontFamily = fontItem.fontFamily || (fontItem['font-family']);
        if (fontFamily) fontSample.style.fontFamily = expandFontStack(fontFamily);
        row.appendChild(fontSample);
      });
      fontsBox.appendChild(row);
    }
    if (stylesFF) {
      const row = el('div', 'font-row');
      const bodySample = el('div', 'sample', 'Body sample AaBbCc');
      bodySample.style.fontFamily = expandFontStack(stylesFF);
      row.appendChild(bodySample);
      fontsBox.appendChild(row);
    }
    return fontsBox;
  }

  function createActionButtons(variation, variationIndex) {
    const actions = el('div', CSS_CLASS_ACTIONS);
    const btnSelect = el('button', '', UI_TEXT.selectBtn);
    btnSelect.addEventListener('click', () => applyVariation(variation));
    const btnPreview = el('button', 'secondary', UI_TEXT.previewBtn);
    btnPreview.addEventListener('click', () => showPreviewModal(variationIndex));
    actions.appendChild(btnSelect);
    actions.appendChild(btnPreview);
    return actions;
  }

  function applyContrastAwareLabels(card) {
    requestAnimationFrame(() => {
      try {
        const swatches = card.querySelectorAll('.' + CSS_CLASS_SWATCH);
        const style = getComputedStyle(card);
        const lightVarStr = style.getPropertyValue('--text-on-light').trim() || DEFAULT_LIGHT_TEXT;
        const darkVarStr = style.getPropertyValue('--text-on-dark').trim() || DEFAULT_DARK_TEXT;
        const lightRGB = colorStringToRgb(lightVarStr);
        const darkRGB = colorStringToRgb(darkVarStr);
        const cardBgRGB = (() => {
          const cardBg = getComputedStyle(card).backgroundColor;
          const parsedCardBg = parseRgbString(cardBg);
          return parsedCardBg ? parsedCardBg.slice(0, 3) : DEFAULT_WHITE_RGB;
        })();
        swatches.forEach(sw => {
          const swatchBg = getComputedStyle(sw).backgroundColor;
          const label = sw.querySelector('.' + CSS_CLASS_SWATCH_LABEL);
          if (!label) return;
          let bgRGB;
          // The WCAG 2.x contrast ratio formula is defined using sRGB relative luminance.
          // We must convert OKLCH to RGB before calculating contrast for WCAG compliance.
          if (swatchBg.startsWith('oklch(')) {
            bgRGB = colorStringToRgb(swatchBg);
          } else {
            const parsedSwatchBg = parseRgbString(swatchBg);
            if (!parsedSwatchBg) {
              bgRGB = lightRGB;
            } else if (parsedSwatchBg.length === 4 && parsedSwatchBg[3] < 1) {
              bgRGB = compositeRGBAoverRGB(parsedSwatchBg, cardBgRGB);
            } else {
              bgRGB = parsedSwatchBg.slice(0, 3);
            }
          }
          const cLight = contrastRatioRGB(bgRGB, lightRGB);
          const cDark = contrastRatioRGB(bgRGB, darkRGB);
          const textColor = cLight >= cDark ? lightVarStr : darkVarStr;
          sw.style.setProperty('--label-color', textColor);
        });
      } catch (e) {
        console.error('WPWM-TVD: Error in applyContrastAwareLabels:', e);
      }
    });
  }

  function renderCard(grid, v, variationIndex) {
    const slug = normalizeSlug(v.slug || v.title || 'variation');
    const scopeClass = CSS_CLASS_VAR_PREFIX + slug;
    const card = el('div', CSS_CLASS_CARD + ' ' + scopeClass);
    card.dataset.variationSlug = slug;

    // Inject scoped CSS variables if provided by variation JSON
    const cssFromJson = getConfigPath(v.config, ['styles', 'css'], '');
    const scopedCss = rewriteAndSanitizeCss(cssFromJson, scopeClass);
    if (scopedCss) {
      const styleTag = document.createElement('style');
      styleTag.textContent = scopedCss;
      card.appendChild(styleTag);
    }

    // Media/preview area with color swatches
    const media = el('div', CSS_CLASS_MEDIA);
    media.style.display = 'flex';
    media.style.alignItems = 'stretch';
    media.style.justifyContent = 'stretch';
    media.appendChild(renderSwatches(v));

    // Body with title, meta, fonts, and actions
    const body = el('div', CSS_CLASS_BODY);
    const titleText = v.title || v.slug;
    const title = el('div', CSS_CLASS_TITLE, titleText);

    // Add current indicator if this is the active variation
    if (currentVariationSlug && slug === currentVariationSlug) {
      const currentBadge = el('span', CSS_CLASS_CURRENT_BADGE, UI_TEXT.currentBadge);
      title.appendChild(currentBadge);
    }

    const fontsBox = renderFontSamples(v);
    const actions = createActionButtons(v, variationIndex);
    body.appendChild(title);
    if (fontsBox.children.length) body.appendChild(fontsBox);
    body.appendChild(actions);

    card.appendChild(media);
    card.appendChild(body);
    grid.appendChild(card);

    // After insertion, compute contrast (WCAG) and set label colors
    applyContrastAwareLabels(card);
  }

  function showPreviewModal(startIndex) {
    let currentIndex = startIndex;
    let isDarkMode = false;

    // Create modal overlay
    const overlay = el('div', CSS_CLASS_MODAL_OVERLAY);
    const modal = el('div', CSS_CLASS_MODAL);

    // Modal header with title and controls
    const header = el('div', CSS_CLASS_MODAL_HEADER);
    const titleEl = el('h2', CSS_CLASS_MODAL_TITLE);
    const controls = el('div', CSS_CLASS_MODAL_CONTROLS);

    // Light/Dark toggle
    const themeToggle = el('button', CSS_CLASS_THEME_TOGGLE, UI_TEXT.lightMode);
    themeToggle.addEventListener('click', () => {
      isDarkMode = !isDarkMode;
      themeToggle.textContent = isDarkMode ? UI_TEXT.darkMode : UI_TEXT.lightMode;
      updatePreview();
    });

    // Close button
    const closeBtn = el('button', CSS_CLASS_MODAL_CLOSE, UI_TEXT.closeBtn);
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    controls.appendChild(themeToggle);
    controls.appendChild(closeBtn);
    header.appendChild(titleEl);
    header.appendChild(controls);

    // Preview content area
    const previewContent = el('div', CSS_CLASS_PREVIEW_CONTENT);

    // Navigation controls
    const nav = el('div', CSS_CLASS_MODAL_NAV);
    const leftGroup = el('div', 'wpwm-tvd-nav-left');
    const selectBtn = el('button', CSS_CLASS_NAV_BTN + ' wpwm-tvd-select-btn', 'Select');
    const prevBtn = el('button', CSS_CLASS_NAV_BTN, UI_TEXT.prevBtn);
    const counter = el('span', CSS_CLASS_COUNTER);
    const nextBtn = el('button', CSS_CLASS_NAV_BTN, UI_TEXT.nextBtn);

    selectBtn.addEventListener('click', () => {
      const v = allVariations[currentIndex];
      applyVariation(v);
      document.body.removeChild(overlay);
    });

    prevBtn.addEventListener('click', () => {
      currentIndex = (currentIndex - 1 + allVariations.length) % allVariations.length;
      updatePreview();
    });

    nextBtn.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % allVariations.length;
      updatePreview();
    });

    leftGroup.appendChild(selectBtn);
    leftGroup.appendChild(prevBtn);
    nav.appendChild(leftGroup);
    nav.appendChild(counter);
    nav.appendChild(nextBtn);

    // Assemble modal
    modal.appendChild(header);
    modal.appendChild(previewContent);
    modal.appendChild(nav);
    overlay.appendChild(modal);

    // Update preview content
    function updatePreview() {
      const v = allVariations[currentIndex];
      const palette = getConfigPath(v.config, ['settings', 'color', 'palette'], []);
      const cssString = getConfigPath(v.config, ['styles', 'css'], '');

      titleEl.textContent = v.title || v.slug;
      counter.textContent = `${currentIndex + 1} / ${allVariations.length}`;

      // Parse CSS variables from the styles.css string
      const cssVars = {};
      if (cssString) {
        // Match CSS variable definitions like: --primary-light: #7ad1ff;
        const varMatches = cssString.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi);
        for (const match of varMatches) {
          const varName = match[1];
          let varValue = match[2].trim();
          // Resolve nested var() references
          if (varValue.startsWith('var(')) {
            const nestedVar = varValue.match(/var\(--([a-z0-9-]+)\)/i);
            if (nestedVar && cssVars[nestedVar[1]]) {
              varValue = cssVars[nestedVar[1]];
            }
          }
          cssVars[varName] = varValue;
        }
      }

      // Get color values from palette - resolve var() references to actual colors
      const getColor = (...slugPatterns) => {
        for (const pattern of slugPatterns) {
          const paletteEntry = palette.find(c => c.slug && c.slug.includes(pattern));
          if (paletteEntry) {
            let color = paletteEntry.color;
            // If color is a CSS variable, resolve it
            if (color && color.startsWith('var(')) {
              const varMatch = color.match(/var\(--([a-z0-9-]+)\)/i);
              if (varMatch && cssVars[varMatch[1]]) {
                color = cssVars[varMatch[1]];
              }
            }
            // Return if we have a real color value (not another var)
            if (color && !color.startsWith('var(')) {
              return color;
            }
          }
        }
        return null;
      };

      const chooseForeground = (bgColor, textOnLight, textOnDark) => {
        const bgRgb = colorStringToRgb(bgColor);
        const tolRgb = colorStringToRgb(textOnLight);
        const todRgb = colorStringToRgb(textOnDark);
        const cLight = contrastRatioRGB(bgRgb, tolRgb);
        const cDark = contrastRatioRGB(bgRgb, todRgb);
        return cLight >= cDark ? textOnLight : textOnDark;
      };

      // Try common WordPress theme slugs and palette generator slugs
      const baseLight = getColor('base-light', 'background-light', 'background') || FALLBACK_COLORS.bgLight;
      const baseDark = getColor('base-dark', 'background-dark') || FALLBACK_COLORS.bgDark;

      const bgColor = isDarkMode ? baseDark : baseLight;

      const textColor = isDarkMode
        ? (getColor('text-on-dark', 'contrast-dark', 'foreground-dark', 'contrast') || FALLBACK_COLORS.textDark)
        : (getColor('text-on-light', 'contrast-light', 'foreground-light', 'contrast', 'foreground') || FALLBACK_COLORS.textLight);

      const textOnLight = getColor('text-on-light', 'contrast-light', 'foreground-light', 'contrast', 'foreground') || DEFAULT_LIGHT_TEXT;
      const textOnDark = getColor('text-on-dark', 'contrast-dark', 'foreground-dark', 'contrast') || DEFAULT_DARK_TEXT;

      const primaryLight = getColor('primary-light', 'primary') || FALLBACK_COLORS.primaryLight;
      const primaryDark = getColor('primary-dark', 'primary-darker', 'primary') || FALLBACK_COLORS.primaryDark;
      const primaryLighter = getColor('primary-lighter', 'primary-light', 'primary') || FALLBACK_COLORS.primaryLighter;
      const primaryDarker = getColor('primary-darker', 'primary-dark', 'primary') || FALLBACK_COLORS.primaryDarker;

      const secondaryLight = getColor('secondary-light', 'secondary') || FALLBACK_COLORS.secondaryLight;
      const secondaryDark = getColor('secondary-dark', 'secondary-darker', 'secondary') || FALLBACK_COLORS.secondaryDark;
      const secondaryLighter = getColor('secondary-lighter', 'secondary-light', 'secondary') || FALLBACK_COLORS.secondaryLighter;
      const secondaryDarker = getColor('secondary-darker', 'secondary-dark', 'secondary') || FALLBACK_COLORS.secondaryDarker;

      const tertiaryLight = getColor('tertiary-light', 'tertiary') || FALLBACK_COLORS.tertiaryLight;
      const tertiaryDark = getColor('tertiary-dark', 'tertiary-darker', 'tertiary') || FALLBACK_COLORS.tertiaryDark;
      const tertiaryLighter = getColor('tertiary-lighter', 'tertiary-light', 'tertiary') || tertiaryLight;
      const tertiaryDarker = getColor('tertiary-darker', 'tertiary-dark', 'tertiary') || tertiaryDark;

      const accentLight = getColor('accent-light', 'accent') || FALLBACK_COLORS.accentLight;
      const accentDark = getColor('accent-dark', 'accent') || FALLBACK_COLORS.accentDark;
      const accentLighter = getColor('accent-lighter', 'accent-light', 'accent') || accentLight;
      const accentDarker = getColor('accent-darker', 'accent-dark', 'accent') || FALLBACK_COLORS.accentDarker;

      const errorLight = getColor('error-light', 'error') || FALLBACK_COLORS.errorLight;
      const errorDark = getColor('error-dark', 'error') || FALLBACK_COLORS.errorDark;
      const noticeLight = getColor('warning-light', 'notice-light', 'warning', 'notice') || FALLBACK_COLORS.noticeLight;
      const noticeDark = getColor('warning-dark', 'notice-dark', 'warning', 'notice') || FALLBACK_COLORS.noticeDark;
      const successLight = getColor('success-light', 'success') || FALLBACK_COLORS.successLight;
      const successDark = getColor('success-dark', 'success') || FALLBACK_COLORS.successDark;

      const semanticErrorBg = isDarkMode ? errorDark : errorLight;
      const semanticNoticeBg = isDarkMode ? noticeDark : noticeLight;
      const semanticSuccessBg = isDarkMode ? successDark : successLight;

      const statusErrorText = chooseForeground(semanticErrorBg, textOnLight, textOnDark);
      const statusNoticeText = chooseForeground(semanticNoticeBg, textOnLight, textOnDark);
      const statusSuccessText = chooseForeground(semanticSuccessBg, textOnLight, textOnDark);

      previewContent.innerHTML = `
        <div class=\"wpwm-preview\" style=\"
          color-scheme: ${isDarkMode ? 'dark' : 'light'};
          --base-light: ${baseLight};
          --base-dark: ${baseDark};
          --text-on-light: ${textOnLight};
          --text-on-dark: ${textOnDark};
          --primary-light: ${primaryLight};
          --primary-dark: ${primaryDark};
          --primary-lighter: ${primaryLighter};
          --primary-darker: ${primaryDarker};
          --primary-light-contrast: ${chooseForeground(primaryLight, textOnLight, textOnDark)};
          --primary-dark-contrast: ${chooseForeground(primaryDark, textOnLight, textOnDark)};
          --primary-lighter-contrast: ${chooseForeground(primaryLighter, textOnLight, textOnDark)};
          --primary-darker-contrast: ${chooseForeground(primaryDarker, textOnLight, textOnDark)};
          --secondary-light: ${secondaryLight};
          --secondary-dark: ${secondaryDark};
          --secondary-lighter: ${secondaryLighter};
          --secondary-darker: ${secondaryDarker};
          --secondary-light-contrast: ${chooseForeground(secondaryLight, textOnLight, textOnDark)};
          --secondary-dark-contrast: ${chooseForeground(secondaryDark, textOnLight, textOnDark)};
          --secondary-lighter-contrast: ${chooseForeground(secondaryLighter, textOnLight, textOnDark)};
          --secondary-darker-contrast: ${chooseForeground(secondaryDarker, textOnLight, textOnDark)};
          --tertiary-light: ${tertiaryLight};
          --tertiary-dark: ${tertiaryDark};
          --tertiary-lighter: ${tertiaryLighter};
          --tertiary-darker: ${tertiaryDarker};
          --tertiary-light-contrast: ${chooseForeground(tertiaryLight, textOnLight, textOnDark)};
          --tertiary-dark-contrast: ${chooseForeground(tertiaryDark, textOnLight, textOnDark)};
          --tertiary-lighter-contrast: ${chooseForeground(tertiaryLighter, textOnLight, textOnDark)};
          --tertiary-darker-contrast: ${chooseForeground(tertiaryDarker, textOnLight, textOnDark)};
          --accent-light: ${accentLight};
          --accent-dark: ${accentDark};
          --accent-lighter: ${accentLighter};
          --accent-darker: ${accentDarker};
          --accent-light-contrast: ${chooseForeground(accentLight, textOnLight, textOnDark)};
          --accent-dark-contrast: ${chooseForeground(accentDark, textOnLight, textOnDark)};
          --accent-lighter-contrast: ${chooseForeground(accentLighter, textOnLight, textOnDark)};
          --accent-darker-contrast: ${chooseForeground(accentDarker, textOnLight, textOnDark)};
          --error-light: ${errorLight};
          --error-dark: ${errorDark};
          --error-light-contrast: ${chooseForeground(errorLight, textOnLight, textOnDark)};
          --error-dark-contrast: ${chooseForeground(errorDark, textOnLight, textOnDark)};
          --notice-light: ${noticeLight};
          --notice-dark: ${noticeDark};
          --notice-light-contrast: ${chooseForeground(noticeLight, textOnLight, textOnDark)};
          --notice-dark-contrast: ${chooseForeground(noticeDark, textOnLight, textOnDark)};
          --success-light: ${successLight};
          --success-dark: ${successDark};
          --success-light-contrast: ${chooseForeground(successLight, textOnLight, textOnDark)};
          --success-dark-contrast: ${chooseForeground(successDark, textOnLight, textOnDark)};
        ">
          <div class="wpwm-preview-card">
            <h1 class="wpwm-preview-title">Welcome to Your Site</h1>
            <p class="wpwm-preview-lead">The quick brown fox <a href="#" class="wpwm-preview-inline-link">jumps over</a> the lazy dog.</p>

            <div class="wpwm-preview-primary-band">
              <div class="wpwm-preview-primary-band-inner">
                <div>
                  <div class="wpwm-preview-kicker">Featured section</div>
                  <div class="wpwm-preview-band-title">Build trust with clear, readable colors</div>
                  <div class="wpwm-preview-band-text">Use Primary for section backgrounds and Accent for links and calls to action.</div>
                </div>
                <div class="wpwm-preview-primary-band-ctas">
                  <a href="#" class="wpwm-preview-accent-cta">Get started</a>
                </div>
              </div>
            </div>

            <hr class="wpwm-preview-rule" />

            <div class="wpwm-preview-info-cards">
              <div class="wpwm-preview-info-card wpwm-preview-info-card--primary"><strong>Primary Light</strong><span>Text on primary background</span></div>
              <div class="wpwm-preview-info-card wpwm-preview-info-card--secondary"><strong>Secondary Light</strong><span>Text on secondary background</span></div>
              <div class="wpwm-preview-info-card wpwm-preview-info-card--tertiary"><strong>Tertiary Light</strong><span>Text on tertiary background</span></div>
            </div>

            <nav class="wpwm-preview-menu" aria-label="Menu">
              <a href="#" class="wpwm-preview-menu-item">Menu item</a>
              <a href="#" class="wpwm-preview-menu-item">Menu item</a>
              <a href="#" class="wpwm-preview-menu-item">Menu item</a>
            </nav>

            <div class="wpwm-preview-testimonial">
              <div class="wpwm-preview-testimonial-quote">“We switched to a contrast-checked palette and immediately got fewer complaints about readability.”</div>
              <div class="wpwm-preview-testimonial-author">
                <div class="wpwm-preview-avatar" aria-hidden="true"></div>
                <div>
                  <div class="wpwm-preview-author-name">Alex Rivera</div>
                  <div class="wpwm-preview-author-title">Site Owner</div>
                </div>
              </div>
            </div>

            <div class="wpwm-preview-list-block">
              <ul class="wpwm-preview-list">
                <li>First item</li>
                <li>Second item</li>
                <li>Third item</li>
                <li>Fourth item</li>
              </ul>
            </div>

            <div class="wpwm-preview-status-messages" aria-label="Status messages demo">
              <div class="wpwm-preview-status wpwm-preview-status--error" role="alert"><strong>Error:</strong> Something went wrong. Please try again.</div>
              <div class="wpwm-preview-status wpwm-preview-status--notice" role="status"><strong>Notice:</strong> Unsaved changes. Don’t forget to save.</div>
              <div class="wpwm-preview-status wpwm-preview-status--success" role="status"><strong>Success:</strong> Your settings have been saved.</div>
            </div>
          </div>
        </div>
      `;

    }

    // Initial render
    updatePreview();

    // Add to page
    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });

    // Close on Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(overlay);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  function previewInEditor(variation) {
    // Non-destructive: apply config to current editor session if API exists
    try {
      const editSite = wp.data.dispatch(WP_STORE_EDIT_SITE);
      if (editSite && typeof editSite.setGlobalStylesUserConfig === 'function') {
        editSite.setGlobalStylesUserConfig(variation.config || {});
        return;
      }
    } catch (e) {/* noop */ }
    // Fallback: try clicking the core tile with matching title
    const tiles = document.querySelectorAll('.edit-site-style-variations [role="button"], .edit-site-style-variations button');
    for (const t of tiles) {
      if ((t.getAttribute('aria-label') || '').includes(variation.title) || (t.textContent || '').includes(variation.title)) {
        t.click();
        break;
      }
    }
  }

  async function applyVariation(variation) {
    console.log('WPWM-TVD: ========================================');
    console.log('WPWM-TVD: APPLYING VARIATION');
    console.log('WPWM-TVD: Title:', variation.title);
    console.log('WPWM-TVD: Slug:', variation.slug);
    console.log('WPWM-TVD: Source file:', variation.source || 'unknown');
    console.log('WPWM-TVD: Has config:', !!variation.config);

    // Log palette colors if available
    const palette = getConfigPath(variation.config, ['settings', 'color', 'palette']);
    if (palette) {
      console.log('WPWM-TVD: Palette structure:', Array.isArray(palette) ? 'flat array' : 'origin-wrapped object');
      console.log('WPWM-TVD: Palette colors:', palette);

      // Log specific colors for debugging
      if (Array.isArray(palette)) {
        const primaryLight = palette.find(c => c.slug && c.slug.includes('primary-light'));
        if (primaryLight) {
          console.log('WPWM-TVD: primary-light color in variation:', primaryLight.color);
        }
      }
    }
    console.log('WPWM-TVD: Full config being applied:', variation.config);
    console.log('WPWM-TVD: ========================================');

    // Try Site Editor API first (only available in Site Editor context)
    try {
      const editSiteDisp = wp.data.dispatch(WP_STORE_EDIT_SITE);
      const coreDisp = wp.data.dispatch(WP_STORE_CORE);
      const coreSel = wp.data.select(WP_STORE_CORE);

      console.log('WPWM-TVD: WordPress data stores available:', {
        hasEditSiteDisp: !!editSiteDisp,
        hasCoreDisp: !!coreDisp,
        hasCoreSel: !!coreSel
      });

      if (editSiteDisp && typeof editSiteDisp.setGlobalStylesUserConfig === 'function') {
        console.log('WPWM-TVD: Using Site Editor API...');

        // Deep clone and ensure arrays remain arrays (WordPress API bug workaround)
        const cleanConfig = JSON.parse(JSON.stringify(variation.config || {}));
        let hasErrors = false;
        const errorLog = [];

        // Validate and fix palette structure
        if (cleanConfig.settings && cleanConfig.settings.color && cleanConfig.settings.color.palette) {
          const palette = cleanConfig.settings.color.palette;

          // Check if palette is a flat array (variation format) vs origin-wrapped (database format)
          if (Array.isArray(palette)) {
            // Flat array format from variation JSON - this is normal, no error
            // WordPress will handle wrapping it in origins during merge
            console.log('WPWM-TVD: Palette is flat array format (normal for variations)');
          } else {
            // Origin-wrapped format - validate each origin
            Object.keys(palette).forEach(origin => {
              if (palette[origin] && typeof palette[origin] === 'object') {
                const isArray = Array.isArray(palette[origin]);

                // Detect object-with-numeric-keys bug
                if (!isArray) {
                  hasErrors = true;
                  errorLog.push({
                    type: 'PALETTE_STRUCTURE_ERROR',
                    origin: origin,
                    issue: 'Palette is an object with numeric keys instead of an array',
                    originalStructure: palette[origin],
                    itemCount: Object.keys(palette[origin]).length
                  });

                  // Fix: Convert to proper array
                  palette[origin] = Object.values(palette[origin]);
                  console.warn('WPWM-TVD: Fixed palette structure for origin:', origin);
                }

                // Validate each palette entry has required fields
                if (Array.isArray(palette[origin])) {
                  palette[origin].forEach((entry, index) => {
                    if (!entry || typeof entry !== 'object') {
                      hasErrors = true;
                      errorLog.push({
                        type: 'PALETTE_ENTRY_ERROR',
                        origin: origin,
                        index: index,
                        issue: 'Entry is not an object',
                        entry: entry
                      });
                    } else if (!entry.slug || !entry.slug.trim()) {
                      hasErrors = true;
                      errorLog.push({
                        type: 'MISSING_SLUG',
                        origin: origin,
                        index: index,
                        issue: 'Palette entry missing slug',
                        entry: entry
                      });
                    } else if (!entry.color) {
                      hasErrors = true;
                      errorLog.push({
                        type: 'MISSING_COLOR',
                        origin: origin,
                        index: index,
                        issue: 'Palette entry missing color',
                        entry: entry
                      });
                    }
                  });
                }
              }
            });
          }
        }

        // Validate fontFamilies structure
        if (cleanConfig.settings && cleanConfig.settings.typography && cleanConfig.settings.typography.fontFamilies) {
          const fontFamilies = cleanConfig.settings.typography.fontFamilies;

          Object.keys(fontFamilies).forEach(origin => {
            if (fontFamilies[origin] && typeof fontFamilies[origin] === 'object') {
              if (!Array.isArray(fontFamilies[origin])) {
                hasErrors = true;
                errorLog.push({
                  type: 'FONT_FAMILIES_STRUCTURE_ERROR',
                  origin: origin,
                  issue: 'fontFamilies is an object with numeric keys instead of an array',
                  itemCount: Object.keys(fontFamilies[origin]).length
                });
                fontFamilies[origin] = Object.values(fontFamilies[origin]);
              }
            }
          });
        }

        // Validate fontSizes structure
        if (cleanConfig.settings && cleanConfig.settings.typography && cleanConfig.settings.typography.fontSizes) {
          const fontSizes = cleanConfig.settings.typography.fontSizes;

          Object.keys(fontSizes).forEach(origin => {
            if (fontSizes[origin] && typeof fontSizes[origin] === 'object') {
              if (!Array.isArray(fontSizes[origin])) {
                hasErrors = true;
                errorLog.push({
                  type: 'FONT_SIZES_STRUCTURE_ERROR',
                  origin: origin,
                  issue: 'fontSizes is an object with numeric keys instead of an array',
                  itemCount: Object.keys(fontSizes[origin]).length
                });
                fontSizes[origin] = Object.values(fontSizes[origin]);
              }
            }
          });
        }

        // Log errors to server if any found
        if (hasErrors) {
          console.error('WPWM-TVD: Validation errors found:', errorLog);

          // Determine source file
          let sourceFile = 'unknown';
          if (variation.source === 'theme') {
            const themeStylesheet = (window.__WPWM_TVD__ && window.__WPWM_TVD__.themeStylesheet) || 'unknown-theme';
            sourceFile = 'wp-content/themes/' + themeStylesheet + '/styles/' + (variation.slug || 'unknown') + '.json';
          } else if (variation.source === 'export') {
            sourceFile = 'wp-content/plugins/wpwm-theme-variation-display/export.json';
          } else if (variation.source) {
            sourceFile = variation.source;
          }

          // Send to server for logging
          try {
            await window.wp.apiFetch({
              path: buildApiPath(API_ENDPOINT_LOG_ERROR),
              method: 'POST',
              data: {
                variation: variation.title || variation.slug || 'unknown',
                sourceFile: sourceFile,
                errors: errorLog,
                timestamp: new Date().toISOString()
              }
            });
          } catch (logError) {
            console.warn('WPWM-TVD: Could not send error log to server:', logError);
          }

          // Show user-friendly warning
          if (wp.data.dispatch(WP_STORE_NOTICES) && wp.data.dispatch(WP_STORE_NOTICES).createWarningNotice) {
            wp.data.dispatch(WP_STORE_NOTICES).createWarningNotice(
              'Variation data had ' + errorLog.length + ' issue(s) that were automatically fixed. Check browser console for details.',
              { type: NOTICE_TYPE_SNACKBAR, isDismissible: true }
            );
          }
        }

        editSiteDisp.setGlobalStylesUserConfig(cleanConfig);

        const currentGlobalStylesId = coreSel.__experimentalGetCurrentGlobalStylesId
          ? coreSel.__experimentalGetCurrentGlobalStylesId()
          : null;

        console.log('WPWM-TVD: Current global styles ID:', currentGlobalStylesId);

        if (currentGlobalStylesId && coreDisp.saveEditedEntityRecord) {
          console.log('WPWM-TVD: Saving via Site Editor API...');
          try {
            await coreDisp.saveEditedEntityRecord(WP_ENTITY_KIND_ROOT, WP_ENTITY_NAME_GLOBAL_STYLES, currentGlobalStylesId);
            console.log('WPWM-TVD: Save successful!');
            if (wp.data.dispatch(WP_STORE_NOTICES) && wp.data.dispatch(WP_STORE_NOTICES).createSuccessNotice) {
              wp.data.dispatch(WP_STORE_NOTICES).createSuccessNotice(
                'Variation "' + (variation.title || variation.slug) + '" applied successfully.',
                { type: NOTICE_TYPE_SNACKBAR, isDismissible: true }
              );
            } else {
              alert('Variation "' + (variation.title || variation.slug) + '" applied successfully.');
            }
            return;
          } catch (saveError) {
            console.error('WPWM-TVD save error:', saveError);
            alert('Variation set but could not save: ' + (saveError.message || 'Unknown error'));
            return;
          }
        }
      } else {
        console.log('WPWM-TVD: Site Editor API not available, trying REST API...');
      }
    } catch (e) {
      console.warn('WPWM-TVD: Site Editor API failed, trying REST API...', e);
    }

    // Fallback: Use REST API (works in admin context)
    console.log('WPWM-TVD: Using REST API to apply variation...');
    console.log('WPWM-TVD: Sending config to REST API:', variation.config);
    try {
      const response = await window.wp.apiFetch({
        path: buildApiPath(API_ENDPOINT_APPLY),
        method: 'POST',
        data: variation.config || {}
      });

      console.log('WPWM-TVD: ========================================');
      console.log('WPWM-TVD: REST API RESPONSE');
      console.log('WPWM-TVD: Success:', response.success);
      console.log('WPWM-TVD: Message:', response.message);
      console.log('WPWM-TVD: Post ID:', response.post_id);
      console.log('WPWM-TVD: Full response:', response);
      console.log('WPWM-TVD: ========================================');

      if (response.success) {
        alert('Variation "' + (variation.title || variation.slug) + '" applied successfully!\n\nPost ID: ' + response.post_id + '\n\nRefresh the page to see changes.');
      } else {
        alert('Variation applied but response was unexpected: ' + JSON.stringify(response));
      }
    } catch (restError) {
      console.error('WPWM-TVD: REST API failed:', restError);
      alert('Could not apply variation via REST API: ' + (restError.message || 'Unknown error'));
    }
  }

  // Mount in Site Editor when styles screen is ready
  if (window.wp && window.wp.data) {
    whenStylesScreenReady(async (host) => {
      const grid = mountPanel(host);
      allVariations = await fetchVariations();
      currentVariationSlug = await getCurrentVariation();
      allVariations.forEach((v, index) => renderCard(grid, v, index));
    });
  }

  // Mount in dedicated admin page
  function initAdminPage() {
    console.log('WPWM-TVD: initAdminPage called');
    const root = document.getElementById(DOM_ID_ROOT);
    console.log('WPWM-TVD: Root element found:', !!root);
    if (!root) return;

    // Check if root is visible (admin page) or hidden (Site Editor)
    const isVisible = root.offsetParent !== null;
    console.log('WPWM-TVD: Root element is visible:', isVisible);

    if (!isVisible) {
      console.log('WPWM-TVD: Skipping admin page init - in Site Editor context');
      return;
    }

    (async () => {
      console.log('WPWM-TVD: Fetching variations...');
      const grid = mountPanelInContainer(root);
      allVariations = await fetchVariations();
      currentVariationSlug = await getCurrentVariation();
      console.log('WPWM-TVD: Variations loaded:', allVariations.length);
      console.log('WPWM-TVD: Current variation:', currentVariationSlug);
      allVariations.forEach((v, index) => renderCard(grid, v, index));
      console.log('WPWM-TVD: Cards rendered');
    })();
  }

  console.log('WPWM-TVD: Document ready state:', document.readyState);
  if (document.readyState === 'loading') {
    console.log('WPWM-TVD: Waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', initAdminPage);
  } else {
    console.log('WPWM-TVD: Initializing immediately');
    initAdminPage();
  }
}

// Initialize immediately
wpwmThemeVariationDisplay();
