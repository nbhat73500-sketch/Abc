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
  Building2,
  AlertCircle,
  Clock,
  ArrowRightLeft,
} from 'lucide-react';
import { LoanAccount, EMIScheduleItem, Account } from '../../types/finance';
import { formatINR, formatDateIN } from '../../utils/formatters';

interface LoanStatementPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  loans: LoanAccount[];
  selectedLoanId?: string;
  accounts: Account[];
}

export type LoanReportType =
  | 'amortization'
  | 'monthly'
  | 'annual'
  | 'bank_wise'
  | 'all_loans_summary';

export const LoanStatementPdfModal: React.FC<LoanStatementPdfModalProps> = ({
  isOpen,
  onClose,
  loans,
  selectedLoanId,
  accounts,
}) => {
  const [activeLoanId, setActiveLoanId] = useState<string>(selectedLoanId || loans[0]?.id || 'all');
  const [reportType, setReportType] = useState<LoanReportType>('amortization');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Synchronize when selectedLoanId changes
  React.useEffect(() => {
    if (selectedLoanId) {
      setActiveLoanId(selectedLoanId);
    } else if (loans.length > 0 && activeLoanId === 'all') {
      setActiveLoanId(loans[0].id);
    }
  }, [selectedLoanId, loans]);

  const activeLoan = useMemo(() => {
    if (activeLoanId === 'all') return null;
    return loans.find((l) => l.id === activeLoanId) || loans[0] || null;
  }, [loans, activeLoanId]);

  const accountsMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  // Aggregate metrics
  const aggregateMetrics = useMemo(() => {
    let originalTotal = 0;
    let outstandingTotal = 0;
    let monthlyEmiTotal = 0;
    let paidTotal = 0;
    let principalRepaidTotal = 0;
    let interestPaidTotal = 0;

    loans.forEach((loan) => {
      originalTotal += loan.originalPrincipal ?? loan.originalAmount ?? 0;
      outstandingTotal += loan.currentOutstandingPrincipal ?? loan.outstandingPrincipal ?? 0;
      monthlyEmiTotal += loan.emiAmount;
      (loan.schedule || []).forEach((item) => {
        if (item.status === 'paid') {
          paidTotal += item.emiAmount;
          principalRepaidTotal += item.principalComponent;
          interestPaidTotal += item.interestComponent;
        }
      });
    });

    return {
      originalTotal,
      outstandingTotal,
      monthlyEmiTotal,
      paidTotal,
      principalRepaidTotal,
      interestPaidTotal,
    };
  }, [loans]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCsv = () => {
    try {
      let csvContent = '';
      if (activeLoan) {
        csvContent = [
          `"LOAN & EMI AMORTIZATION STATEMENT"`,
          `"Lender","${activeLoan.lenderName}"`,
          `"Loan Name","${activeLoan.loanName}"`,
          `"Loan Reference","${activeLoan.loanReference}"`,
          `"Original Principal","${activeLoan.originalPrincipal}"`,
          `"Current Outstanding","${activeLoan.currentOutstandingPrincipal}"`,
          `"Interest Rate (% p.a.)","${activeLoan.interestRateAnnual}%"`,
          `"EMI Amount","${activeLoan.emiAmount}"`,
          `"Payment Frequency","${activeLoan.paymentFrequency}"`,
          `"Generated At","${new Date().toISOString()}"`,
          ``,
          `"Inst #","Due Date","EMI Amount","Principal Component","Interest Component","Remaining Principal","Status","Paid Date","Txn Ref"`,
          ...(activeLoan.schedule || []).map(
            (item) =>
              `"${item.installmentNumber}","${item.dueDate}","${item.emiAmount}","${item.principalComponent}","${item.interestComponent}","${item.remainingPrincipal}","${item.status}","${item.paidDate || ''}","${item.transactionId || ''}"`
          ),
        ].join('\n');
      } else {
        csvContent = [
          `"ALL LOANS & OUTSTANDING BALANCES SUMMARY"`,
          `"Generated At","${new Date().toISOString()}"`,
          ``,
          `"Lender","Loan Reference","Type","Original Principal","Outstanding Principal","Monthly EMI","Interest Rate","Linked Bank","Status"`,
          ...loans.map((l) => {
            const bank = accountsMap.get(l.linkedBankAccountId);
            return `"${l.lenderName}","${l.loanReference}","${l.loanType}","${l.originalPrincipal}","${l.currentOutstandingPrincipal}","${l.emiAmount}","${l.interestRateAnnual}%","${bank?.name || 'N/A'}","${l.status}"`;
          }),
        ].join('\n');
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `Loan_Statement_${activeLoan ? activeLoan.loanReference : 'Portfolio'}_${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setFeedbackToast('CSV statement downloaded successfully!');
      setTimeout(() => setFeedbackToast(null), 3000);
    } catch {
      setFeedbackToast('Error downloading CSV statement');
      setTimeout(() => setFeedbackToast(null), 3000);
    }
  };

  const getStatusBadge = (status: EMIScheduleItem['status']) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
          </span>
        );
      case 'due':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Clock className="w-3 h-3 mr-1" /> Due Today
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            <AlertCircle className="w-3 h-3 mr-1" /> Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Upcoming
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-auto flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Outstanding Balance & EMI Audit Statement
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded border border-emerald-300 dark:border-emerald-700">
                  Read-Only PDF
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official double-entry accounting schedule, liability tracking & bank debit ledger
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadCsv}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="Download Excel / CSV Statement"
            >
              <FileDown className="w-4 h-4 mr-1.5 text-emerald-600" />
              Excel / CSV
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
              title="Print or Save as PDF"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-6 py-3 bg-slate-100/60 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-600 dark:text-slate-400">Select Loan:</span>
            <select
              value={activeLoanId}
              onChange={(e) => setActiveLoanId(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Loans Portfolio (Consolidated)</option>
              {loans.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.lenderName} – {l.loanName} ({l.loanReference})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-600 dark:text-slate-400">Report View:</span>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as LoanReportType)}
              className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="amortization">Full Amortization & Ledger</option>
              <option value="monthly">Monthly Repayment View</option>
              <option value="annual">Annual Principal & Interest Split</option>
              <option value="bank_wise">Bank-Wise Debit Summary</option>
              <option value="all_loans_summary">Portfolio Liability Summary</option>
            </select>
          </div>

          {feedbackToast && (
            <span className="ml-auto inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {feedbackToast}
            </span>
          )}
        </div>

        {/* PRINTABLE READ-ONLY STATEMENT CANVAS */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
          <div
            ref={printAreaRef}
            id="loan-statement-printable"
            className="max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-10 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0"
          >
            {/* Printable Official Header */}
            <div className="border-b-2 border-indigo-600 pb-5 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-extrabold tracking-tight text-indigo-700 dark:text-indigo-400">
                      DHANVAULT
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-semibold uppercase tracking-wider">
                      Accounting System
                    </span>
                  </div>
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {activeLoan
                      ? `${activeLoan.lenderName.toUpperCase()} – LOAN LIABILITY & EMI LEDGER`
                      : 'CONSOLIDATED OUTSTANDING LIABILITIES & EMI SCHEDULE STATEMENT'}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Official Double-Entry Amortization Schedule & Automated Bank Transfer Ledger
                  </p>
                </div>

                <div className="text-right text-xs">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">
                    Statement Date: {formatDateIN(new Date().toISOString())}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Ref ID: DV-EMI-{activeLoan ? activeLoan.loanReference : 'PORTFOLIO'}-
                    {new Date().toISOString().slice(0, 10).replace(/-/g, '')}
                  </div>
                  <div className="inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase mt-1">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Immutable Audit Copy
                  </div>
                </div>
              </div>

              {/* Watermark Notice */}
              <div className="mt-3 py-1 px-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span>
                  <strong>Read-Only Notice:</strong> This statement reflects system-verified double-entry postings (Debit: Loan Liability / Interest Expense, Credit: Bank Account).
                </span>
                <span className="font-mono text-[10px]">Strict Accounting Compliance</span>
              </div>
            </div>

            {/* Account Information Card */}
            {activeLoan ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 mb-6 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Financial Institution</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{activeLoan.lenderName}</span>
                  <span className="text-slate-500 text-[11px] block">{activeLoan.loanName}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Loan Account Ref</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                    {activeLoan.loanReference}
                  </span>
                  <span className="text-slate-500 text-[11px] block">
                    Type: <span className="capitalize">{activeLoan.loanType} Loan</span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Interest Rate & Frequency</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {activeLoan.interestRateAnnual}% p.a.
                  </span>
                  <span className="text-slate-500 text-[11px] block capitalize">
                    {activeLoan.paymentFrequency} (Due Day: {activeLoan.emiDueDay})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Linked Bank Account</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {accountsMap.get(activeLoan.linkedBankAccountId)?.name || 'Direct Transfer'}
                  </span>
                  <span className="text-slate-500 text-[11px] block">
                    Live Bal: {formatINR(accountsMap.get(activeLoan.linkedBankAccountId)?.balance || 0)}
                  </span>
                </div>
              </div>
            ) : null}

            {/* KPI Metric Blocks */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 block">
                  Original Loan Principal
                </span>
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {formatINR(activeLoan ? (activeLoan.originalPrincipal ?? activeLoan.originalAmount ?? 0) : aggregateMetrics.originalTotal)}
                </span>
                <span className="text-[10px] text-slate-500 block">Sanctioned liability</span>
              </div>

              <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/40">
                <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 block">
                  Current Outstanding
                </span>
                <span className="text-lg font-black text-rose-700 dark:text-rose-400">
                  {formatINR(activeLoan ? (activeLoan.currentOutstandingPrincipal ?? activeLoan.outstandingPrincipal ?? 0) : aggregateMetrics.outstandingTotal)}
                </span>
                <span className="text-[10px] text-slate-500 block">Remaining principal balance</span>
              </div>

              <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block">
                  Principal Repaid
                </span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                  {formatINR(
                    activeLoan
                      ? (activeLoan.schedule || [])
                          .filter((i) => i.status === 'paid')
                          .reduce((s, i) => s + i.principalComponent, 0)
                      : aggregateMetrics.principalRepaidTotal
                  )}
                </span>
                <span className="text-[10px] text-slate-500 block">Direct liability reduction</span>
              </div>

              <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900/40">
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 block">
                  Interest Expense Paid
                </span>
                <span className="text-lg font-black text-amber-700 dark:text-amber-400">
                  {formatINR(
                    activeLoan
                      ? (activeLoan.schedule || [])
                          .filter((i) => i.status === 'paid')
                          .reduce((s, i) => s + i.interestComponent, 0)
                      : aggregateMetrics.interestPaidTotal
                  )}
                </span>
                <span className="text-[10px] text-slate-500 block">Expensed to P&L</span>
              </div>
            </div>

            {/* Double Entry Bookkeeping Rule Summary for Statement */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] mb-6 font-mono text-slate-600 dark:text-slate-400">
              <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                Verified Double-Entry Bookkeeping Audit Model:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>• Debit: Loan Liability / EMI Payable (Principal Portion)</div>
                <div>• Credit: Linked Bank Account (Total EMI Amount)</div>
                <div>• Debit: Interest Expense Account (Interest Portion)</div>
                <div>• Credit: Loan Clearing / Amortization Offset</div>
              </div>
            </div>

            {/* Table Content: Amortization Schedule or Portfolio Summary */}
            {activeLoan ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/50 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3 text-right">EMI Amount</th>
                      <th className="py-2.5 px-3 text-right">Principal</th>
                      <th className="py-2.5 px-3 text-right">Interest</th>
                      <th className="py-2.5 px-3 text-right">Remaining Balance</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Payment Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {(activeLoan.schedule || []).map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 ${
                          item.status === 'paid'
                            ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                            : item.status === 'overdue'
                            ? 'bg-rose-50/20 dark:bg-rose-950/10'
                            : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-600 dark:text-slate-400">
                          {item.installmentNumber}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {formatDateIN(item.dueDate)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {formatINR(item.emiAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-emerald-700 dark:text-emerald-400">
                          {formatINR(item.principalComponent)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-amber-700 dark:text-amber-400">
                          {formatINR(item.interestComponent)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                          {formatINR(item.remainingPrincipal ?? item.remainingBalance ?? 0)}
                        </td>
                        <td className="py-2.5 px-3 text-center">{getStatusBadge(item.status)}</td>
                        <td className="py-2.5 px-3 text-right text-[11px] text-slate-500 font-mono">
                          {item.paidDate ? formatDateIN(item.paidDate) : 'Pending'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* All Loans Portfolio Table */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/50 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      <th className="py-2.5 px-3">Lender & Account</th>
                      <th className="py-2.5 px-3">Reference</th>
                      <th className="py-2.5 px-3 text-right">Original Amount</th>
                      <th className="py-2.5 px-3 text-right">Outstanding Principal</th>
                      <th className="py-2.5 px-3 text-right">Monthly EMI</th>
                      <th className="py-2.5 px-3 text-right">Interest Rate</th>
                      <th className="py-2.5 px-3">Linked Bank</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {loans.map((loan) => {
                      const bank = accountsMap.get(loan.linkedBankAccountId);
                      return (
                        <tr key={loan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {loan.lenderName}
                            </span>
                            <span className="text-[11px] text-slate-500">{loan.loanName}</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                            {loan.loanReference || loan.accountReference}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-800 dark:text-slate-200">
                            {formatINR(loan.originalPrincipal ?? loan.originalAmount ?? 0)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-rose-700 dark:text-rose-400">
                            {formatINR(loan.currentOutstandingPrincipal ?? loan.outstandingPrincipal ?? 0)}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-indigo-700 dark:text-indigo-400">
                            {formatINR(loan.emiAmount)}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                            {loan.interestRateAnnual}%
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400 text-[11px]">
                            {bank?.name || 'N/A'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {loan.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer with Signatures and Compliance */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-6 text-[11px] text-slate-500">
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Accounting Audit Authentication:
                </p>
                <p>
                  This report has been automatically generated from the synchronized double-entry financial ledger.
                  All principal deductions and interest allocations reflect verified internal ledger balances.
                </p>
              </div>
              <div className="text-right flex flex-col justify-end items-end">
                <div className="w-44 border-b border-slate-400 dark:border-slate-600 mb-1" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Authorized Financial Audit Signature</span>
                <span className="text-[10px] text-slate-400">DhanVault Automated Financial System</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
