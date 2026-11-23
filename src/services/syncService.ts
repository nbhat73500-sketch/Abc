/**
 * Unified Cloud Firestore Synchronization & Offline Resilience Engine
 * Supports Mobile <-> Desktop real-time sync via:
 *  - Google Account Sign-In (users/{uid})
 *  - 6-Digit Sync Room ID + optional Passcode (sync_rooms/{roomCode})
 *  - Local profile fallback (users/{userId})
 * Features non-destructive timestamp-based conflict resolution, chunked batch commits,
 * offline mutation queues, and real-time heartbeat subscriptions.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, OperationType, formatFirestoreError } from './firebase';
import {
  Transaction,
  Account,
  Category,
  BudgetConfig,
  BudgetRecord,
  DebtRecord,
  SavingsGoal,
  RecurringTransaction,
  AuditLog,
  FinancialDataBackup,
  LoanAccount,
  EMIScheduleItem,
} from '../types/finance';

export type SyncLinkMode = 'local' | 'room' | 'google';

export interface SyncLinkConfig {
  mode: SyncLinkMode;
  roomCode?: string;
  hasPasscode?: boolean;
  googleUid?: string;
  googleEmail?: string;
  googleDisplayName?: string;
  lastSyncedAt?: string;
}

export interface SyncTarget {
  rootCollection: 'users' | 'sync_rooms';
  namespaceId: string;
  mode: SyncLinkMode;
  label: string;
}

export interface SyncResultStats {
  pulledCount: number;
  pushedCount: number;
  mergedCount: number;
  syncedAt: string;
  targetLabel: string;
}

interface SyncQueueItem {
  id: string;
  collection: string;
  docId: string;
  operation: 'set' | 'delete';
  data?: unknown;
  timestamp: string;
}

interface BatchWriteOp {
  collectionName: string;
  docId: string;
  data: Record<string, unknown>;
}

const SYNC_QUEUE_KEY = 'budget_sync_offline_queue';
const SYNC_LINK_CONFIG_KEY = 'budget_sync_link_config_v1';
const DEVICE_ID_KEY = 'budget_sync_device_id';

/**
 * Recursively strip undefined properties so Firestore never throws on undefined fields
 */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
      if (v !== undefined) {
        cleaned[k] = stripUndefined(v);
      }
    });
    return cleaned as T;
  }
  return value;
}

/**
 * Extract comparable epoch timestamp (ms) from any financial record
 */
