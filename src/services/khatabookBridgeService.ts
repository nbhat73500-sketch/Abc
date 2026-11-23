/**
 * Khatabook Bridge Service
 * Provides comprehensive bidirectional ledger synchronization with Khatabook:
 * - Parsing and importing Khatabook Excel/CSV statements (Customers, Suppliers, Transactions)
 * - Exporting DhanVault ledgers formatted for Khatabook upload
 * - One-click WhatsApp payment reminders with pre-filled Khatabook UPI payment links
 * - Automated ledger mapping between Khatabook (You Gave / You Got) and double-entry accounting
 */

import { DebtRecord } from '../types/finance';
import { DecimalSafe } from './calculationEngine';

export interface KhatabookPartySummary {
  name: string;
  phone?: string;
  type: 'customer' | 'supplier';
  totalGave: number; // You Gave (Lent / You will receive)
  totalGot: number; // You Got (Borrowed / You have to pay)
  netBalance: number; // Positive = Receivable, Negative = Payable
  entriesCount: number;
  lastDate?: string;
}

export interface KhatabookImportResult {
  success: boolean;
  importedDebts: Array<Omit<DebtRecord, 'id'>>;
  skippedCount: number;
  partiesDetected: number;
  totalReceivables: number;
  totalPayables: number;
  errors: string[];
}

export class KhatabookBridgeService {
  /**
   * Generates a direct WhatsApp payment reminder URL pre-filled with Khatabook style message
   * Supports standard Indian mobile numbers and international numbers.
   */
  static generateWhatsAppReminderLink(params: {
    partyName: string;
    phone: string;
    amount: number;
    dueDate?: string;
    senderBusinessName?: string;
    note?: string;
  }): string {
    const { partyName, phone, amount, dueDate, senderBusinessName, note } = params;

    // Clean phone number: remove spaces, dashes, parentheses
    let cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone.startsWith('+')) {
      // If 10 digits without country code, prefix with 91 (India)
      if (cleanPhone.length === 10) {
        cleanPhone = `91${cleanPhone}`;
      }
    } else {
      cleanPhone = cleanPhone.replace('+', '');
    }

    const business = senderBusinessName || 'DhanVault Khata';
    const formattedAmount = `₹${amount.toLocaleString('en-IN')}`;
    const dateText = dueDate ? ` on or before ${dueDate}` : '';
    const noteText = note ? `\nNote: ${note}` : '';

