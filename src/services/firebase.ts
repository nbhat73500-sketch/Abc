/**
 * Firebase Service Initialization
 * Uses provisioned firebase-applet-config.json by default, with optional
 * VITE_FIREBASE_* environment overrides for external/self-hosted deployments.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import firebaseConfigData from '../../firebase-applet-config.json';

const env = import.meta.env || ({} as Record<string, string | undefined>);

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfigData.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigData.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfigData.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigData.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigData.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfigData.appId,
  measurementId: firebaseConfigData.measurementId,
};

export const firestoreDatabaseId =
  env.VITE_FIREBASE_DATABASE_ID || firebaseConfigData.firestoreDatabaseId || '(default)';

// Initialize Firebase App instance safely (idempotent across HMR / StrictMode)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with multi-tab persistent local cache (with safe fallback)
function createFirestoreInstance(): Firestore {
  const customDbId =
    firestoreDatabaseId && firestoreDatabaseId !== '(default)' ? firestoreDatabaseId : undefined;

  try {
    return customDbId
      ? initializeFirestore(
          app,
          {
            localCache: persistentLocalCache({
              tabManager: persistentMultipleTabManager(),
            }),
          },
          customDbId
        )
      : initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        });
  } catch {
    // Already initialized (e.g., module reload) or IndexedDB unavailable in private mode
    return customDbId ? getFirestore(app, customDbId) : getFirestore(app);
  }
}

export const db: Firestore = createFirestoreInstance();

// Initialize Firebase Auth & Google Sign-In Provider
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function formatFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = formatFirestoreError(error, operationType, path);
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot per Firebase guidelines
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline; using local cache until reconnected.');
      return false;
    }
    return true;
  }
}

// Non-blocking boot probe
void testFirebaseConnection();
