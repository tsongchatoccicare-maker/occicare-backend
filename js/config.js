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
    url: 'https://zcmxmlhnftdxuxbnverl.supabase.co',
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjbXhtbGhuZnRkeHV4Ym52ZXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDE2ODYsImV4cCI6MjA5MDg3NzY4Nn0.VZ08eCygZDPxMe3FFKDHb9qU8sIElCGrulV8z_j5vXc',
    };
  }
  // Production: same domain (frontend served by Express /public)
  return '';
})();

