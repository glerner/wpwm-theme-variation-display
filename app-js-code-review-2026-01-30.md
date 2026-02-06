# Code Review: assets/app.js

**File**: `/home/george/sites/wpwm-theme-variation-display/assets/app.js`  
**Lines**: 1005  
**Date**: January 30, 2026

---

## Summary

Overall the code is functional and well-structured for a WordPress plugin. However, there are several areas that could be improved for maintainability, security, and consistency.

---

## 1. Function Logic Issues

### 1.1 `getCurrentVariation()` uses `allVariations` before it's populated

**Location**: Lines 139-143

```javascript
const matchedVar = allVariations.find(v =>
  normalizeSlug(v.title) === normalizeSlug(globalStyles.title) ||
  normalizeSlug(v.slug) === normalizeSlug(globalStyles.title)
);
```

**Problem**: `getCurrentVariation()` is called after `fetchVariations()` in both init paths (lines 959-960, 984-985), but the function references `allVariations` which is a module-level variable. If the order ever changes, this will silently fail.

**Fix**: Pass `allVariations` as a parameter to make the dependency explicit:
```javascript
async function getCurrentVariation(variations) {
  // ... use variations instead of allVariations
}
```

### 1.2 `showPreviewModal()` has deeply nested closure accessing outer state

**Location**: Lines 398-676

The `updatePreview()` function (defined inside `showPreviewModal()`) accesses:
- `currentIndex` (mutable outer variable)
- `isDarkMode` (mutable outer variable)
- `allVariations` (module-level)
- `previewContent`, `titleEl`, `counter` (DOM elements from outer scope)

**Problem**: This creates a complex closure that's hard to debug and test.

**Recommendation**: Consider extracting the preview rendering logic into a separate function that takes all needed state as parameters.

---

## 2. Variable Misuse / Scope Issues

### 2.1 `currentIndex` modified in multiple places

**Location**: Lines 399, 440, 445

```javascript
let currentIndex = startIndex;  // line 399
// ...
currentIndex = (currentIndex - 1 + allVariations.length) % allVariations.length;  // line 440
// ...
currentIndex = (currentIndex + 1) % allVariations.length;  // line 445
```

**Assessment**: This is actually **correct** - it's intentional state for modal navigation. The variable is properly scoped to `showPreviewModal()` and only modified by the prev/next button handlers.

**No fix needed** - this is a valid pattern for modal state.

### 2.2 Global state variables

**Location**: Lines 22-23

```javascript
let allVariations = [];
let currentVariationSlug = null;
```

**Problem**: These are module-level mutable state. Multiple functions read and write them:
- `fetchVariations()` returns data, callers assign to `allVariations`
- `getCurrentVariation()` reads `allVariations` and returns slug
- `renderCard()` reads `currentVariationSlug`
- Init functions write both

**Recommendation**: Consider a simple state object:
```javascript
const state = {
  variations: [],
  currentSlug: null
};
```

This makes state mutations more explicit and easier to track.

### 2.3 Unused variable `apiBase`

**Location**: Line 6

```javascript
const apiBase = cfg.pluginRestBase;
```

This is used in `fetchVariations()` and `getCurrentVariation()` but accessed via closure. Consider passing it explicitly or using a config object.

---

## 3. Code Duplication (Should Be Subroutines)

### 3.1 REST API path construction (duplicated 3 times)

**Locations**: Lines 114-120, 154-159, and implicitly in other apiFetch calls

```javascript
let relBase = 'wpwm-tvd/v1';
try {
  const u = new URL(apiBase, window.location.origin);
  relBase = u.pathname.replace(/^\/?/, '').replace(/^.*?wp-json\//, '');
} catch (_e) { /* fallback */ }
const path = relBase.replace(/\/?$/, '') + '/variations';
```

**Fix**: Extract to a helper function:
```javascript
function buildApiPath(endpoint) {
  let relBase = 'wpwm-tvd/v1';
  try {
    const u = new URL(apiBase, window.location.origin);
    relBase = u.pathname.replace(/^\/?/, '').replace(/^.*?wp-json\//, '');
  } catch (_e) { /* fallback */ }
  return relBase.replace(/\/?$/, '') + '/' + endpoint;
}

// Usage:
const res = await window.wp.apiFetch({ path: buildApiPath('variations') });
```

### 3.2 Deep property access pattern (duplicated 10+ times)

**Locations**: Lines 264, 276-277, 358, 462-463, 705, 743, 812, 832, etc.

```javascript
const varPalette = (((variation.config || {}).settings || {}).color || {}).palette || [];
```

**Fix**: Extract to a helper:
```javascript
function getConfigPath(config, ...keys) {
  let obj = config || {};
  for (const key of keys) {
    obj = obj[key] || {};
  }
  return obj;
}

// Usage:
const palette = getConfigPath(variation.config, 'settings', 'color', 'palette') || [];
```

Or use optional chaining (ES2020, supported in your target browsers):
```javascript
const palette = variation.config?.settings?.color?.palette ?? [];
```

### 3.3 Validation logic for palette/fontFamilies/fontSizes (duplicated structure)

**Locations**: Lines 743-808, 811-828, 831-848

All three follow the same pattern:
1. Check if property exists
2. Iterate over origins
3. Check if value is array vs object-with-numeric-keys
4. Log error and fix

