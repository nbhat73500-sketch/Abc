import React, { useState, useMemo } from 'react';
import {
  X,
  CreditCard,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Wallet,
  Info,
} from 'lucide-react';
import { LoanAccount, EMIScheduleItem, Account } from '../../types/finance';
import { formatINR, formatDateIN } from '../../utils/formatters';

interface PayEmiModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanAccount;
  installment: EMIScheduleItem;
  accounts: Account[];
  onConfirmPayment: (params: {
    loanId: string;
    installmentId: string;
    sourceAccountId: string;
    paidDate: string;
    notes?: string;
  }) => { success: boolean; message: string };
}

export const PayEmiModal: React.FC<PayEmiModalProps> = ({
  isOpen,
  onClose,
  loan,
  installment,
  accounts,
  onConfirmPayment,
}) => {
  const bankAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'bank' || a.type === 'wallet' || a.type === 'cash'),
    [accounts]
  );

  const [selectedBankId, setSelectedBankId] = useState(
    loan.linkedBankAccountId || bankAccounts[0]?.id || ''
  );
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(
    `EMI #${installment.installmentNumber} payment for ${loan.lenderName} (${loan.loanName})`
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const selectedBank = useMemo(() => {
    return bankAccounts.find((a) => a.id === selectedBankId);
  }, [bankAccounts, selectedBankId]);

  const currentBalance = selectedBank?.balance || 0;
  const balanceAfter = currentBalance - installment.emiAmount;
  const isSufficient = balanceAfter >= 0;

  if (!isOpen) return null;

  const handlePay = () => {
    if (!selectedBankId) {
      setErrorMessage('Please select a debiting bank account');
      return;
    }

    if (!isSufficient) {
      setErrorMessage(
        `Insufficient funds in ${selectedBank?.name || 'bank account'}. Required: ${formatINR(
          installment.emiAmount
        )}, Available: ${formatINR(currentBalance)}`
      );
      return;
    }

    const result = onConfirmPayment({
      loanId: loan.id,
      installmentId: installment.id,
      sourceAccountId: selectedBankId,
      paidDate,
      notes,
    });

    if (result.success) {
      setSuccessToast(result.message);
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setErrorMessage(result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Process EMI Payment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Installment #{installment.installmentNumber} • {loan.lenderName}
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

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successToast && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Amount and Breakdown Banner */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-center pb-3 border-b border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total EMI Payable
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {formatINR(installment.emiAmount)}
              </span>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Scheduled Due Date: <strong className="text-slate-700 dark:text-slate-300">{formatDateIN(installment.dueDate)}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 text-center">
              <div className="p-2 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                  Principal Component
                </span>
                <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                  {formatINR(installment.principalComponent)}
                </span>
                <span className="text-[10px] text-slate-500 block">Reduces loan balance</span>
              </div>

              <div className="p-2 bg-amber-50/60 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800/40">
                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                  Interest Component
                </span>
                <span className="text-sm font-extrabold text-amber-700 dark:text-amber-300">
                  {formatINR(installment.interestComponent)}
                </span>
                <span className="text-[10px] text-slate-500 block">Interest expense</span>
              </div>
            </div>
          </div>

          {/* Debiting Bank Account Selection */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block">
              Debiting Bank Account <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-medium"
            >
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.bankName || 'Direct'} {b.accountNumber ? `••••${b.accountNumber.slice(-4)}` : ''}) – Balance: {formatINR(b.balance)}
                </option>
              ))}
            </select>
          </div>

          {/* Live Balance Impact Preview */}
          <div className="p-3.5 bg-slate-100/70 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Account Available Balance:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {formatINR(currentBalance)}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>EMI Debit Amount:</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                - {formatINR(installment.emiAmount)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center font-bold">
              <span className="text-slate-800 dark:text-slate-200">Simulated Balance After Payment:</span>
              <span
                className={`font-mono text-sm ${
                  isSufficient
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatINR(balanceAfter)}
              </span>
            </div>

            {!isSufficient && (
              <div className="pt-1 text-[11px] text-rose-600 dark:text-rose-400 flex items-center space-x-1 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Cannot proceed: Insufficient balance. Choose another account or deposit funds.</span>
              </div>
            )}
          </div>

          {/* Payment Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Posting Date
              </label>
              <input
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Remaining Loan After Payment
              </label>
              <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono font-bold text-slate-700 dark:text-slate-300">
                {formatINR(installment.remainingPrincipal ?? installment.remainingBalance)}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Transaction Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
            />
          </div>

          {/* Accounting Compliance Notice */}
          <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-300 flex items-start space-x-2">
            <Info className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
            <div>
              <strong>Double-Entry Posting:</strong> On confirmation, this transaction debits the loan liability by {formatINR(installment.principalComponent)}, debits interest expense by {formatINR(installment.interestComponent)}, and credits {selectedBank?.name} by {formatINR(installment.emiAmount)}.
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!isSufficient}
              onClick={handlePay}
              className={`px-5 py-2 text-xs font-bold rounded-lg text-white shadow-sm transition flex items-center space-x-1.5 ${
                isSufficient
                  ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                  : 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Post EMI Transfer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
