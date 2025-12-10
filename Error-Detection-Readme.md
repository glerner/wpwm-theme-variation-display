# Error Detection & Auto-Fix System

## Overview

The WPWM Theme Variation Display plugin now includes comprehensive error detection and automatic fixing for common theme.json data structure issues.

## What It Detects

### 1. **Palette Structure Errors**
- **Issue**: Palette is an object with numeric keys instead of an array
- **Cause**: WordPress `setGlobalStylesUserConfig()` API has a bug that sometimes converts arrays to objects when merging data. This plugin triggers the bug when applying variations.
- **Fix**: Automatically converts back to proper array format before passing to WordPress

### 2. **Missing Slugs**
- **Issue**: Palette entries without `slug` field
- **Cause**: Malformed variation files or corrupted database entries
- **Fix**: Logs the error (cannot auto-fix, requires manual correction)

### 3. **Missing Colors**
- **Issue**: Palette entries without `color` field
- **Cause**: Incomplete variation data
- **Fix**: Logs the error (cannot auto-fix, requires manual correction)

### 4. **Font Families Structure Errors**
- **Issue**: fontFamilies is an object instead of an array
- **Cause**: Same WordPress API bug
- **Fix**: Automatically converts to proper array

### 5. **Font Sizes Structure Errors**
- **Issue**: fontSizes is an object instead of an array
- **Cause**: Same WordPress API bug
- **Fix**: Automatically converts to proper array

## How It Works

### Client-Side (JavaScript)
When you apply a variation, the plugin:
1. **Validates** the variation config before sending to WordPress
2. **Detects** any structural issues
3. **Auto-fixes** array/object conversion issues
4. **Logs** all errors to the server
5. **Shows** a user-friendly warning if issues were found

### Server-Side (PHP)
The plugin provides:
1. **REST endpoint** (`/wpwm-tvd/v1/log-error`) to receive error reports
2. **Log file** (`better-variation-display-error.log`) with detailed error information
3. **Formatted output** with timestamps, variation names, and full error details

## Log File Format

Errors are logged to: `/wp-content/plugins/wpwm-theme-variation-display/better-variation-display-error.log`

Example entry:
```
================================================================================
TIMESTAMP: 2025-12-09T15:30:00.000Z
VARIATION: FieryIceCreamDelight spta
SOURCE FILE: wp-content/themes/website-tech/styles/fieryicecreamdelight-psta.json
ERROR COUNT: 1
--------------------------------------------------------------------------------

ERROR #1:
  TYPE: PALETTE_STRUCTURE_ERROR
  ORIGIN: theme
  ISSUE: Palette is an object with numeric keys instead of an array
  ITEM COUNT: 35
  ORIGINAL STRUCTURE (first 5 items):
    {
      "0": {
        "slug": "primary-dark",
        "color": "var(--primary-dark)",
        "name": "P Dark"
      },
      "1": {
        "slug": "secondary-dark",
        "color": "var(--secondary-dark)",
        "name": "S Dark"
      },
      ...
    }

================================================================================
```

## User Experience

### When Errors Are Found
1. **Browser Console**: Detailed error log with full data
2. **WordPress Notice**: "Variation data had X issue(s) that were automatically fixed. Check browser console for details."
3. **Log File**: Permanent record of all errors for debugging

### When No Errors
- Variation applies silently
- No warnings or notices
- Normal operation

## For Developers

### Testing Error Detection
To test the error detection system:

1. Apply a variation through the Theme Variation Display
2. Check browser console for `WPWM-TVD: Validation errors found:`
3. Check the log file for detailed error information

### Adding New Validations
To add new error checks, edit `assets/app.js` in the `applyVariation` function around line 340-440.

Pattern:
```javascript
if (/* condition that indicates error */) {
  hasErrors = true;
  errorLog.push({
    type: 'ERROR_TYPE_NAME',
    origin: origin,
    issue: 'Description of the issue',
    // ... any other relevant data
  });

  // Apply fix if possible
  // ...
}
```

