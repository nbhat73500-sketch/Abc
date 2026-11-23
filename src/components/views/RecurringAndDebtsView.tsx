import React, { useState } from 'react';
import {
  Repeat,
  BookOpen,
  Plus,
  Play,
  Calendar,
  User,
  Phone,
  CheckCircle2,
  Trash2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  CreditCard,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { RecurringTransaction, DebtRecord, TransactionType, PaymentMethod } from '../../types/finance';
import { formatINR, formatDateIN } from '../../utils/formatters';
import { CategoryIcon } from '../CategoryIcon';
import { KhatabookSyncModal } from '../modals/KhatabookSyncModal';
import { KhatabookBridgeService } from '../../services/khatabookBridgeService';
import { MessageSquare, ExternalLink, Share2, Upload, Download } from 'lucide-react';

interface RecurringAndDebtsViewProps {
  onOpenSettleDebt: (debt: DebtRecord) => void;
}

export const RecurringAndDebtsView: React.FC<RecurringAndDebtsViewProps> = ({
  onOpenSettleDebt,
}) => {
  const {
    recurring,
    addRecurring,
    deleteRecurring,
    executeRecurring,
    debts,
    addDebt,
    deleteDebt,
    categories,
    accounts,
    settings,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'recurring' | 'debts'>('debts');
  const [isKhatabookModalOpen, setIsKhatabookModalOpen] = useState(false);

  // Recurring modal state
  const [isAddingRecurring, setIsAddingRecurring] = useState(false);
  const [recTitle, setRecTitle] = useState('');
  const [recType, setRecType] = useState<TransactionType>('expense');
  const [recAmount, setRecAmount] = useState('');
  const [recCategoryId, setRecCategoryId] = useState(categories[0]?.id || '');
  const [recAccountId, setRecAccountId] = useState(accounts[0]?.id || '');
  const [recPaymentMethod, setRecPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [recVendor, setRecVendor] = useState('');
  const [recFrequency, setRecFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [recNextDueDate, setRecNextDueDate] = useState('');

  // Debt modal state
  const [isAddingDebt, setIsAddingDebt] = useState(false);
  const [debtPerson, setDebtPerson] = useState('');
  const [debtType, setDebtType] = useState<'lent' | 'borrowed'>('lent');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtDate, setDebtDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [debtDueDate, setDebtDueDate] = useState('');
  const [debtDescription, setDebtDescription] = useState('');
  const [debtContact, setDebtContact] = useState('');

  const categoriesMap = new Map(categories.map((c) => [c.id, c]));
  const accountsMap = new Map(accounts.map((a) => [a.id, a]));

  const handleSaveRecurring = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(recAmount);
    if (isNaN(num) || num <= 0 || !recTitle.trim()) return;

    addRecurring({
      title: recTitle.trim(),
      type: recType,
      amount: num,
      categoryId: recCategoryId,
      subcategory: categoriesMap.get(recCategoryId)?.subcategories[0] || 'General',
      accountId: recAccountId,
      paymentMethod: recPaymentMethod,
      vendor: recVendor.trim() || 'Scheduled Payee',
      frequency: recFrequency,
      dayOfPeriod: 1,
      nextDueDate: recNextDueDate || new Date().toISOString().split('T')[0],
      active: true,
    });

    setIsAddingRecurring(false);
  };

  const handleSaveDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(debtAmount);
    if (isNaN(num) || num <= 0 || !debtPerson.trim()) return;

    addDebt({
      personName: debtPerson.trim(),
      type: debtType,
      amount: num,
      settledAmount: 0,
      date: debtDate,
      dueDate: debtDueDate || undefined,
      description: debtDescription.trim() || (debtType === 'lent' ? 'Money Lent' : 'Money Borrowed'),
      contact: debtContact.trim() || undefined,
      status: 'pending',
    });

    setIsAddingDebt(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Recurring Expenses & Khata (Udhaar) Book
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automate monthly subscriptions, rent, and track lent or borrowed funds
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsKhatabookModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 rounded-lg transition-colors shadow-xs"
            title="Import/Export Khatabook statements or send WhatsApp reminders"
          >
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
            Khatabook Sync
          </button>

          {activeTab === 'recurring' ? (
            <button
              onClick={() => {
                setRecTitle('');
                setRecAmount('');
                setRecVendor('');
                setRecNextDueDate(new Date().toISOString().split('T')[0]);
                setIsAddingRecurring(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Recurring Rule
            </button>
          ) : (
            <button
              onClick={() => {
                setDebtPerson('');
                setDebtAmount('');
                setDebtDescription('');
                setDebtContact('');
                setDebtDueDate('');
                setIsAddingDebt(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Khata Entry
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('recurring')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'recurring'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Repeat className="w-4 h-4 text-emerald-600" />
          Recurring Rules & Subscriptions ({recurring.length})
        </button>

        <button
          onClick={() => setActiveTab('debts')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'debts'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4 text-sky-600" />
          Outstanding Receivables & Payables ({debts.length})
        </button>
      </div>

      {/* TAB 1: RECURRING TRANSACTIONS */}
      {activeTab === 'recurring' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recurring.map((item) => {
              const cat = categoriesMap.get(item.categoryId);
              const acc = accountsMap.get(item.accountId);
              const isIncome = item.type === 'income';

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: `${cat?.color || '#64748b'}15`,
                            color: cat?.color || '#64748b',
                          }}
                        >
                          <CategoryIcon name={cat?.icon || 'Repeat'} className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                            {item.title}
                          </h3>
                          <span className="text-[11px] text-slate-400 block capitalize">
                            {item.frequency} · {item.vendor}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (window.confirm(`Delete recurring rule ${item.title}?`)) {
                            deleteRecurring(item.id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Delete rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-500">Scheduled Amount:</span>
                        <span
                          className={`text-lg font-bold tabular-nums ${
                            isIncome ? 'text-emerald-600' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {isIncome ? '+' : '-'}{formatINR(item.amount)}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-slate-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Account:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {acc?.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Next Due Date:</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatDateIN(item.nextDueDate)}
                          </span>
                        </div>
                      </div>

                      {item.notes && (
                        <p className="text-[11px] text-slate-400 mt-2 italic">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                      {item.frequency}
                    </span>
                    <button
                      onClick={() => {
                        const txn = executeRecurring(item.id);
                        if (txn) {
                          alert(`Transaction of ${formatINR(txn.amount)} logged successfully! Next due date updated.`);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800"
                    >
                      <Play className="w-3.5 h-3.5 fill-emerald-600" />
                      Record Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: UDHAAR & KHATA BOOK */}
      {activeTab === 'debts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {debts.map((debt) => {
              const isLent = debt.type === 'lent'; // someone owes me
              const remaining = debt.amount - (debt.settledAmount || 0);
              const isSettled = debt.status === 'settled';

              return (
                <div
                  key={debt.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isLent
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}
                        >
                          {isLent ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {debt.personName}
                          </h3>
                          <span className="text-[11px] text-slate-400 block">
                            {isLent ? 'Receivable (They owe you)' : 'Payable (You owe them)'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (window.confirm(`Delete record for ${debt.personName}?`)) deleteDebt(debt.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-500">Remaining Balance:</span>
                        <span
                          className={`text-xl font-bold tabular-nums ${
                            isSettled
                              ? 'text-slate-400 line-through'
                              : isLent
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {formatINR(remaining)}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-slate-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Total Amount:</span>
                          <span className="font-semibold tabular-nums">{formatINR(debt.amount)}</span>
                        </div>
                        {debt.settledAmount > 0 && (
                          <div className="flex justify-between">
                            <span>Settled So Far:</span>
                            <span className="text-emerald-600 font-semibold tabular-nums">
                              {formatINR(debt.settledAmount)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Date Logged:</span>
                          <span className="tabular-nums">{formatDateIN(debt.date)}</span>
                        </div>
                        {debt.dueDate && (
                          <div className="flex justify-between">
                            <span>Due Date:</span>
                            <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">
                              {formatDateIN(debt.dueDate)}
                            </span>
                          </div>
                        )}
                        {debt.contact && (
                          <div className="flex justify-between items-center pt-1 text-[11px]">
                            <span className="flex items-center gap-1 text-slate-400">
                              <Phone className="w-3 h-3" /> Contact:
                            </span>
                            <span className="font-mono text-slate-600 dark:text-slate-300">
                              {debt.contact}
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-800/40 p-2 rounded">
                        {debt.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isSettled
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          : debt.status === 'partially_paid'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      {debt.status.toUpperCase().replace('_', ' ')}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {!isSettled && isLent && debt.contact && (
                        <a
                          href={KhatabookBridgeService.generateWhatsAppReminderLink({
                            partyName: debt.personName,
                            phone: debt.contact,
                            amount: remaining,
                            dueDate: debt.dueDate,
                            senderBusinessName: settings.businessName || 'DhanVault Khata',
                            note: debt.description,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 rounded-lg inline-flex items-center gap-1 transition-colors"
                          title="Send Khatabook style WhatsApp payment reminder"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      )}

                      {!isSettled && (
                        <button
                          onClick={() => onOpenSettleDebt(debt)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 rounded-lg shadow-sm"
                        >
                          Settle Payment
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Recurring Rule Modal */}
      {isAddingRecurring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Add Recurring Transaction Rule
              </h3>
              <button
                onClick={() => setIsAddingRecurring(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecurring} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rule Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Indiranagar House Rent, Mutual Fund SIP, Netflix"
                  value={recTitle}
                  onChange={(e) => setRecTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="0.00"
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Frequency
                  </label>
                  <select
                    value={recFrequency}
                    onChange={(e) => setRecFrequency(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={recCategoryId}
                    onChange={(e) => setRecCategoryId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account / Mode
                  </label>
                  <select
                    value={recAccountId}
                    onChange={(e) => setRecAccountId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Next Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={recNextDueDate}
                    onChange={(e) => setRecNextDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payee / Vendor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Landlord, Airtel"
                    value={recVendor}
                    onChange={(e) => setRecVendor(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingRecurring(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 rounded-lg shadow-sm"
                >
                  Save Recurring Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Khata Debt Modal */}
      {isAddingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Record Udhaar / Khata Entry
              </h3>
              <button
                onClick={() => setIsAddingDebt(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDebt} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Person or Vendor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma, Amit Verma, Pooja"
                  value={debtPerson}
                  onChange={(e) => setDebtPerson(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Entry Type
                  </label>
                  <select
                    value={debtType}
                    onChange={(e) => setDebtType(e.target.value as 'lent' | 'borrowed')}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="lent">I Lent Money (Receivable)</option>
                    <option value="borrowed">I Borrowed Money (Payable)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="0.00"
                    value={debtAmount}
                    onChange={(e) => setDebtAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date Lent / Borrowed
                  </label>
                  <input
                    type="date"
                    required
                    value={debtDate}
                    onChange={(e) => setDebtDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expected Repayment Date
                  </label>
                  <input
                    type="date"
                    value={debtDueDate}
                    onChange={(e) => setDebtDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="+91 98450 12345"
                  value={debtContact}
                  onChange={(e) => setDebtContact(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Purpose
                </label>
                <input
                  type="text"
                  placeholder="e.g. Split restaurant bill, concert ticket booking"
                  value={debtDescription}
                  onChange={(e) => setDebtDescription(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingDebt(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 rounded-lg shadow-sm"
                >
                  Save Khata Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Khatabook Direct Sync & Bridge Modal */}
      <KhatabookSyncModal
        isOpen={isKhatabookModalOpen}
        onClose={() => setIsKhatabookModalOpen(false)}
      />
    </div>
  );
};
