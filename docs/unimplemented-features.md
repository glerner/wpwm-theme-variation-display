# Unimplemented Features - Theme Variation Display

**Date**: 2026-02-10
**Related**: Code review findings from app-js-code-review-2026-02-04.md

## Overview

This document tracks features mentioned in documentation or code comments that are not yet fully implemented in the Theme Variation Display plugin. These are noted during code review but don't require immediate action.

## Features Not Yet Implemented

## High Priority - Next to Implement

### 1. OKLCH as Primary Color Format

**Status**: Not implemented - currently uses hex as primary format
**Priority**: High - foundational change for color system
**Description**: Make OKLCH the main color format in the Color Palette Generator, with other formats (Hex, HSL) stored alongside it for compatibility.

**Requirements**:
- Color Palette Generator should store OKLCH as the primary format
- Store Hex and HSL as derived/companion formats
- Ensure Theme Variation Display works seamlessly with OKLCH values
- All color calculations and conversions should use OKLCH internally
- Maintain backward compatibility with existing hex-based variations

**Impact**:
- Better perceptual uniformity for color calculations
- More accurate contrast and luminance calculations
- Improved color interpolation and mixing
- Future-proof for modern CSS color features

**Implementation Notes**:
- Theme Variation Display already has `oklchToRgb()` function (validated in recent code review)
- Need to update Color Palette Generator to output OKLCH as primary
- Consider migration path for existing variations
- Test all color resolution paths with OKLCH values

### 2. Variation Management for Paid Plans

**Status**: Not implemented - needs architecture for scale
**Priority**: High - required for paid tier functionality
**Description**: Support filtering and managing large numbers of variations (480+ variations: 24 variations × 20 color sets).

**Requirements**:

**File Organization**:
- Each theme in separate folder (standard WordPress structure)
- `<theme>/styles/` contains only active variations
- Agency users manage their own theme variation files
- Document folder labeling system for variation archives

**Variation Metadata**:
- Add custom field (WordPress-ignored) for variation comments
- Track what was changed to create this variation
- Track which variation this was based on
- Example schema addition:
  ```json
  {
    "title": "Variation Name",
    "slug": "variation-slug",
    "_wpwm_meta": {
      "comment": "Increased contrast for accessibility",
      "basedOn": "parent-variation-slug",
      "created": "2026-02-10",
      "colorSet": "ocean-blues"
    }
  }
  ```

**Performance Requirements**:
- Theme Variation Display must handle 480+ variations efficiently
- Implement lazy loading or pagination if needed
- Consider virtual scrolling for large variation lists
- Optimize card rendering for performance

**User Workflow**:
- Agency users move variations working on, into a WordPress theme folder
- Archive inactive variations outside WordPress structure
- Clear documentation for folder organization
- Consider CLI tools for bulk variation management

**Implementation Notes**:
- Test with 480 variations to identify performance bottlenecks
- Consider caching strategies for variation metadata
- May need database indexing for variation searches
- Document best practices for variation organization

---

## Medium Priority

### 3. Page Background Selection in Color Palette Generator

**Status**: Not implemented in Theme Variation Display
**Location**: Mentioned in user request
**Description**: The Color Palette Generator has page background selection functionality that isn't yet fully implemented in the generator itself, and consequently isn't available in the Theme Variation Display.

**Impact**:
- Theme Variation Display currently derives page backgrounds from palette colors using luminance sorting
- Manual page background selection would provide more control over which colors are used for light/dark backgrounds

**Notes for Future Implementation**:
- Would require updates to the variation JSON schema to include explicit page background selections
- Theme Variation Display would need to read and respect these selections instead of deriving them
- Fallback logic should remain for variations without explicit selections

### 2. Gradient Background Support for Buttons

**Status**: Partial implementation
**Location**: `@/home/george/sites/wpwm-theme-variation-display/assets/app.js:1807-1808`
**Code Comment**:
```javascript
// FUTURE ENHANCEMENT: For gradient backgrounds, extract the first color from the gradient
// and use that for contrast calculation instead of falling back to placeholder.
```

**Description**: When button backgrounds use CSS gradients, the current implementation falls back to placeholder colors for contrast calculations.

**Impact**:
- Button text colors may not have optimal contrast when buttons use gradient backgrounds
- Preview modal shows placeholder colors instead of gradient-aware contrast

**Notes for Future Implementation**:
- Parse gradient syntax to extract dominant color
- Use extracted color for WCAG contrast calculations
- Consider average color or weighted color based on gradient stops
- Consider using the first color of the gradient for the portion of the button background that has text on it, and gradient for the rest of the button background

### 3. Enhanced Color Palette Generator Integration

**Status**: Mentioned but not detailed
**Location**: Preview modal note text
**Description**: The Theme Variation Display is designed specifically for palettes from the WPWM Color Palette Generator. Other palette structures may not display as intended.

**Current Behavior**:
- Works best with palettes that follow the generator's naming conventions
- Falls back to placeholder colors for missing semantic color roles
- Derives colors from available palette when specific roles aren't defined

**Potential Enhancements**:
- Auto-detect palette structure and adapt display accordingly
- Provide admin UI to map palette colors to display roles
- Support additional palette formats beyond the generator's output (Oxygen, Bricks, Elementor, Kadence, Greenshift, perhaps SeedProd and Thrive Architect -- only those that have semantic naming)
-- low priority for the Theme Variation Display plugin; medium priority for the WPWM Color Palette Generator to add the generated palette to those systems. Until then, the CSS variables are available for use in those systems.

## Related Documentation

- Code Review: `docs/app-js-code-review-2026-02-04.md`
- Color Palette Generator: https://gl-color-palette-generator.vercel.app/

## Notes

These unimplemented features don't block current functionality. The Theme Variation Display works well with its current feature set. These items are documented for future consideration and planning.
