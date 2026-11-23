import React, { useState } from 'react';
import { Smartphone, Download, X, Zap } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './modals/PWAInstallModal';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If already running standalone or dismissed, hide
  if (isInstalled || dismissed) {
    return (
      <PWAInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white px-3 sm:px-6 py-2 border-b border-emerald-500/25 shadow-xs shrink-0 no-print">
        <div className="w-full flex items-center justify-between gap-2 sm:gap-4 text-xs">
          <div className="flex items-center gap-2 truncate min-w-0">
            <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <span className="font-semibold text-emerald-300">
                Install Budget Management App:
              </span>{' '}
              <span className="text-slate-300 hidden md:inline">
                Fast 100% offline access from your phone or desktop home screen.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 active:scale-95 rounded-lg transition-all shadow-xs cursor-pointer"
              title="Install Budget Management on this device"
            >
              {isInstallable ? (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Install App</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Install App</span>
                </>
              )}
            </button>

            <button
              onClick={() => setDismissed(true)}
              className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              title="Dismiss banner"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <PWAInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
