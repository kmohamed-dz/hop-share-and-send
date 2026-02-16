/**
 * Capacitor helper utilities for MAAK mobile app.
 * 
 * On web (including v0 preview), all functions are safe no-ops.
 * On native (Android/iOS), Capacitor plugins are loaded dynamically.
 * 
 * NOTE: Capacitor packages are NOT included in the web package.json.
 * They are installed locally when building native apps via:
 *   npm install @capacitor/core @capacitor/cli @capacitor/app @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard
 *   npx cap add android && npx cap add ios && npx cap sync
 */

/**
 * Check if running as a native mobile app (Android/iOS).
 * Returns false on web (including v0 preview).
 */
export const isNativePlatform = (): boolean => {
  try {
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
};

/**
 * Get the current platform: 'android' | 'ios' | 'web'
 */
export const getPlatform = (): string => {
  try {
    return (window as any).Capacitor?.getPlatform?.() ?? 'web';
  } catch {
    return 'web';
  }
};

/**
 * Initialize Capacitor plugins for native platforms.
 * Call this once in main.tsx after app mount.
 * This is a complete no-op on web — no imports attempted.
 */
export async function initCapacitor() {
  // On web, do nothing at all — don't even attempt dynamic imports
  if (!isNativePlatform()) return;

  // On native only, load plugins via Capacitor's global registry
  try {
    const cap = (window as any).Capacitor;
    
    // Handle hardware back button on Android
    const appPlugin = cap?.Plugins?.App;
    if (appPlugin) {
      appPlugin.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          appPlugin.exitApp();
        }
      });
    }

    // Hide splash screen
    const splashPlugin = cap?.Plugins?.SplashScreen;
    if (splashPlugin) {
      await splashPlugin.hide();
    }

    // Configure status bar
    const statusBarPlugin = cap?.Plugins?.StatusBar;
    if (statusBarPlugin) {
      await statusBarPlugin.setStyle({ style: 'LIGHT' });
      await statusBarPlugin.setBackgroundColor({ color: '#10b981' });
    }
  } catch (error) {
    console.warn('Capacitor plugin initialization error:', error);
  }
}
