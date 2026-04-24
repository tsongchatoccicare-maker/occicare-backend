# 🚀 คู่มือนำขึ้น Online — OcciCare Mobile Checkup System
# ใช้ได้จริง 100% | ฟรี

---

## ⚡ วิธีเร็วที่สุด (2 นาที) — Netlify Drop

1. แตก ZIP → ได้โฟลเดอร์ **mck-production/**
2. ไปที่ 👉 **https://app.netlify.com/drop**
3. **ลากทั้งโฟลเดอร์** mck-production/ วางบนหน้าเว็บ
4. รอ 30 วินาที → ได้ URL เช่น **https://abc-xyz.netlify.app**
5. เปลี่ยนชื่อ: Site configuration → Change site name
   → **https://occicare-checkup.netlify.app**

---

## 🗄 เชื่อม Supabase Database (ฟรี)

### ขั้นตอน 1 — สร้าง Supabase Project
```
https://supabase.com → New Project
  Name:     occicare-checkup
  Region:   Southeast Asia (Singapore)
  Password: [ตั้งรหัสผ่านแข็งแกร่ง]
```

### ขั้นตอน 2 — รัน SQL
ไปที่ SQL Editor → รัน:
```sql
CREATE TABLE mck_kv (
  id         BIGSERIAL PRIMARY KEY,
  db_name    TEXT NOT NULL,
  tbl_name   TEXT NOT NULL,
  payload    JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(db_name, tbl_name)
);
CREATE TABLE mck_config (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE mck_kv     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mck_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON mck_kv     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON mck_config FOR ALL USING (true) WITH CHECK (true);
```

### ขั้นตอน 3 — ใส่ Keys ใน js/config.js
```javascript
// เปิดไฟล์ js/config.js แล้วแก้ไข:
SUPABASE_URL: 'https://xxxxxxxx.supabase.co',   // Project URL
SUPABASE_KEY: 'eyJhbGci...',                     // anon/public key
```

### ขั้นตอน 4 — Deploy ใหม่
ลากโฟลเดอร์ขึ้น Netlify อีกครั้ง (หรือ push ไป GitHub แล้วเชื่อม Auto-deploy)

---

## 💬 Line Notify Setup (แจ้งเตือน TAT/SLA/วันตรวจ)

### 1. รับ Token
```
1. ไป https://notify-bot.line.me/th/
2. Log in ด้วย Line account
3. Generate token → ตั้งชื่อ "MCK Alerts"
4. เลือก Group หรือ 1:1 ที่ต้องการรับแจ้งเตือน
5. Copy Token
```

### 2. สร้าง Proxy Function (Netlify)
สร้างไฟล์ **netlify/functions/line-proxy.js**:
```javascript
const https = require('https');
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  const { token, message } = JSON.parse(event.body || '{}');
  if (!token || !message) return { statusCode: 400, body: JSON.stringify({ message: 'missing params' }) };
  return new Promise((resolve) => {
    const body = 'message=' + encodeURIComponent(message);
    const req = https.request({
      hostname: 'notify-api.line.me',
      path: '/api/notify',
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      resolve({ statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ message: 'ok', status: res.statusCode }) });
    });
    req.on('error', (e) => resolve({ statusCode: 500, body: JSON.stringify({ message: e.message }) }));
    req.write(body);
    req.end();
  });
};
```

### 3. ตั้งค่าใน App
```
เปิดระบบ → Config → Line Notify
→ ใส่ Token
→ Proxy URL: https://your-site.netlify.app/.netlify/functions/line-proxy
→ กด "บันทึก" → "ทดสอบส่ง"
```

---

## 👥 Demo Accounts

| Username  | Password  | Role      |
|-----------|-----------|-----------|
| admin     | admin1234 | admin     |
| sales01   | sales1234 | sales     |
| op01      | op1234    | operation |
| lab01     | lab1234   | lab       |
| report01  | rpt1234   | report    |
| billing01 | bill1234  | billing   |

> ⚠️ เปลี่ยน Password ทุก Account ก่อนใช้งานจริง
> Config → จัดการผู้ใช้งาน → แก้ไข

---

## 🌐 Custom Domain (ฟรี)

### Netlify Subdomain (ฟรีตลอด)
```
Netlify Dashboard → Site configuration → Change site name
→ occicare-checkup  →  https://occicare-checkup.netlify.app
```

### Domain ของตัวเอง (ต้องซื้อ .com ~300 บาท/ปี)
```
1. ซื้อ domain จาก Cloudflare Registrar (ถูกสุด)
2. Netlify → Domain management → Add custom domain
3. ใส่ domain → Verify
4. Cloudflare DNS → เพิ่ม CNAME:
   Name: @ (หรือ www)
   Target: your-site.netlify.app
   Proxy: DNS only
5. รอ 5-10 นาที → ใช้งานได้
```

---

## 📁 โครงสร้างไฟล์

```
mck-production/
├── index.html              ← หน้าหลัก (Mobile-ready)
├── css/
│   └── style.css           ← Premium OcciCare Design
├── js/
│   ├── config.js           ← ✏️ ใส่ Supabase keys ตรงนี้
│   ├── database.js         ← DB Layer (sync + localStorage)
│   ├── app.js              ← Core app (v4 ทุก Page/Role)
│   ├── app-extensions.js   ← Calendar, Mobile, Nav Badges
│   ├── line-notify.js      ← Line Notify integration
│   └── calendar.js         ← ปฏิทินงาน
└── netlify/
    └── functions/
        └── line-proxy.js   ← Line Notify Proxy (สร้างเอง)
```

---

*OcciCare Mobile Checkup System — Deploy Guide*