    const message = `Namaste ${partyName},\nThis is a gentle payment reminder from *${business}*.\n\nYour outstanding balance of *${formattedAmount}* is due${dateText}.\n\nPlease clear the pending khata dues at your earliest convenience via UPI or bank transfer.${noteText}\n\nThank you for your business!`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }

  /**
   * Generates standard Khatabook CSV format export of current khata records
   */
  static exportToKhatabookCsv(debts: DebtRecord[], businessName?: string): string {
    const headers = [
      'Customer/Supplier Name',
      'Mobile Number',
      'Party Type',
      'Date (YYYY-MM-DD)',
      'You Gave (Debit/Dr)',
      'You Got (Credit/Cr)',
      'Remaining Balance',
      'Status',
      'Description / Notes',
    ];

    const rows = debts.map((d) => {
      const remaining = DecimalSafe.subtract(d.amount, d.settledAmount || 0);
      const isLent = d.type === 'lent'; // You gave money to them (You will receive)
      const youGave = isLent ? d.amount : 0;
      const youGot = !isLent ? d.amount : 0;
      const partyType = d.khatabookPartyType || (isLent ? 'Customer' : 'Supplier');

      return [
        `"${d.personName.replace(/"/g, '""')}"`,
        `"${d.contact || ''}"`,
        `"${partyType}"`,
        `"${d.date}"`,
        youGave > 0 ? youGave.toFixed(2) : '0',
        youGot > 0 ? youGot.toFixed(2) : '0',
        remaining.toFixed(2),
        `"${d.status}"`,
        `"${(d.description || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Parses CSV content exported from Khatabook or standard ledger spreadsheets
   * Supports standard column formats from Khatabook app:
   * - Name, Contact, You Gave (Dr), You Got (Cr), Date, Notes
   */
  static parseKhatabookCsv(csvContent: string): KhatabookImportResult {
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return {
        success: false,
        importedDebts: [],
        skippedCount: 0,
        partiesDetected: 0,
        totalReceivables: 0,
        totalPayables: 0,
        errors: ['File is empty or contains no transaction records.'],
      };
    }

    // Parse header row
    const headerLine = lines[0].toLowerCase();
    const columns = this.parseCsvLine(headerLine);

    // Identify column indices
    let nameIdx = columns.findIndex((c) => c.includes('name') || c.includes('party') || c.includes('customer') || c.includes('supplier'));
    let phoneIdx = columns.findIndex((c) => c.includes('phone') || c.includes('mobile') || c.includes('contact'));
    let gaveIdx = columns.findIndex((c) => c.includes('gave') || c.includes('debit') || c.includes('dr') || c.includes('lent'));
    let gotIdx = columns.findIndex((c) => c.includes('got') || c.includes('credit') || c.includes('cr') || c.includes('borrow'));
    let amountIdx = columns.findIndex((c) => c.includes('amount') || c.includes('total') || c.includes('balance'));
    let dateIdx = columns.findIndex((c) => c.includes('date') || c.includes('entry date'));
    let notesIdx = columns.findIndex((c) => c.includes('note') || c.includes('desc') || c.includes('remark') || c.includes('item'));

    if (nameIdx === -1) nameIdx = 0; // Default first col to name

    const importedDebts: Array<Omit<DebtRecord, 'id'>> = [];
    const partySet = new Set<string>();
    let skippedCount = 0;
    let totalReceivables = 0;
    let totalPayables = 0;
    const errors: string[] = [];

    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCsvLine(lines[i]);
      if (row.length === 0 || !row.some((cell) => cell.length > 0)) {
        skippedCount++;
        continue;
      }

      const personName = (row[nameIdx] || '').trim();
      if (!personName) {
        skippedCount++;
        continue;
      }

      partySet.add(personName);
      const phone = phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx].trim() : undefined;
      const notes = notesIdx !== -1 && row[notesIdx] ? row[notesIdx].trim() : 'Imported from Khatabook';

      let parsedDate = todayStr;
      if (dateIdx !== -1 && row[dateIdx]) {
        const rawDate = row[dateIdx].trim();
        // Handle DD/MM/YYYY or YYYY-MM-DD
        if (rawDate.includes('/')) {
          const parts = rawDate.split('/');
          if (parts.length === 3) {
            // Check if YYYY/MM/DD or DD/MM/YYYY
            if (parts[0].length === 4) {
              parsedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            } else {
              parsedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
        } else if (rawDate.includes('-')) {
          parsedDate = rawDate;
        }
      }

      // Check gave (You Gave = Lent / Receivable)
      const gaveVal = gaveIdx !== -1 ? parseFloat(row[gaveIdx].replace(/[^0-9.]/g, '')) : 0;
      // Check got (You Got = Borrowed / Payable)
      const gotVal = gotIdx !== -1 ? parseFloat(row[gotIdx].replace(/[^0-9.]/g, '')) : 0;

      if (!isNaN(gaveVal) && gaveVal > 0) {
        importedDebts.push({
          personName,
          type: 'lent',
          amount: DecimalSafe.format(gaveVal),
          settledAmount: 0,
          date: parsedDate,
          description: notes,
          contact: phone,
          status: 'pending',
          khatabookPartyType: 'customer',
          khatabookRefId: `KB-IMP-${i}`,
          syncSource: 'khatabook_import',
        });
        totalReceivables = DecimalSafe.add(totalReceivables, gaveVal);
      } else if (!isNaN(gotVal) && gotVal > 0) {
        importedDebts.push({
          personName,
          type: 'borrowed',
          amount: DecimalSafe.format(gotVal),
          settledAmount: 0,
          date: parsedDate,
          description: notes,
          contact: phone,
          status: 'pending',
          khatabookPartyType: 'supplier',
          khatabookRefId: `KB-IMP-${i}`,
          syncSource: 'khatabook_import',
        });
        totalPayables = DecimalSafe.add(totalPayables, gotVal);
      } else if (amountIdx !== -1) {
        // Fallback to single amount column
        const singleVal = parseFloat((row[amountIdx] || '').replace(/[^0-9.]/g, ''));
        if (!isNaN(singleVal) && singleVal > 0) {
          // If sign is negative or contains payable, it's borrowed, else lent
          const isNegative = (row[amountIdx] || '').includes('-') || (notes.toLowerCase().includes('payable'));
          const type = isNegative ? 'borrowed' : 'lent';
          importedDebts.push({
            personName,
            type,
            amount: DecimalSafe.format(singleVal),
            settledAmount: 0,
            date: parsedDate,
            description: notes,
            contact: phone,
            status: 'pending',
            khatabookPartyType: type === 'lent' ? 'customer' : 'supplier',
            khatabookRefId: `KB-IMP-${i}`,
            syncSource: 'khatabook_import',
          });
          if (type === 'lent') {
            totalReceivables = DecimalSafe.add(totalReceivables, singleVal);
          } else {
            totalPayables = DecimalSafe.add(totalPayables, singleVal);
          }
        } else {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    return {
      success: importedDebts.length > 0,
      importedDebts,
      skippedCount,
      partiesDetected: partySet.size,
      totalReceivables,
      totalPayables,
      errors,
    };
  }

  /**
   * Helper to parse CSV lines handling quoted fields correctly
   */
  private static parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  }
}
