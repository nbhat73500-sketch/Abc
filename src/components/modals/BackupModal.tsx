import React, { useState, useRef } from 'react';
import { X, Download, Upload, CheckCircle2, AlertTriangle, Shield, User, Phone } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { FinancialDataBackup } from '../../types/finance';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose }) => {
  const {
    exportFinancialData,
    importFinancialData,
    settings,
    updateSettings,
    transactions,
    accounts,
  } = useFinance();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [pinInput, setPinInput] = useState(settings.securityPin || '');
  const [pinEnabled, setPinEnabled] = useState(settings.pinLockEnabled);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string) as FinancialDataBackup;
        const success = importFinancialData(json);
        if (success) {
          setStatusMessage({
            text: `Successfully imported backup with ${json.transactions?.length || 0} transactions!`,
            type: 'success',
          });
        } else {
          setStatusMessage({
            text: 'Invalid financial data format in backup file.',
            type: 'error',
          });
        }
      } catch {
        setStatusMessage({
          text: 'Failed to read JSON backup file. Please verify file integrity.',
          type: 'error',
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSavePinSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinEnabled && (!pinInput || pinInput.length < 4)) {
      setStatusMessage({ text: 'PIN must be at least 4 digits', type: 'error' });
      return;
    }
    updateSettings({
      pinLockEnabled: pinEnabled,
      securityPin: pinEnabled ? pinInput : undefined,
    });
    setStatusMessage({
      text: pinEnabled ? 'Security PIN successfully updated & activated.' : 'PIN Lock disabled.',
      type: 'success',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 my-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Data Management & Security
            </h3>
            <p className="text-xs text-slate-500">
              Backup, restore, and PIN protection
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMessage && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="mt-4 space-y-5">
          {/* Section 1: Backup & Restore */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-2">
              Persistent Storage ({transactions.length} Transactions across {accounts.length} Accounts)
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Export all your records into a standardized JSON backup file or restore previously saved data.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportFinancialData}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                Export Full Backup (.json)
              </button>

              <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer transition-colors shadow-xs">
                <Upload className="w-3.5 h-3.5 text-sky-600" />
                Restore from File
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  try {
                    const safe = localStorage.getItem('dhanvault_financial_backup_safe') || localStorage.getItem('dhanvault_pre_reset_backup');
                    if (safe) {
                      const parsed = JSON.parse(safe);
                      const ok = importFinancialData(parsed);
                      if (ok) {
                        setStatusMessage({ text: 'Safeguarded data restored successfully!', type: 'success' });
                        return;
                      }
                    }
                    setStatusMessage({ text: 'No safety snapshot found.', type: 'error' });
                  } catch {
                    setStatusMessage({ text: 'Failed to restore snapshot.', type: 'error' });
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg transition-colors shadow-xs"
                title="Restore from continuous auto-safe snapshot"
              >
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                Restore Auto-Safe Snapshot
              </button>
            </div>
          </div>

          {/* Section 2: Security PIN Lock */}
          <form onSubmit={handleSavePinSettings} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  Privacy & PIN Protection
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={pinEnabled}
                  onChange={(e) => setPinEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {pinEnabled && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="password"
                  maxLength={6}
                  placeholder="Set 4-digit PIN"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  className="w-32 px-3 py-1.5 text-xs text-center tracking-widest font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 rounded-lg"
                >
                  Save PIN
                </button>
              </div>
            )}
            <p className="text-[11px] text-slate-500">
              Protects ledger from unauthorized view when shared or left open on desktop.
            </p>
          </form>

          {/* Developer & Support Info */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  Developer: Naseer Ul Haq
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>+91-7006708349</span>
                </p>
              </div>
            </div>
            <a
              href="tel:+917006708349"
              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 hover:bg-emerald-200/80 dark:bg-emerald-950/80 rounded-lg transition-colors"
            >
              Contact
            </a>
          </div>

        </div>
      </div>
    </div>
  );
};
