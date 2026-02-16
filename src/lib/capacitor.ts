/**
 * Check if running as a native mobile app (Android/iOS).
 * Returns false on web (including v0 preview).
 */
export const isNativePlatform = (): boolean => {
  try {
    // Check for Capacitor global injected by native shell
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
 * This is a no-op on web.
 */
export async function initCapacitor() {
  if (!isNativePlatform()) return;

  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();

    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#10b981' });
  } catch (error) {
    console.warn('Capacitor plugin initialization error:', error);
  }
}
