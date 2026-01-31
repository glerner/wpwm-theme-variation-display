/* Site Editor Error Trap - Debug helper for TypeError: (i || []) is not iterable */
function wpwmSiteEditorErrorTrap() {
  console.log('WPWM Error Trap: Initializing Site Editor error monitoring');

  // Store original console.error to preserve it
  const originalError = console.error;
  
  // Track if we've already logged this specific error to avoid spam
  let errorLogged = false;

  // Override console.error to catch React errors
  console.error = function(...args) {
    const errorMsg = args.join(' ');
    
    if (errorMsg.includes('is not iterable') && !errorLogged) {
      errorLogged = true;
      console.group('🔴 WPWM Error Trap: Caught iteration error');
      console.log('Error message:', errorMsg);
      console.log('Full arguments:', args);
      console.log('Stack trace:', new Error().stack);
      
      // Try to get current global styles data
      if (window.wp && window.wp.data) {
        try {
          const select = window.wp.data.select;
          const globalStyles = select('core').getEntityRecord('root', 'globalStyles', 
            select('core/__experimentalBlockEditor').getSettings().__experimentalGlobalStylesBaseStyles?.id
          );
          console.log('Current global styles:', globalStyles);
          
          if (globalStyles && globalStyles.settings) {
            console.log('Settings.color.palette:', globalStyles.settings?.color?.palette);
            console.log('Settings.color.gradients:', globalStyles.settings?.color?.gradients);
            console.log('Settings.color.duotone:', globalStyles.settings?.color?.duotone);
            console.log('Settings.typography.fontFamilies:', globalStyles.settings?.typography?.fontFamilies);
            console.log('Settings.typography.fontSizes:', globalStyles.settings?.typography?.fontSizes);
          }
        } catch (e) {
          console.log('Could not retrieve global styles:', e.message);
        }
      }
      
      console.groupEnd();
    }
    
    // Call original console.error
    originalError.apply(console, args);
  };

  // Add global error handler for uncaught errors
  window.addEventListener('error', function(event) {
    if (event.message && event.message.includes('is not iterable')) {
      console.group('🔴 WPWM Error Trap: Uncaught error event');
      console.log('Message:', event.message);
      console.log('Filename:', event.filename);
      console.log('Line:', event.lineno, 'Column:', event.colno);
      console.log('Error object:', event.error);
      
      // Try to inspect the problematic data
      if (window.wp && window.wp.data) {
        try {
          const select = window.wp.data.select;
          const coreEditor = select('core/editor');
          const blockEditor = select('core/block-editor');
          
          console.log('Editor settings:', blockEditor?.getSettings?.());
          console.log('Current post:', coreEditor?.getCurrentPost?.());
          
          // Check for malformed arrays in settings
          const settings = blockEditor?.getSettings?.() || {};
          Object.keys(settings).forEach(key => {
            const value = settings[key];
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              // Check if it looks like it should be an array (has numeric keys)
              const keys = Object.keys(value);
              const hasNumericKeys = keys.some(k => !isNaN(parseInt(k)));
              if (hasNumericKeys) {
                console.warn(`⚠️ Possible malformed array in settings.${key}:`, value);
              }
            }
          });
        } catch (e) {
          console.log('Could not inspect editor state:', e.message);
        }
      }
      
      console.groupEnd();
    }
  });

  // Monitor for React error boundaries
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && event.reason.message.includes('is not iterable')) {
      console.group('🔴 WPWM Error Trap: Unhandled promise rejection');
      console.log('Reason:', event.reason);
      console.log('Promise:', event.promise);
      console.groupEnd();
    }
  });

  console.log('WPWM Error Trap: Monitoring active');
}

// Initialize immediately
wpwmSiteEditorErrorTrap();
