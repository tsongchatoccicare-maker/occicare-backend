/**
 * config.js — Frontend Configuration
 * Edit API_BASE to match your backend server URL
 */
const API_BASE = (() => {
  if (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1') {
    return 'https://occicare-backend.vercel.app';
  }
  // Production: same domain (frontend served by Express /public)
  return '';
})();
