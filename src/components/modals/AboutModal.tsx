import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MessageCircle,
  Copy,
  Check,
  ShieldCheck,
  Smartphone,
  IndianRupee,
  Cpu,
  Heart,
  CheckCircle2,
} from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const developerName = 'Naseer Ul Haq';
  const contactNumber = '+91-7006708349';
  const emailAddress = 'N.bhat73500@gmail.com';
  const whatsappUrl = 'https://wa.me/917006708349?text=Hello%20Naseer,%20regarding%20Budget%20Management%20App';

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(contactNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h2 id="about-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                About Budget Management
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Daily Expenses Tracker & Financial Manager
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close About Dialog"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Developer Spotlight Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-800/60 border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xl shadow-md ring-4 ring-white dark:ring-slate-900">
                  NH
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 mb-1">
                  <User className="w-3 h-3" />
                  <span>Lead Developer</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {developerName}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Software Engineer & Financial Systems Architect
                </p>
              </div>
            </div>

            {/* Contact Details */}
            <div className="mt-4 pt-4 border-t border-emerald-200/60 dark:border-emerald-800/50 space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-100 dark:border-emerald-900/30">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                      Contact Number
                    </p>
                    <a
                      href={`tel:${contactNumber}`}
                      className="text-sm font-semibold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-mono"
                    >
                      {contactNumber}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopyNumber}
                    title="Copy phone number"
                    className="p-1.5 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <a
                    href={`tel:${contactNumber}`}
                    className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-2xs transition-colors whitespace-nowrap"
                  >
                    Call
                  </a>
                </div>
              </div>

              {/* Action Buttons for Mobile / WhatsApp */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-100/80 hover:bg-emerald-200/80 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 rounded-xl transition-colors border border-emerald-200 dark:border-emerald-800/60"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={`mailto:${emailAddress}?subject=Budget%20Management%20App%20Inquiry`}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-800 dark:text-sky-200 bg-sky-100/80 hover:bg-sky-200/80 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 rounded-xl transition-colors border border-sky-200 dark:border-sky-800/60"
                >
                  <Mail className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Email</span>
                </a>
              </div>
            </div>
          </div>

          {/* App Core Pillars */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              System Architecture & Features
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                  <Smartphone className="w-4 h-4" />
                  <span>100% Offline App</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Full standalone PWA support. Records and balances sync instantly without an internet connection.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-1 text-sky-600 dark:text-sky-400 font-semibold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Zero Cloud Privacy</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your financial records never leave this device. Encrypted 4-digit PIN lock security included.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-1 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                  <IndianRupee className="w-4 h-4" />
                  <span>Indian Rupee & Format</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Lakh/Crore numbering, DD-MM-YYYY dates, UPI, Bank Transfer, and Udhaar/Khata book tracking.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-1 text-purple-600 dark:text-purple-400 font-semibold text-xs">
                  <Cpu className="w-4 h-4" />
                  <span>Smart Analytics</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Real-time cash book, category variance, CSV bulk passbook import, and monthly P&L statements.
                </p>
              </div>
            </div>
          </div>

          {/* Technical Specifications */}
          <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Application Version</span>
              <span className="font-mono font-medium text-slate-900 dark:text-white">v2.4.0 (Offline PWA)</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Default Currency</span>
              <span className="font-medium text-slate-900 dark:text-white">Indian Rupee (₹ INR)</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Data Storage</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Encrypted Local Persistence
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>for seamless daily finance</span>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
