// Firebase Analytics, loaded lazily and only when allowed. Respects Do Not Track / Global Privacy Control
// and the in-app toggle. No personal data is attached to events.
import { firebaseConfig, ANALYTICS_ENABLED } from '../firebase-config.js';
let app, analytics, fns, loading;
const blocked = () => navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
export async function setAnalytics(on) {
  if (!ANALYTICS_ENABLED || blocked()) return false;
  try {
    if (!loading) loading = (async () => {
      const V = '10.14.1';
      const a = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
      fns = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-analytics.js`);
      app = a.initializeApp(firebaseConfig);
      analytics = fns.getAnalytics(app);
    })();
    await loading;
    fns.setAnalyticsCollectionEnabled(analytics, !!on);
    return !!on;
  } catch (e) { console.info('Analytics unavailable:', e.message); return false; }
}
export function logEvent(name, params) {
  try { if (analytics && fns) fns.logEvent(analytics, name, params || {}); } catch {}
}
export const analyticsAllowed = () => ANALYTICS_ENABLED && !blocked();
