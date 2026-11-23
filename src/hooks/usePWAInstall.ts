import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Module-level global to capture beforeinstallprompt even before React finishes mounting
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach((listener) => listener(globalDeferredPrompt));
    console.log('[PWA] beforeinstallprompt event captured and ready for user trigger.');
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    promptListeners.forEach((listener) => listener(null));
    console.log('[PWA] App successfully installed on device.');
  });
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => globalDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => detectStandalone());
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    const updateStandalone = () => setIsInstalled(detectStandalone());
    updateStandalone();

    const mqStandalone = window.matchMedia('(display-mode: standalone)');
    const mqOverlay = window.matchMedia('(display-mode: window-controls-overlay)');
    mqStandalone.addEventListener?.('change', updateStandalone);
    mqOverlay.addEventListener?.('change', updateStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    const android = /android/.test(ua);
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsAndroid(android);
    setIsIOS(ios);
    setIsDesktop(!android && !ios);

    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    if (globalDeferredPrompt && !deferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt);
    }

    const listener = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt);
      if (!prompt) {
        setIsInstalled(true);
      }
    };
    promptListeners.add(listener);

    return () => {
      promptListeners.delete(listener);
      mqStandalone.removeEventListener?.('change', updateStandalone);
      mqOverlay.removeEventListener?.('change', updateStandalone);
    };
  }, [deferredPrompt]);

  const install = async (): Promise<boolean> => {
    const prompt = deferredPrompt || globalDeferredPrompt;
    if (!prompt) {
      console.warn('[PWA] Install called but no native prompt available (deferredPrompt is null).');
      return false;
    }

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        globalDeferredPrompt = null;
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[PWA] Error during native prompt install:', err);
      return false;
    }
  };

  return {
    isInstallable: !!(deferredPrompt || globalDeferredPrompt),
    isInstalled,
    isAndroid,
    isIOS,
    isDesktop,
    isInIframe,
    install,
  };
}
