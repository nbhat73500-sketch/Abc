import React from 'react';
import { X, Download, FileText } from 'lucide-react';
import { Transaction } from '../../types/finance';
import { formatINR, formatDateIN } from '../../utils/formatters';

interface ReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, onClose }) => {
  if (!transaction || !transaction.receiptUrl) return null;

  const isPdf = transaction.receiptUrl.startsWith('data:application/pdf') ||
    transaction.receiptName?.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Receipt / Bill Attachment
            </h3>
            <p className="text-[11px] text-slate-500">
              {transaction.id} · {formatDateIN(transaction.date)} · {formatINR(transaction.amount)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={transaction.receiptUrl}
              download={transaction.receiptName || `Receipt_${transaction.id}`}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center justify-center max-h-[60vh] overflow-auto bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
          {isPdf ? (
            <div className="p-8 text-center">
              <FileText className="w-16 h-16 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {transaction.receiptName || 'PDF Document Attachment'}
              </p>
              <a
                href={transaction.receiptUrl}
                download={transaction.receiptName || 'receipt.pdf'}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-md"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </a>
            </div>
          ) : (
            <img
              src={transaction.receiptUrl}
              alt={transaction.receiptName || 'Receipt'}
              className="max-h-[55vh] object-contain rounded shadow-xs"
            />
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>{transaction.vendor} ({transaction.description})</span>
          <button
            onClick={onClose}
            className="px-3 py-1 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
