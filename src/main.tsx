import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Register unified Workbox PWA Service Worker for clean Desktop & Mobile standalone execution
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        updateSW(true);
      },
      onOfflineReady() {
        console.log('[PWA] App ready to work offline on Desktop & Mobile.');
      },
      onRegisterError(err) {
        console.warn('[PWA] Service Worker registration deferred:', err);
      },
    });
  } catch (err) {
    console.warn('[PWA] Service Worker setup skipped:', err);
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
