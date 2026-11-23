import React, { useState } from 'react';
import {
  Smartphone,
  Monitor,
  Apple,
  Download,
  X,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  WifiOff,
  Zap,
  HardDrive,
  Info,
  ArrowRight,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isAndroid, isIOS, isInIframe, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'auto' | 'android' | 'desktop' | 'ios'>(() => {
    if (isAndroid) return 'android';
    if (isIOS) return 'ios';
    return 'desktop';
  });
  const [installSuccess, setInstallSuccess] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
        setInstallSuccess(false);
      }, 2000);
    }
  };

  const handleCopyStandaloneUrl = () => {
    try {
      navigator.clipboard?.writeText(window.location.href);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2500);
    } catch {
      // Clipboard fallback unavailable
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white overflow-hidden my-auto">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner shrink-0">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Install Budget Management</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[10px] font-black uppercase tracking-wider">
                  Offline PWA
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Install as a native application on Android, Desktop, or iOS
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Status Badge & Direct Native Action */}
          {isInstalled ? (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-emerald-900 dark:text-emerald-200">
                  Application Is Already Installed!
                </p>
                <p className="text-emerald-700 dark:text-emerald-300 text-[11px] mt-0.5">
                  You are running or have installed Budget Management. It operates with full offline support.
                </p>
              </div>
            </div>
          ) : isInstallable ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="font-bold text-sm text-emerald-900 dark:text-emerald-100 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  Direct 1-Click Install Ready!
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Your browser is ready to install the native standalone package immediately.
                </p>
              </div>
              <button
                onClick={handleNativeInstall}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{installSuccess ? 'Installed!' : 'Install Now'}</span>
              </button>
            </div>
          ) : null}

          {/* Iframe Notice & One-Click Separate Window Launcher */}
          {isInIframe && !isInstalled && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/80 rounded-xl">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    Running inside preview frame
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 text-[11px] leading-relaxed">
                    Browser security prevents direct PWA install prompts from triggering inside an embedded iframe. Open the app in its own browser tab to trigger Chrome's native Install button.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyStandaloneUrl}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{urlCopied ? 'App URL Copied! Paste in Chrome/Edge Tab' : 'Copy App URL for Standalone Tab'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Device Tabs */}
          <div>
            <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'android'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android Phone</span>
              </button>
              <button
                onClick={() => setActiveTab('desktop')}
                className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'desktop'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Chrome Desktop</span>
              </button>
              <button
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'ios'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Apple className="w-3.5 h-3.5" />
                <span>iPhone / iPad</span>
              </button>
            </div>

            {/* Tab 1: Android Instructions */}
            {activeTab === 'android' && (
              <div className="pt-4 space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Open in Google Chrome
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                      Open this URL in Google Chrome on your Android smartphone.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Tap the 3 dots (⋮)
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                      In the top-right corner of Chrome, tap the menu icon (⋮).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Tap "Install app" or "Add to Home screen"
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                      Confirm installation. The app will appear in your Android app drawer and home screen.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Desktop Instructions */}
            {activeTab === 'desktop' && (
              <div className="pt-4 space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Check the Address Bar Icon (⊕)
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                      Look at the right side of your Chrome or Edge URL bar for an install icon (a monitor with down arrow).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Or Open Chrome Menu (⋮)
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                      Click the 3 dots in Chrome → select <strong>"Save and share"</strong> → click <strong>"Install Smart Daily Expenses..."</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: iOS Instructions */}
            {activeTab === 'ios' && (
              <div className="pt-4 space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Open in Safari
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                      Apple requires using Safari for home-screen installation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Tap the Share Button (⬆)
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                      Tap the square icon with an arrow pointing up at the bottom of Safari.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Tap "Add to Home Screen"
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                      Scroll down, select "Add to Home Screen", then tap "Add" in the top right.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Key Advantages */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <WifiOff className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <div className="text-[11px] font-bold">100% Offline</div>
              <div className="text-[10px] text-slate-400">Zero data required</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <Zap className="w-4 h-4 text-amber-500 mx-auto mb-1" />
              <div className="text-[11px] font-bold">Instant Launch</div>
              <div className="text-[10px] text-slate-400">Under 0.2s load</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <HardDrive className="w-4 h-4 text-sky-500 mx-auto mb-1" />
              <div className="text-[11px] font-bold">&lt; 5MB Storage</div>
              <div className="text-[10px] text-slate-400">Lightweight app</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Secure PWA Standard</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
