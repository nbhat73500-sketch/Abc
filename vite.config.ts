import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function apiDevPlugin(): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const url = new URL(req.url, 'http://localhost:3000');
        res.setHeader('Content-Type', 'application/json');

        if (url.pathname === '/api/health') {
          res.statusCode = 200;
          res.end(JSON.stringify({
            status: 'ok',
            app: 'Smart Daily Expenses Tracker & Budget Manager',
            developer: 'Naseer Ul Haq (+91-7006708349)',
            timestamp: new Date().toISOString(),
            googlePlayStatus: 'ready_to_publish'
          }));
          return;
        }

        if (url.pathname === '/api/purchases/products') {
          res.statusCode = 200;
          res.end(JSON.stringify({
            success: true,
            products: [
              {
                id: 'com.budgetmanagement.pro.monthly',
                name: 'Budget Pro Monthly',
                priceINR: 199,
                formattedPrice: '₹199 / month',
                billingPeriod: 'monthly'
              },
              {
                id: 'com.budgetmanagement.pro.yearly',
                name: 'Budget Pro Annual (Best Value)',
                priceINR: 1499,
                formattedPrice: '₹1,499 / year',
                billingPeriod: 'yearly',
                savingsBadge: 'Save 37%',
                popular: true
              },
              {
                id: 'com.budgetmanagement.lifetime',
                name: 'Enterprise Lifetime License',
                priceINR: 3999,
                formattedPrice: '₹3,999 One-Time',
                billingPeriod: 'once',
                savingsBadge: 'Pay Once, Keep Forever'
              }
            ]
          }));
          return;
        }

        if (url.pathname === '/api/purchases/verify' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body || '{}');
              const isLifetime = parsed.productId?.includes('lifetime');
              const expiry = new Date();
              if (parsed.productId?.includes('yearly')) {
                expiry.setFullYear(expiry.getFullYear() + 1);
              } else if (!isLifetime) {
                expiry.setMonth(expiry.getMonth() + 1);
              }

              res.statusCode = 200;
              res.end(JSON.stringify({
                success: true,
                message: 'Google Play purchase receipt verified successfully by server.',
                entitlement: {
                  tier: isLifetime ? 'lifetime' : 'pro',
                  isActive: true,
                  productId: parsed.productId || 'com.budgetmanagement.pro.monthly',
                  orderId: parsed.orderId || `GPA.${Date.now()}`,
                  purchaseTime: new Date().toISOString(),
                  expiryTime: isLifetime ? undefined : expiry.toISOString(),
                  licenseKey: `LIC-SRV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
                  verifiedBy: 'google_play'
                }
              }));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'Invalid JSON body' }));
            }
          });
          return;
        }

        if (url.pathname === '/api/purchases/restore' && req.method === 'POST') {
          res.statusCode = 200;
          res.end(JSON.stringify({
            success: true,
            message: 'Active entitlements verified from Google Play Licensing API.',
            entitlement: {
              tier: 'pro',
              isActive: true,
              productId: 'com.budgetmanagement.pro.yearly',
              orderId: `GPA.RESTORE-${Date.now()}`,
              purchaseTime: new Date().toISOString(),
              expiryTime: new Date(Date.now() + 365 * 86400000).toISOString(),
              verifiedBy: 'google_play'
            }
          }));
          return;
        }

        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
      });
    }
  };
}

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [
      apiDevPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'icon.svg',
          'manifest.json',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'Smart Daily Expenses Tracker & Financial Manager',
          short_name: 'BudgetVault',
          description:
            'Offline-first daily income, expense, EMI loan, and multi-account budget manager with real-time Mobile-to-Desktop cloud sync.',
          theme_color: '#059669',
          background_color: '#020617',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
          orientation: 'any',
          start_url: '/',
          scope: '/',
          lang: 'en',
          categories: ['finance', 'productivity', 'utilities'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          shortcuts: [
            {
              name: 'Add Expense',
              short_name: 'New Expense',
              description: 'Quickly record a new transaction',
              url: '/?action=new_expense',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
              name: 'Monthly Summary',
              short_name: 'Summary',
              description: 'View monthly financial report and statement',
              url: '/?action=summary',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/__\//, /^\/\.well-known\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/(firestore|identitytoolkit|securetoken|www)\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^\/api\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
          suppressWarnings: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
