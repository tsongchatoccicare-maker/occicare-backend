/**
 * Line Messaging API Integration — Mobile Checkup System v2
 * เชื่อมต่อผ่าน LINE Messaging API (Channel Access Token)
 * รองรับ: Push Message, Reply Message
 * ต้องใช้ Proxy Server เพราะ Browser ไม่สามารถเรียก LINE API โดยตรงได้
 */
const LineNotify = {
  _token: null,       // Channel Access Token (Messaging API)
  _to: null,          // userId หรือ groupId หรือ roomId
  _proxyUrl: null,    // Netlify/Supabase function URL

  init() {
    this._token    = localStorage.getItem('line_channel_token') || null;
    this._to       = localStorage.getItem('line_to_id')         || null;
    this._proxyUrl = localStorage.getItem('line_proxy_url')     || null;
  },

  setToken(token)  { this._token = token;    localStorage.setItem('line_channel_token', token); },
  setTo(to)        { this._to = to;          localStorage.setItem('line_to_id', to); },
  setProxy(url)    { this._proxyUrl = url;   localStorage.setItem('line_proxy_url', url); },
  getToken()       { return this._token; },
  getTo()          { return this._to; },
  getProxy()       { return this._proxyUrl; },

  /**
   * ส่งข้อความผ่าน Messaging API — Push Message
   * Proxy รับ: { token, to, message }
   * แล้ว forward ไป LINE API: POST https://api.line.me/v2/bot/message/push
   */
  async send(message) {
    if (!this._token) return { ok: false, msg: 'ไม่ได้ตั้งค่า Channel Access Token' };
    if (!this._to)    return { ok: false, msg: 'ไม่ได้ตั้งค่า User/Group ID' };
    if (!this._proxyUrl) return { ok: false, msg: 'ไม่ได้ตั้งค่า Proxy URL' };
    try {
      const res = await fetch(this._proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token:   this._token,
          to:      this._to,
          message: message,
          type:    'messaging_api'     // ← บอก proxy ให้ใช้ Messaging API
        })
      });
      const data = await res.json().catch(()=>({}));
      return { ok: res.ok, msg: data.message || (res.ok ? 'ส่งสำเร็จ' : `Error ${res.status}`) };
    } catch (e) {
      return { ok: false, msg: e.message };
    }
  },

  /* ── Notification helpers ────────────────── */
  async notifyTAT(projectCode, company, daysLeft) {
    const icon = daysLeft < 0 ? '🔴' : '🟡';
    const msg = daysLeft < 0
      ? `${icon} [MCK Alert] TAT เกินกำหนด!\n📋 Project: ${projectCode}\n🏢 ${company}\n⏰ เกินมาแล้ว ${Math.abs(daysLeft)} วัน\n🔗 กรุณาดำเนินการด่วน`
      : `${icon} [MCK Alert] TAT ใกล้ครบกำหนด!\n📋 Project: ${projectCode}\n🏢 ${company}\n⏰ เหลืออีก ${daysLeft} วัน`;
    return this.send(msg);
  },

  async notifySLA(projectCode, company, daysLeft) {
    const icon = daysLeft < 0 ? '🔴' : '🟠';
    const msg = daysLeft < 0
      ? `${icon} [MCK Alert] SLA เกินกำหนด!\n📋 Project: ${projectCode}\n🏢 ${company}\n⏰ เกินมาแล้ว ${Math.abs(daysLeft)} วัน`
      : `${icon} [MCK Alert] SLA ใกล้ครบ!\n📋 Project: ${projectCode}\n🏢 ${company}\n⏰ เหลืออีก ${daysLeft} วัน`;
    return this.send(msg);
  },

  async notifyOnsiteApproaching(projectCode, company, date, daysLeft) {
    const msg = `📅 [MCK] ใกล้ถึงวันตรวจ!\n📋 Project: ${projectCode}\n🏢 ${company}\n📆 วันตรวจ: ${date}\n⏰ อีก ${daysLeft} วัน\n✅ กรุณาตรวจสอบความพร้อม`;
    return this.send(msg);
  },

  async notifyStatusChange(projectCode, company, oldStatus, newStatus) {
    const msg = `🔔 [MCK] อัปเดตสถานะ Project\n📋 ${projectCode}\n🏢 ${company}\n${oldStatus} → ${newStatus}`;
    return this.send(msg);
  },

  async notifyCritical(projectCode, company, patientName, testName, value) {
    const msg = `🚨 [MCK] CRITICAL ALERT!\n📋 Project: ${projectCode}\n🏢 ${company}\n👤 ${patientName}\n🔬 ${testName}: ${value}\n⚠️ ต้องดำเนินการด่วน!`;
    return this.send(msg);
  },
};

window.LineNotify = LineNotify;