**Fix**: Extract to a generic validator:
```javascript
function validateArrayStructure(obj, propertyPath, typeName) {
  const errors = [];
  if (!obj) return { errors, fixed: obj };
  
  Object.keys(obj).forEach(origin => {
    if (obj[origin] && typeof obj[origin] === 'object' && !Array.isArray(obj[origin])) {
      errors.push({
        type: `${typeName}_STRUCTURE_ERROR`,
        origin,
        issue: `${typeName} is an object with numeric keys instead of an array`,
        itemCount: Object.keys(obj[origin]).length
      });
      obj[origin] = Object.values(obj[origin]);
    }
  });
  
  return { errors, fixed: obj };
}
```

### 3.4 Color resolution logic (duplicated in `showPreviewModal` and `renderSwatches`)

**Locations**: Lines 488-507 (`getColor` in `showPreviewModal`) and lines 245-256 (`createColorSwatch`)

Both deal with resolving colors from palette entries, but use different approaches.

**Recommendation**: Unify color resolution into a single helper that handles both CSS variables and direct hex values.

---

## 4. Security Issues

### 4.1 ⚠️ MEDIUM: innerHTML with template literal

**Location**: Lines 565-651

```javascript
previewContent.innerHTML = `
  <div class=\"wpwm-preview\" style=\"...
    ${bgColor}
    ${textColor}
    ...
  \">
    ...
  </div>
`;
```

**Problem**: While the color values come from parsed CSS/palette data (not direct user input), if a malicious variation JSON contained something like:
```json
{ "color": "\"><script>alert('xss')</script><div style=\"" }
```

It could potentially inject HTML.

**Current Mitigation**: The `colorStringToRgb()` function validates hex format, and CSS values are mostly sanitized by the browser's CSS parser. However, the template literal doesn't escape the values.

**Recommended Fix**: Use DOM methods instead of innerHTML, or sanitize values:
```javascript
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Or use CSS.escape() for CSS values:
previewContent.style.setProperty('--wpwm-bg', CSS.escape(bgColor));
```

### 4.2 ✅ GOOD: CSS sanitization exists

**Location**: Lines 231-243

```javascript
function rewriteAndSanitizeCss(css, scopeClass) {
  // ...
  // Drop self-referential variable assignments
  out = out.replace(/(--[a-z0-9-_]+)\s*:\s*var\(\s*\1\s*\)\s*;?/gi, '');
  return out;
}
```

This is good defensive coding against malformed CSS.

### 4.3 ✅ GOOD: REST API uses WordPress nonce

The code properly uses `wp.apiFetch` which handles nonce authentication automatically.

### 4.4 ⚠️ LOW: `alert()` with user-controlled data

**Locations**: Lines 910, 915, 944-945, 946-947, 951

```javascript
alert('Variation "' + (variation.title || variation.slug) + '" applied successfully!');
```

**Problem**: If `variation.title` contains special characters, it could be confusing (though not a security issue with `alert()`).

**Recommendation**: Consider using WordPress notices consistently instead of `alert()`.

---

## 5. Other Recommendations

### 5.1 Magic strings should be constants

**Location**: Various

Strings like `'wpwm-tvd/v1'`, `'core/edit-site'`, `'root'`, `'globalStyles'` appear multiple times.

**Fix**:
```javascript
const API_NAMESPACE = 'wpwm-tvd/v1';
const WP_STORE_EDIT_SITE = 'core/edit-site';
const WP_STORE_CORE = 'core';
```

### 5.2 Console logging should be conditional

**Location**: Throughout (50+ console.log statements)

**Problem**: Excessive logging in production.

**Fix**: Add a debug flag:
```javascript
const DEBUG = window.__WPWM_TVD__?.debug || false;

function log(...args) {
  if (DEBUG) console.log('WPWM-TVD:', ...args);
}
```

### 5.3 Error handling could be more consistent

Some functions use try/catch with console.error, others use console.warn, others silently fail. Consider a unified error handling approach.

### 5.4 Missing JSDoc comments

Functions lack documentation. Adding JSDoc would improve maintainability:
```javascript
/**
 * Fetch all available theme variations from the REST API.
 * @returns {Promise<Array<Object>>} Array of variation objects
 */
async function fetchVariations() {
```

---

## 6. Positive Observations

✅ **Good structure**: Functions are reasonably sized and focused  
✅ **Good naming**: Function and variable names are descriptive  
✅ **Good defensive coding**: Null checks, fallbacks, try/catch blocks  
✅ **Good accessibility**: Uses semantic HTML, ARIA labels in preview  
✅ **Good WordPress integration**: Proper use of wp.data, wp.apiFetch, notices API  
✅ **Good CSS scoping**: Each variation card gets its own scoped CSS class  

---

## Priority Fixes

1. **HIGH**: Extract `buildApiPath()` helper (reduces duplication, prevents bugs)
2. **HIGH**: Use optional chaining for deep property access (cleaner, less error-prone)
3. **MEDIUM**: Sanitize values before innerHTML or switch to DOM methods
4. **MEDIUM**: Extract validation logic into reusable function
5. **LOW**: Add debug flag for console logging
6. **LOW**: Add JSDoc comments

---

## Refactoring Estimate

- **Quick wins** (1-2 hours): Extract `buildApiPath()`, add optional chaining, add debug flag
- **Medium effort** (2-4 hours): Extract validation helper, sanitize innerHTML, unify error handling
- **Larger refactor** (4-8 hours): Restructure state management, add JSDoc, comprehensive testing

