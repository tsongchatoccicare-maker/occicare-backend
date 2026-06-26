/**
 * config.js — Frontend Configuration
 */
const API_BASE = (() => {
  if (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  // Production: same domain (frontend served by Express /public)
  return '';
})();

// ★ Supabase Configuration
// ดึงจาก https://app.supabase.com → Project → Settings → API
//   - Project URL  → SUPABASE_URL  (เช่น 'https://abcdefgh.supabase.co')
//   - anon public  → SUPABASE_KEY  (key สำหรับ client — ปลอดภัยที่จะใส่ใน frontend)
// ถ้าเว้นว่าง ระบบจะใช้ localStorage อย่างเดียว (QR ข้ามเครื่องจะไม่ทำงาน)
const SUPABASE_URL = '';
const SUPABASE_KEY = '';
