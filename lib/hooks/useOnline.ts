'use client';

import { useEffect, useState } from 'react';

// Returns the current browser online status. Starts as `true` during SSR /
// initial render to avoid a flash of the offline banner.
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setOnline(navigator.onLine);
    }
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}
