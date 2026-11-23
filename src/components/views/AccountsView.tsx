import React, { useState } from 'react';
import {
  Wallet,
  Building,
  CreditCard,
  Smartphone,
  ArrowRightLeft,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  X,
  Printer,
  FileText,
  Building2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Account, AccountType } from '../../types/finance';
import { formatINR } from '../../utils/formatters';

interface AccountsViewProps {
  onOpenTransfer: () => void;
  onFilterByAccount: (accountId: string) => void;
  onOpenStatementPdf?: (params?: { title?: string; accountId?: string; dateRangeLabel?: string }) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  onOpenTransfer,
  onFilterByAccount,
  onOpenStatementPdf,
}) => {
  const { accounts, loans, totalLoanLiability, addAccount, updateAccount, deleteAccount, transactions } = useFinance();

  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [color, setColor] = useState('#0284c7');
  const [notes, setNotes] = useState('');

  // Totals
  const totalLiquid = accounts
    .filter((a) => a.type !== 'credit_card')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalCreditDebt = accounts
    .filter((a) => a.type === 'credit_card' && a.balance < 0)
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);

  const netBalance = totalLiquid - totalCreditDebt;

  const handleOpenAdd = () => {
    setName('');
    setType('bank');
    setBankName('');
    setAccountNumber('');
    setInitialBalance('0');
    setCreditLimit('');
    setColor('#0284c7');
    setNotes('');
    setEditingAccountId(null);
    setIsAddingAccount(true);
  };

  const handleOpenEdit = (acc: Account) => {
    setName(acc.name);
    setType(acc.type);
    setBankName(acc.bankName || '');
    setAccountNumber(acc.accountNumber || '');
    setInitialBalance(acc.initialBalance.toString());
    setCreditLimit(acc.creditLimit ? acc.creditLimit.toString() : '');
    setColor(acc.color);
    setNotes(acc.notes || '');
    setEditingAccountId(acc.id);
    setIsAddingAccount(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const numInit = parseFloat(initialBalance) || 0;
    const numLimit = creditLimit ? parseFloat(creditLimit) : undefined;

    if (editingAccountId) {
      updateAccount(editingAccountId, {
        name: name.trim(),
        type,
        bankName: bankName.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        initialBalance: numInit,
        creditLimit: numLimit,
        color,
        notes: notes.trim() || undefined,
      });
    } else {
      addAccount({
        name: name.trim(),
        type,
        bankName: bankName.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        initialBalance: numInit,
        creditLimit: numLimit,
        color,
        notes: notes.trim() || undefined,
      });
    }

    setIsAddingAccount(false);
  };

  const getAccountIcon = (accType: AccountType) => {
    switch (accType) {
      case 'bank':
        return <Building className="w-5 h-5" />;
      case 'credit_card':
        return <CreditCard className="w-5 h-5" />;
      case 'wallet':
        return <Smartphone className="w-5 h-5" />;
      case 'cash':
      default:
        return <Wallet className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Accounts & Wallets Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain independent balances for physical cash, bank accounts, UPI, and credit cards
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenStatementPdf && (
            <button
              onClick={() => onOpenStatementPdf({ title: 'CONSOLIDATED ACCOUNTS & PASSBOOK STATEMENT' })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-800 rounded-lg transition-colors shadow-2xs"
              title="Print Read-Only PDF Statement for all accounts"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-600" />
              <span>Print PDF Statement</span>
            </button>
          )}
          <button
            onClick={onOpenTransfer}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-sky-600" />
            Transfer Funds
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Account
          </button>
        </div>
      </div>

      {/* Net Worth Summary Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Liquid Balances (Cash + Banks + UPI)</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatINR(totalLiquid)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Immediately spendable funds</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Credit Card Outstanding Balance</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              {formatINR(totalCreditDebt)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Short-term liabilities to settle</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Total Net Financial Worth</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {formatINR(netBalance)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Liquid Assets minus Credit Debt</p>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const isCredit = acc.type === 'credit_card';
          const accTxnCount = transactions.filter(
            (t) => t.accountId === acc.id || t.toAccountId === acc.id
          ).length;

          return (
            <div
              key={acc.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                      style={{
                        backgroundColor: `${acc.color}15`,
                        color: acc.color,
                      }}
                    >
                      {getAccountIcon(acc.type)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {acc.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {acc.bankName || acc.type.toUpperCase().replace('_', ' ')}
                        {acc.accountNumber ? ` · ${acc.accountNumber}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(acc)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                      title="Edit Account"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {accounts.length > 1 && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete ${acc.name}? Transactions mapped to it will remain.`)) {
                            deleteAccount(acc.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Delete Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Balance display */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-500">
                    {isCredit ? 'Outstanding Due:' : 'Current Balance:'}
                  </span>
                  <div className="text-2xl font-bold tracking-tight mt-0.5 tabular-nums">
                    <span
                      className={
                        acc.balance < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-900 dark:text-white'
                      }
                    >
                      {formatINR(acc.balance)}
                    </span>
                  </div>

                  {/* Credit card limit gauge */}
                  {isCredit && acc.creditLimit && (
                    <div className="mt-2 text-xs text-slate-500">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span>Used: {formatINR(Math.abs(acc.balance))}</span>
                        <span>Limit: {formatINR(acc.creditLimit)}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (Math.abs(acc.balance) / acc.creditLimit) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {acc.notes && (
                    <p className="text-[11px] text-slate-400 mt-2 italic">
                      "{acc.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Footer action */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 tabular-nums">
                  {accTxnCount} Txns
                </span>
                <div className="flex items-center gap-2">
                  {onOpenStatementPdf && (
                    <button
                      onClick={() =>
                        onOpenStatementPdf({
                          accountId: acc.id,
                          title: `${acc.name.toUpperCase()} STATEMENT & PASSBOOK`,
                        })
                      }
                      className="px-2 py-0.5 rounded text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
                      title={`Print PDF Statement for ${acc.name}`}
                    >
                      <Printer className="w-3 h-3 text-slate-400" />
                      <span>PDF</span>
                    </button>
                  )}
                  <button
                    onClick={() => onFilterByAccount(acc.id)}
                    className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Passbook →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Outstanding Balance & Loan Liability Accounts Section */}
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Outstanding Balance / EMI Payable Accounts
              </h3>
              <p className="text-xs text-slate-500">
                Loan liabilities, original sanctions &amp; monthly amortization accounts
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500 block">Total Loan Liability:</span>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400">
              {formatINR(totalLoanLiability)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loans.map((loan) => (
            <div
              key={loan.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {loan.lenderName}
                  </span>
                  <span className="text-[11px] text-slate-500">{loan.loanName}</span>
                  <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                    {loan.loanReference}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  {loan.loanType}
                </span>
              </div>

              <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Outstanding:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                    {formatINR(loan.currentOutstandingPrincipal ?? loan.outstandingPrincipal ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Monthly EMI:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {formatINR(loan.emiAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Interest Rate: {loan.interestRateAnnual}%</span>
                  <span>Due Day: {loan.emiDueDay}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Account Modal */}
      {isAddingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {editingAccountId ? 'Edit Account' : 'Add New Account / Wallet'}
                </h3>
                <p className="text-[11px] text-slate-500">Physical cash, bank, UPI, or credit card</p>
              </div>
              <button
                onClick={() => setIsAddingAccount(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Salary, SBI Savings, Cash in Hand"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AccountType)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="bank">Bank Account</option>
                    <option value="cash">Cash in Hand</option>
                    <option value="wallet">Digital Wallet / UPI</option>
                    <option value="credit_card">Credit Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {type === 'bank' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC, ICICI, SBI"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Account No. / Digits
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. •••• 4892"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {type === 'credit_card' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    placeholder="e.g. 200000"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Card / Account Color
                </label>
                <div className="flex gap-2">
                  {['#0284c7', '#059669', '#7c3aed', '#ea580c', '#e11d48', '#475569'].map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        color === c ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Salary auto-credit, billing on 20th"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingAccount(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 rounded-lg shadow-sm"
                >
                  {editingAccountId ? 'Update Account' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
