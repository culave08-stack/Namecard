'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Only register on HTTPS (Vercel) or localhost
    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost && window.location.protocol !== 'https:') return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => {
        // Non-fatal: app still works without offline support
        console.warn('[sw] registration failed', err);
      });
  }, []);

  return null;
}
