import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  parseCSV,
  processRawCsvRows,
  ParsedCsvRow,
  downloadCsvTemplate,
} from '../../utils/csvParser';
import { formatINR, formatDateIN } from '../../utils/formatters';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (count: number) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const {
    transactions,
    categories,
    accounts,
    addTransactionsBatch,
  } = useFinance();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csvFileName, setCsvFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [targetAccountId, setTargetAccountId] = useState<string>(accounts[0]?.id || '');
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>(categories[0]?.id || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrorMessage('Please upload a valid .csv file.');
      return;
    }

    setCsvFileName(file.name);
    setErrorMessage('');
    setSuccessCount(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const { headers, rows } = parseCSV(text);

        if (headers.length === 0 || rows.length === 0) {
          setErrorMessage('The uploaded CSV file is empty or missing headers.');
          setIsProcessing(false);
          return;
        }

        const processed = processRawCsvRows(headers, rows, transactions, categories, accounts);
        setParsedRows(processed);

        // Auto-select valid non-duplicate rows
        const validIndices = new Set<number>();
        processed.forEach((r, idx) => {
          if (r.isValid && !r.isDuplicate) {
            validIndices.add(idx);
          }
        });
        setSelectedIndices(validIndices);
      } catch (err) {
        console.error(err);
        setErrorMessage('Failed to parse CSV file. Please verify format.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allValid = new Set<number>();
      parsedRows.forEach((r, idx) => {
        if (r.isValid && (!skipDuplicates || !r.isDuplicate)) {
          allValid.add(idx);
        }
      });
      setSelectedIndices(allValid);
    } else {
      setSelectedIndices(new Set());
    }
  };

  const handleToggleRow = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
  };

  // Summaries
  const stats = useMemo(() => {
    const total = parsedRows.length;
    const valid = parsedRows.filter((r) => r.isValid).length;
    const duplicates = parsedRows.filter((r) => r.isDuplicate).length;
    const invalid = total - valid;

    let selectedInflow = 0;
    let selectedOutflow = 0;

    selectedIndices.forEach((idx) => {
      const row = parsedRows[idx];
      if (row && row.isValid) {
        if (row.type === 'income') selectedInflow += row.amount;
        else if (row.type === 'expense') selectedOutflow += row.amount;
      }
    });

    return {
      total,
      valid,
      duplicates,
      invalid,
      selectedCount: selectedIndices.size,
      selectedInflow,
      selectedOutflow,
    };
  }, [parsedRows, selectedIndices]);

  const handleCommitImport = () => {
    if (selectedIndices.size === 0) return;

    const categoriesByName = new Map(
      categories.map((c) => [c.name.toLowerCase().trim(), c])
    );
    const accountsByName = new Map(
      accounts.map((a) => [a.name.toLowerCase().trim(), a])
    );

    const rowsToImport: Array<any> = [];

    selectedIndices.forEach((idx) => {
      const row = parsedRows[idx];
      if (!row || !row.isValid) return;

      // Find matched category or default
      let matchedCat = categoriesByName.get(row.categoryName.toLowerCase().trim());
      if (!matchedCat) {
        matchedCat = categories.find((c) => c.id === defaultCategoryId) || categories[0];
      }

      // Find matched account or user selected target account
      let matchedAcc = accountsByName.get(row.accountName.toLowerCase().trim());
      const resolvedAccountId = matchedAcc ? matchedAcc.id : targetAccountId;

      rowsToImport.push({
        type: row.type,
        date: row.date,
        time: row.time || '12:00',
        amount: row.amount,
        categoryId: matchedCat.id,
        subcategory: row.subcategory || matchedCat.subcategories[0] || 'General',
        description: row.description,
        paymentMethod: row.paymentMethod || 'upi',
        accountId: resolvedAccountId,
        vendor: row.vendor || 'Merchant',
        notes: row.notes || undefined,
        tag: row.tag || 'CSV Import',
        isReconciled: true,
      });
    });

    if (rowsToImport.length > 0) {
      addTransactionsBatch(rowsToImport);
      setSuccessCount(rowsToImport.length);
      if (onImportComplete) {
        onImportComplete(rowsToImport.length);
      }
      setTimeout(() => {
        onClose();
      }, 1400);
    }
  };

  const handleReset = () => {
    setCsvFileName('');
    setParsedRows([]);
    setSelectedIndices(new Set());
    setErrorMessage('');
    setSuccessCount(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 my-6 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Import Transactions from CSV
              </h2>
              <p className="text-xs text-slate-500">
                Bulk upload historical records from bank statements or spreadsheets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadCsvTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
              title="Download standardized CSV column header template"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Download Template
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success message banner */}
        {successCount !== null && (
          <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-xs font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Success! {successCount} transactions have been imported into your ledger and balances updated. Closing...
            </span>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-800 dark:text-rose-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Content Area */}
        {parsedRows.length === 0 ? (
          /* Step 1: Upload Dropzone */
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <label className="w-full max-w-xl flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-center group">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40 text-slate-400 group-hover:text-emerald-600 flex items-center justify-center transition-colors mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Choose CSV File or drag and drop here
              </span>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Supports Budget Management exports and Indian bank statements (HDFC, SBI, ICICI, etc.) with Debit/Credit columns
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* Format explanation */}
            <div className="w-full max-w-xl p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-2 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                <HelpCircle className="w-4 h-4 text-sky-600" />
                <span>Supported CSV Formats:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                <li>Standard Budget Management columns (Date, Type, Category, Amount, Vendor, Account)</li>
                <li>Bank passbook exports with separate <strong>Withdrawal / Debit</strong> and <strong>Deposit / Credit</strong> columns</li>
                <li>Flexible date formats: <code className="text-emerald-600 dark:text-emerald-400">DD-MM-YYYY</code>, <code className="text-emerald-600 dark:text-emerald-400">DD/MM/YYYY</code>, or <code className="text-emerald-600 dark:text-emerald-400">YYYY-MM-DD</code></li>
                <li>Automatic Indian Rupee (₹) symbol & commas cleanup</li>
              </ul>
            </div>
          </div>
        ) : (
          /* Step 2: Preview & Configuration */
          <div className="flex-1 flex flex-col space-y-4 pt-4 overflow-hidden">
            {/* Top Config & Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shrink-0">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Default Target Account
                </label>
                <select
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatINR(acc.balance, { hideDecimals: true })})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Fallback Category
                </label>
                <select
                  value={defaultCategoryId}
                  onChange={(e) => setDefaultCategoryId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center pt-4">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => {
                      setSkipDuplicates(e.target.checked);
                      if (e.target.checked) {
                        const next = new Set(selectedIndices);
                        parsedRows.forEach((r, idx) => {
                          if (r.isDuplicate) next.delete(idx);
                        });
                        setSelectedIndices(next);
                      }
                    }}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300"
                  />
                  <span>Skip duplicate rows automatically</span>
                </label>
              </div>
            </div>

            {/* Summary statistics pill strip */}
            <div className="flex items-center justify-between text-xs px-1 shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-900 dark:text-white">
                  File: <span className="font-mono">{csvFileName}</span>
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600 dark:text-slate-400">
                  Selected <strong className="text-slate-900 dark:text-white">{stats.selectedCount}</strong> of {stats.total} rows
                </span>
                {stats.duplicates > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    ({stats.duplicates} duplicates detected)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 tabular-nums">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  +{formatINR(stats.selectedInflow)}
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  -{formatINR(stats.selectedOutflow)}
                </span>
              </div>
            </div>

            {/* Scrollable Preview Table */}
            <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIndices.size > 0 && selectedIndices.size === stats.valid}
                        onChange={(e) => handleToggleSelectAll(e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                    </th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Description / Vendor</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Payment Mode</th>
                    <th className="py-2 px-3 text-right">Amount (₹)</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {parsedRows.map((row, idx) => {
                    const isSelected = selectedIndices.has(idx);

                    return (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          !row.isValid
                            ? 'bg-rose-50/40 dark:bg-rose-950/20 text-slate-400'
                            : row.isDuplicate
                            ? 'bg-amber-50/30 dark:bg-amber-950/20'
                            : isSelected
                            ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                            : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            disabled={!row.isValid}
                            checked={isSelected}
                            onChange={() => handleToggleRow(idx)}
                            className="rounded text-emerald-600 disabled:opacity-30"
                          />
                        </td>

                        <td className="py-2 px-3 font-mono tabular-nums whitespace-nowrap">
                          {formatDateIN(row.date)}
                        </td>

                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`font-semibold uppercase text-[10px] px-1.5 py-0.5 rounded ${
                              row.type === 'income'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : row.type === 'expense'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                            }`}
                          >
                            {row.type}
                          </span>
                        </td>

                        <td className="py-2 px-3 max-w-[200px]">
                          <span className="font-semibold text-slate-900 dark:text-white block truncate">
                            {row.description}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {row.vendor}
                          </span>
                        </td>

                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {row.categoryName}
                        </td>

                        <td className="py-2 px-3 uppercase text-[10px] text-slate-500 whitespace-nowrap">
                          {row.paymentMethod.replace('_', ' ')}
                        </td>

                        <td className="py-2 px-3 text-right font-bold tabular-nums whitespace-nowrap">
                          <span
                            className={
                              row.type === 'income'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-900 dark:text-white'
                            }
                          >
                            {row.type === 'income' ? '+' : '-'}
                            {formatINR(row.amount)}
                          </span>
                        </td>

                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {!row.isValid ? (
                            <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                              {row.validationError || 'Invalid'}
                            </span>
                          ) : row.isDuplicate ? (
                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Duplicate
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline"
              >
                Upload different file
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedIndices.size === 0}
                  onClick={handleCommitImport}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 disabled:opacity-40 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Import {selectedIndices.size} Transactions
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
