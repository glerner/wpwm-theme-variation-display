# Color Space Analysis and Visual Hierarchy

## Visual Hierarchy Goals

### Design Principle: Layered Depth
Elements should create visual depth through saturation and lightness changes as they stack. The goal is to make it clear which elements are "on top" of others.

### Light Mode Hierarchy (Bottom to Top)

Following the elevation principle - **darkest to lightest**:

1. **Page background**: `base-light` (near-white, L ~0.97)
2. **Section background**: `primary-light` (L ~0.85, more saturated than page)
3. **Elements on section**: `primary-lighter` (L ~0.92, lighter than section, elevated)
4. **Text/headings**: `primary-darker` (L ~0.30, high contrast)

### Dark Mode Hierarchy (Bottom to Top)

Following the same elevation principle - **darkest to lightest**:

1. **Page background**: `base-dark` (near-black, L ~0.15)
2. **Section background**: `primary-darker` (L ~0.30, lighter than page)
3. **Elements on section**: `primary-dark` (L ~0.35, lighter than section, elevated)
4. **Text/headings**: `primary-light` (L ~0.85, high contrast)

### Color Naming Convention

The palette uses a consistent naming pattern:
- `{color}-lighter`: Highest lightness (closest to white in light mode, closest to black in dark mode)
- `{color}-light`: Medium-high lightness
- `{color}-dark`: Medium-low lightness
- `{color}-darker`: Lowest lightness (closest to black in light mode, closest to white in dark mode)

Each color has a corresponding `-contrast` variable with WCAG-compliant text color.

### CSS Implementation Pattern

Using the modern `light-dark()` CSS function:

```css
.element {
  background: light-dark(var(--primary-light), var(--primary-dark));
  color: light-dark(var(--primary-light-contrast), var(--primary-dark-contrast));
}
```

The `color-scheme` property on the parent element controls which value is used:
- `color-scheme: light` → uses first value
- `color-scheme: dark` → uses second value

### Industry Standard: The Elevation Model

Based on Material Design and Apple's Human Interface Guidelines, the **Elevation Model** is the standard approach used by expert UI designers.

**Core Principle:** Elevated elements get **LIGHTER** (higher OKLCH L value) in both light and dark modes.

#### Light Mode Elevation (Industry Standard)
- **Page Background**: L = 0.80–0.85 (primary-tinted base, WCAG 7+ contrast with dark text) OR L = 0.97 (neutral near-white)
- **Section/Surface**: L = 0.98–0.99 (main content area, nearly white - lighter than page)
- **Cards/Elements**: L = 1.00 (pure white, highest elevation) + shadows

**Delta Rule**: Increment by ~0.02 L for subtle, sophisticated separation

**Two Approaches:**
1. **Neutral Base** (Gemini's example): Page at L=0.97, sections at L=0.99, cards at L=1.00
2. **Branded Base** (Alternative): Page at L=0.80-0.85 with primary tint, sections at L=0.95-0.99, cards at L=1.00

The branded approach creates more visual interest and brand presence, while the neutral approach is more subtle.

#### Dark Mode Elevation (Industry Standard)
- **Page Background**: L = 0.18–0.17 (deepest layer, near-black)
- **Section/Surface**: L = 0.24–0.22 (mid elevation)
- **Cards/Elements**: L = 0.30–0.28 (highest elevation, catches more "light")

**Delta Rule**: Increment by ~0.06 L for distinguishable layers on screens

#### Why This Works
In dark mode, instead of shadows (which don't show on black), we use **lightness to represent elevation**. The closer an object is to the "light source" (the user), the more light it catches.

#### Additional Elevation Helpers
1. **Shadows**: In light mode, shadows are more effective than color changes for depth
2. **Borders**: When lightness difference is very small (~0.01), subtle borders help define edges
3. **Chroma**: In dark mode, keep very low chroma (0.01–0.03) for neutrals; tiny bit of hue makes it feel "premium" vs "dead" gray

### Correct Implementation for WPWM Theme Variation Display

Following the Elevation Model, elements get **lighter** (higher L) as they stack in both modes.

#### Lightness Progression (Bottom to Top)
**Light Mode:** near-black → darker → dark → light → lighter → near-white
**Dark Mode:** near-black → darker → dark → light → lighter → near-white

Bottom to top is **darkest to lightest in BOTH modes**. This creates the correct elevation where higher elements have higher L values in both modes.

#### Correct CSS Pairings (Elevation Model)

The pattern is: **darker ↔ light** and **dark ↔ lighter**

**Page Background:**
- `base-light` ↔ `base-dark`

**Sections (Mid Elevation):**
- `primary-light` ↔ `primary-darker`

**Elevated Elements (High Elevation):**
- `primary-lighter` ↔ `primary-dark`

**Interactive Elements (Buttons/Menu):**
- Normal: `accent-darker` ↔ `accent-light`
- Hover: `accent-dark` ↔ `accent-lighter`

**Alternating List Items:**
- Odd: `secondary-lighter` ↔ `secondary-dark`
- Even: `secondary-light` ↔ `secondary-darker`

**Status Messages (No elevation, just semantic):**
- Error: `error-light` ↔ `error-dark`
- Notice: `notice-light` ↔ `notice-dark`
- Success: `success-light` ↔ `success-dark`

#### Visual Stacking with Shadows

For top-most elements (cards, buttons, modals), add shadows to enhance elevation:

**Light Mode:**
```css
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.06);
```

**Dark Mode:**
Shadows are less effective on dark backgrounds. Use lightness difference instead, but subtle shadows can help:
```css
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2);
```

#### Summary of Pairing Pattern

The pattern is: **darker ↔ light** and **dark ↔ lighter**

This ensures that in both light and dark modes:
- **Lower elevation = lower L value** (darker colors in both modes)
- **Higher elevation = higher L value** (lighter colors in both modes)
- Bottom to top is always: darkest → lightest
- The visual result: elevated elements appear "closer" to the viewer by catching more light
