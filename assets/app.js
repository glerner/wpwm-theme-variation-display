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
  // Limit font samples to keep card height manageable while showing variety
  const MAX_FONT_SAMPLES = 5;
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
   * Consistent error logging with severity levels
   * @param {string} context - Description of where the error occurred
   * @param {Error|string} error - The error object or message
   * @param {string} severity - 'error', 'warn', or 'log' (default: 'error')
   */
  function logError(context, error, severity = 'error') {
    const prefix = 'WPWM-TVD';
    const message = `${prefix}: ${context}`;

    if (severity === 'error') {
      console.error(message, error);
    } else if (severity === 'warn') {
      console.warn(message, error);
    } else {
      console.log(message, error);
    }
  }

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
    // Validate input RGB values
    if (isNaN(r) || isNaN(g) || isNaN(b)) return 0;

    const [sr, sg, sb] = [r / 255, g / 255, b / 255];
    const lin = [sr, sg, sb].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    const luminance = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];

    // Validate output
    return isNaN(luminance) ? 0 : luminance;
  }
  function contrastRatioRGB(a, b) {
    const La = rgbToLuminance(a);
    const Lb = rgbToLuminance(b);
    const bright = Math.max(La, Lb);
    const dark = Math.min(La, Lb);
    const ratio = (bright + 0.05) / (dark + 0.05);

    // Validate output
    return isNaN(ratio) ? 1 : ratio;
  }
  /**
   * Convert OKLCH color string to RGB array
   * @param {string} oklchStr - OKLCH color in format "oklch(L C H)" where L is 0-1, C is 0-0.4, H is 0-360
   * @returns {number[]|null} RGB array [r, g, b] (0-255) or null if invalid
   */
  function oklchToRgb(oklchStr) {
    const match = oklchStr.match(/oklch\(\s*([0-9.]+)[,\s]+([0-9.]+)[,\s]+([0-9.]+)\s*\)/);
    if (!match) return null;
    let L = parseFloat(match[1]);
    let C = parseFloat(match[2]);
    let H = parseFloat(match[3]);

    // Validate parsed values
    if (isNaN(L) || isNaN(C) || isNaN(H)) return null;

    // Clamp values to valid OKLCH ranges
    L = Math.max(0, Math.min(1, L));
    C = Math.max(0, Math.min(0.4, C));
    H = ((H % 360) + 360) % 360;

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

    const rFinal = Math.max(0, Math.min(255, Math.round(r * 255)));
    const gFinal = Math.max(0, Math.min(255, Math.round(g * 255)));
    const bFinal = Math.max(0, Math.min(255, Math.round(bVal * 255)));

    // Validate final RGB values
    if (isNaN(rFinal) || isNaN(gFinal) || isNaN(bFinal)) return null;

    return [rFinal, gFinal, bFinal];
  }
  /**
   * Convert color string to RGB array, supporting hex, OKLCH, and CSS color formats
   * @param {string} colorStr - Color string in any supported format
   * @returns {number[]} RGB array [r, g, b] (0-255)
   */
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
    // Support 8-digit hex with alpha (#RRGGBBAA)
    if (/^#([0-9a-f]{8})$/i.test(colorString)) {
      const n = parseInt(colorString.slice(1, 7), 16);
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

  /**
   * Sanitize color value to prevent XSS via innerHTML injection
   * @param {string} colorStr - Color value to sanitize
   * @returns {string} Sanitized color value or empty string if unsafe
   */
  function sanitizeColorValue(colorStr) {
    if (!colorStr || typeof colorStr !== 'string') return '';
    const s = colorStr.trim();

    // Allow safe CSS color formats only
    // Hex colors
    if (/^#[0-9a-f]{3,8}$/i.test(s)) return s;

    // RGB/RGBA
    if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)$/i.test(s)) return s;
    if (/^rgba?\(\s*\d+\s+\d+\s+\d+(?:\s*\/\s*[\d.]+%?)?\s*\)$/i.test(s)) return s;

    // OKLCH
    if (/^oklch\(\s*[\d.]+\s+[\d.]+\s+[\d.]+(?:\s*\/\s*[\d.]+%?)?\s*\)$/i.test(s)) return s;

    // Color-mix
    if (/^color-mix\(in\s+srgb\s*,\s*[^)]+\)$/i.test(s)) return s;

    // CSS var() references
    if (/^var\(--[a-z0-9-]+\)$/i.test(s)) return s;

    // Named CSS colors (basic set)
    const namedColors = ['transparent', 'currentcolor', 'inherit', 'initial', 'unset'];
    if (namedColors.includes(s.toLowerCase())) return s;

    // If it doesn't match safe patterns, return empty string
    console.warn('WPWM-TVD: Potentially unsafe color value filtered:', colorStr);
    return '';
  }

  function parseColorToRgba(colorStr) {
    const s = (colorStr || '').trim();
    if (!s) return null;
    const rgba = parseRgbString(s);
    if (rgba) return rgba;
    if (/^#([0-9a-f]{8})$/i.test(s)) {
      const r = parseInt(s.slice(1, 3), 16);
      const g = parseInt(s.slice(3, 5), 16);
      const b = parseInt(s.slice(5, 7), 16);
      const a = parseInt(s.slice(7, 9), 16) / 255;

      // Validate parsed values
      if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) return null;

      return [r, g, b, Math.max(0, Math.min(1, a))];
    }
    return null;
  }

  function isOpaqueColor(colorStr) {
    const rgba = parseColorToRgba(colorStr);
    if (!rgba) return true;
    return rgba[3] >= 1;
  }

  function compositeColorStringOverBg(colorStr, bgRgb) {
    const rgba = parseColorToRgba(colorStr);
    if (!rgba) return colorStringToRgb(colorStr);
    if (rgba[3] >= 1) return rgba.slice(0, 3);
    return compositeRGBAoverRGB(rgba, bgRgb);
  }

  function compositeRGBAoverRGB(fgRGBA, bgRGB) {
    const [fr, fg, fb, fa = 1] = fgRGBA;
    const [br, bg, bb] = bgRGB;
    const a = fa;
    const outR = Math.round(fr * a + br * (1 - a));
    const outG = Math.round(fg * a + bg * (1 - a));
    const outB = Math.round(fb * a + bb * (1 - a));

    // Validate output to prevent NaN propagation
    if (isNaN(outR) || isNaN(outG) || isNaN(outB)) {
      return bgRGB; // Fall back to background color if composition fails
    }

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
    } catch (e) {
      logError('fetch error', e);
      return [];
    }
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
        const swWrap = card.querySelector('.' + CSS_CLASS_SWATCHES);
        const gridBgRGB = (() => {
          const bg = swWrap ? getComputedStyle(swWrap).backgroundColor : null;
          const parsed = bg ? parseRgbString(bg) : null;
          return parsed ? parsed.slice(0, 3) : DEFAULT_WHITE_RGB;
        })();

        const getDisplayedBgRgb = (el) => {
          if (!el) return null;
          const bg = getComputedStyle(el).backgroundColor;
          if (!bg) return null;
          if (bg.startsWith('oklch(')) return colorStringToRgb(bg);
          const parsed = parseRgbString(bg);
          if (!parsed) return null;
          if (parsed.length === 4 && parsed[3] < 1) {
            return compositeRGBAoverRGB(parsed, gridBgRGB);
          }
          return parsed.slice(0, 3);
        };

        swatches.forEach(sw => {
          const swatchBg = getComputedStyle(sw).backgroundColor;
          const label = sw.querySelector('.' + CSS_CLASS_SWATCH_LABEL);
          if (!label) return;

          const slug = (sw.dataset.slug || '').toString();

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
              bgRGB = compositeRGBAoverRGB(parsedSwatchBg, gridBgRGB);
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
        logError('Error in applyContrastAwareLabels', e);
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

  function resolvePreviewColors(variation, isDarkMode) {
    const palette = getConfigPath(variation.config, ['settings', 'color', 'palette'], []);
    const cssString = getConfigPath(variation.config, ['styles', 'css'], '');

    const PLACEHOLDER_COLOR = '#10b981';

    // Parse CSS variables from the styles.css string
    const cssVars = {};
    if (cssString) {
      const varMatches = cssString.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi);
      for (const match of varMatches) {
        const varName = match[1];
        let varValue = match[2].trim();
        if (varValue.startsWith('var(')) {
          const nestedVar = varValue.match(/var\(--([a-z0-9-]+)\)/i);
          if (nestedVar && cssVars[nestedVar[1]]) {
            varValue = cssVars[nestedVar[1]];
          }
        }
        cssVars[varName] = varValue;
      }
    }

    function resolveStyleColorValue(colorValue) {
      if (!colorValue) return null;
      let c = (colorValue || '').toString().trim();
      if (!c) return null;

      // WP theme.json may use preset tokens like: var:preset|color|contrast
      // Convert them into valid CSS var() references.
      if (c.includes('var:preset|color|')) {
        c = c.replace(/var:preset\|color\|([a-z0-9-]+)/gi, 'var(--wp--preset--color--$1)');
      }

      // Prefer resolving WP preset vars to the actual variation palette values.
      // This makes the preview independent of whether :root defines the preset var.
      // Example: var(--wp--preset--color--contrast) -> "#1b1b1b" (from settings.color.palette).
      const resolveWpPresetColorFromPalette = (varName) => {
        const prefix = 'wp--preset--color--';
        if (!varName || !varName.startsWith(prefix)) return null;
        const slug = varName.slice(prefix.length);
        if (!slug) return null;

        const entry = Array.isArray(palette)
          ? palette.find(e => e && typeof e === 'object' && (e.slug || e.name) === slug)
          : null;
        if (!entry) return null;

        let val = entry.color;
        if (typeof val !== 'string') return null;
        val = val.trim();
        if (!val) return null;

        // Resolve var(--x) through styles.css parsed vars if available.
        if (val.startsWith('var(')) {
          const m = val.match(/var\(--([a-z0-9-]+)\)/i);
          if (m && cssVars[m[1]]) {
            const resolved = (cssVars[m[1]] || '').trim();
            if (resolved && !resolved.startsWith('var(')) return resolved;
          }
        }

        // If it's a WP token, normalize it; otherwise return as-is.
        if (val.includes('var:preset|color|')) {
          val = val.replace(/var:preset\|color\|([a-z0-9-]+)/gi, 'var(--wp--preset--color--$1)');
        }

        return val;
      };

      // Replace any occurrence(s) of WP preset vars in complex expressions.
      // This covers cases like: color-mix(in srgb, var(--wp--preset--color--contrast) 85%, transparent)
      if (c.includes('var(--wp--preset--color--')) {
        c = c.replace(/var\(--(wp--preset--color--[a-z0-9-]+)\)/gi, (full, varName) => {
          const fromPalette = resolveWpPresetColorFromPalette(varName);
          if (fromPalette && !fromPalette.startsWith('var(')) return fromPalette;
          return full;
        });
      }

      // Resolve var(--x) using parsed CSS vars when possible
      if (c.startsWith('var(')) {
        const varMatch = c.match(/var\(--([a-z0-9-]+)\)/i);
        if (varMatch && cssVars[varMatch[1]]) {
          const resolved = (cssVars[varMatch[1]] || '').trim();
          if (resolved && !resolved.startsWith('var(')) return resolved;
        }

        // If it's a WP preset var, try resolving from the variation palette.
        if (varMatch && varMatch[1] && varMatch[1].startsWith('wp--preset--color--')) {
          const fromPalette = resolveWpPresetColorFromPalette(varMatch[1]);
          if (fromPalette && !fromPalette.startsWith('var(')) return fromPalette;
        }

        // Try resolving WP preset vars from :root (common in default theme variations)
        if (varMatch && varMatch[1] && varMatch[1].startsWith('wp--preset--')) {
          try {
            const rootVal = getComputedStyle(document.documentElement)
              .getPropertyValue(`--${varMatch[1]}`)
              .trim();
            if (rootVal && !rootVal.startsWith('var(')) return rootVal;
          } catch (e) {/* noop */ }
        }

        // Keep the var() reference for CSS assignment even if we can't resolve it.
        return c;
      }

      // Accept common CSS colors we can measure
      if (c.startsWith('#') || c.startsWith('rgb(') || c.startsWith('rgba(') || c.startsWith('oklch(') || c.startsWith('color(')) {
        return c;
      }

      return c;
    }

    // Get button colors from theme.json styles when available
    // const buttonBgFromStyles = resolveStyleColorValue(getConfigPath(variation.config, ['styles', 'elements', 'button', 'color', 'background']));
    const buttonTextFromStyles = resolveStyleColorValue(getConfigPath(variation.config, ['styles', 'elements', 'button', 'color', 'text']));

    const buttonHoverBgFromStyles =
      resolveStyleColorValue(getConfigPath(variation.config, ['styles', 'elements', 'button', ':hover', 'color', 'background'])) ||
      resolveStyleColorValue(getConfigPath(variation.config, ['styles', 'elements', 'button', 'hover', 'color', 'background']));
    const buttonHoverTextFromStyles =
      resolveStyleColorValue(getConfigPath(variation.config, ['styles', 'elements', 'button', ':hover', 'color', 'text'])) ||
      resolveStyleColorValue(getConfigPath(variation.config, ['styles', 'elements', 'button', 'hover', 'color', 'text']));

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

    function normalizePaletteEntries(paletteEntries) {
      if (!Array.isArray(paletteEntries)) return [];
      const out = [];
      // Use a neutral mid-gray background for compositing colors with alpha
      const neutralBg = [128, 128, 128];

      for (const entry of paletteEntries) {
        if (!entry || typeof entry !== 'object') continue;
        const slug = (entry.slug || entry.name || '').toString();
        const rawColor = entry.color;
        let resolved = rawColor;
        if (resolved && typeof resolved === 'string' && resolved.trim().startsWith('var(')) {
          const varMatch = resolved.match(/var\(--([a-z0-9-]+)\)/i);
          if (varMatch && cssVars[varMatch[1]]) {
            resolved = cssVars[varMatch[1]];
          }
        }
        resolved = resolveStyleColorValue(resolved);

        // Composite colors with alpha over neutral background to ensure all palette colors are opaque
        if (resolved && typeof resolved === 'string') {
          const rgba = parseColorToRgba(resolved);
          if (rgba && rgba[3] < 1) {
            // Has alpha channel - composite it
            const composited = compositeRGBAoverRGB(rgba, neutralBg);
            resolved = `rgb(${composited[0]}, ${composited[1]}, ${composited[2]})`;
          }
        }

        out.push({ slug, raw: rawColor, color: resolved });
      }
      return out;
    }

    const normalizedPalette = normalizePaletteEntries(palette);
    const paletteColors = normalizedPalette
      .map(e => e.color)
      .filter(Boolean);

    // Derive base colors from palette by luminance (prefer opaque colors)
    const opaqueCandidates = paletteColors.filter(c => isOpaqueColor(c));
    const baseCandidates = opaqueCandidates.length ? opaqueCandidates : paletteColors;

    function byLuminanceAsc(a, b) {
      const La = rgbToLuminance(colorStringToRgb(a));
      const Lb = rgbToLuminance(colorStringToRgb(b));
      return La - Lb;
    }

    const sortedByLum = baseCandidates.slice().sort(byLuminanceAsc);
    const derivedBaseLight = sortedByLum.length ? sortedByLum[sortedByLum.length - 1] : PLACEHOLDER_COLOR;
    const derivedBaseDark = sortedByLum.length ? sortedByLum[0] : PLACEHOLDER_COLOR;

    // Derive text colors based on page backgrounds
    const derivedTextOnLight = (() => {
      const candidates = paletteColors.length ? paletteColors : [DEFAULT_LIGHT_TEXT, DEFAULT_DARK_TEXT];
      let best = candidates[0];
      let bestC = 0;
      const bgRgb = colorStringToRgb(derivedBaseLight);
      for (const c of candidates) {
        const fgRgb = compositeColorStringOverBg(c, bgRgb);
        const cr = contrastRatioRGB(bgRgb, fgRgb);
        if (cr > bestC) {
          bestC = cr;
          best = c;
        }
      }
      return best || DEFAULT_LIGHT_TEXT;
    })();

    const derivedTextOnDark = (() => {
      const candidates = paletteColors.length ? paletteColors : [DEFAULT_LIGHT_TEXT, DEFAULT_DARK_TEXT];
      let best = candidates[0];
      let bestC = 0;
      const bgRgb = colorStringToRgb(derivedBaseDark);
      for (const c of candidates) {
        const fgRgb = compositeColorStringOverBg(c, bgRgb);
        const cr = contrastRatioRGB(bgRgb, fgRgb);
        if (cr > bestC) {
          bestC = cr;
          best = c;
        }
      }
      return best || DEFAULT_DARK_TEXT;
    })();

    function bestForegroundColor(bgColor, candidates) {
      const bgRgb = colorStringToRgb(bgColor);
      let best = (candidates && candidates.length) ? candidates[0] : (DEFAULT_LIGHT_TEXT);
      let bestC = 0;
      for (const c of (candidates || [])) {
        if (!c) continue;
        const fgRgb = compositeColorStringOverBg(c, bgRgb);
        const cr = contrastRatioRGB(bgRgb, fgRgb);
        if (cr > bestC) {
          bestC = cr;
          best = c;
        }
      }
      return best;
    }

    // Sequentially assign remaining colors to preview roles
    const used = new Set([derivedBaseLight, derivedBaseDark, derivedTextOnLight, derivedTextOnDark]);
    const remaining = paletteColors.filter(c => !used.has(c));
    const assigned = []; // Track colors as they're assigned for reuse
    let remIdx = 0;
    let cycleIdx = 0;
    const nextColor = () => {
      // First, use remaining unused colors
      if (remIdx < remaining.length) {
        const color = remaining[remIdx++];
        assigned.push(color);
        return color;
      }
      // When remaining is empty, cycle through already-assigned colors
      if (assigned.length > 0) {
        const color = assigned[cycleIdx % assigned.length];
        cycleIdx++;
        return color;
      }
      // Only use placeholder if we have no colors at all
      return PLACEHOLDER_COLOR;
    };

    // Initialize all preview role colors to placeholder
    const previewColors = {
      baseLight: derivedBaseLight,
      baseDark: derivedBaseDark,
      textOnLight: derivedTextOnLight,
      textOnDark: derivedTextOnDark,
      primaryLight: PLACEHOLDER_COLOR,
      primaryDark: PLACEHOLDER_COLOR,
      primaryLighter: PLACEHOLDER_COLOR,
      primaryDarker: PLACEHOLDER_COLOR,
      secondaryLight: PLACEHOLDER_COLOR,
      secondaryDark: PLACEHOLDER_COLOR,
      secondaryLighter: PLACEHOLDER_COLOR,
      secondaryDarker: PLACEHOLDER_COLOR,
      tertiaryLight: PLACEHOLDER_COLOR,
      tertiaryDark: PLACEHOLDER_COLOR,
      tertiaryLighter: PLACEHOLDER_COLOR,
      tertiaryDarker: PLACEHOLDER_COLOR,
      accentLight: PLACEHOLDER_COLOR,
      accentDark: PLACEHOLDER_COLOR,
      accentLighter: PLACEHOLDER_COLOR,
      accentDarker: PLACEHOLDER_COLOR,
      errorLight: PLACEHOLDER_COLOR,
      errorDark: PLACEHOLDER_COLOR,
      noticeLight: PLACEHOLDER_COLOR,
      noticeDark: PLACEHOLDER_COLOR,
      successLight: PLACEHOLDER_COLOR,
      successDark: PLACEHOLDER_COLOR,
    };

    // Prefer semantic slugs if present, otherwise fill sequentially
    const baseLightExplicit = getColor('base-light', 'background-light', 'background');
    const baseDarkExplicit = getColor('base-dark', 'background-dark');
    const baseSingle = getColor('base', 'basecolor');
    const contrastSingle = getColor('contrast', 'contrastcolor');
    const contrast2 = getColor('contrast-2');
    const contrast3 = getColor('contrast-3');

    let baseLight = baseLightExplicit || previewColors.baseLight;
    let baseDark = baseDarkExplicit || previewColors.baseDark;

    // Common WP default themes: base + contrast. base is usually light but not guaranteed.
    if (!baseLightExplicit && !baseDarkExplicit && baseSingle) {
      const L = rgbToLuminance(colorStringToRgb(baseSingle));
      if (L >= 0.5) {
        baseLight = baseSingle;
      } else {
        baseDark = baseSingle;
      }
    }

    let textOnLight = getColor('text-on-light', 'contrast-light', 'foreground-light', 'foreground') || previewColors.textOnLight;
    let textOnDark = getColor('text-on-dark', 'contrast-dark', 'foreground-dark') || previewColors.textOnDark;

    // If we have base/contrast, treat contrast as the intended text color on base.
    if (contrastSingle) {
      if (baseSingle && baseLight === baseSingle) textOnLight = contrastSingle;
      if (baseSingle && baseDark === baseSingle) textOnDark = contrastSingle;
    } else {
      // Use numbered contrast entries if needed (common in WP default variations)
      if (baseSingle && baseLight === baseSingle) {
        textOnLight = contrast2 || contrast3 || textOnLight;
      }
      if (baseSingle && baseDark === baseSingle) {
        textOnDark = contrast2 || contrast3 || textOnDark;
      }
    }

    // Fill accents first
    // 1) If a slug matches accent*, use that.
    // 2) Otherwise, if theme.json defines button background, treat that as accent.
    const accentSeed =
      getColor('accent-darker', 'accent-dark', 'accent-light', 'accent-lighter', 'accent', 'accent-1', 'accent-2', 'accent-3', 'accent-4', 'accent-5') ||
      buttonBgFromStyles ||
      nextColor();
    previewColors.accentLight = accentSeed;
    previewColors.accentDark = accentSeed;
    previewColors.accentLighter = accentSeed;
    previewColors.accentDarker = accentSeed;

    // Primary/secondary/tertiary next
    const primarySeed = getColor('primary') || nextColor();
    previewColors.primaryLight = primarySeed;
    previewColors.primaryDark = primarySeed;
    previewColors.primaryLighter = primarySeed;
    previewColors.primaryDarker = primarySeed;

    const secondarySeed = getColor('secondary') || nextColor();
    previewColors.secondaryLight = secondarySeed;
    previewColors.secondaryDark = secondarySeed;
    previewColors.secondaryLighter = secondarySeed;
    previewColors.secondaryDarker = secondarySeed;

    const tertiarySeed = getColor('tertiary') || nextColor();
    previewColors.tertiaryLight = tertiarySeed;
    previewColors.tertiaryDark = tertiarySeed;
    previewColors.tertiaryLighter = tertiarySeed;
    previewColors.tertiaryDarker = tertiarySeed;

    // Status colors last
    const errorSeed = getColor('error') || nextColor();
    previewColors.errorLight = errorSeed;
    previewColors.errorDark = errorSeed;
    const noticeSeed = getColor('warning', 'notice') || nextColor();
    previewColors.noticeLight = noticeSeed;
    previewColors.noticeDark = noticeSeed;
    const successSeed = getColor('success') || nextColor();
    previewColors.successLight = successSeed;
    previewColors.successDark = successSeed;

    const chooseForeground = (bgColor, textOnLight, textOnDark) => {
      let bgRgb;
      try {
        bgRgb = colorStringToRgb(bgColor);
      } catch (e) {
        return textOnLight;
      }
      const tolRgb = compositeColorStringOverBg(textOnLight, bgRgb);
      const todRgb = compositeColorStringOverBg(textOnDark, bgRgb);
      const cLight = contrastRatioRGB(bgRgb, tolRgb);
      const cDark = contrastRatioRGB(bgRgb, todRgb);
      return cLight >= cDark ? textOnLight : textOnDark;
    };

    const pickColor = (...vals) => {
      for (const v of vals) {
        if (typeof v !== 'string') continue;
        const s = v.trim();
        if (!s) continue;
        if (s === 'undefined' || s === 'null') continue;
        return s;
      }
      return PLACEHOLDER_COLOR;
    };

    const bgColor = isDarkMode ? baseDark : baseLight;

    const primaryLight = getColor('primary-light') || previewColors.primaryLight;
    const primaryDark = getColor('primary-dark') || previewColors.primaryDark;
    const primaryLighter = getColor('primary-lighter') || previewColors.primaryLighter;
    const primaryDarker = getColor('primary-darker') || previewColors.primaryDarker;

    const secondaryLight = getColor('secondary-light') || previewColors.secondaryLight;
    const secondaryDark = getColor('secondary-dark') || previewColors.secondaryDark;
    const secondaryLighter = getColor('secondary-lighter') || previewColors.secondaryLighter;
    const secondaryDarker = getColor('secondary-darker') || previewColors.secondaryDarker;

    const tertiaryLight = getColor('tertiary-light') || previewColors.tertiaryLight;
    const tertiaryDark = getColor('tertiary-dark') || previewColors.tertiaryDark;
    const tertiaryLighter = getColor('tertiary-lighter') || previewColors.tertiaryLighter;
    const tertiaryDarker = getColor('tertiary-darker') || previewColors.tertiaryDarker;

    const accentLight = pickColor(getColor('accent-light'), previewColors.accentLight);
    const accentDark = pickColor(getColor('accent-dark'), previewColors.accentDark);
    const accentLighter = pickColor(getColor('accent-lighter'), previewColors.accentLighter);
    const accentDarker = pickColor(getColor('accent-darker'), previewColors.accentDarker);

    // Build a reusable color pool from palette (excluding page bg/text and placeholders)
    // This allows semantic colors to reuse palette colors instead of falling back to PLACEHOLDER_COLOR
    const normalizeColorForComparison = (color) => {
      if (!color || typeof color !== 'string') return '';
      // Normalize hex colors to lowercase without spaces
      return color.toLowerCase().trim().replace(/\s+/g, '');
    };

    const baseNorm = normalizeColorForComparison(baseLight);
    const darkNorm = normalizeColorForComparison(baseDark);
    const textLightNorm = normalizeColorForComparison(textOnLight);
    const textDarkNorm = normalizeColorForComparison(textOnDark);
    const placeholderNorm = normalizeColorForComparison(PLACEHOLDER_COLOR);

    const reusableColors = paletteColors.filter(c => {
      if (!c || typeof c !== 'string') return false;
      const normalized = normalizeColorForComparison(c);
      // Exclude only exact matches of page backgrounds and text colors
      if (normalized === baseNorm || normalized === darkNorm) return false;
      if (normalized === textLightNorm || normalized === textDarkNorm) return false;
      // Exclude placeholder color
      if (normalized === placeholderNorm) return false;
      return true;
    });

    // Helper to pick from palette pool with fallback
    const pickFromPalette = (preferredColor, fallbackIndex = 0) => {
      if (preferredColor && preferredColor !== PLACEHOLDER_COLOR) return preferredColor;
      return reusableColors[fallbackIndex % Math.max(1, reusableColors.length)] || PLACEHOLDER_COLOR;
    };

    // For minimal palettes, reuse colors from the palette instead of falling back to placeholder
    // All colors are already opaque from normalizePaletteEntries
    const errorLight = getColor('error-light') || pickFromPalette(previewColors.errorLight, 0);
    const errorDark = getColor('error-dark') || pickFromPalette(previewColors.errorDark, 0);
    const noticeLight = getColor('warning-light', 'notice-light') || pickFromPalette(previewColors.noticeLight, 1);
    const noticeDark = getColor('warning-dark', 'notice-dark') || pickFromPalette(previewColors.noticeDark, 1);
    const successLight = getColor('success-light') || pickFromPalette(previewColors.successLight, 2);
    const successDark = getColor('success-dark') || pickFromPalette(previewColors.successDark, 2);

    // Prefer theme.json button colors when available
    // FUTURE ENHANCEMENT: For gradient backgrounds, extract the first color from the gradient
    // and use that for contrast calculation instead of falling back to placeholder.
    const ctaBgLight = pickColor(buttonBgFromStyles, accentDarker, primaryDarker, primaryDark, PLACEHOLDER_COLOR);
    const ctaBgDark = pickColor(buttonBgFromStyles, accentLight, primaryLight, primaryLighter, PLACEHOLDER_COLOR);

    // If CTA background is transparent, calculate text against the underlying page background
    const ctaBgLightForContrast = (ctaBgLight && ctaBgLight.toLowerCase().trim() === 'transparent') ? baseLight : ctaBgLight;
    const ctaBgDarkForContrast = (ctaBgDark && ctaBgDark.toLowerCase().trim() === 'transparent') ? baseDark : ctaBgDark;

    const ctaTextLight = chooseForeground(ctaBgLightForContrast, textOnLight, textOnDark);
    const ctaTextDark = chooseForeground(ctaBgDarkForContrast, textOnLight, textOnDark);

    const ctaHoverBgLight = pickColor(buttonHoverBgFromStyles, accentDark, ctaBgLight, PLACEHOLDER_COLOR);
    const ctaHoverBgDark = pickColor(buttonHoverBgFromStyles, accentLighter, ctaBgDark, PLACEHOLDER_COLOR);

    const effectiveBgForContrast = (bgString, underlyingBgString) => {
      if (typeof bgString !== 'string' || typeof underlyingBgString !== 'string') return bgString;
      // Normalize whitespace including newlines to single spaces
      const s = bgString.replace(/\s+/g, ' ').trim();
      if (!s) return bgString;

      // Helper to composite RGBA over RGB background
      const compositeRgbOverBg = (fgRgba, bgRgb) => {
        const [r, g, b, a = 1] = [fgRgba.r, fgRgba.g, fgRgba.b, fgRgba.a];
        const [br, bg, bb] = bgRgb;
        const outR = Math.round(r * a + br * (1 - a));
        const outG = Math.round(g * a + bg * (1 - a));
        const outB = Math.round(b * a + bb * (1 - a));

        // Validate output to prevent NaN propagation
        if (isNaN(outR) || isNaN(outG) || isNaN(outB)) {
          return { r: br, g: bg, b: bb };
        }

        return { r: outR, g: outG, b: outB };
      };

      // Handle: color-mix(in srgb, <colorA> P%, <colorB>)
      // If colorB is transparent: composite colorA with alpha P% over underlying background
      // Otherwise: mix colorA and colorB at the specified percentages
      const m = s.match(/color-mix\(\s*in\s+srgb\s*,\s*([^,]+?)\s+(\d+(?:\.\d+)?)%\s*,\s*([^\)]+?)\s*\)/i);
      if (m) {
        const aRaw = (m[1] || '').trim();
        const pct = Math.max(0, Math.min(100, parseFloat(m[2] || '0')));
        const bRaw = (m[3] || '').trim();
        const wa = pct / 100;
        const wb = 1 - wa;

        try {
          const aRgb = colorStringToRgb(aRaw);

          // Validate that we got a valid RGB array
          if (!aRgb || !Array.isArray(aRgb) || aRgb.length < 3) {
            return PLACEHOLDER_COLOR;
          }

          if (bRaw.toLowerCase() === 'transparent') {
            const underRgb = colorStringToRgb(underlyingBgString);

            // Validate underlying background RGB
            if (!underRgb || !Array.isArray(underRgb) || underRgb.length < 3) {
              return PLACEHOLDER_COLOR;
            }

            const composited = compositeRgbOverBg({ r: aRgb[0], g: aRgb[1], b: aRgb[2], a: wa }, underRgb);

            // Validate that we got valid numbers; fall back to placeholder if computation failed
            if (isNaN(composited.r) || isNaN(composited.g) || isNaN(composited.b)) {
              return PLACEHOLDER_COLOR;
            }

            return `rgb(${composited.r} ${composited.g} ${composited.b})`;
          }

          const bRgb = colorStringToRgb(bRaw);

          // Validate second color RGB
          if (!bRgb || !Array.isArray(bRgb) || bRgb.length < 3) {
            return PLACEHOLDER_COLOR;
          }

          const mixed = {
            r: Math.round(aRgb[0] * wa + bRgb[0] * wb),
            g: Math.round(aRgb[1] * wa + bRgb[1] * wb),
            b: Math.round(aRgb[2] * wa + bRgb[2] * wb),
          };

          // Validate that we got valid numbers; fall back to placeholder if computation failed
          if (isNaN(mixed.r) || isNaN(mixed.g) || isNaN(mixed.b)) {
            return PLACEHOLDER_COLOR;
          }

          return `rgb(${mixed.r} ${mixed.g} ${mixed.b})`;
        } catch (e) {
          // If color parsing or computation fails, use placeholder color
          return PLACEHOLDER_COLOR;
        }
      }

      return bgString;
    };

    const hoverBgForContrastLight = effectiveBgForContrast(ctaHoverBgLight, baseLight);
    const hoverBgForContrastDark = effectiveBgForContrast(ctaHoverBgDark, baseDark);
    const ctaHoverTextLight = chooseForeground(hoverBgForContrastLight, textOnLight, textOnDark);
    const ctaHoverTextDark = chooseForeground(hoverBgForContrastDark, textOnLight, textOnDark);

    const semanticErrorBg = isDarkMode ? errorDark : errorLight;
    const semanticNoticeBg = isDarkMode ? noticeDark : noticeLight;
    const semanticSuccessBg = isDarkMode ? successDark : successLight;

    const statusErrorText = chooseForeground(semanticErrorBg, textOnLight, textOnDark);
    const statusNoticeText = chooseForeground(semanticNoticeBg, textOnLight, textOnDark);
    const statusSuccessText = chooseForeground(semanticSuccessBg, textOnLight, textOnDark);

    const headingLight = bestForegroundColor(baseLight, [primaryDarker, accentDarker, textOnLight, textOnDark]);
    const headingDark = bestForegroundColor(baseDark, [primaryLight, accentLight, textOnDark, textOnLight]);

    const listItemBgLight = remaining.length > 3 ? remaining[3] : primaryLight;
    const listItemBgDark = remaining.length > 3 ? remaining[3] : primaryDark;
    const listItemTextLight = chooseForeground(listItemBgLight, textOnLight, textOnDark);
    const listItemTextDark = chooseForeground(listItemBgDark, textOnLight, textOnDark);

    const listItemAltBgLight = remaining.length > 4 ? remaining[4] : secondaryLight;
    const listItemAltBgDark = remaining.length > 4 ? remaining[4] : secondaryDark;
    const listItemAltTextLight = chooseForeground(listItemAltBgLight, textOnLight, textOnDark);
    const listItemAltTextDark = chooseForeground(listItemAltBgDark, textOnLight, textOnDark);

    const menuAltBgLight = remaining.length > 5 ? remaining[5] : tertiaryLight;
    const menuAltBgDark = remaining.length > 5 ? remaining[5] : tertiaryDark;
    const menuAltTextLight = chooseForeground(menuAltBgLight, textOnLight, textOnDark);
    const menuAltTextDark = chooseForeground(menuAltBgDark, textOnLight, textOnDark);

    const placeholderCount = [
      baseLight, baseDark, textOnLight, textOnDark,
      primaryLight, primaryDark, primaryLighter, primaryDarker,
      secondaryLight, secondaryDark, secondaryLighter, secondaryDarker,
      tertiaryLight, tertiaryDark, tertiaryLighter, tertiaryDarker,
      accentLight, accentDark, accentLighter, accentDarker,
      errorLight, errorDark, noticeLight, noticeDark, successLight, successDark
    ].filter(c => c === PLACEHOLDER_COLOR).length;

    return {
      baseLight, baseDark, textOnLight, textOnDark,
      primaryLight, primaryDark, primaryLighter, primaryDarker,
      secondaryLight, secondaryDark, secondaryLighter, secondaryDarker,
      tertiaryLight, tertiaryDark, tertiaryLighter, tertiaryDarker,
      accentLight, accentDark, accentLighter, accentDarker,
      errorLight, errorDark, noticeLight, noticeDark, successLight, successDark,
      ctaBgLight, ctaBgDark, ctaTextLight, ctaTextDark,
      hoverBgForContrastLight, hoverBgForContrastDark, ctaHoverTextLight, ctaHoverTextDark,
      headingLight, headingDark,
      listItemBgLight, listItemBgDark, listItemTextLight, listItemTextDark,
      listItemAltBgLight, listItemAltBgDark, listItemAltTextLight, listItemAltTextDark,
      menuAltBgLight, menuAltBgDark, menuAltTextLight, menuAltTextDark,
      paletteColors, placeholderCount, chooseForeground
    };
  }

  function showPreviewModal(startIndex) {
    let currentIndex = startIndex;
    let isDarkMode = false;

    let escHandler = null;
    const closeModal = () => {
      try {
        if (overlay && overlay.parentNode) {
          document.body.removeChild(overlay);
        }
      } catch (e) {/* noop */ }
      if (escHandler) {
        document.removeEventListener('keydown', escHandler);
      }
    };

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
      closeModal();
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
      closeModal();
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

      titleEl.textContent = v.title || v.slug;
      counter.textContent = `${currentIndex + 1} / ${allVariations.length}`;

      // Resolve all colors using extracted function
      const colors = resolvePreviewColors(v, isDarkMode);
      const {
        baseLight, baseDark, textOnLight, textOnDark,
        primaryLight, primaryDark, primaryLighter, primaryDarker,
        secondaryLight, secondaryDark, secondaryLighter, secondaryDarker,
        tertiaryLight, tertiaryDark, tertiaryLighter, tertiaryDarker,
        accentLight, accentDark, accentLighter, accentDarker,
        errorLight, errorDark, noticeLight, noticeDark, successLight, successDark,
        ctaBgLight, ctaBgDark, ctaTextLight, ctaTextDark,
        hoverBgForContrastLight, hoverBgForContrastDark, ctaHoverTextLight, ctaHoverTextDark,
        headingLight, headingDark,
        listItemBgLight, listItemBgDark, listItemTextLight, listItemTextDark,
        listItemAltBgLight, listItemAltBgDark, listItemAltTextLight, listItemAltTextDark,
        menuAltBgLight, menuAltBgDark, menuAltTextLight, menuAltTextDark,
        paletteColors, placeholderCount, chooseForeground
      } = colors;

      const derivedNote = (!paletteColors.length)
        ? 'No palette colors found; using derived defaults.'
        : `This Theme Variation Viewer is designed for the <a href="https://gl-color-palette-generator.vercel.app/" target="_blank" rel="noopener">WPWM Color Palette Generator</a>. For other palettes, colors likely won't be displayed how the theme designer intended. (Found ${paletteColors.length} color(s)${placeholderCount > 0 ? `, ${placeholderCount} slot(s) filled with placeholder` : ''})`;

      // Sanitize all color values before injection to prevent XSS
      const s = sanitizeColorValue;

      previewContent.innerHTML = `
        <div class=\"wpwm-preview\" style=\"
          color-scheme: ${isDarkMode ? 'dark' : 'light'};
          --base-light: ${s(baseLight)};
          --base-dark: ${s(baseDark)};
          --text-on-light: ${s(textOnLight)};
          --text-on-dark: ${s(textOnDark)};
          --primary-light: ${s(primaryLight)};
          --primary-dark: ${s(primaryDark)};
          --primary-lighter: ${s(primaryLighter)};
          --primary-darker: ${s(primaryDarker)};
          --primary-light-contrast: ${s(chooseForeground(primaryLight, textOnLight, textOnDark))};
          --primary-dark-contrast: ${s(chooseForeground(primaryDark, textOnLight, textOnDark))};
          --primary-lighter-contrast: ${s(chooseForeground(primaryLighter, textOnLight, textOnDark))};
          --primary-darker-contrast: ${s(chooseForeground(primaryDarker, textOnLight, textOnDark))};
          --secondary-light: ${s(secondaryLight)};
          --secondary-dark: ${s(secondaryDark)};
          --secondary-lighter: ${s(secondaryLighter)};
          --secondary-darker: ${s(secondaryDarker)};
          --secondary-light-contrast: ${s(chooseForeground(secondaryLight, textOnLight, textOnDark))};
          --secondary-dark-contrast: ${s(chooseForeground(secondaryDark, textOnLight, textOnDark))};
          --secondary-lighter-contrast: ${s(chooseForeground(secondaryLighter, textOnLight, textOnDark))};
          --secondary-darker-contrast: ${s(chooseForeground(secondaryDarker, textOnLight, textOnDark))};
          --tertiary-light: ${s(tertiaryLight)};
          --tertiary-dark: ${s(tertiaryDark)};
          --tertiary-lighter: ${s(tertiaryLighter)};
          --tertiary-darker: ${s(tertiaryDarker)};
          --tertiary-light-contrast: ${s(chooseForeground(tertiaryLight, textOnLight, textOnDark))};
          --tertiary-dark-contrast: ${s(chooseForeground(tertiaryDark, textOnLight, textOnDark))};
          --tertiary-lighter-contrast: ${s(chooseForeground(tertiaryLighter, textOnLight, textOnDark))};
          --tertiary-darker-contrast: ${s(chooseForeground(tertiaryDarker, textOnLight, textOnDark))};
          --accent-light: ${s(accentLight)};
          --accent-dark: ${s(accentDark)};
          --accent-lighter: ${s(accentLighter)};
          --accent-darker: ${s(accentDarker)};
          --accent-light-contrast: ${s(chooseForeground(accentLight, textOnLight, textOnDark))};
          --accent-dark-contrast: ${s(chooseForeground(accentDark, textOnLight, textOnDark))};
          --accent-lighter-contrast: ${s(chooseForeground(accentLighter, textOnLight, textOnDark))};
          --accent-darker-contrast: ${s(chooseForeground(accentDarker, textOnLight, textOnDark))};
          --error-light: ${s(errorLight)};
          --error-dark: ${s(errorDark)};
          --error-light-contrast: ${s(chooseForeground(errorLight, textOnLight, textOnDark))};
          --error-dark-contrast: ${s(chooseForeground(errorDark, textOnLight, textOnDark))};
          --notice-light: ${s(noticeLight)};
          --notice-dark: ${s(noticeDark)};
          --notice-light-contrast: ${s(chooseForeground(noticeLight, textOnLight, textOnDark))};
          --notice-dark-contrast: ${s(chooseForeground(noticeDark, textOnLight, textOnDark))};
          --success-light: ${s(successLight)};
          --success-dark: ${s(successDark)};
          --success-light-contrast: ${s(chooseForeground(successLight, textOnLight, textOnDark))};

          --success-dark-contrast: ${s(chooseForeground(successDark, textOnLight, textOnDark))};
          --cta-bg-light: ${s(ctaBgLight)};
          --cta-bg-dark: ${s(ctaBgDark)};
          --cta-text-light: ${s(ctaTextLight)};
          --cta-text-dark: ${s(ctaTextDark)};
          --cta-hover-bg-light: ${s(hoverBgForContrastLight)};
          --cta-hover-bg-dark: ${s(hoverBgForContrastDark)};
          --cta-hover-text-light: ${s(ctaHoverTextLight)};
          --cta-hover-text-dark: ${s(ctaHoverTextDark)};
          --heading-light: ${s(headingLight)};
          --heading-dark: ${s(headingDark)};
          --list-item-bg-light: ${s(listItemBgLight)};
          --list-item-bg-dark: ${s(listItemBgDark)};
          --list-item-text-light: ${s(listItemTextLight)};
          --list-item-text-dark: ${s(listItemTextDark)};
          --list-item-alt-bg-light: ${s(listItemAltBgLight)};
          --list-item-alt-bg-dark: ${s(listItemAltBgDark)};
          --list-item-alt-text-light: ${s(listItemAltTextLight)};
          --list-item-alt-text-dark: ${s(listItemAltTextDark)};
          --menu-alt-bg-light: ${s(menuAltBgLight)};
          --menu-alt-bg-dark: ${s(menuAltBgDark)};
          --menu-alt-text-light: ${s(menuAltTextLight)};
          --menu-alt-text-dark: ${s(menuAltTextDark)};
        ">
          ${derivedNote ? `<div class="wpwm-preview-note">${derivedNote}</div>` : ''}
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
              <a href="#" class="wpwm-preview-menu-item wpwm-preview-menu-item--alt">Menu item</a>
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
        closeModal();
      }
    });

    // Close on Escape key
    escHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
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
