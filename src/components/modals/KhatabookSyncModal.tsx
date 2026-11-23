import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  MessageSquare,
  ArrowRight,
  BookOpen,
  Users,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { KhatabookBridgeService, KhatabookImportResult } from '../../services/khatabookBridgeService';
import { formatINR } from '../../utils/formatters';

interface KhatabookSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KhatabookSyncModal: React.FC<KhatabookSyncModalProps> = ({ isOpen, onClose }) => {
  const { debts, importDebtsBatch, settings } = useFinance();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'guide'>('import');
  const [importResult, setImportResult] = useState<KhatabookImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMessage(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = KhatabookBridgeService.parseKhatabookCsv(text);
        setImportResult(result);
        setIsProcessing(false);
      } catch (err: any) {
        setIsProcessing(false);
        setImportResult({
          success: false,
          importedDebts: [],
          skippedCount: 0,
          partiesDetected: 0,
          totalReceivables: 0,
          totalPayables: 0,
          errors: [err.message || 'Failed to read file.'],
        });
      }
    };

    reader.onerror = () => {
      setIsProcessing(false);
      setStatusMessage('Error reading file from disk.');
    };

    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!importResult || importResult.importedDebts.length === 0) return;

    const count = importDebtsBatch(importResult.importedDebts);
    setStatusMessage(`Successfully imported ${count} ledger records from Khatabook into your Khata Book.`);
    setImportResult(null);
  };

  const handleExportCsv = () => {
    const csv = KhatabookBridgeService.exportToKhatabookCsv(debts, settings.businessName);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Khatabook_Ledger_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusMessage('Khatabook CSV report exported successfully.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-lg">
              KB
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Khatabook Direct Ledger Sync & Bridge
              </h2>
              <p className="text-xs text-slate-500">
                Bidirectional synchronization, WhatsApp payment reminders & Khata statements
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'import'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Upload className="w-4 h-4" />
            Import from Khatabook
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'export'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Download className="w-4 h-4" />
            Export to Khatabook Format
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'guide'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            API & Link Guide
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {statusMessage && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* TAB 1: IMPORT FROM KHATABOOK */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-center space-y-3">
                <FileSpreadsheet className="w-10 h-10 text-purple-600 dark:text-purple-400 mx-auto" />
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Select Khatabook Ledger Statement (CSV/Excel)
                  </h3>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
                    Export your party ledger report from Khatabook (Web or Android app) and select the file here to import all receivables and payables.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-2 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isProcessing ? 'Parsing File...' : 'Choose Khatabook CSV File'}
                </button>
              </div>

              {/* Import Preview */}
              {importResult && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      File Verification & Summary
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                        importResult.success
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {importResult.success ? 'Verified Valid' : 'Check Format'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Entries</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {importResult.importedDebts.length}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Unique Parties</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {importResult.partiesDetected}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Receivables (Lent)</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {formatINR(importResult.totalReceivables)}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Payables (Borrowed)</span>
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                        {formatINR(importResult.totalPayables)}
                      </span>
                    </div>
                  </div>

                  {importResult.importedDebts.length > 0 && (
                    <div className="pt-2">
                      <button
                        onClick={handleConfirmImport}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Import All {importResult.importedDebts.length} Records into Khata Book
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPORT TO KHATABOOK */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Export Khata Ledger in Khatabook CSV Format
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Compatible with Khatabook, Vyapar, and Excel ledger spreadsheets.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">
                    Current active records ready for export:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {debts.length} Khata Entries
                  </span>
                </div>

                <button
                  onClick={handleExportCsv}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  Download Khatabook Compatible CSV Report
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: API & INTEGRATION GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
                <h4 className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Khatabook Public API Architecture Note
                </h4>
                <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                  Khatabook is a proprietary closed ecosystem and does not publish public self-serve REST API keys. DhanVault provides direct integration through:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-800 dark:text-amber-300">
                  <li>
                    <strong>Bidirectional CSV/Excel Synchronization</strong>: Export statements from the Khatabook app and import them directly with automatic party and balance mapping.
                  </li>
                  <li>
                    <strong>WhatsApp Payment Collection Reminders</strong>: Click the WhatsApp icon next to any party in your Khata Book to send pre-formatted UPI collection links directly to their phone.
                  </li>
                  <li>
                    <strong>Double-Entry Accounting Reversals</strong>: When settling any debt, choose the receiving bank/cash account to record the cash flow automatically in your P&L and balance sheet.
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  How to Send WhatsApp Reminders (Like Khatabook)
                </h4>
                <p className="text-[11px] leading-relaxed">
                  Go to <strong>Khata Book & Bills</strong> &rarr; find any pending receivable &rarr; click the <strong>Send WhatsApp Reminder</strong> button. It opens WhatsApp directly with a professional polite payment reminder with the party name and amount due.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
