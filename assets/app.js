/* WPWM Theme Variation Display (colors + fonts) */
(function(){
  const cfg = (window.__WPWM_TVD__) || {};
  const apiBase = cfg.pluginRestBase;

  function el(tag, cls, text){
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  // --- Color helpers for reliable contrast decisions ---
  function parseRgbString(s){
    const m = (s||'').match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/i);
    if (!m) return null;
    const r = parseInt(m[1],10), g = parseInt(m[2],10), b = parseInt(m[3],10);
    const a = typeof m[4] !== 'undefined' ? Math.max(0, Math.min(1, parseFloat(m[4]))) : 1;
    return [r,g,b,a];
  }
  function rgbToLuminance([r,g,b]){
    const [sr, sg, sb] = [r/255, g/255, b/255];
    const lin = [sr,sg,sb].map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
    return 0.2126*lin[0] + 0.7152*lin[1] + 0.0722*lin[2];
  }
  function contrastRatioRGB(a,b){
    const La = rgbToLuminance(a);
    const Lb = rgbToLuminance(b);
    const bright = Math.max(La, Lb);
    const dark = Math.min(La, Lb);
    return (bright + 0.05) / (dark + 0.05);
  }
  function colorStringToRgb(colorStr){
    // Try hex
    const s = (colorStr||'').trim();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)){
      const hex = s.length === 4
        ? '#' + s[1]+s[1]+s[2]+s[2]+s[3]+s[3]
        : s;
      const n = parseInt(hex.slice(1),16);
      return [(n>>16)&255, (n>>8)&255, n&255];
    }
    // Else let the browser resolve it
    const tmp = document.createElement('div');
    tmp.style.color = s;
    document.body.appendChild(tmp);
    const rgb = getComputedStyle(tmp).color;
    tmp.remove();
    const parsed = parseRgbString(rgb);
    return parsed ? parsed.slice(0,3) : [0,0,0];
  }

  function compositeRGBAoverRGB(fgRGBA, bgRGB){
    const [fr,fg,fb,fa=1] = fgRGBA;
    const [br,bg2,bb] = bgRGB;
    const a = fa;
    const outR = Math.round(fr * a + br * (1 - a));
    const outG = Math.round(fg * a + bg2 * (1 - a));
    const outB = Math.round(fb * a + bb * (1 - a));
    return [outR, outG, outB];
  }

  function whenStylesScreenReady(cb){
    const { subscribe } = wp.data;
    const unsub = subscribe(()=>{
      const host = document.querySelector('.edit-site-style-variations, .edit-site-style-variations__list');
      if (host){ unsub(); cb(host); }
    });
  }

  async function fetchVariations(){
    try{
      // apiFetch expects a path relative to /wp-json, e.g. 'wpwm-tvd/v1/variations'
      let relBase = 'wpwm-tvd/v1';
      try{
        const u = new URL(apiBase, window.location.origin);
        // Strip everything up to and including '/wp-json/'
        relBase = u.pathname.replace(/^\/?/, '').replace(/^.*?wp-json\//, '');
      }catch(_e){ /* fallback to default relBase */ }
      const path = relBase.replace(/\/?$/, '') + '/variations';
      const res = await window.wp.apiFetch({ path });
      return res.variations || [];
    }catch(e){ console.error('WPWM-TVD fetch error', e); return []; }
  }

  function mountPanel(afterEl){
    let panel = document.getElementById('wpwm-tvd-panel');
    if (!panel){
      panel = el('div','', '');
      panel.id = 'wpwm-tvd-panel';
      const header = el('div','wpwm-tvd-header');
      const note = el('div','wpwm-tvd-note','Variable-accurate preview (colors & fonts). Use Select to apply if available.');
      header.appendChild(note);
      panel.appendChild(header);
      const grid = el('div','wpwm-tvd-grid');
      panel.appendChild(grid);
      afterEl.parentElement.insertBefore(panel, afterEl.nextSibling);
    }
    return panel.querySelector('.wpwm-tvd-grid');
  }

  function mountPanelInContainer(container){
    let panel = document.getElementById('wpwm-tvd-panel');
    if (!panel){
      panel = el('div','', '');
      panel.id = 'wpwm-tvd-panel';
      const header = el('div','wpwm-tvd-header');
      const note = el('div','wpwm-tvd-note','Variable-accurate preview (colors & fonts). Use Select to apply if available.');
      header.appendChild(note);
      panel.appendChild(header);
      const grid = el('div','wpwm-tvd-grid');
      panel.appendChild(grid);
      container.appendChild(panel);
    }
    return panel.querySelector('.wpwm-tvd-grid');
  }

  function injectCSS(doc, css){
    if (!css) return;
    const s = doc.createElement('style');
    s.textContent = css;
    doc.head.appendChild(s);
  }

  function normalizeSlug(s){
    return (s||'').toString().toLowerCase().trim().replace(/[^a-z0-9-_]+/g,'-').replace(/^-+|-+$/g,'');
  }

  function rewriteAndSanitizeCss(css, scopeClass){
    if (!css) return '';
    try{
      // Scope common roots to the card-specific class
      let out = css
        .replace(/:root\s*,\s*\.editor-styles-wrapper/g, '.'+scopeClass)
        .replace(/:root(?![\w-])/g, '.'+scopeClass)
        .replace(/\.editor-styles-wrapper/g, '.'+scopeClass);
      // Drop self-referential variable assignments like: --x: var(--x)
      out = out.replace(/(--[a-z0-9-_]+)\s*:\s*var\(\s*\1\s*\)\s*;?/gi, '');
      return out;
    }catch(_e){ return css; }
  }

  function renderCard(grid, v){
    const slug = normalizeSlug(v.slug || v.title || 'variation');
    const scopeClass = 'wpwm-tvd-var--' + slug;
    const card = el('div','wpwm-tvd-card '+scopeClass);

    // Media/preview area without iframe
    const media = el('div','wpwm-tvd-media');
    media.style.display = 'flex';
    media.style.alignItems = 'stretch';
    media.style.justifyContent = 'stretch';

    // Inject scoped CSS variables if provided by variation JSON
    const cssFromJson = (v.config && v.config.styles && v.config.styles.css) ? v.config.styles.css : '';
    const scopedCss = rewriteAndSanitizeCss(cssFromJson, scopeClass);
    if (scopedCss){
      const styleTag = document.createElement('style');
      styleTag.textContent = scopedCss;
      card.appendChild(styleTag);
    }

    // Swatches: only colors defined in the variation
    const swWrap = el('div','wpwm-tvd-swatches');
    swWrap.style.display='flex';
    swWrap.style.height='100%';
    swWrap.style.width='100%';
    const varPalette = (((v.config||{}).settings||{}).color||{}).palette || [];
    if (varPalette.length){
      varPalette.forEach(p=>{
        if (!p) return;
        const sw = document.createElement('div');
        sw.className = 'wpwm-tvd-swatch';
        sw.style.background = (p.color || 'transparent');
        const slug = (p.slug || p.name || '').toString();
        sw.title = slug;
        sw.dataset.slug = slug.toLowerCase();
        const label = document.createElement('div');
        label.className = 'wpwm-tvd-swatch-label';
        label.textContent = slug;
        sw.appendChild(label);
        swWrap.appendChild(sw);
      });
    }
    media.appendChild(swWrap);

    const body = el('div','wpwm-tvd-body');
    const title = el('div','wpwm-tvd-title', v.title || v.slug);
    // Avoid repeating variation name: show only theme/source info
    const metaText = (v.source ? String(v.source) : 'theme') + (v.slug ? ' · ' + v.slug : '');
    const meta = el('div','wpwm-tvd-meta', metaText);

    // Font samples (two common spots): settings.typography.fontFamilies and styles.typography.fontFamily
    const fontsBox = el('div','wpwm-tvd-fonts');
    const ff = (((v.config||{}).settings||{}).typography||{}).fontFamilies || [];
    if (ff.length){
      const row = el('div','font-row');
      ff.slice(0,2).forEach(f=>{
        const s = el('div','sample', f.name || f.slug || 'Font');
        const fam = f.fontFamily || (f['font-family']);
        if (fam) s.style.fontFamily = fam;
        row.appendChild(s);
      });
      fontsBox.appendChild(row);
    }
    const stylesFF = (((v.config||{}).styles||{}).typography||{}).fontFamily;
    if (stylesFF){
      const row = el('div','font-row');
      const s = el('div','sample','Body sample AaBbCc');
      s.style.fontFamily = stylesFF;
      row.appendChild(s);
      fontsBox.appendChild(row);
    }

    // Actions
    const actions = el('div','wpwm-tvd-actions');
    const btnSelect = el('button','', 'Select');
    btnSelect.addEventListener('click', ()=>applyVariation(v));
    const btnPreview = el('button','secondary', 'Preview (temporary)');
    btnPreview.addEventListener('click', ()=>previewInEditor(v));
    actions.appendChild(btnSelect);
    actions.appendChild(btnPreview);

    body.appendChild(title);
    body.appendChild(meta);
    if (fontsBox.children.length) body.appendChild(fontsBox);
    body.appendChild(actions);

    card.appendChild(media);
    card.appendChild(body);
    grid.appendChild(card);

    // After insertion, compute contrast (WCAG) and set label colors
    requestAnimationFrame(()=>{
      try{
        const swatches = card.querySelectorAll('.wpwm-tvd-swatch');
        const style = getComputedStyle(card);
        const lightVarStr = style.getPropertyValue('--text-on-light').trim() || '#000';
        const darkVarStr  = style.getPropertyValue('--text-on-dark').trim() || '#fff';
        const lightRGB = colorStringToRgb(lightVarStr);
        const darkRGB  = colorStringToRgb(darkVarStr);
        const cardBgRGB = (()=>{
          const bg = getComputedStyle(card).backgroundColor;
          const p = parseRgbString(bg);
          return p ? p.slice(0,3) : [255,255,255];
        })();
        swatches.forEach(sw => {
          const bg = getComputedStyle(sw).backgroundColor;
          const label = sw.querySelector('.wpwm-tvd-swatch-label');
          if (!label) return;
          const parsed = parseRgbString(bg);
          let bgRGB;
          if (!parsed){
            bgRGB = lightRGB;
          } else if (parsed.length === 4 && parsed[3] < 1) {
            bgRGB = compositeRGBAoverRGB(parsed, cardBgRGB);
          } else {
            bgRGB = parsed.slice(0,3);
          }
          // Compare contrast with both candidates (TOK on light vs TOK on dark)
          const cLight = contrastRatioRGB(bgRGB, lightRGB);
          const cDark  = contrastRatioRGB(bgRGB, darkRGB);
          const useDarkText = cDark >= cLight; // choose the higher-contrast text color
          label.style.color = useDarkText ? darkVarStr : lightVarStr;
          label.style.opacity = 1;
        });
      } catch(_e) { /* noop */ }
    });
  }

  function previewInEditor(variation){
    // Non-destructive: apply config to current editor session if API exists
    try{
      const editSite = wp.data.dispatch('core/edit-site');
      if (editSite && typeof editSite.setGlobalStylesUserConfig === 'function'){
        editSite.setGlobalStylesUserConfig( variation.config || {} );
        return;
      }
    }catch(e){/* noop */}
    // Fallback: try clicking the core tile with matching title
    const tiles = document.querySelectorAll('.edit-site-style-variations [role="button"], .edit-site-style-variations button');
    for (const t of tiles){
      if ((t.getAttribute('aria-label')||'').includes(variation.title) || (t.textContent||'').includes(variation.title)){
        t.click();
        break;
      }
    }
  }

  function applyVariation(variation){
    // Best-effort: use editor API if present to set user config and save
    try{
      const editSiteDisp = wp.data.dispatch('core/edit-site');
      const coreDisp = wp.data.dispatch('core');
      const coreSel = wp.data.select('core');
      if (editSiteDisp && typeof editSiteDisp.setGlobalStylesUserConfig === 'function'){
        editSiteDisp.setGlobalStylesUserConfig( variation.config || {} );
        // Attempt save via core-data if entity present
        const gs = coreSel.getEditedEntityRecord && coreSel.getEditedEntityRecord('root','globalStyles');
        if (gs && coreDisp.saveEditedEntityRecord){
          coreDisp.saveEditedEntityRecord('root','globalStyles');
        }
        return;
      }
    } catch(e){ console.warn('WPWM-TVD select failed', e); }
    alert('Could not programmatically apply. Please open the default variations and select the matching one.');
  }

  // Mount in Site Editor when styles screen is ready
  if (window.wp && window.wp.data) {
    whenStylesScreenReady(async (host)=>{
      const grid = mountPanel(host);
      const variations = await fetchVariations();
      variations.forEach(v=> renderCard(grid, v));
    });
  }

  // Mount in dedicated admin page
  function initAdminPage(){
    const root = document.getElementById('wpwm-tvd-root');
    if (!root) return;
    (async ()=>{
      const grid = mountPanelInContainer(root);
      const variations = await fetchVariations();
      variations.forEach(v=> renderCard(grid, v));
    })();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initAdminPage);
  } else {
    initAdminPage();
  }
})();
