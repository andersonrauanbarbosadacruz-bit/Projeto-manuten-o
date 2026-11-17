import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let isReloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || isReloading) return;
    isReloading = true;
    window.location.reload();
  });

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const checkForUpdate = () => {
        if (navigator.onLine) {
          registration.update().catch(() => {});
        }
      };

      // Check immediately on boot, when returning to tab/PWA, and periodically
      checkForUpdate();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkForUpdate();
        }
      });
      window.addEventListener('focus', checkForUpdate);
      window.addEventListener('online', checkForUpdate);
      window.setInterval(() => {
        if (!document.hidden) {
          checkForUpdate();
        }
      }, 30 * 1000);
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