## Known Issues Fixed

### Issue: Site Editor Crashes with "Undefined array key 'slug'"
- **Root Cause**: WordPress core doesn't validate palette entries before accessing `slug` key
- **Our Fix**: Filter in `functions.php` removes entries without slugs before WordPress processes them
- **Prevention**: This plugin now validates and fixes data before it reaches WordPress

### Issue: Site Editor Crashes with "i.find is not a function"
- **Root Cause**: WordPress Site Editor API converts arrays to objects with numeric keys
- **Our Fix**: Plugin detects and converts back to arrays before saving
- **Prevention**: Validation runs on every variation application

## 📋 Testing & Monitoring

1. **Upload the updated files**:
   - `assets/app.js`
   - `better-variation-display.php`

2. **Apply a variation** through the Theme Variation Display plugin

3. **Check for errors**:
   - **Browser Console**: Look for `WPWM-TVD: Validation errors found:`
   - **WordPress Notices**: Look for auto-fix warnings
   - **Log File**:
     ```bash
     cat /wp-content/plugins/wpwm-theme-variation-display/better-variation-display-error.log
     ```

4. **No need to delete global styles posts** - the auto-fix handles corrupted data automatically!

### Clearing the Log File
The log file will grow over time. To clear it:
```bash
rm /wp-content/plugins/wpwm-theme-variation-display/better-variation-display-error.log
```

Or truncate it to keep the file but clear contents:
```bash
> /wp-content/plugins/wpwm-theme-variation-display/better-variation-display-error.log
```

## Fixing Corrupted Global Styles

If the Site Editor crashes or won't load, you likely have corrupted global styles data in the database.

### Option 1: WP-CLI Validation & Fix (Recommended)

**Check for errors:**
```bash
wp wpwm-tvd validate-global-styles
```

**Auto-fix structure issues:**
```bash
wp wpwm-tvd validate-global-styles --fix
```

**Check a specific theme:**
```bash
wp wpwm-tvd validate-global-styles --theme=website-tech --fix
```

This command will:
- ✅ Detect array/object structure issues
- ✅ Auto-fix convertible problems
- ✅ Report issues that need manual correction
- ✅ Save the fixed data back to the database

### Option 2: Delete and Start Fresh

If the data is too corrupted to fix:

1. **Find the global styles post ID:**
   ```bash
   wp post list --post_type=wp_global_styles --format=table
   # OR
   wp post list --post_type=wp_global_styles --format=csv --fields=ID,post_name
   ```

2. **Delete it:**
   ```bash
   # if the ID you want is 285
   ID=285
   wp post delete $ID --force
   ```

3. **WordPress will recreate it** the next time you visit the Site Editor

### Option 3: Manual Database Fix

If you don't have WP-CLI access:

1. **Export the post content:**
   ```sql
   SELECT post_content FROM wp_posts
   WHERE post_type = 'wp_global_styles'
   AND post_name LIKE '%your-theme-name%';
   ```

2. **Fix the JSON structure** in a text editor:
   - Find any `"palette": { "0": {...}, "1": {...} }`
   - Change to `"palette": [ {...}, {...} ]`
   - Same for `fontFamilies` and `fontSizes`

3. **Update the database:**
   ```sql
   UPDATE wp_posts
   SET post_content = '[your-fixed-json]'
   WHERE ID = [post-id];
   ```

### Prevention

The plugin now auto-fixes these issues when applying variations, so corruption should no longer occur after updating to this version.

## Support

If you encounter errors that aren't being auto-fixed:
1. Run `wp wpwm-tvd validate-global-styles --fix`
2. Check the log file for details
3. Check browser console for JavaScript errors
4. Verify variation JSON files are valid JSON
5. Ensure all palette entries have `slug`, `color`, and `name` fields
