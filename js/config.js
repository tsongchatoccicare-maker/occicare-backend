/**
 * ════════════════════════════════════════
 *  Mobile Checkup System — Config
 *  แก้ไขเฉพาะค่าใน section นี้
 * ════════════════════════════════════════
 *
 * วิธีหา Supabase Keys:
 *   1. https://supabase.com → Project → Settings → API
 *   2. คัดลอก "Project URL" และ "anon public" key
 */

const APP_CONFIG = {
  // ─── Supabase (ใส่ค่าจริงจาก Supabase Dashboard) ───
  SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co',
  SUPABASE_KEY: 'YOUR_ANON_PUBLIC_KEY',

  // ─── App Settings ───
  APP_NAME:    'Mobile Checkup System',
  APP_VERSION: '1.0.0',
  COMPANY:     'บริษัท ของคุณ จำกัด',   // ← เปลี่ยนชื่อบริษัทของคุณ

  // ─── Session timeout (ชั่วโมง) ───
  SESSION_HOURS: 8,

  // ─── Default TAT Policy ───
  DEFAULT_TAT_SMALL:     15,    // วัน (≤ threshold คน)
  DEFAULT_TAT_LARGE:     20,    // วัน (> threshold คน)
  DEFAULT_TAT_THRESHOLD: 2000,  // จำนวนคน
  DEFAULT_SLA_AFTER_TAT: 7,     // วันหลัง TAT
  DEFAULT_ALERT_DAYS:    3,     // แจ้งเตือนก่อนครบกำหนด
};
