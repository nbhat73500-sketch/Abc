import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertTriangle, Upload, Eye, Trash2, ArrowRightLeft, Printer } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction, TransactionType, PaymentMethod } from '../../types/finance';
import { formatINR, detectDuplicateTransaction, formatDateIN } from '../../utils/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction?: Transaction | null;
  defaultType?: TransactionType;
  onSaveAndPrint?: (txn: Transaction) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  editingTransaction,
  defaultType = 'expense',
  onSaveAndPrint,
}) => {
  const {
    transactions,
    accounts,
    categories,
    addTransaction,
    updateTransaction,
  } = useFinance();

  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategory, setSubcategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [vendor, setVendor] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [tag, setTag] = useState<string>('');
  const [isReconciled, setIsReconciled] = useState<boolean>(true);
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [receiptName, setReceiptName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [ignoreDuplicateWarning, setIgnoreDuplicateWarning] = useState<boolean>(false);

  // Initialize or populate form
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setDate(editingTransaction.date);
      setTime(editingTransaction.time || '12:00');
      setCategoryId(editingTransaction.categoryId);
      setSubcategory(editingTransaction.subcategory || '');
      setDescription(editingTransaction.description || '');
      setPaymentMethod(editingTransaction.paymentMethod);
      setAccountId(editingTransaction.accountId);
      setToAccountId(editingTransaction.toAccountId || '');
      setVendor(editingTransaction.vendor || '');
      setNotes(editingTransaction.notes || '');
      setTag(editingTransaction.tag || '');
      setIsReconciled(editingTransaction.isReconciled ?? true);
      setReceiptUrl(editingTransaction.receiptUrl || '');
      setReceiptName(editingTransaction.receiptName || '');
    } else {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');

      setType(defaultType);
      setAmount('');
      setDate(today);
      setTime(`${hours}:${mins}`);

      // Default category matching type
      const suitableCat = categories.find(
        (c) => c.type === defaultType || c.type === 'both'
      );
      setCategoryId(suitableCat?.id || categories[0]?.id || '');
      setSubcategory(suitableCat?.subcategories[0] || '');

      setDescription('');
      setPaymentMethod('upi');
      setAccountId(accounts[0]?.id || '');
      setToAccountId(accounts[1]?.id || accounts[0]?.id || '');
      setVendor('');
      setNotes('');
      setTag('');
      setIsReconciled(true);
      setReceiptUrl('');
      setReceiptName('');
    }
    setErrorMsg('');
    setIgnoreDuplicateWarning(false);
  }, [editingTransaction, defaultType, isOpen, categories, accounts]);

  // Categories filtered by transaction type
  const availableCategories = useMemo(() => {
    if (type === 'transfer') {
      return categories.filter((c) => c.id === 'cat-misc' || c.type === 'both');
    }
    return categories.filter((c) => c.type === type || c.type === 'both');
  }, [categories, type]);

  // Subcategories of selected category
  const activeCategory = useMemo(() => {
    return categories.find((c) => c.id === categoryId);
  }, [categories, categoryId]);

  // Handle category change -> reset subcategory to first
  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    const cat = categories.find((c) => c.id === newCatId);
    if (cat && cat.subcategories.length > 0) {
      setSubcategory(cat.subcategories[0]);
    } else {
      setSubcategory('');
    }
  };

  // Duplicate transaction check
  const duplicateCandidate = useMemo(() => {
    const numAmount = parseFloat(amount);
    if (!isOpen || isNaN(numAmount) || numAmount <= 0 || !date) return null;

    return detectDuplicateTransaction(
      {
        amount: numAmount,
        date,
        vendor,
        description,
        categoryId,
      },
      transactions,
      editingTransaction?.id
    );
  }, [amount, date, vendor, description, categoryId, transactions, editingTransaction, isOpen]);

  // Handle receipt file upload
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg('Receipt image file is too large (max 4MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setReceiptUrl(reader.result as string);
      setReceiptName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent, andPrint = false) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than ₹0');
      return;
    }

    if (!date) {
      setErrorMsg('Please select a transaction date');
      return;
    }

    if (!accountId) {
      setErrorMsg('Please select an account');
      return;
    }

    if (type === 'transfer') {
      if (!toAccountId) {
        setErrorMsg('Please select the destination account for the transfer');
        return;
      }
      if (accountId === toAccountId) {
        setErrorMsg('Source account and destination account cannot be the same');
        return;
      }
    }

    if (duplicateCandidate && !ignoreDuplicateWarning && !editingTransaction) {
      setErrorMsg('Duplicate detected. Please verify or check the box to confirm intentional duplicate.');
      return;
    }

    const txnPayload = {
      type,
      amount: numAmount,
      date,
      time: time || '12:00',
      categoryId: categoryId || 'cat-misc',
      subcategory: subcategory || '',
      description: description.trim() || (type === 'transfer' ? 'Account Transfer' : activeCategory?.name || 'Expense'),
      paymentMethod,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      vendor: vendor.trim() || (type === 'transfer' ? 'Internal Transfer' : 'Self'),
      notes: notes.trim() || undefined,
      tag: tag.trim() || undefined,
      isReconciled,
      receiptUrl: receiptUrl || undefined,
      receiptName: receiptName || undefined,
    };

    let saved: Transaction;
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, txnPayload);
      saved = { ...editingTransaction, ...txnPayload };
    } else {
      saved = addTransaction(txnPayload);
    }

    onClose();
    if (andPrint && onSaveAndPrint) {
      onSaveAndPrint(saved);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {editingTransaction ? 'Edit Transaction' : 'Record New Transaction'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {editingTransaction ? `ID: ${editingTransaction.id}` : 'All amounts in Indian Rupee (₹)'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transaction Type Segmented Switch */}
        <div className="p-6 pb-0">
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                const cat = categories.find((c) => c.type === 'expense');
                if (cat) handleCategoryChange(cat.id);
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-all ${
                type === 'expense'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Expense (-)
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                const cat = categories.find((c) => c.type === 'income');
                if (cat) handleCategoryChange(cat.id);
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-all ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Income (+)
            </button>
            <button
              type="button"
              onClick={() => setType('transfer')}
              className={`py-2 text-xs font-semibold rounded-md transition-all ${
                type === 'transfer'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Transfer (⇄)
            </button>
          </div>
        </div>

        {/* Duplicate Warning Alert */}
        {duplicateCandidate && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Possible Duplicate Detected: </span>
              A transaction of {formatINR(duplicateCandidate.amount)} on {formatDateIN(duplicateCandidate.date)} ({duplicateCandidate.vendor || duplicateCandidate.description}) already exists.
              <label className="flex items-center gap-2 mt-2 font-medium cursor-pointer text-amber-900 dark:text-amber-300">
                <input
                  type="checkbox"
                  checked={ignoreDuplicateWarning}
                  onChange={(e) => setIgnoreDuplicateWarning(e.target.checked)}
                  className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                />
                This is a distinct, intentional transaction
              </label>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg text-xs text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[68vh] overflow-y-auto">
          {/* Row 1: Amount and Date/Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-400">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-sm font-semibold tabular-nums border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              {amount && !isNaN(parseFloat(amount)) && (
                <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
                  Formatted: {formatINR(parseFloat(amount))}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date (DD-MM-YYYY) *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Transfer row if type === 'transfer' */}
          {type === 'transfer' ? (
            <div className="p-3 bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/50 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  From Account (Source) *
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatINR(acc.balance, { hideDecimals: true })})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-sky-600" /> To Account (Destination) *
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} disabled={acc.id === accountId}>
                      {acc.name} ({formatINR(acc.balance, { hideDecimals: true })})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            /* Category & Subcategory */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subcategory
                </label>
                <select
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">General</option>
                  {activeCategory?.subcategories.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Description & Payee / Vendor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description / Purpose *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Monthly Pantry Groceries, Uber to Office"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Person / Vendor / Merchant
              </label>
              <input
                type="text"
                placeholder="e.g. Swiggy, DMart, Infosys, Landlord"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Payment Method & Account (For regular non-transfer) */}
          {type !== 'transfer' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="cash">Cash in Hand</option>
                  <option value="bank_transfer">Bank Transfer (NEFT / IMPS / RTGS)</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="other">Other Payment Method</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account / Wallet
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatINR(acc.balance, { hideDecimals: true })})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Tags & Reconciliation status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tag / Classification
              </label>
              <input
                type="text"
                placeholder="e.g. Tax Deductible, Business, Personal, Reversal"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isReconciled}
                  onChange={(e) => setIsReconciled(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                />
                Mark as Reconciled / Verified with bank statement
              </label>
            </div>
          </div>

          {/* Receipt Attachment */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Receipt / Bill Attachment
            </label>
            {receiptUrl ? (
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
                <div className="flex items-center gap-2 truncate">
                  <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                    {receiptName || 'Attached Receipt File'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReceiptUrl('');
                    setReceiptName('');
                  }}
                  className="text-rose-600 hover:text-rose-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Click to upload invoice / receipt bill (PNG, JPG, PDF up to 4MB)
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleReceiptUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes & Remarks
            </label>
            <textarea
              rows={2}
              placeholder="Any additional notes or transaction reference..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {onSaveAndPrint && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Save this transaction and open print statement receipt"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Save & Print</span>
              </button>
            )}
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {editingTransaction ? 'Save Changes' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
