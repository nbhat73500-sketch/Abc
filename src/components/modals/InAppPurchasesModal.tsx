import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Crown,
  Smartphone,
  CreditCard,
  Zap,
  RotateCcw,
  Check,
  Loader2,
  ExternalLink,
  IndianRupee,
} from 'lucide-react';
import { STORE_PRODUCTS, PurchaseService } from '../../services/purchaseService';
import { PurchaseProduct, UserEntitlement } from '../../types/purchases';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../utils/formatters';

interface InAppPurchasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (entitlement: UserEntitlement) => void;
}

export const InAppPurchasesModal: React.FC<InAppPurchasesModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { userProfile } = useAuth();
  const [selectedProductId, setSelectedProductId] = useState<string>('com.budgetmanagement.pro.yearly');
  const [entitlement, setEntitlement] = useState<UserEntitlement>(() => PurchaseService.getLocalEntitlement());
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isPlayBilling, setIsPlayBilling] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEntitlement(PurchaseService.getLocalEntitlement());
      setActionMessage(null);
      PurchaseService.isPlayBillingAvailable().then(setIsPlayBilling);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePurchase = async (product: PurchaseProduct) => {
    setLoading(true);
    setActionMessage(null);

    try {
      const res = await PurchaseService.purchaseProduct(
        product,
        userProfile?.id || 'usr_play_store',
        userProfile?.phoneNumber || '+91-7006708349',
        userProfile?.email || 'N.bhat73500@gmail.com',
        'google_play'
      );

      if (res.success) {
        setEntitlement(res.entitlement);
        setActionMessage({ text: res.message, type: 'success' });
        if (onSuccess) onSuccess(res.entitlement);
      } else {
        setActionMessage({ text: res.message || 'Transaction could not be completed.', type: 'error' });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Payment processing failed.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    setActionMessage(null);

    try {
      const res = await PurchaseService.restorePurchases(
        userProfile?.id || 'usr_play_store',
        userProfile?.phoneNumber || '+91-7006708349',
        userProfile?.email || 'N.bhat73500@gmail.com'
      );

      if (res.success) {
        setEntitlement(res.entitlement);
        setActionMessage({ text: res.message, type: 'success' });
        if (onSuccess) onSuccess(res.entitlement);
      } else {
        setActionMessage({ text: res.message, type: 'error' });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Could not verify previous purchases.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = STORE_PRODUCTS.find((p) => p.id === selectedProductId) || STORE_PRODUCTS[1];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="store-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Google Play Badge */}
        <div className="relative p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-700 text-white flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-xs flex items-center gap-1 uppercase tracking-wider">
                <Crown className="w-3 h-3 text-amber-300" />
                Google Play Store In-App Purchases
              </span>
              {entitlement.isActive && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-emerald-950 uppercase">
                  Active {entitlement.tier.toUpperCase()}
                </span>
              )}
            </div>
            <h2 id="store-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight">
              Unlock Budget Management Pro
            </h2>
            <p className="text-xs text-white/80 max-w-md">
              Unlimited multi-account ledgers, real-time cloud sync, 6-month predictive trends, and ad-free experience.
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Store Dialog"
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Message */}
        {actionMessage && (
          <div
            className={`p-3 text-xs flex items-center gap-2 font-medium ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-b border-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-b border-rose-200'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Zap className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Active Entitlement Notice if already subscribed */}
        {entitlement.isActive && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                Licensed Account: {entitlement.productTitle || `${entitlement.tier.toUpperCase()} License`}
              </span>
              <p className="text-[11px] text-slate-500 font-mono">
                Order ID: {entitlement.orderId || 'GPA-STORE-VERIFIED'} · Key: {entitlement.licenseKey || 'ACTIVE'}
              </p>
            </div>
            <span className="px-2 py-1 rounded-md bg-emerald-600 text-white font-semibold text-[11px]">
              Active & Synced
            </span>
          </div>
        )}

        {/* Products Grid */}
        <div className="p-6 overflow-y-auto space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {STORE_PRODUCTS.map((prod) => {
              const isSelected = selectedProductId === prod.id;
              return (
                <div
                  key={prod.id}
                  onClick={() => setSelectedProductId(prod.id)}
                  className={`relative p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {prod.popular && (
                    <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-2xs">
                      {prod.savingsBadge || 'Most Popular'}
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        {prod.name}
                      </h3>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                      </div>
                    </div>

                    <div className="mt-2">
                      <span className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {prod.formattedPrice}
                      </span>
                    </div>

                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {prod.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400 space-y-1">
                    {prod.features.slice(0, 3).map((f, i) => (
                      <div key={i} className="flex items-start gap-1">
                        <Check className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Product Feature Breakdown */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Included in {selectedProduct.name}:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
              {selectedProduct.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Google Play Guarantees & Support */}
          <div className="p-3 rounded-xl bg-slate-100/60 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Google Play Billing & Digital Goods Protected
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Package: com.budgetmanagement.app</span>
            </div>
            <p>
              Auto-renewing subscriptions can be managed or cancelled anytime via Google Play Store &gt; Subscriptions. Developer Contact: Naseer Ul Haq (+91-7006708349).
            </p>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleRestore}
            disabled={loading}
            type="button"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Previous Purchases</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              type="button"
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
            >
              Maybe Later
            </button>

            <button
              onClick={() => handlePurchase(selectedProduct)}
              disabled={loading}
              type="button"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  <span>Subscribe for {selectedProduct.formattedPrice}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
