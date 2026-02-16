import { Capacitor } from '@capacitor/core';

/**
 * Check if running as a native mobile app (Android/iOS)
 */
export const isNativePlatform = () => Capacitor.isNativePlatform();

/**
 * Get the current platform: 'android' | 'ios' | 'web'
 */
export const getPlatform = () => Capacitor.getPlatform();

/**
 * Initialize Capacitor plugins for native platforms.
 * Call this once in main.tsx after app mount.
 */
export async function initCapacitor() {
  if (!isNativePlatform()) return;

  try {
    // Handle Android back button
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    // Hide splash screen after app is ready
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();

    // Set status bar style
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#10b981' });
  } catch (error) {
    console.warn('Capacitor plugin initialization error:', error);
  }
}
