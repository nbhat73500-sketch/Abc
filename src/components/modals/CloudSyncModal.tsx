import React, { useState } from 'react';
import {
  Cloud,
  RefreshCw,
  X,
  Link2,
  Copy,
  Check,
  ShieldCheck,
  Smartphone,
  Monitor,
  KeyRound,
  Unlink,
  AlertCircle,
  CheckCircle2,
  WifiOff,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  const {
    syncState,
    pendingSyncCount,
    syncLinkConfig,
    activeSyncTarget,
    lastSyncStats,
    lastSyncError,
    triggerCloudSync,
    createSyncRoom,
    joinSyncRoom,
    disconnectSyncRoom,
    linkGoogleAccountSync,
  } = useFinance();
  const { currentUser } = useAuth();

  const [activeMethod, setActiveMethod] = useState<'room' | 'google'>(() =>
    syncLinkConfig.mode === 'google' ? 'google' : 'room'
  );
  const [createPasscode, setCreatePasscode] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [joinPasscode, setJoinPasscode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const isGoogleSignedIn = Boolean(
    currentUser?.providerData?.some((p) => p.providerId === 'google.com')
  );

  const handleManualSync = async () => {
    setFeedbackError(null);
    setFeedbackSuccess(null);
    setIsWorking(true);
    try {
      const stats = await triggerCloudSync();
      if (stats) {
        setFeedbackSuccess(
          `Synced with ${stats.targetLabel} (Pulled ${stats.pulledCount}, Pushed ${stats.pushedCount}).`
        );
      } else {
        setFeedbackError(lastSyncError || 'Could not reach Cloud Firestore. Changes remain safely cached locally.');
      }
    } catch (err: any) {
      setFeedbackError(err.message || 'Cloud sync failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    setFeedbackSuccess(null);
    setIsWorking(true);
    try {
      const created = await createSyncRoom(createPasscode);
      setCreatePasscode('');
      setFeedbackSuccess(
        `Sync Room #${created.roomCode} created & synced! Enter this 6-digit code on your other device.`
      );
    } catch (err: any) {
      setFeedbackError(err.message || 'Failed to create Sync Room.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    setFeedbackSuccess(null);
    setIsWorking(true);
    try {
      const stats = await joinSyncRoom(joinRoomCode, joinPasscode);
      setJoinRoomCode('');
      setJoinPasscode('');
      if (stats) {
        setFeedbackSuccess(
          `Linked to ${stats.targetLabel}! Merged ${stats.pulledCount} cloud record(s) and pushed ${stats.pushedCount} local record(s).`
        );
      } else {
        setFeedbackSuccess('Linked to Sync Room successfully.');
      }
    } catch (err: any) {
      setFeedbackError(err.message || 'Failed to join Sync Room.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleGoogleSync = async () => {
    setFeedbackError(null);
    setFeedbackSuccess(null);
    setIsWorking(true);
    try {
      const stats = await linkGoogleAccountSync();
      if (stats) {
        setFeedbackSuccess(
          `Google Cloud Sync active for ${stats.targetLabel} (Pulled ${stats.pulledCount}, Pushed ${stats.pushedCount}).`
        );
      }
    } catch (err: any) {
      const msg = err?.message || 'Google Sign-In was cancelled or failed.';
      setFeedbackError(msg);
    } finally {
      setIsWorking(false);
    }
  };

  const handleCopyRoomCode = () => {
    if (!syncLinkConfig.roomCode) return;
    navigator.clipboard?.writeText(syncLinkConfig.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const statusMeta = {
    synced: {
      label: 'Synced',
      dot: 'bg-emerald-400',
      badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
    },
    syncing: {
      label: 'Syncing...',
      dot: 'bg-sky-400 animate-ping',
      badge: 'bg-sky-500/20 text-sky-200 border-sky-400/40',
    },
    local: {
      label: 'Local',
      dot: 'bg-amber-400',
      badge: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
    },
    offline: {
      label: 'Offline',
      dot: 'bg-rose-400',
      badge: 'bg-rose-500/20 text-rose-200 border-rose-400/40',
    },
    error: {
      label: 'Retry Needed',
      dot: 'bg-rose-400',
      badge: 'bg-rose-500/20 text-rose-200 border-rose-400/40',
    },
  }[syncState];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-700 via-emerald-700 to-teal-800 p-5 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close Cloud Sync Modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 pr-8">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-inner shrink-0">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold">Mobile ↔ Desktop Cloud Sync</h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusMeta.badge}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                  {statusMeta.label}
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Real-time Firestore sync with automatic offline timestamp conflict resolution
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* Active Sync Status Strip */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>↔</span>
                  <Monitor className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">
                  {syncLinkConfig.mode === 'room'
                    ? `Linked via Sync Room #${syncLinkConfig.roomCode}`
                    : syncLinkConfig.mode === 'google'
                    ? `Linked via Google (${syncLinkConfig.googleEmail || syncLinkConfig.googleDisplayName})`
                    : `Local Device (${activeSyncTarget.label})`}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {syncLinkConfig.lastSyncedAt
                    ? `Last synced: ${new Date(syncLinkConfig.lastSyncedAt).toLocaleTimeString()}`
                    : 'Not yet synced this session'}
                </span>
                {pendingSyncCount > 0 && (
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {pendingSyncCount} local change(s) queued
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleManualSync}
              disabled={isWorking || syncState === 'syncing'}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isWorking || syncState === 'syncing' ? 'animate-spin' : ''}`} />
              <span>{isWorking || syncState === 'syncing' ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          {/* Feedback Alerts */}
          {(feedbackError || (syncState === 'error' && lastSyncError)) && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{feedbackError || lastSyncError}</span>
            </div>
          )}

          {feedbackSuccess && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{feedbackSuccess}</span>
            </div>
          )}

          {syncState === 'offline' && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs">
              <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                You are currently offline. Continue adding expenses, income, or EMI logs freely—clicking <strong>Sync Now</strong> once online will merge everything by timestamp.
              </span>
            </div>
          )}

          {/* Linking Method Switcher */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveMethod('room');
                setFeedbackError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeMethod === 'room'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>6-Digit Sync Room ID</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMethod('google');
                setFeedbackError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeMethod === 'google'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Link2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Google Account Sync</span>
            </button>
          </div>

          {/* Method 1: 6-Digit Sync Room ID */}
          {activeMethod === 'room' && (
            <div className="space-y-4">
              {syncLinkConfig.mode === 'room' && syncLinkConfig.roomCode ? (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-500/50 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Active Sync Room Connected
                    </span>
                    {syncLinkConfig.hasPasscode && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                        <ShieldCheck className="w-3 h-3" />
                        Passcode Protected
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        Enter this 6-Digit Room ID on your other device
                      </p>
                      <p className="text-3xl font-mono font-black tracking-[0.25em] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {syncLinkConfig.roomCode}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyRoomCode}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedCode ? 'Copied' : 'Copy ID'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                      Real-time updates active across all devices in Room #{syncLinkConfig.roomCode}.
                    </p>
                    <button
                      type="button"
                      onClick={disconnectSyncRoom}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer shrink-0"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Unlink Room</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Create New Room */}
                  <form
                    onSubmit={handleCreateRoom}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          1. Start New Sync Room
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Generate a unique 6-digit code on your first device (e.g., Mobile).
                        </p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Optional Passcode
                        </label>
                        <input
                          type="password"
                          value={createPasscode}
                          onChange={(e) => setCreatePasscode(e.target.value)}
                          placeholder="Leave blank or set passcode"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isWorking}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                    >
                      {isWorking ? 'Creating Room...' : 'Generate 6-Digit Room ID'}
                    </button>
                  </form>

                  {/* Join Existing Room */}
                  <form
                    onSubmit={handleJoinRoom}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5 text-sky-600" />
                          2. Join Existing Room
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Enter the 6-digit code from your other device to merge ledgers.
                        </p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          6-Digit Sync Room ID
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={joinRoomCode}
                          onChange={(e) =>
                            setJoinRoomCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                          }
                          placeholder="e.g. 482915"
                          maxLength={6}
                          required
                          className="w-full px-3 py-2 text-sm font-mono font-bold tracking-[0.2em] text-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Room Passcode (if set)
                        </label>
                        <input
                          type="password"
                          value={joinPasscode}
                          onChange={(e) => setJoinPasscode(e.target.value)}
                          placeholder="Optional passcode"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isWorking || joinRoomCode.length !== 6}
                      className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                    >
                      {isWorking ? 'Linking & Merging...' : 'Link & Sync Now'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Method 2: Google Account Sync */}
          {activeMethod === 'google' && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3.5">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Sign in with Google on Mobile & Desktop
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Link both devices automatically using your Google account. Both instances will read and write to your private cloud ledger in real time.
                </p>
              </div>

              {syncLinkConfig.mode === 'google' && syncLinkConfig.googleEmail ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Connected: {syncLinkConfig.googleDisplayName || syncLinkConfig.googleEmail}
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      {syncLinkConfig.googleEmail} · Real-time cloud sync active
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={disconnectSyncRoom}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer shrink-0"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleSync}
                  disabled={isWorking}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                    />
                    <path
                      fill="#34A853"
                      d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                    />
                  </svg>
                  <span>
                    {isWorking
                      ? 'Connecting Google Account...'
                      : isGoogleSignedIn
                      ? 'Switch Cloud Sync to Google Account'
                      : 'Sign in with Google to Sync'}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Conflict Resolution & Last Sync Summary */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Timestamp Conflict Resolution & Non-Destructive Merge</span>
            </div>
            <p className="leading-relaxed">
              Expenses, income, loans, and EMI logs added offline on Mobile or Desktop are never overwritten. Clicking <strong>Sync Now</strong> merges both devices by record timestamp and preserves all paid EMI installments from either device.
            </p>
            {lastSyncStats && (
              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 pt-1">
                Last sync ({lastSyncStats.targetLabel}): {lastSyncStats.pulledCount} pulled · {lastSyncStats.pushedCount} pushed · {lastSyncStats.mergedCount} merged.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Powered by Firebase Firestore + Local Offline Cache
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
