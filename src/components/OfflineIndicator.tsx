import React, { useState, useEffect, useRef } from 'react';
import { WifiOff, CheckCircle2, X } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      setDismissed(false);
      setShowReconnected(false);
    } else if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!isOnline && !dismissed) {
    return (
      <aside
        aria-label="Offline status"
        className="fixed bottom-16 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-md bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-xl border border-emerald-500/30 shadow-2xl flex items-center justify-between gap-3 text-xs animate-in slide-in-from-bottom-2 duration-300"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <WifiOff className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold flex items-center gap-1.5 text-emerald-400">
              <span>Offline Mode Active</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Changes are saved locally and will automatically merge to the cloud when you reconnect.
            </p>
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-slate-400 hover:text-white rounded shrink-0 cursor-pointer"
          title="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  if (showReconnected) {
    return (
      <aside
        aria-label="Online status"
        className="fixed bottom-16 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-sm bg-emerald-700/95 text-white px-3.5 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-2 duration-300"
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
        <span>Back online · Merging offline records with Cloud Sync</span>
      </aside>
    );
  }

  return null;
};
