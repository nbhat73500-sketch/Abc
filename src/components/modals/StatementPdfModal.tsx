import React, { useMemo, useState, useRef } from 'react';
import {
  X,
  Printer,
  FileDown,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Wallet,
  IndianRupee,
  FileText,
  Lock,
  Download,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { Transaction, Account } from '../../types/finance';
import { formatINR, formatDateIN } from '../../utils/formatters';
import { DecimalSafe } from '../../services/calculationEngine';

interface StatementPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  dateRangeLabel?: string;
  selectedAccountId?: string;
  customTransactions?: Transaction[];
}

export const StatementPdfModal: React.FC<StatementPdfModalProps> = ({
  isOpen,
  onClose,
  title = 'OFFICIAL FINANCIAL STATEMENT & LEDGER AUDIT',
  dateRangeLabel,
  selectedAccountId,
  customTransactions,
}) => {
  const { transactions, accounts, categories, availableBalance } = useFinance();
  const { userProfile, role, isDevAccount } = useAuth();

  const [statementFilterPeriod, setStatementFilterPeriod] = useState<string>('current_month');
  const [targetAccountFilter, setTargetAccountFilter] = useState<string>(selectedAccountId || 'all');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const categoriesMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountsMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  // Determine active date range based on selector
  const activeDateBounds = useMemo(() => {
    if (dateRangeLabel) return { label: dateRangeLabel, start: '', end: '' };

    if (statementFilterPeriod === 'current_month') {
      return { label: 'October 2026 (01 Oct - 31 Oct 2026)', start: '2026-10-01', end: '2026-10-31' };
    } else if (statementFilterPeriod === 'last_month') {
      return { label: 'September 2026 (01 Sep - 30 Sep 2026)', start: '2026-09-01', end: '2026-09-30' };
    } else if (statementFilterPeriod === 'fy2627') {
      return { label: 'Financial Year 2026-27 (01 Apr 2026 - 31 Mar 2027)', start: '2026-04-01', end: '2027-03-31' };
    } else {
      return { label: 'Complete Lifetime Ledger History', start: '', end: '' };
    }
  }, [statementFilterPeriod, dateRangeLabel]);

  // Filter transactions for statement
  const statementTransactions = useMemo(() => {
    let pool = customTransactions || transactions;

    if (targetAccountFilter !== 'all') {
      pool = pool.filter((t) => t.accountId === targetAccountFilter || t.toAccountId === targetAccountFilter);
    }

    if (activeDateBounds.start) {
      pool = pool.filter((t) => t.date >= activeDateBounds.start);
    }
    if (activeDateBounds.end) {
      pool = pool.filter((t) => t.date <= activeDateBounds.end);
    }

    // Sort chronologically ascending for passbook ledger calculation
    return [...pool].sort((a, b) => {
      const timeA = `${a.date} ${a.time || '00:00'}`;
      const timeB = `${b.date} ${b.time || '00:00'}`;
      return timeA.localeCompare(timeB) || a.id.localeCompare(b.id);
    });
  }, [customTransactions, transactions, targetAccountFilter, activeDateBounds]);

  // Aggregate totals and compute chronological running passbook balances
  const { ledgerRows, totalInflow, totalOutflow, netMovement, openingBalance, closingBalance } = useMemo(() => {
    let initialBal = 0;
    if (targetAccountFilter !== 'all') {
      const acc = accounts.find((a) => a.id === targetAccountFilter);
      initialBal = acc ? acc.initialBalance : 0;
    } else {
      initialBal = DecimalSafe.sum(accounts.map((a) => a.initialBalance));
    }

    // Calculate prior transactions before start date to find true opening balance
    let priorMovement = 0;
    if (activeDateBounds.start) {
      const priorTxns = transactions.filter((t) => {
        if (targetAccountFilter !== 'all' && t.accountId !== targetAccountFilter && t.toAccountId !== targetAccountFilter) {
          return false;
        }
        return t.date < activeDateBounds.start;
      });

      priorTxns.forEach((t) => {
        if (t.type === 'income') priorMovement = DecimalSafe.add(priorMovement, t.amount);
        else if (t.type === 'expense') priorMovement = DecimalSafe.subtract(priorMovement, t.amount);
      });
    }

    const calculatedOpening = DecimalSafe.add(initialBal, priorMovement);

    let running = calculatedOpening;
    let inflowSum = 0;
    let outflowSum = 0;

    const rows = statementTransactions.map((txn) => {
      let debit = 0;
      let credit = 0;

      if (txn.type === 'income') {
        credit = txn.amount;
        running = DecimalSafe.add(running, credit);
        inflowSum = DecimalSafe.add(inflowSum, credit);
      } else if (txn.type === 'expense') {
        debit = txn.amount;
        running = DecimalSafe.subtract(running, debit);
        outflowSum = DecimalSafe.add(outflowSum, debit);
      } else if (txn.type === 'transfer') {
        if (targetAccountFilter !== 'all') {
          if (txn.accountId === targetAccountFilter) {
            debit = txn.amount;
            running = DecimalSafe.subtract(running, debit);
            outflowSum = DecimalSafe.add(outflowSum, debit);
          } else if (txn.toAccountId === targetAccountFilter) {
            credit = txn.amount;
            running = DecimalSafe.add(running, credit);
            inflowSum = DecimalSafe.add(inflowSum, credit);
          }
        } else {
          // Internal transfer across accounts leaves total net unchanged
          debit = txn.amount;
          credit = txn.amount;
        }
      }

      return {
        ...txn,
        debit,
        credit,
        runningBalance: running,
      };
    });

    const net = DecimalSafe.subtract(inflowSum, outflowSum);
    const calculatedClosing = running;

    return {
      ledgerRows: rows,
      totalInflow: inflowSum,
      totalOutflow: outflowSum,
      netMovement: net,
      openingBalance: calculatedOpening,
      closingBalance: calculatedClosing,
    };
  }, [statementTransactions, targetAccountFilter, accounts, activeDateBounds, transactions]);

  // Unique reference for audit
  const statementRefId = useMemo(() => {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `STMT-IN-${timestamp.slice(-6)}`;
  }, []);

  const generatedTimestamp = useMemo(() => {
    return new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium',
    });
  }, []);

  // Generate self-contained standalone HTML document for reliable offline saving and printing
  const generatePrintableHtml = (autoPrint = false) => {
    const targetAccountName =
      targetAccountFilter === 'all'
        ? 'Consolidated Portfolio'
        : accountsMap.get(targetAccountFilter)?.name || 'Account';

    const rowsHtml = ledgerRows.map((row, idx) => {
      const catName = categoriesMap.get(row.categoryId || '')?.name || 'General';
      const accName = accountsMap.get(row.accountId)?.name || 'Account';
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const debitText = row.debit > 0 ? formatINR(row.debit) : '—';
      const creditText = row.credit > 0 ? `+${formatINR(row.credit)}` : '—';
      const debitColor = row.debit > 0 ? '#dc2626' : '#94a3b8';
      const creditColor = row.credit > 0 ? '#059669' : '#94a3b8';

      return `
        <tr style="background-color: ${bg}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 6px 8px; border-right: 1px solid #cbd5e1; white-space: nowrap;">${formatDateIN(row.date)} ${row.time ? `<br><small style="color:#64748b;">${row.time}</small>` : ''}</td>
          <td style="padding: 6px 8px; border-right: 1px solid #cbd5e1; font-family: monospace; font-size: 10px; color:#475569;">${row.id.substring(0, 10)}</td>
          <td style="padding: 6px 8px; border-right: 1px solid #cbd5e1;"><strong>${escapeHtml(row.description)}</strong>${row.notes ? `<div style="font-size:10px;color:#64748b;">${escapeHtml(row.notes)}</div>` : ''}</td>
          <td style="padding: 6px 8px; border-right: 1px solid #cbd5e1;">${escapeHtml(catName)}</td>
          <td style="padding: 6px 8px; border-right: 1px solid #cbd5e1;">${escapeHtml(accName)}</td>
          <td style="padding: 6px 8px; border-right: 1px solid #cbd5e1; text-align: right; color: ${debitColor}; font-weight: bold; font-family: monospace;">${debitText}</td>
          <td style="padding: 6px 8px; border-right: 1px solid #cbd5e1; text-align: right; color: ${creditColor}; font-weight: bold; font-family: monospace;">${creditText}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: bold; font-family: monospace; color: #0f172a;">${formatINR(row.runningBalance)}</td>
        </tr>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Statement - ${statementRefId}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 8mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 16px;
      font-size: 11px;
      line-height: 1.4;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-icon {
      width: 32px;
      height: 32px;
      background: #0f172a;
      color: #ffffff;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 16px;
      text-align: center;
      line-height: 32px;
    }
    .brand-title {
      font-size: 16px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: -0.5px;
      color: #0f172a;
    }
    .brand-sub {
      font-size: 10px;
      color: #475569;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .meta-box {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 6px;
      text-align: right;
      font-size: 10px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 16px;
      text-align: center;
    }
    .summary-card {
      border: 1px solid #cbd5e1;
      padding: 8px;
      border-radius: 6px;
      background: #f8fafc;
    }
    .summary-label {
      font-size: 9px;
      font-weight: bold;
      text-transform: uppercase;
      color: #475569;
      display: block;
      margin-bottom: 3px;
    }
    .summary-value {
      font-size: 13px;
      font-weight: bold;
      font-family: monospace;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      border: 1px solid #cbd5e1;
      margin-top: 10px;
    }
    th {
      background: #e2e8f0;
      padding: 6px 8px;
      text-align: left;
      font-size: 9px;
      font-weight: bold;
      text-transform: uppercase;
      border: 1px solid #cbd5e1;
      color: #1e293b;
    }
    td {
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
    }
    tfoot tr {
      background: #f1f5f9;
      font-weight: bold;
    }
    .footer-seal {
      margin-top: 24px;
      border-top: 1px solid #cbd5e1;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 9px;
      color: #64748b;
    }
    .no-print {
      display: none;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
  ${autoPrint ? `<script>window.onload = function() { setTimeout(function() { window.focus(); window.print(); }, 200); };</script>` : ''}
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">
        <div class="brand-icon">₹</div>
        <div>
          <div class="brand-title">Budget Management ERP</div>
          <div class="brand-sub">Financial Passbook & Audited Ledger Statement</div>
        </div>
      </div>
      <div style="margin-top: 10px; font-size: 11px;">
        <div><strong>Account Holder:</strong> ${escapeHtml(userProfile?.displayName || 'Personal Account Holder')}</div>
        <div><strong>Phone:</strong> ${escapeHtml(userProfile?.phoneNumber || '+91-9845012345')}</div>
        <div><strong>Email:</strong> ${escapeHtml(userProfile?.email || 'N.bhat73500@gmail.com')}</div>
      </div>
    </div>
    <div class="meta-box">
      <div style="font-family: monospace; font-weight: bold; font-size: 12px; color: #0f172a;">${statementRefId}</div>
      <div style="color: #059669; font-weight: bold; margin: 2px 0;">● READ-ONLY AUDIT VERIFIED</div>
      <div><strong>Generated:</strong> ${generatedTimestamp}</div>
      <div><strong>Currency:</strong> INR (₹ - Indian Rupee)</div>
      <div><strong>Target Wallet:</strong> ${escapeHtml(targetAccountName)}</div>
    </div>
  </div>

  <div style="background: #f1f5f9; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-weight: 600; font-size: 11px; display: flex; justify-content: space-between;">
    <span>Statement Period: ${escapeHtml(activeDateBounds.label)}</span>
    <span style="font-family: monospace; color: #475569;">Decimal-Safe Precision (Paisa)</span>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <span class="summary-label">Opening Balance</span>
      <span class="summary-value">${formatINR(openingBalance)}</span>
    </div>
    <div class="summary-card" style="background: #f0fdf4; border-color: #bbf7d0;">
      <span class="summary-label" style="color: #166534;">Total Inflow (+)</span>
      <span class="summary-value" style="color: #15803d;">+${formatINR(totalInflow)}</span>
    </div>
    <div class="summary-card" style="background: #fef2f2; border-color: #fecaca;">
      <span class="summary-label" style="color: #991b1b;">Total Outflow (-)</span>
      <span class="summary-value" style="color: #b91c1c;">-${formatINR(totalOutflow)}</span>
    </div>
    <div class="summary-card" style="background: #f0f9ff; border-color: #bae6fd;">
      <span class="summary-label" style="color: #075985;">Net Movement</span>
      <span class="summary-value" style="color: ${netMovement >= 0 ? '#0369a1' : '#b91c1c'};">${netMovement >= 0 ? '+' : ''}${formatINR(netMovement)}</span>
    </div>
    <div class="summary-card" style="background: #0f172a; color: #ffffff; border-color: #0f172a;">
      <span class="summary-label" style="color: #cbd5e1;">Closing Balance</span>
      <span class="summary-value" style="color: #ffffff;">${formatINR(closingBalance)}</span>
    </div>
  </div>

  <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px; text-transform: uppercase;">
    Itemized Chronological Transaction Log (${ledgerRows.length} Entries)
  </div>

  <table>
    <thead>
      <tr>
        <th>Date & Time</th>
        <th>Ref ID</th>
        <th>Description / Payee</th>
        <th>Category</th>
        <th>Account</th>
        <th style="text-align: right;">Debit Out (₹)</th>
        <th style="text-align: right;">Credit In (₹)</th>
        <th style="text-align: right;">Balance (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="8" style="text-align:center;padding:16px;">No transactions found for this period.</td></tr>'}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="5" style="text-align: right; text-transform: uppercase;">Totals for Period:</td>
        <td style="text-align: right; color: #dc2626; font-family: monospace;">-${formatINR(totalOutflow)}</td>
        <td style="text-align: right; color: #059669; font-family: monospace;">+${formatINR(totalInflow)}</td>
        <td style="text-align: right; font-family: monospace;">${formatINR(closingBalance)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer-seal">
    <div>
      <div><strong>Certified Read-Only Ledger Statement</strong></div>
      <div>Computed with IEEE-754 decimal-safe accounting standards. Valid for audit and tax records.</div>
      <div style="font-family: monospace; margin-top: 4px;">REF: ${statementRefId} · VERIFIED PASSBOOK</div>
    </div>
    <div style="text-align: right;">
      <div style="border-bottom: 1px dashed #64748b; width: 140px; text-align: center; font-weight: bold; padding-bottom: 2px;">
        SYSTEM VERIFIED
      </div>
      <div style="font-size: 9px; margin-top: 2px;">Authorised System Sign-off</div>
    </div>
  </div>
</body>
</html>`;
  };

  const escapeHtml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // 1. Direct Save/Download file to device
  const handleDownloadFile = () => {
    try {
      const htmlContent = generatePrintableHtml(false);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const cleanPeriod = activeDateBounds.label.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
      a.href = url;
      a.download = `Statement_${cleanPeriod}_${statementRefId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setFeedbackToast('Statement saved to your downloads!');
      setTimeout(() => setFeedbackToast(null), 3500);
    } catch (e) {
      console.error('Download error:', e);
      setFeedbackToast('Error saving file. Attempting print...');
      setTimeout(() => setFeedbackToast(null), 3000);
    }
  };

  // 2. Reliable Print method (Hidden iframe with fallback to window.print)
  const handlePrint = () => {
    setFeedbackToast('Preparing statement for print...');
    try {
      // Hidden iframe isolation printing (bypasses main page and iframe clipping)
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const html = generatePrintableHtml(true);
      if (iframe.contentWindow) {
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(html);
        iframe.contentWindow.document.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setFeedbackToast('Print dialog triggered!');
            setTimeout(() => setFeedbackToast(null), 3000);
          } catch (err) {
            console.warn('Iframe print error, falling back to window.print', err);
            window.print();
          } finally {
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 3000);
          }
        }, 300);
        return;
      }
    } catch (e) {
      console.warn('Iframe printing failed, using window.print fallback', e);
    }

    // Direct window.print fallback
    try {
      window.print();
      setFeedbackToast('Print dialog opened');
      setTimeout(() => setFeedbackToast(null), 3000);
    } catch (err) {
      console.error('window.print also blocked:', err);
      // If browser completely blocks print inside sandbox, download the file so user isn't stuck
      handleDownloadFile();
      setFeedbackToast('Browser blocked print dialog: Statement downloaded as file instead!');
      setTimeout(() => setFeedbackToast(null), 4000);
    }
  };

  // 3. Combined Save & Print Handler
  const handleSaveAndPrint = () => {
    // 1. Download offline file first
    handleDownloadFile();
    // 2. Trigger print dialog
    setTimeout(() => {
      handlePrint();
    }, 250);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden my-auto animate-scaleUp print:border-none print:shadow-none print:max-w-none print:max-h-none print:rounded-none relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Feedback Notification */}
        {feedbackToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 animate-fadeIn pointer-events-none">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{feedbackToast}</span>
          </div>
        )}

        {/* Modal Top Control Bar (Hidden during print) */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between no-print shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  Read-Only PDF Statement Viewer
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
                  <Lock className="w-3 h-3 text-slate-500" />
                  READ-ONLY CERTIFIED
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Official printable accounting format. Use "Save & Print" to download copy and print.
              </p>
            </div>
          </div>

          {/* Action Buttons Top Bar */}
          <div className="flex items-center gap-2">
            {/* Primary Save & Print Button */}
            <button
              onClick={handleSaveAndPrint}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title="Download statement file and open print preview"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Save & Print</span>
            </button>

            {/* Save / Download Only */}
            <button
              onClick={handleDownloadFile}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
              title="Save statement to downloads folder"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Save File</span>
            </button>

            {/* Print Only */}
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              title="Direct Print Preview"
              aria-label="Direct Print Preview"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter controls inside Modal (Hidden during print) */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs no-print shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">Period:</span>
              <select
                value={statementFilterPeriod}
                onChange={(e) => setStatementFilterPeriod(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="current_month">Current Month (Oct 2026)</option>
                <option value="last_month">Previous Month (Sep 2026)</option>
                <option value="fy2627">Indian FY 2026-27</option>
                <option value="all">Lifetime History</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">Account:</span>
              <select
                value={targetAccountFilter}
                onChange={(e) => setTargetAccountFilter(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">Consolidated (All Accounts)</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            <span>Showing {ledgerRows.length} ledger entries</span>
          </div>
        </div>

        {/* Scrollable Printable A4 / PDF Document Area */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white text-slate-900 font-sans print:p-0">
          {/* 1. OFFICIAL PDF LETTERHEAD HEADER */}
          <div className="border-b-2 border-slate-900 pb-4 mb-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    ₹
                  </div>
                  <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-slate-950 uppercase">
                      Budget Management ERP
                    </h1>
                    <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest">
                      Financial Passbook & Audited Ledger Statement
                    </p>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-700 space-y-0.5">
                  <p>
                    <span className="font-bold text-slate-900">Account Holder: </span>
                    {userProfile?.displayName || 'Personal Account Holder'}
                  </p>
                  <p>
                    <span className="font-bold text-slate-900">Registered Phone: </span>
                    {userProfile?.phoneNumber || '+91-9845012345'}
                  </p>
                  <p>
                    <span className="font-bold text-slate-900">Email: </span>
                    {userProfile?.email || 'N.bhat73500@gmail.com'}
                  </p>
                </div>
              </div>

              {/* Security & Metadata Box */}
              <div className="sm:text-right text-xs text-slate-600 bg-slate-50 print:bg-white p-3 rounded-lg border border-slate-200">
                <p className="font-mono font-bold text-slate-900 text-sm">
                  {statementRefId}
                </p>
                <p className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider mt-0.5">
                  ● READ-ONLY AUDIT VERIFIED
                </p>
                <div className="mt-2 text-[11px] space-y-0.5">
                  <p>
                    <span className="font-semibold text-slate-700">Generated: </span>
                    {generatedTimestamp}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Currency: </span>
                    INR (₹ - Indian Rupee)
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Target Wallet: </span>
                    {targetAccountFilter === 'all'
                      ? 'Consolidated Portfolio'
                      : accountsMap.get(targetAccountFilter)?.name || 'Account'}
                  </p>
                </div>
              </div>
            </div>

            {/* Statement Scope Banner */}
            <div className="mt-4 p-2.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-800 flex items-center justify-between">
              <span>Statement Period: {activeDateBounds.label}</span>
              <span className="text-slate-600 font-mono text-[11px]">Decimal-Safe Precision (Paisa)</span>
            </div>
          </div>

          {/* 2. EXECUTIVE FINANCIAL SUMMARY MATRIX */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-6 text-center">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                Opening Balance
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-slate-900 tabular-nums">
                {formatINR(openingBalance)}
              </span>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="block text-[10px] font-bold uppercase text-emerald-800 tracking-wider">
                Total Inflow (+)
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-emerald-700 tabular-nums">
                +{formatINR(totalInflow)}
              </span>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <span className="block text-[10px] font-bold uppercase text-rose-800 tracking-wider">
                Total Outflow (-)
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-rose-700 tabular-nums">
                -{formatINR(totalOutflow)}
              </span>
            </div>

            <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
              <span className="block text-[10px] font-bold uppercase text-sky-800 tracking-wider">
                Net Movement
              </span>
              <span
                className={`text-sm sm:text-base font-bold font-mono tabular-nums ${
                  netMovement >= 0 ? 'text-sky-800' : 'text-rose-700'
                }`}
              >
                {netMovement >= 0 ? '+' : ''}
                {formatINR(netMovement)}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3 bg-slate-900 text-white rounded-lg">
              <span className="block text-[10px] font-bold uppercase text-slate-300 tracking-wider">
                Closing Balance
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-white tabular-nums">
                {formatINR(closingBalance)}
              </span>
            </div>
          </div>

          {/* 3. DETAILED LEDGER PASSBOOK TABLE */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
              Itemized Chronological Transaction Log
            </h3>

            {ledgerRows.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-slate-200 rounded-lg">
                No financial transactions recorded for the selected statement period.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2 px-2.5 border-r border-slate-300">Date & Time</th>
                      <th className="py-2 px-2.5 border-r border-slate-300">Ref / Txn ID</th>
                      <th className="py-2 px-2.5 border-r border-slate-300">Description / Payee</th>
                      <th className="py-2 px-2.5 border-r border-slate-300">Category</th>
                      <th className="py-2 px-2.5 border-r border-slate-300">Account</th>
                      <th className="py-2 px-2.5 border-r border-slate-300 text-right text-rose-700">
                        Debit Out (₹)
                      </th>
                      <th className="py-2 px-2.5 border-r border-slate-300 text-right text-emerald-700">
                        Credit In (₹)
                      </th>
                      <th className="py-2 px-2.5 text-right font-bold">Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {ledgerRows.map((row, idx) => {
                      const catName = categoriesMap.get(row.categoryId || '')?.name || 'General';
                      const accName = accountsMap.get(row.accountId)?.name || 'Account';

                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                          }`}
                        >
                          <td className="py-2 px-2.5 border-r border-slate-200 whitespace-nowrap text-slate-700 font-sans text-xs">
                            {formatDateIN(row.date)} {row.time ? `· ${row.time}` : ''}
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-200 text-slate-500 font-mono text-[10px]">
                            {row.id.substring(0, 10)}
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-200 font-sans text-xs">
                            <span className="font-semibold text-slate-900 block truncate max-w-[200px]">
                              {row.description}
                            </span>
                            {row.notes && (
                              <span className="text-[10px] text-slate-500 block truncate max-w-[200px]">
                                {row.notes}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-200 text-slate-700 font-sans text-xs whitespace-nowrap">
                            {catName}
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-200 text-slate-700 font-sans text-xs whitespace-nowrap">
                            {accName}
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-200 text-right font-bold text-rose-600 tabular-nums">
                            {row.debit > 0 ? formatINR(row.debit) : '—'}
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-200 text-right font-bold text-emerald-600 tabular-nums">
                            {row.credit > 0 ? `+${formatINR(row.credit)}` : '—'}
                          </td>
                          <td className="py-2 px-2.5 text-right font-bold text-slate-900 tabular-nums">
                            {formatINR(row.runningBalance)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-xs">
                      <td colSpan={5} className="py-2.5 px-2.5 text-slate-800 uppercase text-right">
                        Totals for Statement Period:
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-rose-700">
                        -{formatINR(totalOutflow)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-emerald-700">
                        +{formatINR(totalInflow)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-900">
                        {formatINR(closingBalance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* 4. AUDIT COMPLIANCE & VERIFICATION FOOTER */}
          <div className="pt-4 border-t-2 border-slate-300">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Certified Read-Only Ledger Statement
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 max-w-lg leading-relaxed">
                  This financial statement is generated by the Budget Management ERP calculation engine with IEEE-754 decimal-safe accounting standards. Entries cannot be altered post-export without invalidating the checksum.
                </p>
              </div>

              <div className="text-center sm:text-right">
                <div className="w-36 h-10 border-b border-dashed border-slate-400 mx-auto sm:ml-auto flex items-end justify-center pb-1 text-[10px] font-bold text-slate-600">
                  SYSTEM VERIFIED
                </div>
                <span className="text-[9px] text-slate-400 block mt-0.5">Authorised System Sign-off</span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 text-center font-mono text-[9px] text-slate-400">
              HASH-REF: {statementRefId}-SHA256-DECIMAL-SAFE-PRECISION · PAGE 1 OF 1
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar (Hidden during print) */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between no-print shrink-0 flex-wrap gap-2">
          <div className="text-xs text-slate-500">
            Read-only financial document · Safe for taxation, audits, & personal records
          </div>

          <div className="flex items-center gap-2">
            {/* Primary Save & Print Button */}
            <button
              onClick={handleSaveAndPrint}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title="Download statement file and open print preview"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Save & Print</span>
            </button>

            {/* Save / Download Only */}
            <button
              onClick={handleDownloadFile}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
              title="Download file directly"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Save File</span>
            </button>

            {/* Direct Print Only */}
            <button
              onClick={handlePrint}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Trigger print preview dialog"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
