export type BillingTier = 'free' | 'pro' | 'lifetime';

export interface PurchaseProduct {
  id: string; // e.g. 'com.budgetmanagement.pro.monthly'
  name: string;
  description: string;
  priceINR: number;
  formattedPrice: string;
  billingPeriod?: 'monthly' | 'yearly' | 'once';
  savingsBadge?: string;
  popular?: boolean;
  features: string[];
}

export interface UserEntitlement {
  tier: BillingTier;
  isActive: boolean;
  productTitle?: string;
  productId?: string;
  orderId?: string;
  purchaseTime?: string;
  expiryTime?: string;
  licenseKey?: string;
  verifiedBy: 'google_play' | 'cloud_api' | 'local_store';
}

export interface PurchaseVerificationRequest {
  productId: string;
  purchaseToken?: string;
  orderId?: string;
  paymentMethod?: string;
  userId: string;
  userPhone?: string;
  userEmail?: string;
}

export interface PurchaseVerificationResponse {
  success: boolean;
  message: string;
  entitlement: UserEntitlement;
}