function getRecordTimestamp(record: Record<string, unknown> | undefined): number {
  if (!record) return 0;
  const candidate =
    (record.updatedAt as string | undefined) ||
    (record.createdAt as string | undefined) ||
    (record.timestamp as string | undefined) ||
    (record.date as string | undefined);
  if (!candidate) return 0;
  const parsed = Date.parse(candidate);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Deterministic SHA-256 hash for optional Sync Room passcodes (with fallback for non-secure contexts)
 */
async function hashPasscode(passcode: string): Promise<string> {
  const normalized = passcode.trim();
  if (!normalized) return '';
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(`budgetvault_room_salt::${normalized}`);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback below
  }
  // Simple deterministic FNV-1a fallback if crypto.subtle is unavailable
  let h = 0x811c9dc5;
  const salted = `budgetvault_room_salt::${normalized}`;
  for (let i = 0; i < salted.length; i++) {
    h ^= salted.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fnv_${(h >>> 0).toString(16)}`;
}

/**
 * Generic timestamp-based non-destructive array merge by `id`.
 * Offline additions on either mobile or desktop are ALWAYS preserved.
 */
function mergeByTimestamp<T extends { id: string }>(
  localItems: T[],
  cloudItems: T[]
): {
  merged: T[];
  toPush: T[];
  pulledCount: number;
  mergedCount: number;
} {
  const cloudMap = new Map<string, T>();
  cloudItems.forEach((item) => {
    if (item && item.id) cloudMap.set(item.id, item);
  });

  const mergedMap = new Map<string, T>();
  const toPush: T[] = [];
  let pulledCount = 0;
  let mergedCount = 0;

  // 1. Process all local records
  localItems.forEach((localItem) => {
    if (!localItem || !localItem.id) return;
    const cloudItem = cloudMap.get(localItem.id);
    if (!cloudItem) {
      // Local-only record (e.g., added offline on this device) -> keep and push to cloud
      mergedMap.set(localItem.id, localItem);
      toPush.push(localItem);
    } else {
      const localTs = getRecordTimestamp(localItem as unknown as Record<string, unknown>);
      const cloudTs = getRecordTimestamp(cloudItem as unknown as Record<string, unknown>);
      if (localTs > cloudTs) {
        mergedMap.set(localItem.id, localItem);
        toPush.push(localItem);
        mergedCount++;
      } else {
        mergedMap.set(localItem.id, cloudItem);
        if (cloudTs > localTs) {
          mergedCount++;
        }
      }
    }
  });

  // 2. Pull any cloud-only records (e.g., added on the other linked device)
  cloudItems.forEach((cloudItem) => {
    if (!cloudItem || !cloudItem.id) return;
    if (!mergedMap.has(cloudItem.id)) {
      mergedMap.set(cloudItem.id, cloudItem);
      pulledCount++;
    }
  });

  return {
    merged: Array.from(mergedMap.values()),
    toPush,
    pulledCount,
    mergedCount,
  };
}

/**
 * Specialized non-destructive merge for LoanAccount + EMI Schedules.
 * Ensures paid EMI installments on EITHER mobile or desktop are never reverted.
 */
function mergeLoansByTimestamp(
  localLoans: LoanAccount[],
  cloudLoans: LoanAccount[]
): {
  merged: LoanAccount[];
  toPush: LoanAccount[];
  pulledCount: number;
  mergedCount: number;
} {
  const cloudMap = new Map<string, LoanAccount>();
  cloudLoans.forEach((l) => {
    if (l && l.id) cloudMap.set(l.id, l);
  });

  const mergedMap = new Map<string, LoanAccount>();
  const toPush: LoanAccount[] = [];
  let pulledCount = 0;
  let mergedCount = 0;

  localLoans.forEach((localLoan) => {
    if (!localLoan || !localLoan.id) return;
    const cloudLoan = cloudMap.get(localLoan.id);
    if (!cloudLoan) {
      mergedMap.set(localLoan.id, localLoan);
      toPush.push(localLoan);
      return;
    }

    const localTs = getRecordTimestamp(localLoan as unknown as Record<string, unknown>);
    const cloudTs = getRecordTimestamp(cloudLoan as unknown as Record<string, unknown>);
    const baseLoan = localTs >= cloudTs ? localLoan : cloudLoan;
    const otherLoan = localTs >= cloudTs ? cloudLoan : localLoan;

    // Merge EMI schedule items so paid installments from either side survive
    const otherScheduleById = new Map<string, EMIScheduleItem>();
    (otherLoan.schedule || []).forEach((item) => {
      otherScheduleById.set(item.id || String(item.installmentNumber), item);
    });

    let scheduleChangedFromCloud = false;
    const mergedSchedule = (baseLoan.schedule || []).map((item) => {
      const otherItem = otherScheduleById.get(item.id || String(item.installmentNumber));
      if (!otherItem) return item;
      if (item.status !== 'paid' && otherItem.status === 'paid') {
        scheduleChangedFromCloud = true;
        return otherItem;
      }
      return item;
    });

    // Recompute remaining principal accurately if schedules merged paid items
    const unpaidItems = mergedSchedule.filter((s) => s.status !== 'paid');
    const lastPaid = [...mergedSchedule].reverse().find((s) => s.status === 'paid');
    const reconciledOutstanding =
      unpaidItems.length === 0
        ? 0
        : lastPaid
        ? lastPaid.remainingPrincipal ?? lastPaid.remainingBalance
        : baseLoan.outstandingPrincipal;

    const finalLoan: LoanAccount = {
      ...baseLoan,
      schedule: mergedSchedule,
      outstandingPrincipal: reconciledOutstanding,
      currentOutstandingPrincipal: reconciledOutstanding,
      status: unpaidItems.length === 0 && mergedSchedule.length > 0 ? 'closed' : baseLoan.status,
      updatedAt:
        scheduleChangedFromCloud || localTs > cloudTs
          ? new Date().toISOString()
          : baseLoan.updatedAt || baseLoan.createdAt,
    };

    mergedMap.set(localLoan.id, finalLoan);
    if (localTs > cloudTs || scheduleChangedFromCloud) {
      toPush.push(finalLoan);
      mergedCount++;
    } else if (cloudTs > localTs) {
      mergedCount++;
    }
  });

  cloudLoans.forEach((cloudLoan) => {
    if (!cloudLoan || !cloudLoan.id) return;
    if (!mergedMap.has(cloudLoan.id)) {
      mergedMap.set(cloudLoan.id, cloudLoan);
      pulledCount++;
    }
  });

  return {
    merged: Array.from(mergedMap.values()),
    toPush,
    pulledCount,
    mergedCount,
  };
}

export class SyncService {
  private static isProcessing = false;

  /**
   * Persistent unique ID for this browser/device instance
   */
  static getDeviceId(): string {
    try {
      let id = localStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        id = `dev_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
        localStorage.setItem(DEVICE_ID_KEY, id);
      }
      return id;
    } catch {
      return 'dev_session';
    }
  }

  /**
   * Read persisted Cloud Sync link configuration (Room ID / Google Account / Local)
   */
  static getSyncLinkConfig(): SyncLinkConfig {
    try {
      const raw = localStorage.getItem(SYNC_LINK_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SyncLinkConfig;
        if (parsed && parsed.mode) return parsed;
      }
    } catch {
      // Fallback to local
    }
    return { mode: 'local' };
  }

  /**
   * Persist Cloud Sync link configuration
   */
  static saveSyncLinkConfig(config: SyncLinkConfig): void {
    try {
      localStorage.setItem(SYNC_LINK_CONFIG_KEY, JSON.stringify(config));
    } catch {
      // Ignore storage quota errors
    }
  }

  /**
   * Resolve active Firestore root path for the current device
   */
  static resolveSyncTarget(
    linkConfig: SyncLinkConfig,
    fallbackUserId: string
  ): SyncTarget {
    if (linkConfig.mode === 'room' && linkConfig.roomCode && /^\d{6}$/.test(linkConfig.roomCode)) {
      return {
        rootCollection: 'sync_rooms',
        namespaceId: linkConfig.roomCode,
        mode: 'room',
        label: `Sync Room #${linkConfig.roomCode}`,
      };
    }

    if (linkConfig.mode === 'google' && linkConfig.googleUid) {
      return {
        rootCollection: 'users',
        namespaceId: linkConfig.googleUid,
        mode: 'google',
        label: linkConfig.googleEmail || linkConfig.googleDisplayName || 'Google Account',
      };
    }

    return {
      rootCollection: 'users',
      namespaceId: fallbackUserId || 'dev_admin_naseer',
      mode: 'local',
      label: 'Cloud Ledger',
    };
  }

  /**
   * Build a Firestore DocumentReference inside the active SyncTarget
   */
  private static getTargetDocRef(target: SyncTarget, subcollection: string, docId: string) {
    return doc(db, target.rootCollection, target.namespaceId, subcollection, docId);
  }

  /**
   * Build a Firestore CollectionReference inside the active SyncTarget
   */
  private static getTargetCollRef(target: SyncTarget, subcollection: string) {
    return collection(db, target.rootCollection, target.namespaceId, subcollection);
  }

  /**
   * Commit write operations in safe Firestore batch chunks (max 380 ops/batch < 500 limit)
   */
  private static async commitOpsInChunks(
    target: SyncTarget,
    ops: BatchWriteOp[],
    chunkSize = 380
  ): Promise<void> {
    for (let i = 0; i < ops.length; i += chunkSize) {
      const slice = ops.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      slice.forEach((op) => {
        const ref = this.getTargetDocRef(target, op.collectionName, op.docId);
        batch.set(ref, stripUndefined(op.data), { merge: true });
      });
      await batch.commit();
    }
  }

  /**
   * Create a new 6-digit Sync Room in Firestore with optional passcode
   */
  static async createSyncRoom(passcode?: string): Promise<{
    roomCode: string;
    hasPasscode: boolean;
  }> {
    if (!navigator.onLine) {
      throw new Error('You are currently offline. Connect to the internet to create a Sync Room.');
    }

    const passcodeHash = passcode?.trim() ? await hashPasscode(passcode) : '';
    const hasPasscode = Boolean(passcodeHash);

    let roomCode = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = String(Math.floor(100000 + Math.random() * 900000));
      const roomRef = doc(db, 'sync_rooms', candidate);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) {
        roomCode = candidate;
        break;
      }
    }

    if (!roomCode) {
      roomCode = String(Math.floor(100000 + Math.random() * 900000));
    }

    const now = new Date().toISOString();
    const roomRef = doc(db, 'sync_rooms', roomCode);
    await setDoc(
      roomRef,
      {
        roomCode,
        hasPasscode,
        passcodeHash,
        createdAt: now,
        updatedAt: now,
        lastSyncedAt: now,
        lastSyncedBy: this.getDeviceId(),
      },
      { merge: true }
    );

    return { roomCode, hasPasscode };
  }

  /**
   * Verify and join an existing 6-digit Sync Room
   */
  static async verifyAndJoinSyncRoom(
    rawRoomCode: string,
    passcode?: string
  ): Promise<{ roomCode: string; hasPasscode: boolean }> {
    if (!navigator.onLine) {
      throw new Error('You are currently offline. Connect to the internet to join a Sync Room.');
    }

    const roomCode = rawRoomCode.replace(/\D/g, '').slice(0, 6);
    if (roomCode.length !== 6) {
      throw new Error('Please enter a valid 6-digit numeric Sync Room ID.');
    }

    const roomRef = doc(db, 'sync_rooms', roomCode);
    const snap = await getDoc(roomRef);

    if (!snap.exists()) {
      throw new Error(
        `Sync Room #${roomCode} was not found. Double-check the 6-digit code from your other device.`
      );
    }

    const roomData = snap.data() as {
      hasPasscode?: boolean;
      passcodeHash?: string;
    };

    if (roomData.hasPasscode && roomData.passcodeHash) {
      const enteredHash = passcode?.trim() ? await hashPasscode(passcode) : '';
      if (!enteredHash || enteredHash !== roomData.passcodeHash) {
        throw new Error('Incorrect room passcode. Please enter the passcode set on the first device.');
      }
    }

    return {
      roomCode,
      hasPasscode: Boolean(roomData.hasPasscode),
    };
  }

  /**
   * Get queued offline mutations
   */
  static getQueue(): SyncQueueItem[] {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save queue
   */
  static saveQueue(queue: SyncQueueItem[]): void {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch {
      // Ignore quota errors
    }
  }

  /**
   * Enqueue a mutation for background / offline sync
   */
  static enqueueMutation(
    collectionName: string,
    docId: string,
    operation: 'set' | 'delete',
    data?: unknown
  ): void {
    const queue = this.getQueue();
    const filtered = queue.filter(
      (item) => !(item.collection === collectionName && item.docId === docId)
    );
    const payload =
      operation === 'set' && data && typeof data === 'object'
        ? {
            ...(data as Record<string, unknown>),
            updatedAt: (data as Record<string, unknown>).updatedAt || new Date().toISOString(),
          }
        : data;

    filtered.push({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      collection: collectionName,
      docId,
      operation,
      data: payload,
      timestamp: new Date().toISOString(),
    });
    this.saveQueue(filtered);
  }

  /**
   * Publish lightweight sync heartbeat so other linked devices receive real-time updates
   */
  static async publishHeartbeat(target: SyncTarget): Promise<void> {
    if (!navigator.onLine) return;
    try {
      const now = new Date().toISOString();
      const heartbeatRef = this.getTargetDocRef(target, 'meta', 'sync_heartbeat');
      await setDoc(
        heartbeatRef,
        {
          updatedAt: now,
          updatedByDeviceId: this.getDeviceId(),
          sequence: Date.now(),
        },
        { merge: true }
      );
      if (target.rootCollection === 'sync_rooms') {
        await setDoc(
          doc(db, 'sync_rooms', target.namespaceId),
          {
            lastSyncedAt: now,
            lastSyncedBy: this.getDeviceId(),
            updatedAt: now,
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn('[SyncService] Heartbeat publish deferred:', err);
    }
  }

  /**
   * Process all offline items in the queue when online
   */
  static async processQueue(targetOrUserId: SyncTarget | string): Promise<number> {
    if (!navigator.onLine || this.isProcessing) return 0;
    this.isProcessing = true;

    const target: SyncTarget =
      typeof targetOrUserId === 'string'
        ? {
            rootCollection: 'users',
            namespaceId: targetOrUserId,
            mode: 'local',
            label: 'Cloud Ledger',
          }
        : targetOrUserId;

    const queue = this.getQueue();
    if (queue.length === 0) {
      this.isProcessing = false;
      return 0;
    }

    let processedCount = 0;
    const remainingQueue: SyncQueueItem[] = [];

    for (const item of queue) {
      try {
        const docRef = this.getTargetDocRef(target, item.collection, item.docId);
        if (item.operation === 'set') {
          const cleanPayload = stripUndefined({
            ...(item.data as Record<string, unknown>),
            userId: target.namespaceId,
            updatedAt:
              (item.data as Record<string, unknown>)?.updatedAt ||
              item.timestamp ||
              new Date().toISOString(),
          });
          await setDoc(docRef, cleanPayload, { merge: true });
        } else if (item.operation === 'delete') {
          await deleteDoc(docRef);
        }
        processedCount++;
      } catch (err) {
        console.warn(`[SyncService] Failed to sync item ${item.docId}:`, err);
        remainingQueue.push(item);
      }
    }

    this.saveQueue(remainingQueue);
    this.isProcessing = false;

    if (processedCount > 0) {
      await this.publishHeartbeat(target);
    }

    return processedCount;
  }

  /**
   * Pull all financial collections from Cloud Firestore and perform
   * non-destructive timestamp-based bidirectional merge with local data.
   */
  static async fullBidirectionalSync(
    target: SyncTarget,
    localData: FinancialDataBackup
  ): Promise<{
    mergedData: FinancialDataBackup;
    stats: SyncResultStats;
  }> {
    if (!navigator.onLine) {
      throw new Error('Device is offline. Changes remain safely cached locally.');
    }

    // Step 1: Flush any pending queued offline mutations first
    await this.processQueue(target);

    // Step 2: Pull all subcollections from Firestore in parallel
    const basePath = `${target.rootCollection}/${target.namespaceId}`;
    let accountsSnap,
      categoriesSnap,
      budgetsSnap,
      txnsSnap,
      debtsSnap,
      recurringSnap,
      savingsSnap,
      loansSnap,
      auditSnap,
      budgetConfigSnap;

    try {
      [
        accountsSnap,
        categoriesSnap,
        budgetsSnap,
        txnsSnap,
        debtsSnap,
        recurringSnap,
        savingsSnap,
        loansSnap,
        auditSnap,
        budgetConfigSnap,
      ] = await Promise.all([
        getDocs(this.getTargetCollRef(target, 'accounts')),
        getDocs(this.getTargetCollRef(target, 'categories')),
        getDocs(this.getTargetCollRef(target, 'budgets')),
        getDocs(this.getTargetCollRef(target, 'transactions')),
        getDocs(this.getTargetCollRef(target, 'debts')),
        getDocs(this.getTargetCollRef(target, 'recurring')),
        getDocs(this.getTargetCollRef(target, 'savings')),
        getDocs(this.getTargetCollRef(target, 'loans')),
        getDocs(this.getTargetCollRef(target, 'audit_logs')),
        getDoc(this.getTargetDocRef(target, 'meta', 'budget_config')),
      ]);
    } catch (error) {
      const info = formatFirestoreError(error, OperationType.GET, basePath);
      console.error('[SyncService] Cloud pull failed:', JSON.stringify(info));
      throw new Error(info.error);
    }

    const cloudAccounts = accountsSnap.docs.map((d) => d.data() as Account);
    const cloudCategories = categoriesSnap.docs.map((d) => d.data() as Category);
    const cloudBudgets = budgetsSnap.docs
      .filter((d) => d.id !== 'config')
      .map((d) => d.data() as BudgetRecord)
      .filter((b) => Boolean(b && b.id));
    const cloudTransactions = txnsSnap.docs.map((d) => d.data() as Transaction);
    const cloudDebts = debtsSnap.docs.map((d) => d.data() as DebtRecord);
    const cloudRecurring = recurringSnap.docs.map((d) => d.data() as RecurringTransaction);
    const cloudSavings = savingsSnap.docs.map((d) => d.data() as SavingsGoal);
    const cloudLoans = loansSnap.docs.map((d) => d.data() as LoanAccount);
    const cloudAuditLogs = auditSnap.docs.map((d) => d.data() as AuditLog);
    const cloudBudgetConfig = budgetConfigSnap.exists()
      ? (budgetConfigSnap.data() as BudgetConfig & { updatedAt?: string })
      : null;

    // Step 3: Non-destructive timestamp-based merge for every entity collection
    const mergedAccounts = mergeByTimestamp(localData.accounts || [], cloudAccounts);
    const mergedCategories = mergeByTimestamp(localData.categories || [], cloudCategories);
    const mergedBudgets = mergeByTimestamp(
      localData.budgets || localData.budget?.activeBudgets || [],
      cloudBudgets
    );
    const mergedTransactions = mergeByTimestamp(localData.transactions || [], cloudTransactions);
    const mergedDebts = mergeByTimestamp(localData.debts || [], cloudDebts);
    const mergedRecurring = mergeByTimestamp(localData.recurring || [], cloudRecurring);
    const mergedSavings = mergeByTimestamp(localData.savingsGoals || [], cloudSavings);
    const mergedLoans = mergeLoansByTimestamp(localData.loans || [], cloudLoans);
    const mergedAuditLogs = mergeByTimestamp(localData.auditLogs || [], cloudAuditLogs);

    // Sort transactions newest-first consistently across devices
    mergedTransactions.merged.sort((a, b) => {
      const dateCmp = (b.date || '').localeCompare(a.date || '');
      if (dateCmp !== 0) return dateCmp;
      const timeCmp = (b.time || '').localeCompare(a.time || '');
      if (timeCmp !== 0) return timeCmp;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    // Sort audit logs newest-first
    mergedAuditLogs.merged.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    // Merge BudgetConfig cleanly
    const mergedBudgetConfig: BudgetConfig = cloudBudgetConfig
      ? {
          ...localData.budget,
          dailyBudget: cloudBudgetConfig.dailyBudget ?? localData.budget.dailyBudget,
          weeklyBudget: cloudBudgetConfig.weeklyBudget ?? localData.budget.weeklyBudget,
          monthlyBudget: cloudBudgetConfig.monthlyBudget ?? localData.budget.monthlyBudget,
          yearlyBudget: cloudBudgetConfig.yearlyBudget ?? localData.budget.yearlyBudget,
          categoryBudgets: {
            ...(localData.budget.categoryBudgets || {}),
            ...(cloudBudgetConfig.categoryBudgets || {}),
          },
          activeBudgets: mergedBudgets.merged,
        }
      : {
          ...localData.budget,
          activeBudgets: mergedBudgets.merged,
        };

    // Step 4: Prepare chunked cloud push for all local-only or locally-newer docs
    const now = new Date().toISOString();
    const ops: BatchWriteOp[] = [];

    const pushCollection = <T extends { id: string }>(collectionName: string, items: T[]) => {
      items.forEach((item) => {
        ops.push({
          collectionName,
          docId: item.id,
          data: {
            ...(item as unknown as Record<string, unknown>),
            userId: target.namespaceId,
            updatedAt: (item as unknown as Record<string, unknown>).updatedAt || now,
          },
        });
      });
    };

    pushCollection('accounts', mergedAccounts.toPush);
    pushCollection('categories', mergedCategories.toPush);
    pushCollection('budgets', mergedBudgets.toPush);
    pushCollection('transactions', mergedTransactions.toPush);
    pushCollection('debts', mergedDebts.toPush);
    pushCollection('recurring', mergedRecurring.toPush);
    pushCollection('savings', mergedSavings.toPush);
    pushCollection('loans', mergedLoans.toPush);
    pushCollection('audit_logs', mergedAuditLogs.toPush);

    // Push budget_config if cloud didn't have it yet
    if (!cloudBudgetConfig && localData.budget) {
      ops.push({
        collectionName: 'meta',
        docId: 'budget_config',
        data: {
          ...mergedBudgetConfig,
          updatedAt: now,
        },
      });
    }

    if (ops.length > 0) {
      try {
        await this.commitOpsInChunks(target, ops);
      } catch (error) {
        const info = formatFirestoreError(error, OperationType.WRITE, basePath);
        console.error('[SyncService] Cloud push failed:', JSON.stringify(info));
        throw new Error(info.error);
      }
      await this.publishHeartbeat(target);
    }

    const pulledCount =
      mergedAccounts.pulledCount +
      mergedCategories.pulledCount +
      mergedBudgets.pulledCount +
      mergedTransactions.pulledCount +
      mergedDebts.pulledCount +
      mergedRecurring.pulledCount +
      mergedSavings.pulledCount +
      mergedLoans.pulledCount +
      mergedAuditLogs.pulledCount;

    const pushedCount = ops.length;
    const mergedCount =
      mergedAccounts.mergedCount +
      mergedCategories.mergedCount +
      mergedBudgets.mergedCount +
      mergedTransactions.mergedCount +
      mergedDebts.mergedCount +
      mergedRecurring.mergedCount +
      mergedSavings.mergedCount +
      mergedLoans.mergedCount +
      mergedAuditLogs.mergedCount;

    const mergedData: FinancialDataBackup = {
      ...localData,
      accounts: mergedAccounts.merged,
      categories: mergedCategories.merged.length > 0 ? mergedCategories.merged : localData.categories,
      budget: mergedBudgetConfig,
      budgets: mergedBudgets.merged,
      transactions: mergedTransactions.merged,
      debts: mergedDebts.merged,
      recurring: mergedRecurring.merged,
      savingsGoals: mergedSavings.merged,
      loans: mergedLoans.merged,
      auditLogs: mergedAuditLogs.merged,
    };

    return {
      mergedData,
      stats: {
        pulledCount,
        pushedCount,
        mergedCount,
        syncedAt: now,
        targetLabel: target.label,
      },
    };
  }

  /**
   * Subscribe to real-time sync heartbeats from linked Mobile / Desktop devices
   */
  static subscribeToSyncHeartbeat(
    target: SyncTarget,
    onRemoteUpdate: () => void,
    onError?: (err: unknown) => void
  ): Unsubscribe {
    const localDeviceId = this.getDeviceId();
    let lastSequenceSeen = 0;
    let isFirstSnapshot = true;

    const heartbeatRef = this.getTargetDocRef(target, 'meta', 'sync_heartbeat');
    const path = `${target.rootCollection}/${target.namespaceId}/meta/sync_heartbeat`;

    return onSnapshot(
      heartbeatRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          isFirstSnapshot = false;
          return;
        }
        const data = snapshot.data() as {
          updatedByDeviceId?: string;
          sequence?: number;
        };
        const seq = data.sequence || 0;
        if (isFirstSnapshot) {
          isFirstSnapshot = false;
          lastSequenceSeen = seq;
          return;
        }
        if (data.updatedByDeviceId && data.updatedByDeviceId !== localDeviceId && seq > lastSequenceSeen) {
          lastSequenceSeen = seq;
          onRemoteUpdate();
        }
      },
      (error) => {
        const info = formatFirestoreError(error, OperationType.GET, path);
        console.warn('[SyncService] Real-time listener warning:', JSON.stringify(info));
        if (onError) onError(error);
      }
    );
  }

  /**
   * Legacy helper kept compatible: delegates to bidirectional sync safely
   */
  static async migrateLocalDataToCloud(
    targetOrUserId: SyncTarget | string,
    localData: FinancialDataBackup
  ): Promise<boolean> {
    try {
      const target: SyncTarget =
        typeof targetOrUserId === 'string'
          ? {
              rootCollection: 'users',
              namespaceId: targetOrUserId,
              mode: 'local',
              label: 'Cloud Ledger',
            }
          : targetOrUserId;
      await this.fullBidirectionalSync(target, localData);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Atomically commits an EMI payment batch to Cloud Firestore (or queues atomically for offline sync)
   */
  static async commitAtomicEmiPayment(params: {
    userId: string;
    target?: SyncTarget;
    loan: LoanAccount;
    transactions: Transaction[];
    auditLog: AuditLog;
  }): Promise<boolean> {
    const { userId, loan, transactions, auditLog } = params;
    const target: SyncTarget = params.target || {
      rootCollection: 'users',
      namespaceId: userId,
      mode: 'local',
      label: 'Cloud Ledger',
    };

    if (navigator.onLine && target.namespaceId && target.namespaceId !== 'offline') {
      try {
        const batch = writeBatch(db);
        const now = new Date().toISOString();

        const loanRef = this.getTargetDocRef(target, 'loans', loan.id);
        batch.set(
          loanRef,
          stripUndefined({ ...loan, userId: target.namespaceId, updatedAt: now }),
          { merge: true }
        );

        transactions.forEach((txn) => {
          const txnRef = this.getTargetDocRef(target, 'transactions', txn.id);
          batch.set(
            txnRef,
            stripUndefined({ ...txn, userId: target.namespaceId, updatedAt: now }),
            { merge: true }
          );
        });

        const logRef = this.getTargetDocRef(target, 'audit_logs', auditLog.id);
        batch.set(logRef, stripUndefined({ ...auditLog, userId: target.namespaceId }));

        await batch.commit();
        await this.publishHeartbeat(target);
        return true;
      } catch (err) {
        console.warn('[SyncService] Cloud atomic EMI batch failed, enqueuing offline:', err);
      }
    }

    this.enqueueMutation('loans', loan.id, 'set', loan);
    transactions.forEach((txn) => {
      this.enqueueMutation('transactions', txn.id, 'set', txn);
    });
    this.enqueueMutation('audit_logs', auditLog.id, 'set', auditLog);
    return false;
  }

  /**
   * Record an immutable audit log entry in Cloud and Local
   */
  static async recordAuditLog(
    targetOrUserId: SyncTarget | string,
    action: AuditLog['action'],
    entityType: AuditLog['entityType'],
    entityId: string,
    performedBy: string,
    details: string
  ): Promise<AuditLog> {
    const target: SyncTarget =
      typeof targetOrUserId === 'string'
        ? {
            rootCollection: 'users',
            namespaceId: targetOrUserId,
            mode: 'local',
            label: 'Cloud Ledger',
          }
        : targetOrUserId;

    const logId = `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const logEntry: AuditLog = {
      id: logId,
      action,
      entityType,
      entityId,
      performedBy,
      details,
      timestamp: new Date().toISOString(),
    };

    try {
      if (navigator.onLine && target.namespaceId && target.namespaceId !== 'offline') {
        const logDocRef = this.getTargetDocRef(target, 'audit_logs', logId);
        await setDoc(logDocRef, stripUndefined({ ...logEntry, userId: target.namespaceId }));
      } else {
        this.enqueueMutation('audit_logs', logId, 'set', logEntry);
      }
    } catch {
      this.enqueueMutation('audit_logs', logId, 'set', logEntry);
    }

    return logEntry;
  }
}
