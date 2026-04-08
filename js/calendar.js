/**
 * Calendar Page — Mobile Checkup System
 * แสดงตารางงานทั้งหมด พร้อม popup รายละเอียด Project
 */
const CalendarPage = {
  _year: new Date().getFullYear(),
  _month: new Date().getMonth(),
  
  STATUS_COLORS: {
    Prospect: '#8B5CF6', Closed: '#06B6D4', Onsite: '#3B82F6',
    Lab: '#F59E0B', Report: '#8B5CF6', Billing: '#10B981', Completed: '#6B7280'
  },
  
  async render() {
    document.getElementById('content').innerHTML = `
    <div class="ph">
      <div><h2 id="cal-title">📅 ปฏิทินงาน</h2><p>ตารางงานตรวจสุขภาพทั้งหมด</p></div>
      <div class="btn-grp">
        <button class="btn btn-out btn-sm" onclick="CalendarPage.prev()">◀ เดือนก่อน</button>
        <button class="btn btn-out btn-sm" onclick="CalendarPage.today()">วันนี้</button>
        <button class="btn btn-out btn-sm" onclick="CalendarPage.next()">เดือนถัดไป ▶</button>
      </div>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <div id="cal-wrap" style="padding:16px"></div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px" id="cal-legend"></div>`;
    await this.drawCalendar();
  },
  
  async drawCalendar() {
    const projs = await DB.project.list();
    const y = this._year, m = this._month;
    const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    document.getElementById('cal-title').textContent = `📅 ${months[m]} ${y + 543}`;
    
    // Build event map
    const events = {};
    for (const p of projs) {
      if (!p.onsite_date) continue;
      const d = p.onsite_date.substr(0, 10);
      if (!events[d]) events[d] = [];
      events[d].push(p);
    }
    
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    
    const days = ['อา','จ','อ','พ','พฤ','ศ','ส'];
    let html = `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px">`;
    days.forEach(d => {
      html += `<div style="text-align:center;font-size:11px;font-weight:700;color:var(--txt-lt);padding:6px 0;text-transform:uppercase">${d}</div>`;
    });
    html += '</div>';
    html += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">`;
    
    for (let i = 0; i < firstDay; i++) html += `<div></div>`;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const dayEvents = events[dateStr] || [];
      const isToday = dateStr === todayStr;
      const daysUntil = Math.ceil((new Date(dateStr) - today) / 86400000);
      const isNearby = daysUntil >= 0 && daysUntil <= 3 && dayEvents.length > 0;
      
      html += `<div onclick="CalendarPage.openDay('${dateStr}')"
        style="min-height:70px;padding:4px 5px;border-radius:8px;cursor:pointer;
        background:${isToday ? 'var(--navy)' : isNearby ? '#FFF7ED' : 'var(--surf2)'};
        border:1.5px solid ${isToday ? 'var(--navy)' : isNearby ? '#FED7AA' : 'var(--bdr)'};
        transition:all .15s;position:relative">
        <div style="font-size:12px;font-weight:${isToday?'700':'500'};color:${isToday?'#fff':'var(--txt)'};text-align:right;margin-bottom:3px">${day}</div>
        ${isNearby&&!isToday?'<div style="position:absolute;top:3px;left:4px;width:6px;height:6px;border-radius:50%;background:#F59E0B"></div>':''}
        ${dayEvents.slice(0,2).map(p => `
          <div onclick="event.stopPropagation();CalendarPage.openProject(${p.id})"
            style="font-size:9.5px;padding:2px 5px;border-radius:4px;margin-bottom:2px;
            background:${this.STATUS_COLORS[p.status]||'#888'}22;
            color:${this.STATUS_COLORS[p.status]||'#888'};
            border-left:2px solid ${this.STATUS_COLORS[p.status]||'#888'};
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600">
            ${p.company_name.length > 12 ? p.company_name.substr(0,12)+'…' : p.company_name}
          </div>`).join('')}
        ${dayEvents.length > 2 ? `<div style="font-size:9px;color:var(--txt-lt);margin-top:1px">+${dayEvents.length-2} เพิ่มเติม</div>` : ''}
      </div>`;
    }
    html += '</div>';
    document.getElementById('cal-wrap').innerHTML = html;
    
    // Legend
    const statuses = [...new Set(projs.map(p=>p.status))];
    document.getElementById('cal-legend').innerHTML = statuses.map(s =>
      `<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--txt-md)">
        <div style="width:10px;height:10px;border-radius:50%;background:${this.STATUS_COLORS[s]||'#888'}"></div>${s}
      </div>`).join('');
  },
  
  async openDay(dateStr) {
    const projs = (await DB.project.list()).filter(p => p.onsite_date === dateStr);
    if (!projs.length) return;
    if (projs.length === 1) { this.openProject(projs[0].id); return; }
    const list = projs.map(p => `<div style="padding:10px;border:1px solid var(--bdr);border-radius:8px;cursor:pointer;margin-bottom:8px" onclick="CalendarPage.openProject(${p.id})">
      <div style="font-weight:600">${p.project_code}</div>
      <div style="font-size:12px;color:var(--txt-lt)">${p.company_name}</div>
    </div>`).join('');
    Modal.open(`<div>${list}</div>`, `งานวันที่ ${dateStr}`);
  },
  
  async openProject(id) {
    const [p, h, jo, rp, lp, inv] = await Promise.all([
      DB.project.get(id), DB.project.getHandover(id), DB.operation.getJO(id),
      DB.report.getPlan(id), DB.lab.getProject(id), DB.billing.getInvoice(id)
    ]);
    const statusColors = this.STATUS_COLORS;
    const daysUntil = p.onsite_date ? Math.ceil((new Date(p.onsite_date)-new Date())/86400000) : null;
    Modal.open(`
    <div style="background:${statusColors[p.status]||'#888'}15;border-radius:10px;padding:14px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-family:'Prompt',sans-serif;font-size:16px;font-weight:700;color:var(--navy)">${p.project_code}</div>
          <div style="font-size:13px;color:var(--txt-md);margin-top:2px">${p.company_name}</div>
        </div>
        <span class="badge" style="background:${statusColors[p.status]||'#888'}22;color:${statusColors[p.status]||'#888'};border:1px solid ${statusColors[p.status]||'#888'}44">${p.status}</span>
      </div>
    </div>
    ${daysUntil !== null && daysUntil >= 0 && daysUntil <= 3 ? `<div class="ab warning mb4">⚠️ วันตรวจอีก ${daysUntil} วัน — เตรียมพร้อมด่วน!</div>` : ''}
    <div class="sr"><span>วันตรวจ</span><span class="fw6">${U.fmtD(p.onsite_date)} ${p.onsite_time||''}</span></div>
    <div class="sr"><span>สถานที่</span><span>${U.esc(p.location||'-')}</span></div>
    <div class="sr"><span>จำนวน</span><span>${(p.headcount||0).toLocaleString()} คน</span></div>
    <div class="sr"><span>ผู้ประสานงาน</span><span>${U.esc(p.coordinator_name||'-')} ${p.coordinator_phone||''}</span></div>
    <div class="sr"><span>สร้างโดย</span><span>${U.esc(p.created_by||'-')}</span></div>
    <div class="divider"></div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--txt-lt);margin-bottom:10px">สถานะแต่ละขั้นตอน</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
      ${[
        {l:'Handover',done:!!h,icon:'💼'},
        {l:'ใบแจ้งงาน',done:!!jo,icon:'📋'},
        {l:'ส่ง Lab',done:!!lp,icon:'🔬'},
        {l:'TAT',done:lp?.status==='reported',icon:'⏱'},
        {l:'Report Plan',done:!!rp,icon:'📄'},
        {l:'ส่งผล',done:rp?.status==='sent',icon:'✅'},
        {l:'Invoice',done:!!inv,icon:'💰'},
        {l:'ชำระแล้ว',done:inv?.status==='Paid',icon:'🏦'},
      ].map(s=>`<div style="text-align:center;padding:8px 4px;border-radius:8px;background:${s.done?'#F0FDF4':'var(--surf2)'};border:1px solid ${s.done?'#86EFAC':'var(--bdr)'}">
        <div style="font-size:16px">${s.icon}</div>
        <div style="font-size:10px;font-weight:600;color:${s.done?'var(--suc)':'var(--txt-lt)'};margin-top:3px">${s.l}</div>
        <div style="font-size:14px">${s.done?'✅':'⬜'}</div>
      </div>`).join('')}
    </div>`, `Project — ${p.project_code}`);
  },
  
  prev() { this._month--; if(this._month<0){this._month=11;this._year--;} this.drawCalendar(); },
  next() { this._month++; if(this._month>11){this._month=0;this._year++;} this.drawCalendar(); },
  today() { this._year=new Date().getFullYear(); this._month=new Date().getMonth(); this.drawCalendar(); },
};

window.CalendarPage = CalendarPage;
