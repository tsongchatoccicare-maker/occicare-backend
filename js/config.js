/**
 * config.js — Frontend Configuration
 * Edit API_BASE to match your backend server URL
 
const API_BASE = (() => {
  if (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  // Production: same domain (frontend served by Express /public)
  return '';
})();
*/

/**
 * config.js — Frontend Configuration
 * Edit API_BASE to match your backend server URL
 */
const API_BASE = (() => {
  if (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1') {
    url: 'https://gjbufbzaohzekhzqivsi.supabase.co',
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqYnVmYnphb2h6ZWtoenFpdnNpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTYxMDE4NywiZXhwIjoyMDkxMTg2MTg3fQ.mFeYwer300LWX4nKF-R3Te4QoG3RoqREVaO1yLDm-I8',
    };
  }
  // Production: same domain (frontend served by Express /public)
  return '';
})();

