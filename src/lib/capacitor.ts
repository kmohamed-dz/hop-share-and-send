/**
 * Capacitor helper utilities for MAAK mobile app.
 *
 * On web (including v0 preview), all functions are safe no-ops.
 * On native (Android/iOS via Capacitor), plugins are accessed
 * through the global window.Capacitor registry — NO npm imports needed here.
 *
 * To build native apps locally, install Capacitor packages:
 *   npm i @capacitor/core @capacitor/cli @capacitor/app
 *   npm i @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard
 *   npx cap add android && npx cap add ios && npx cap sync
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getCapacitor = (): any => (typeof window !== "undefined" ? (window as any).Capacitor : null);

/** Check if running as a native mobile app (Android/iOS). */
export const isNativePlatform = (): boolean => {
  try {
    return !!getCapacitor()?.isNativePlatform?.();
  } catch {
    return false;
  }
};

/** Get the current platform: 'android' | 'ios' | 'web' */
export const getPlatform = (): string => {
  try {
    return getCapacitor()?.getPlatform?.() ?? "web";
  } catch {
    return "web";
  }
};

/**
 * Initialize Capacitor plugins for native platforms.
 * Safe no-op on web — accesses plugins through global registry only.
 */
export async function initCapacitor() {
  if (!isNativePlatform()) return;

  try {
    const plugins = getCapacitor()?.Plugins;
    if (!plugins) return;

    // Handle hardware back button on Android
    const appPlugin = plugins.App;
    if (appPlugin) {
      appPlugin.addListener("backButton", ({ canGoBack }: { canGoBack: boolean }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          appPlugin.exitApp();
        }
      });
    }

    // Hide splash screen
    const splashPlugin = plugins.SplashScreen;
    if (splashPlugin) {
      await splashPlugin.hide();
    }

    // Configure status bar
    const statusBarPlugin = plugins.StatusBar;
    if (statusBarPlugin) {
      await statusBarPlugin.setStyle({ style: "LIGHT" });
      await statusBarPlugin.setBackgroundColor({ color: "#10b981" });
    }
  } catch (error) {
    console.warn("Capacitor plugin init skipped:", error);
  }
}
