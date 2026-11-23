import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Building2,
  Calendar,
  Percent,
  Wallet,
  IndianRupee,
  Calculator,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { LoanAccount, Account, PaymentFrequency } from '../../types/finance';
import { calculateStandardEMI } from '../../services/emiCalculationService';
import { formatINR } from '../../utils/formatters';

interface LoanAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (loanData: Omit<LoanAccount, 'id' | 'createdAt' | 'updatedAt' | 'schedule'>) => void;
  editingLoan?: LoanAccount | null;
  accounts: Account[];
}

export const LoanAccountModal: React.FC<LoanAccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingLoan,
  accounts,
}) => {
  const bankAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'bank' || a.type === 'wallet' || a.type === 'cash'),
    [accounts]
  );

  const [lenderName, setLenderName] = useState('');
  const [loanName, setLoanName] = useState('');
  const [loanReference, setLoanReference] = useState('');
  const [loanType, setLoanType] = useState<LoanAccount['loanType']>('home');
  const [originalPrincipal, setOriginalPrincipal] = useState<number>(500000);
  const [currentOutstandingPrincipal, setCurrentOutstandingPrincipal] = useState<number>(500000);
  const [interestRateAnnual, setInterestRateAnnual] = useState<number>(8.5);
  const [tenureMonths, setTenureMonths] = useState<number>(60);
  const [emiAmount, setEmiAmount] = useState<number>(10258);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [emiDueDay, setEmiDueDay] = useState<number>(5);
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('monthly');
  const [linkedBankAccountId, setLinkedBankAccountId] = useState('');
  const [autoDebitApproved, setAutoDebitApproved] = useState(false);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-calculate suggested EMI using reducing balance formula
  const calculatedEmi = useMemo(() => {
    return calculateStandardEMI(originalPrincipal || 0, interestRateAnnual || 0, tenureMonths || 1);
  }, [originalPrincipal, interestRateAnnual, tenureMonths]);

  // Sync state on open or edit
  useEffect(() => {
    if (editingLoan) {
      setLenderName(editingLoan.lenderName);
      setLoanName(editingLoan.loanName);
      setLoanReference(editingLoan.loanReference || editingLoan.accountReference || '');
      setLoanType(editingLoan.loanType || 'home');
      setOriginalPrincipal(editingLoan.originalPrincipal ?? editingLoan.originalAmount ?? 0);
      setCurrentOutstandingPrincipal(editingLoan.currentOutstandingPrincipal ?? editingLoan.outstandingPrincipal ?? 0);
      setInterestRateAnnual(editingLoan.interestRateAnnual ?? editingLoan.interestRate ?? 0);
      setTenureMonths(editingLoan.tenureMonths ?? editingLoan.totalTenureMonths ?? 60);
      setEmiAmount(editingLoan.emiAmount);
      setStartDate(editingLoan.startDate);
      setEndDate(editingLoan.endDate || '');
      setEmiDueDay(editingLoan.emiDueDay);
      setPaymentFrequency(editingLoan.paymentFrequency);
      setLinkedBankAccountId(editingLoan.linkedBankAccountId);
      setAutoDebitApproved(editingLoan.autoDebitApproved);
      setNotes(editingLoan.notes || '');
    } else {
      setLenderName('');
      setLoanName('');
      setLoanReference(`LOAN-${Date.now().toString().slice(-6)}`);
      setLoanType('home');
      setOriginalPrincipal(1000000);
      setCurrentOutstandingPrincipal(1000000);
      setInterestRateAnnual(8.5);
      setTenureMonths(60);
      setEmiAmount(calculateStandardEMI(1000000, 8.5, 60));
      setStartDate(new Date().toISOString().split('T')[0]);
      setEmiDueDay(5);
      setPaymentFrequency('monthly');
      setLinkedBankAccountId(bankAccounts[0]?.id || '');
      setAutoDebitApproved(false);
      setNotes('');
    }
    setErrorMessage('');
  }, [editingLoan, isOpen, bankAccounts]);

  // Compute end date automatically if tenure & start date given
  useEffect(() => {
    if (startDate && tenureMonths > 0) {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + tenureMonths);
      setEndDate(d.toISOString().split('T')[0]);
    }
  }, [startDate, tenureMonths]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lenderName.trim()) {
      setErrorMessage('Please enter the lender / financial institution name');
      return;
    }
    if (!loanName.trim()) {
      setErrorMessage('Please enter a descriptive name for this loan account');
      return;
    }
    if (!loanReference.trim()) {
      setErrorMessage('Please provide a loan or account reference number');
      return;
    }
    if (originalPrincipal <= 0) {
      setErrorMessage('Original principal must be greater than 0');
      return;
    }
    if (currentOutstandingPrincipal < 0) {
      setErrorMessage('Current outstanding principal cannot be negative');
      return;
    }
    if (emiAmount <= 0) {
      setErrorMessage('EMI amount must be greater than 0');
      return;
    }
    if (!linkedBankAccountId) {
      setErrorMessage('Please select a linked bank account for EMI transfers');
      return;
    }

    onSave({
      lenderName: lenderName.trim(),
      loanName: loanName.trim(),
      accountReference: loanReference.trim(),
      loanReference: loanReference.trim(),
      loanType,
      originalAmount: originalPrincipal,
      originalPrincipal,
      outstandingPrincipal: currentOutstandingPrincipal,
      currentOutstandingPrincipal,
      emiAmount,
      interestRate: interestRateAnnual,
      interestRateAnnual,
      totalTenureMonths: tenureMonths,
      tenureMonths,
      startDate,
      endDate,
      emiDueDay,
      paymentFrequency,
      linkedBankAccountId,
      autoDebitApproved,
      status: currentOutstandingPrincipal <= 0 ? 'closed' : 'active',
      notes: notes.trim(),
    });

    onClose();
  };

  const selectedBank = bankAccounts.find((a) => a.id === linkedBankAccountId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingLoan ? 'Edit Outstanding Balance / Loan Account' : 'New Outstanding Balance Account'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure lender terms, EMI schedule parameters & linked bank account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Basic Lender & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lender / Financial Institution <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC Bank, SBI, Tata Capital"
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Loan Description / Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Home Loan - 3BHK Flat, Car Loan Nexon"
                value={loanName}
                onChange={(e) => setLoanName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Reference & Loan Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Loan Reference / Account No. <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC-HL-882941"
                value={loanReference}
                onChange={(e) => setLoanReference(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Loan Liability Category
              </label>
              <select
                value={loanType}
                onChange={(e) => setLoanType(e.target.value as LoanAccount['loanType'])}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
              >
                <option value="home">Home Loan (Mortgage)</option>
                <option value="vehicle">Vehicle / Car / Bike Loan</option>
                <option value="personal">Personal Loan</option>
                <option value="business">Business / Commercial Loan</option>
                <option value="education">Education Loan</option>
                <option value="other">Other Outstanding Liability</option>
              </select>
            </div>
          </div>

          {/* Principal & Outstanding */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Original Loan Principal (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={originalPrincipal}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setOriginalPrincipal(val);
                    if (!editingLoan) setCurrentOutstandingPrincipal(val);
                  }}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Current Outstanding Principal (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-rose-500 font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={currentOutstandingPrincipal}
                  onChange={(e) => setCurrentOutstandingPrincipal(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Rate & Tenure */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Annual Interest Rate (%) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.05"
                  value={interestRateAnnual}
                  onChange={(e) => setInterestRateAnnual(parseFloat(e.target.value) || 0)}
                  className="w-full pr-8 pl-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
                <span className="absolute right-3 top-2.5 text-slate-400 font-bold">%</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tenure (Months) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="360"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  EMI Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setEmiAmount(calculatedEmi)}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center"
                  title="Auto-calculate EMI using reducing balance formula"
                >
                  <Calculator className="w-3 h-3 mr-0.5" />
                  Auto-fill ₹{calculatedEmi.toLocaleString()}
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-indigo-600 font-bold">₹</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={emiAmount}
                  onChange={(e) => setEmiAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-indigo-700 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Dates & Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Loan Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Maturity / End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                EMI Due Day of Month <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={emiDueDay}
                onChange={(e) => setEmiDueDay(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Frequency
              </label>
              <select
                value={paymentFrequency}
                onChange={(e) => setPaymentFrequency(e.target.value as PaymentFrequency)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          {/* Bank Account Selection & Live Balance Display */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <Wallet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Linked Bank Account for EMI Transfers <span className="text-rose-500">*</span></span>
              </label>
              {selectedBank && (
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Available Balance: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatINR(selectedBank.balance)}</strong>
                </span>
              )}
            </div>

            <select
              value={linkedBankAccountId}
              onChange={(e) => setLinkedBankAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-medium"
              required
            >
              <option value="">-- Choose Bank Account --</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.bankName || 'Direct'} {b.accountNumber ? `••••${b.accountNumber.slice(-4)}` : ''}) – Bal: {formatINR(b.balance)}
                </option>
              ))}
            </select>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-start space-x-3">
              <input
                type="checkbox"
                id="autoDebitApproved"
                checked={autoDebitApproved}
                onChange={(e) => setAutoDebitApproved(e.target.checked)}
                className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <label htmlFor="autoDebitApproved" className="text-slate-700 dark:text-slate-300 text-[11px] cursor-pointer">
                <strong className="text-slate-900 dark:text-white">Enable Automatic Internal Accounting Debit on Due Date</strong>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  When enabled, the system will automatically create the internal double-entry transfer transaction on the scheduled due date if sufficient bank balance is verified. (No external bank debit without banking authorization).
                </p>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Internal Loan Notes & Audit References
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Sanction letter ref, fixed vs floating rate review date, collateral details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
            >
              {editingLoan ? 'Save Loan Account Changes' : 'Create Outstanding Account & Generate EMI Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
