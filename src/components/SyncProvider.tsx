'use client';

import { useEffect, useState } from 'react';
import { pullFromSheets, getSKUs } from '@/lib/store';

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Check if we have local data already
    const hasLocalData = getSKUs().length > 0;

    if (hasLocalData) {
      // Return visit: show content immediately, sync in background
      setReady(true);
      setSyncing(true);
      pullFromSheets().then(() => {
        setSyncing(false);
        // Notify pages to refresh their state from updated localStorage
        window.dispatchEvent(new Event('sheets-synced'));
      });
    } else {
      // First visit / new browser: wait for Sheets data before showing content
      setSyncing(true);
      pullFromSheets().then((data) => {
        setSyncing(false);
        setReady(true);
        if (data) {
          // Notify pages that fresh data is available
          window.dispatchEvent(new Event('sheets-synced'));
        }
      });
    }
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 text-lg">Loading data from cloud...</p>
          <p className="text-gray-400 text-sm mt-1">Connecting to Google Sheets</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {syncing && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-500 text-white text-xs text-center py-0.5">
          Syncing with Google Sheets...
        </div>
      )}
      {children}
    </>
  );
}
