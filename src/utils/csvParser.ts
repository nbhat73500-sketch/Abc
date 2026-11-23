import { Transaction, TransactionType, PaymentMethod, Category, Account } from '../types/finance';

export interface ParsedCsvRow {
  rowIndex: number;
  raw: Record<string, string>;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: TransactionType;
  amount: number;
  description: string;
  vendor: string;
  categoryName: string;
  subcategory: string;
  paymentMethod: PaymentMethod;
  accountName: string;
  tag?: string;
  notes?: string;
  isValid: boolean;
  validationError?: string;
  isDuplicate?: boolean;
}

/**
 * Robust CSV parser that handles quotes, escaped quotes, and newlines
 */
export function parseCSV(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      if (currentRow.some((field) => field.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // First line is headers
  const rawHeaders = lines[0].map((h) => h.replace(/^\uFEFF/, '').trim());
  const rows: Record<string, string>[] = [];

  for (let r = 1; r < lines.length; r++) {
    const values = lines[r];
    const rowObj: Record<string, string> = {};
    for (let h = 0; h < rawHeaders.length; h++) {
      rowObj[rawHeaders[h]] = values[h] !== undefined ? values[h].trim() : '';
    }
    rows.push(rowObj);
  }

  return { headers: rawHeaders, rows };
}

/**
 * Normalize flexible date strings into standard YYYY-MM-DD
 * Supports DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, YYYY/MM/DD, DD.MM.YYYY
 */
export function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // MM-DD-YYYY or MM/DD/YYYY
  const tryDate = new Date(clean);
  if (!isNaN(tryDate.getTime())) {
    return tryDate.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Parse an amount string, stripping currency symbols (₹, $, Rs), commas, etc.
 */
export function parseAmount(val: string): number {
  if (!val) return 0;
  const clean = val.replace(/[₹$Rs,\s]/gi, '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Infer payment method from text
 */
export function inferPaymentMethod(text: string): PaymentMethod {
  const lower = text.toLowerCase();
  if (lower.includes('upi') || lower.includes('gpay') || lower.includes('phonepe') || lower.includes('paytm')) {
    return 'upi';
  }
  if (lower.includes('credit') || lower.includes('cc')) {
    return 'credit_card';
  }
  if (lower.includes('debit') || lower.includes('dc') || lower.includes('atm')) {
    return 'debit_card';
  }
  if (lower.includes('neft') || lower.includes('imps') || lower.includes('rtgs') || lower.includes('transfer') || lower.includes('netbanking')) {
    return 'bank_transfer';
  }
  if (lower.includes('cash')) {
    return 'cash';
  }
  return 'other';
}

/**
 * Intelligent mapping of CSV rows to structured financial transactions
 */
export function processRawCsvRows(
  headers: string[],
  rows: Record<string, string>[],
  existingTransactions: Transaction[],
  categories: Category[],
  accounts: Account[]
): ParsedCsvRow[] {
  // Find column keys
  const findCol = (patterns: string[]): string | undefined => {
    return headers.find((h) => {
      const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      return patterns.some((p) => lower.includes(p));
    });
  };

  const dateCol = findCol(['date', 'txndate', 'valuedate', 'postingdate']);
  const timeCol = findCol(['time', 'txntime']);
  const descCol = findCol(['description', 'particulars', 'narration', 'purpose', 'details', 'memo']);
  const vendorCol = findCol(['vendor', 'person', 'merchant', 'beneficiary', 'payee']);
  const typeCol = findCol(['type', 'txntype', 'crdr', 'drcr']);
  const amountCol = findCol(['amount', 'transactionamount']);
  const debitCol = findCol(['debit', 'withdrawal', 'withdrawal', 'dr']);
  const creditCol = findCol(['credit', 'deposit', 'cr']);
  const categoryCol = findCol(['category', 'categoryname']);
  const subcatCol = findCol(['subcategory', 'subcat']);
  const accountCol = findCol(['account', 'wallet', 'bank', 'mode']);
  const paymentMethodCol = findCol(['paymentmethod', 'method', 'channel']);
  const notesCol = findCol(['notes', 'remark', 'remarks', 'ref']);
  const tagCol = findCol(['tag', 'tags', 'label']);

  return rows.map((row, idx) => {
    let dateStr = dateCol ? row[dateCol] : '';
    const normalizedDate = normalizeDate(dateStr) || new Date().toISOString().split('T')[0];

    const timeStr = timeCol && row[timeCol] ? row[timeCol] : '12:00';
    const description = (descCol ? row[descCol] : '') || 'Imported Entry';
    const vendor = (vendorCol ? row[vendorCol] : '') || description.substring(0, 30);
    const notes = notesCol ? row[notesCol] : '';
    const tag = tagCol ? row[tagCol] : 'CSV Import';

    let amount = 0;
    let type: TransactionType = 'expense';

    // Bank Statement with Debit/Credit columns
    if (debitCol && creditCol) {
      const debitVal = parseAmount(row[debitCol] || '');
      const creditVal = parseAmount(row[creditCol] || '');

      if (creditVal > 0) {
        amount = creditVal;
        type = 'income';
      } else if (debitVal > 0) {
        amount = debitVal;
        type = 'expense';
      } else if (amountCol) {
        amount = Math.abs(parseAmount(row[amountCol] || ''));
        const rawType = (typeCol ? row[typeCol] : '').toLowerCase();
        type = rawType.includes('in') || rawType.includes('cr') ? 'income' : 'expense';
      }
    } else if (amountCol) {
      const rawAmt = parseAmount(row[amountCol] || '');
      amount = Math.abs(rawAmt);

      const rawType = (typeCol ? row[typeCol] : '').toLowerCase();
      if (rawType.includes('income') || rawType.includes('cr') || rawType.includes('deposit') || rawAmt > 0 && rawType === 'income') {
        type = 'income';
      } else if (rawType.includes('transfer')) {
        type = 'transfer';
      } else {
        type = 'expense';
      }
    }

    // Category matching
    let categoryName = categoryCol ? row[categoryCol] : '';
    if (!categoryName) {
      // Auto-categorize by description keywords
      const lowerDesc = description.toLowerCase();
      if (lowerDesc.includes('swiggy') || lowerDesc.includes('zomato') || lowerDesc.includes('restaurant') || lowerDesc.includes('food') || lowerDesc.includes('grocery') || lowerDesc.includes('dmart') || lowerDesc.includes('blinkit')) {
        categoryName = 'Food and Groceries';
      } else if (lowerDesc.includes('petrol') || lowerDesc.includes('fuel') || lowerDesc.includes('hpcl') || lowerDesc.includes('ioc') || lowerDesc.includes('uber') || lowerDesc.includes('ola') || lowerDesc.includes('metro')) {
        categoryName = 'Travel and Fuel';
      } else if (lowerDesc.includes('rent') || lowerDesc.includes('electricity') || lowerDesc.includes('bescom') || lowerDesc.includes('bill') || lowerDesc.includes('water')) {
        categoryName = 'Rent and Utilities';
      } else if (lowerDesc.includes('salary') || lowerDesc.includes('payroll') || lowerDesc.includes('consulting') || lowerDesc.includes('freelance')) {
        categoryName = 'Salary and Income';
        type = 'income';
      } else if (lowerDesc.includes('pharmacy') || lowerDesc.includes('apollo') || lowerDesc.includes('hospital') || lowerDesc.includes('doctor')) {
        categoryName = 'Medical Expenses';
      } else if (lowerDesc.includes('netflix') || lowerDesc.includes('prime') || lowerDesc.includes('spotify') || lowerDesc.includes('movie') || lowerDesc.includes('pvr')) {
        categoryName = 'Entertainment';
      } else if (lowerDesc.includes('sip') || lowerDesc.includes('mutual') || lowerDesc.includes('groww') || lowerDesc.includes('emi') || lowerDesc.includes('loan')) {
        categoryName = 'Loan and EMI Payments';
      } else {
        categoryName = type === 'income' ? 'Salary and Income' : 'Miscellaneous';
      }
    }

    const subcategory = subcatCol ? row[subcatCol] : 'General';
    const accountName = accountCol ? row[accountCol] : (accounts[0]?.name || 'Primary Account');
    const paymentMethod = paymentMethodCol ? inferPaymentMethod(row[paymentMethodCol]) : inferPaymentMethod(description);

    const isValid = amount > 0 && !!normalizedDate;
    let validationError: string | undefined;
    if (amount <= 0) validationError = 'Invalid or zero amount';
    if (!normalizedDate) validationError = 'Invalid date format';

    // Check duplicate
    const isDuplicate = existingTransactions.some((txn) => {
      return (
        txn.date === normalizedDate &&
        Math.abs(txn.amount - amount) < 0.01 &&
        (txn.description.toLowerCase() === description.toLowerCase() ||
          txn.vendor.toLowerCase() === vendor.toLowerCase())
      );
    });

    return {
      rowIndex: idx + 1,
      raw: row,
      date: normalizedDate,
      time: timeStr,
      type,
      amount,
      description,
      vendor,
      categoryName,
      subcategory,
      paymentMethod,
      accountName,
      tag,
      notes,
      isValid,
      validationError,
      isDuplicate,
    };
  });
}

/**
 * Generate a downloadable header-only CSV import template
 */
export function generateCsvTemplateContent(): string {
  const templateHeaders = [
    'Date (DD-MM-YYYY)',
    'Type',
    'Category',
    'Subcategory',
    'Description',
    'Amount (INR)',
    'Payment Method',
    'Account / Wallet',
    'Vendor / Person',
    'Tag',
    'Notes',
  ];

  return templateHeaders.join(',');
}

export function downloadCsvTemplate() {
  const content = generateCsvTemplateContent();
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'BudgetManagement_Import_Template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
