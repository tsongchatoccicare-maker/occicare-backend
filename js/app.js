/* Mobile Checkup App v2 */
/* ===== CONSTANTS ===== */
// STATIONS — ดึงจาก Config Stations (localStorage) ถ้ามี / ใช้ defaults ถ้าไม่มี
const STATION_DEFAULTS=[
  {code:'ST-01',name:'ลงทะเบียน',active:true},{code:'ST-02',name:'ตรวจเพิ่ม',active:true},{code:'ST-03',name:'ชั่งน้ำหนัก & วัดส่วนสูง',active:true},
  {code:'ST-04',name:'ซักประวัติ & วัดความดัน',active:true},{code:'ST-05',name:'เจาะเลือด',active:true},{code:'ST-06',name:'ฉีดวัคซีน',active:true},
  {code:'ST-07',name:'ปัสสาวะ/อุจจาระ',active:true},{code:'ST-08',name:'สมรรถภาพการได้ยิน',active:true},{code:'ST-09',name:'สมรรถภาพกล้ามเนื้อมือและแขน',active:true},
  {code:'ST-10',name:'สมรรถภาพกล้ามเนื้อขาและหลัง',active:true},{code:'ST-11',name:'สมรรถภาพปอด',active:true},{code:'ST-12',name:'คลื่นไฟฟ้าหัวใจ',active:true},
  {code:'ST-13',name:'ตรวจสายตาคอม/ตาบอดสี',active:true},{code:'ST-14',name:'เอกซเรย์ Digital',active:true},{code:'ST-15',name:'รันคิวแพทย์',active:true},
  {code:'ST-16',name:'แพทย์ผู้ตรวจ',active:true},{code:'ST-17',name:'คืนเอกสาร',active:true},{code:'ST-18',name:'อื่นๆ',active:true},
  {code:'ST-05A',name:'Tube Clot (เจาะเลือด)',active:true},{code:'ST-05B',name:'Tube CBC (เจาะเลือด)',active:true},{code:'ST-05C',name:'Tube FBS (เจาะเลือด)',active:true}
];
// Getter ดึงจาก localStorage ถ้ามี ไม่มีใช้ defaults
const _STATIONS_KEY='sys_stations_config';
function getStations(){
  try{const raw=localStorage.getItem(_STATIONS_KEY);if(raw){const arr=JSON.parse(raw);if(Array.isArray(arr)&&arr.length)return arr;}}catch{}
  return STATION_DEFAULTS;
}
// STATIONS ใช้เป็น proxy เพื่อความเข้ากันได้ — ทุกครั้งที่เรียก .map/.filter จะดึงข้อมูลล่าสุด
const STATIONS=new Proxy([],{
  get(target,prop){const s=getStations();if(typeof s[prop]==='function')return s[prop].bind(s);return s[prop];},
  has(target,key){return key in getStations();},
  ownKeys(target){return Reflect.ownKeys(getStations());},
  getOwnPropertyDescriptor(target,key){return Object.getOwnPropertyDescriptor(getStations(),key);}
});
// Tube stations auto-prompt เมื่อเลือก ST-05
const TUBE_STATIONS=['ST-05A','ST-05B','ST-05C'];
const JOB_TYPES=['ตรวจสุขภาพ','OS XRAY','ตรวจซ้ำ','เก็บอาหาร ตย','อบรม First Aid','Consult','อื่นๆ'];
const VEHICLES=['รถยนต์กะบะขาว','รถยนต์กะบะทึบ','รถ Xray ขาว','รถ Xray เขียว','รถตรวจการได้ยิน','เช่ารถตู้'];
const PROFESSIONS=['เจ้าหน้าที่','RN','MT','แพทย์','เจ้าหน้าที่ ใบ Cer','อื่นๆ'];
const STAFF_TYPES=['ในองค์กร','Part-time','Out Source'];
const STATUS_FLOW=['Prospect','Closed','Onsite','Lab','Report','Billing','Completed'];
const MODULES={dashboard:'📊 Dashboard',customers:'👥 CRM ลูกค้า',sales:'💼 Sales',quotation:'📋 ใบเสนอราคา',op_prep:'🚑 Op-เตรียมงาน/ใบแจ้งงาน',op_checklist:'📋 Op-Checklist Station',op_onsite:'🚑 Op-Onsite',op_report:'📊 Op-รายงานสรุปค่าใช้จ่าย',lab:'🔬 Lab & TAT',xray:'📡 เอกซเรย์ X-ray',report:'📄 Report ทีมทำผล',opd:'🏥 OPD — ตรวจครบ',medical:'📋 เวชระเบียน',billing:'💰 Billing & Invoice',staff:'👤 ตั้งค่ารายชื่อ',parttime:'⏰ Part-Time',parttime_history:'📊 รายงานประวัติ PT',assessment:'⭐ Gen Assessment',assessment_report:'🌟 ผลประเมินความพึงพอใจ',config_assessment:'🎯 ตั้งค่าแบบประเมิน',config:'⚙ Config ระบบ'};
const QT_APPROVE_ROLES=['admin','sales']; // roles that can approve quotations

/* ===== UTILS ===== */
const U={
  fmt:n=>Number(n||0).toLocaleString('th-TH'),
  fmtD:s=>{if(!s)return'-';const d=new Date(s);return d.toLocaleDateString('th-TH',{year:'numeric',month:'short',day:'numeric'});},
  fmtDT:s=>{if(!s)return'-';const d=new Date(s);return d.toLocaleDateString('th-TH',{year:'numeric',month:'short',day:'numeric'})+' '+d.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});},
  daysLeft:d=>d?Math.ceil((new Date(d)-new Date())/86400000):null,
  badge(s){const m={'Prospect':'b-prospect','Follow up':'b-follow','Negotiation':'b-nego','Closed':'b-closed','Onsite':'b-onsite','Lab':'b-lab','Report':'b-report','Billing':'b-billing','Completed':'b-completed','Pending':'b-pending','Paid':'b-paid','analyzing':'b-analyzing','reported':'b-closed','sent':'b-completed','interpreting':'b-interpreting','Confirmed':'b-confirmed','Completed':'b-completed','Draft':'b-draft'};return`<span class="badge ${m[s]||'b-pending'}">${s}</span>`;},
  tatBadge(d){const n=this.daysLeft(d);if(n===null)return'<span class="badge b-pending">ไม่ระบุ</span>';if(n<0)return`<span class="badge b-danger">เกิน ${Math.abs(n)} วัน</span>`;if(n<=3)return`<span class="badge" style="background:#FEF5E7;color:#D35400;">⚠ ${n} วัน</span>`;return`<span class="badge b-closed">${n} วัน</span>`;},
  toast(msg,t='success'){const el=document.createElement('div');el.className=`ab ${t}`;el.style.cssText='position:fixed;bottom:20px;right:20px;z-index:9999;min-width:280px;box-shadow:0 4px 12px rgba(0,0,0,.15);';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),3200);},
  confirm:msg=>window.confirm(msg),
  esc:s=>String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'),
  sel:(opts,val,placeholder='-- เลือก --')=>`<option value="">${placeholder}</option>`+opts.map(o=>typeof o==='object'?`<option value="${o.v}" ${o.v==val?'selected':''}>${o.l}</option>`:`<option ${o==val?'selected':''}>${o}</option>`).join(''),
  stationOpts:(val='')=>getStations().filter(s=>s.active!==false||s.code===val).map(s=>`<option value="${s.code}" ${s.code==val?'selected':''}>${s.code} ${s.name}</option>`).join(''),
  // ═══ ผู้บันทึก — Auto-fill from session, readonly for non-admin, editable for admin ═══
  recordedByField(value, fieldId='_rb'){
    const sess = DB.auth.session();
    const isAdmin = sess && sess.role === 'admin';
    const currentName = sess ? sess.name : '';
    // ถ้าเป็น record ใหม่ (ยังไม่มีค่า) — แสดงชื่อ current user
    // ถ้ามีค่าอยู่ (เก่า) — แสดงค่าเก่า
    const displayVal = value || currentName;
    if(isAdmin){
      return `<div class="fg">
        <label style="display:block;font-size:11px;color:#FFFFFF;opacity:.85;margin-bottom:4px;font-weight:600">ผู้บันทึก <span style="color:#F0CD7F">✏️ Admin แก้ไขได้</span></label>
        <input id="${fieldId}" value="${this.esc(displayVal)}" placeholder="ชื่อผู้บันทึก"
          style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid #F0CD7F;border-radius:5px;color:#FFFFFF;font-size:12px;font-family:inherit;font-weight:500"/>
      </div>`;
    }
    return `<div class="fg">
      <label style="display:block;font-size:11px;color:#FFFFFF;opacity:.85;margin-bottom:4px;font-weight:600">ผู้บันทึก 🔒</label>
      <input id="${fieldId}" value="${this.esc(displayVal)}" readonly
        style="width:100%;padding:7px 10px;background:var(--s-2,#162338);border:1px dashed rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:inherit;font-weight:500;cursor:not-allowed;opacity:.85"/>
      <div style="font-size:10.5px;color:#FFFFFF;opacity:.6;margin-top:3px;font-weight:400">ระบบกรอกอัตโนมัติจาก user ที่ login</div>
    </div>`;
  },
  // อ่านค่าจาก recordedByField + ส่ง _override_recorded_by ถ้า admin แก้ไข
  recordedByValue(fieldId='_rb'){
    const el = document.getElementById(fieldId);
    if(!el) return null;
    const sess = DB.auth.session();
    const isAdmin = sess && sess.role === 'admin';
    if(isAdmin && el.value && el.value.trim()){
      return el.value.trim();
    }
    return null; // null = ให้ DB._stampUser ใส่อัตโนมัติ
  },
  // แสดงในตาราง: ชื่อ + role tag · ถ้าว่างให้ "—"
  recordedByCell(name, role){
    if(!name) return '<span style="color:#FFFFFF;opacity:.45">—</span>';
    const roleTag = role ? `<span style="font-size:10px;color:#F0CD7F;background:rgba(240,205,127,.1);padding:1px 5px;border-radius:3px;margin-left:5px;font-family:'IBM Plex Mono',monospace;font-weight:600">${role}</span>` : '';
    return `<span style="font-size:11.5px;color:#FFFFFF;background:rgba(110,231,183,.12);padding:1px 7px;border-radius:4px;font-weight:500;display:inline-block">${this.esc(name)}</span>${roleTag}`;
  }
,
  // ═══ Staff Autocomplete helper ═══
  // Returns HTML <input> + dropdown. Usage:
  //   ${U.staffAutocomplete('jo_dir', jo.director, 'พิมพ์ชื่อ ชื่อเล่น แผนก ตำแหน่ง หรือรหัส...')}
  staffAutocomplete(inputId, value='', placeholder='พิมพ์เพื่อค้นหาพนักงาน...', source='all'){
    return `<div style="position:relative" data-staff-ac="${inputId}" data-source="${source}">
      <input id="${inputId}" value="${this.esc(value||'')}" placeholder="${this.esc(placeholder)}" autocomplete="off" data-source="${source}"
        oninput="U.staffAutocompleteShow('${inputId}',this.value)"
        onfocus="U.staffAutocompleteShow('${inputId}',this.value)"
        onblur="setTimeout(()=>U.staffAutocompleteHide('${inputId}'),200)"
        style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:inherit;font-weight:500"/>
      <div id="${inputId}_drop" style="display:none;position:absolute;top:100%;left:0;right:0;margin-top:4px;background:#162338;border:1px solid rgba(240,205,127,.3);border-radius:6px;max-height:260px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,.4);z-index:1000"></div>
    </div>`;
  },
  staffAutocompleteShow(inputId, query){
    const drop = document.getElementById(inputId+'_drop');
    const inp = document.getElementById(inputId);
    if(!drop || !inp) return;
    // อ่าน source filter จาก dataset · default 'all'
    let source = inp.dataset.source || 'all';
    // ถ้า source = 'auto' → อ่านจาก staff_type ของ person card
    // inputId pattern: 'sm_name_{idx}' — แยก idx จาก suffix
    if(source === 'auto'){
      const m = inputId.match(/^sm_name_(\d+)$/);
      let staffType = '';
      if(m){
        const idx = m[1];
        const sel = document.querySelector(`[data-pidx="${idx}"][data-person="staff_type"]`);
        if(sel) staffType = sel.value;
      }
      source = (staffType === 'Part-time') ? 'parttime' : (staffType === 'ในองค์กร' ? 'staff' : 'all');
    }
    // ดึงผลตาม source
    const q = (query||'').toLowerCase();
    let results = [];
    if(source === 'parttime'){
      // PT directory: status === 'approved' ขึ้นเฉพาะอนุมัติแล้ว · OR pending ก็ขึ้น
      results = DB.parttime.list().filter(r=>{
        if(!q) return true;
        const fields=[r.full_name, r.phone, r.position, r.email, r.car_plate];
        return fields.some(f=>(f||'').toString().toLowerCase().includes(q));
      }).slice(0,8).map(r=>({
        _src: 'pt',
        id: r.id,
        employee_id: 'PT-'+String(r.id).padStart(3,'0'),
        full_name: r.full_name||'-',
        nickname: '',
        department: r.position||'-',
        position: r.position||'-',
        phone: r.phone||''
      }));
    } else if(source === 'staff'){
      results = DB.staff.search(query).slice(0,8).map(r=>({...r, _src:'staff'}));
    } else {
      // all = both
      const staff = DB.staff.search(query).slice(0,5).map(r=>({...r, _src:'staff'}));
      const pt = DB.parttime.list().filter(r=>{
        if(!q) return true;
        const fields=[r.full_name, r.phone, r.position, r.email, r.car_plate];
        return fields.some(f=>(f||'').toString().toLowerCase().includes(q));
      }).slice(0,3).map(r=>({
        _src:'pt',
        id: r.id,
        employee_id: 'PT-'+String(r.id).padStart(3,'0'),
        full_name: r.full_name||'-',
        nickname: '',
        department: r.position||'-',
        position: r.position||'-',
        phone: r.phone||''
      }));
      results = [...staff, ...pt];
    }
    if(results.length===0){
      const sourceLabel = source==='staff'?'พนักงาน (ในองค์กร)':source==='parttime'?'Part-Time':'รายชื่อ';
      drop.innerHTML = `<div style="padding:11px 13px;font-size:11.5px;color:#FFFFFF;opacity:.6;text-align:center">ไม่พบ${sourceLabel} — พิมพ์เพิ่มเพื่อค้นหา</div>`;
      drop.style.display='block';
      return;
    }
    const highlight = (txt)=>{
      if(!txt) return '';
      if(!q) return this.esc(txt);
      const s = String(txt);
      const i = s.toLowerCase().indexOf(q);
      if(i<0) return this.esc(s);
      return this.esc(s.substr(0,i)) + '<span style="background:rgba(240,205,127,.3);color:#F0CD7F;font-weight:700">'+this.esc(s.substr(i,q.length))+'</span>' + this.esc(s.substr(i+q.length));
    };
    drop.innerHTML = results.map((s,i)=>{
      const srcBadge = s._src==='pt'
        ? '<span style="font-size:9.5px;color:#F0CD7F;background:rgba(240,205,127,.15);padding:1px 6px;border-radius:4px;font-family:monospace;font-weight:700">PT</span>'
        : '<span style="font-size:9.5px;color:#7DD3FC;background:rgba(56,189,248,.15);padding:1px 6px;border-radius:4px;font-family:monospace;font-weight:700">STAFF</span>';
      return `
      <div onmousedown="U.staffAutocompletePick('${inputId}','${s._src}',${s.id})"
        style="padding:9px 13px;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer;display:flex;align-items:center;gap:10px;${i===0?'background:rgba(240,205,127,.06)':''}"
        onmouseover="this.style.background='rgba(240,205,127,.1)'"
        onmouseout="this.style.background='${i===0?'rgba(240,205,127,.06)':'transparent'}'">
        <span style="font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:#F0CD7F;background:rgba(240,205,127,.12);padding:2px 7px;border-radius:4px;font-weight:600;flex-shrink:0;min-width:65px;text-align:center">${highlight(s.employee_id)}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12.5px;color:#FFFFFF;font-weight:600;line-height:1.3">${highlight(s.full_name)} ${s.nickname?'· '+highlight(s.nickname):''}</div>
          <div style="font-size:10.5px;color:#FFFFFF;opacity:.7;margin-top:2px;font-weight:400">${highlight(s.department||'-')}${s.phone?' · '+this.esc(s.phone):''}</div>
        </div>
        ${srcBadge}
      </div>`;
    }).join('');
    drop.style.display='block';
  },
  staffAutocompleteHide(inputId){
    const drop = document.getElementById(inputId+'_drop');
    if(drop) drop.style.display='none';
  },
  staffAutocompletePick(inputId, src, recordId){
    const inp = document.getElementById(inputId);
    if(!inp) return;
    let name = '', empId = '', phone = '';
    if(src === 'pt'){
      const r = DB.parttime.get(parseInt(recordId));
      if(!r) return;
      name = r.full_name;
      empId = 'PT-'+String(r.id).padStart(3,'0');
      phone = r.phone||'';
      inp.dataset.ptId = r.id;
    } else {
      const s = DB.staff.get(parseInt(recordId));
      if(!s) return;
      name = s.full_name;
      empId = s.employee_id;
      phone = s.phone||'';
      inp.dataset.staffId = s.id;
    }
    inp.value = name;
    inp.dataset.empId = empId;
    inp.dataset.src = src;
    // ถ้าอยู่ใน person card — auto-fill phone ด้วย (ถ้าช่องว่าง)
    const m = inputId.match(/^sm_name_(\d+)$/);
    if(m && phone){
      const idx = m[1];
      const phoneInput = document.querySelector(`[data-pidx="${idx}"][data-person="phone"]`);
      if(phoneInput && !phoneInput.value) phoneInput.value = phone;
    }
    U.staffAutocompleteHide(inputId);
  },
  // ─── Hide all dropdown when window resize/scroll ───
  staffAutocompleteHideAll(){
    document.querySelectorAll('[id$="_drop"]').forEach(d=>{
      if(d.style.display === 'block' || d.style.display === ''){
        d.style.display = 'none';
      }
    });
  }};

// Global listener: ปิด dropdown ทั้งหมดเมื่อ resize/scroll (กัน dropdown ค้างผิดที่)
if(typeof window !== 'undefined' && !window._mck_ac_listener_installed){
  window._mck_ac_listener_installed = true;
  let _rt;
  window.addEventListener('resize', ()=>{
    clearTimeout(_rt);
    _rt = setTimeout(()=>{ try{ U.staffAutocompleteHideAll(); }catch(e){} }, 60);
  });
  document.addEventListener('click', (e)=>{
    // ปิด dropdown ทั้งหมดถ้าคลิกข้างนอก autocomplete
    const ac = e.target.closest('[data-staff-ac]');
    if(!ac){
      try{ U.staffAutocompleteHideAll(); }catch(e){}
    }
  }, true);
}

/* ===== MODAL ===== */
const Modal={
  open(html,title,onSave,wide=false){
    document.getElementById('mo-title').textContent=title;
    document.getElementById('mo-body').innerHTML=html;
    const box=document.querySelector('.mo-box');
    box.style.maxWidth=wide?'1300px':'1300px';
    document.getElementById('mo').classList.add('open');
    if(onSave){document.getElementById('mo-save').style.display='inline-flex';document.getElementById('mo-save').onclick=onSave;}
    else document.getElementById('mo-save').style.display='none';
  },
  close(){document.getElementById('mo').classList.remove('open');}
};

/* ===== ROUTER ===== */
const Router={
  current:'dashboard',
  pages:{},
  navigate(page){
    const sess=DB.auth.session();
    if(!sess){showLogin();return;}

    if(!DB.auth.can('view',page)&&page!=='calendar'&&page!=='op_report'){U.toast('⛔ ไม่มีสิทธิ์เข้าถึงหน้านี้','danger');return;}
    this.current=page;
    document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.page===page));
    document.getElementById('pt').textContent={dashboard:'Dashboard',calendar:'ปฏิทินงาน',quotation:'ใบเสนอราคา (Quotation)',exam_config:'รายการตรวจ & ต้นทุน',customers:'CRM — ลูกค้า',sales:'Sales — Project & Handover',op_checklist:'Operation — เตรียมงาน',op_prep:'Operation — ใบแจ้งงาน',op_onsite:'Operation — Onsite',lab:'Lab — ห้องปฏิบัติการ',report:'Report — ทีมทำผล',billing:'Billing — Invoice',config:'Config — ตั้งค่าระบบ',config_checklist:'ตั้งค่า Checklist',xray:'X-Ray — อ่านฟิล์ม',op_report:'Operation — รายงานสรุปค่าใช้จ่าย',opd:'OPD — ตรวจครบ',config_stations:'ตั้งค่า Station',medical:'เวชระเบียน',op_station_checklist:'Operation — Checklist Station',config_station_checklist:'ตั้งค่า Checklist Station',staff:'ตั้งค่ารายชื่อพนักงาน',parttime:'⏰ Part-Time — ใบสมัคร',parttime_history:'📊 รายงานประวัติ Part-Time',assessment:'⭐ Gen Assessment — สร้าง QR แบบประเมิน',assessment_report:'🌟 ผลประเมินความพึงพอใจ',config_assessment:'🎯 ตั้งค่าแบบประเมิน'}[page]||page;
    // Show loading indicator
    const content = document.getElementById('content');
    if(content) content.innerHTML = '<div class="empty" style="padding:60px"><div style="font-size:32px;margin-bottom:12px;opacity:.4">⏳</div><p style="color:var(--t-dim)">กำลังโหลด...</p></div>';
    // Call render (may be async)
    const renderFn = Pages[page] && Pages[page].render;
    if(renderFn) {
      try {
        const result = renderFn.call(Pages[page]);
        if(result && typeof result.then === 'function') {
          result.catch(e => {
            if(content) content.innerHTML = `<div class="ab danger"><strong>เกิดข้อผิดพลาด:</strong> ${e.message}</div>`;
          });
        }
      } catch(e) {
        if(content) content.innerHTML = `<div class="ab danger"><strong>เกิดข้อผิดพลาด:</strong> ${e.message}</div>`;
      }
    }
    updateAlerts();
    window.scrollTo(0,0);
  }
};

/* ═══════════════════════════════════════════════════════════
   LOGIN NOTIFICATION POPUP — เด้งงานใหม่หลัง Login
   ═══════════════════════════════════════════════════════════ */
function showLoginNotificationPopup(user){
  if(!user) return;
  // Snooze check
  if(DB.notifications.isSnoozed(user.id)) return;
  // ดึง previous_login_at จาก session
  let sess;
  try { sess = JSON.parse(localStorage.getItem('mck_session')||'{}'); } catch{ sess={}; }
  const sinceISO = sess.previous_login_at || null; // null = first login → ใช้ 7 วันย้อนหลัง
  const groups = DB.notifications.getNewItemsForRole(user.role, sinceISO);
  if(!groups || groups.length===0) return; // ไม่มีงานใหม่ → ไม่เด้ง

  const totalCount = groups.reduce((s,g)=>s+(g.count||g.items.length),0);
  const groupsHtml = groups.map(g=>`
    <div style="margin-bottom:14px">
      <div style="font-size:11px;color:#F0CD7F;font-weight:600;letter-spacing:.6px;margin-bottom:8px;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;display:flex;align-items:center;gap:6px">
        ${g.icon||'📌'} ${g.label}
        <span style="background:rgba(240,205,127,.18);color:#F0CD7F;padding:1px 8px;border-radius:9px;font-size:10.5px">${g.count||g.items.length} รายการ</span>
      </div>
      ${g.items.map(it=>`
        <div onclick="closeLoginPopup();${it.page?`Router.navigate('${it.page}')`:''}"
          style="background:#162338;border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:10px 13px;margin-bottom:7px;display:flex;align-items:flex-start;gap:11px;transition:all .15s;cursor:pointer"
          onmouseover="this.style.borderColor='rgba(240,205,127,.35)';this.style.background='#1A2A44'"
          onmouseout="this.style.borderColor='rgba(255,255,255,.06)';this.style.background='#162338'">
          <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#F0CD7F;font-weight:700;background:rgba(240,205,127,.12);padding:3px 8px;border-radius:5px;flex-shrink:0;align-self:flex-start;margin-top:1px">${U.esc(it.project_code||'-')}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;color:#FFFFFF;font-weight:600;line-height:1.3">${U.esc(it.company||'-')}</div>
            <div style="font-size:11px;color:#FFFFFF;opacity:.75;margin-top:4px;font-weight:400">${it.meta||''}</div>
          </div>
          <span style="font-size:10.5px;font-weight:600;padding:2px 7px;border-radius:4px;align-self:flex-start;margin-top:1px;flex-shrink:0;white-space:nowrap;${it.urgent?'color:#FCA5A5;background:rgba(252,165,165,.12)':'color:#6EE7B7;background:rgba(110,231,183,.12)'}">${it.urgent?'⚠ ':''}${U.esc(it.action||'')}</span>
        </div>
      `).join('')}
    </div>
  `).join('');

  const sinceText = sinceISO 
    ? `ตั้งแต่เข้าระบบครั้งก่อน (${new Date(sinceISO).toLocaleString('th-TH',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})})`
    : 'ในช่วง 7 วันที่ผ่านมา';

  // สร้าง popup overlay
  const overlay = document.createElement('div');
  overlay.id = 'login-notif-popup';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:flex-start;padding:60px 20px 20px;z-index:9999;animation:popupFadeIn .25s ease';
  overlay.innerHTML = `
    <style>@keyframes popupFadeIn{from{opacity:0}to{opacity:1}}
    @keyframes popupSlideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}</style>
    <div style="background:#0F1A2E;border:1.5px solid rgba(240,205,127,.35);border-radius:14px;width:100%;max-width:540px;box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 40px rgba(240,205,127,.08);overflow:hidden;animation:popupSlideUp .3s ease;max-height:calc(100vh - 100px);display:flex;flex-direction:column">
      <div style="padding:18px 22px;background:linear-gradient(180deg,#162338 0%,#0F1A2E 100%);border-bottom:1px solid rgba(240,205,127,.2);display:flex;align-items:flex-start;gap:13px;flex-shrink:0">
        <div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(180deg,#F0CD7F,#D4A845);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;box-shadow:0 4px 12px rgba(240,205,127,.25)">🔔</div>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:700;color:#FFFFFF">มีงานใหม่ ${totalCount} รายการรอคุณดำเนินการ</div>
          <div style="font-size:12px;color:#FFFFFF;opacity:.85;margin-top:3px;font-weight:400">สวัสดี ${U.esc(user.name)} (Role: ${user.role}) · ${sinceText}</div>
        </div>
        <button onclick="closeLoginPopup()" style="background:none;border:none;color:#FFFFFF;opacity:.7;font-size:20px;cursor:pointer;padding:0;line-height:1;flex-shrink:0">×</button>
      </div>
      <div style="padding:18px 22px;flex:1;overflow-y:auto;min-height:0">${groupsHtml}</div>
      <div style="padding:12px 22px;border-top:1px solid rgba(255,255,255,.08);background:#0B1322;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;flex-shrink:0">
        <label style="font-size:11.5px;color:#FFFFFF;opacity:.85;display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" id="notif-snooze" style="accent-color:#F0CD7F;width:14px;height:14px"/> ไม่แสดงอีกใน 1 ชั่วโมง
        </label>
        <div style="display:flex;gap:8px">
          <button onclick="closeLoginPopup()" style="padding:7px 14px;border:1px solid rgba(255,255,255,.22);background:transparent;color:#FFFFFF;border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">ปิด</button>
          <button onclick="closeLoginPopup();Router.navigate('dashboard')" style="padding:7px 14px;border:1px solid #F0CD7F;background:linear-gradient(180deg,#F0CD7F,#D4A845);color:#1A1A1A;border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:600">ดูทั้งหมด →</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  // คลิก backdrop ปิด
  overlay.addEventListener('click',(e)=>{
    if(e.target===overlay) closeLoginPopup();
  });
}

function closeLoginPopup(){
  const el = document.getElementById('login-notif-popup');
  if(!el) return;
  // Snooze ถ้า check
  const snoozeCb = document.getElementById('notif-snooze');
  if(snoozeCb && snoozeCb.checked){
    const sess = DB.auth.session();
    if(sess) DB.notifications.snooze(sess.userId);
  }
  el.style.animation = 'popupFadeIn .2s ease reverse';
  setTimeout(()=>el.remove(),200);
}

/* ===== AUTH UI ===== */
function showLogin(){
  document.getElementById('app').style.display='none';
  document.getElementById('login-screen').style.display='flex';
}
function showApp(){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app').style.display='flex';
  buildNav();
  updateAlerts();
}
// ═══ Nav badge count per page ═══
function _getNavBadgeCount(page){
  try {
    if(page==='parttime'){
      const list = DB.parttime ? DB.parttime.list() : [];
      return list.filter(r=>r.status==='pending').length;
    }
    // เพิ่ม page อื่น ๆ ที่ต้องการ badge ได้ที่นี่
    return 0;
  } catch(e){ return 0; }
}

// อัปเดต badge ของทุก nav item โดยไม่ rebuild nav ทั้งหมด (รักษา active state)
function updateNavBadges(){
  try {
    const navItems = document.querySelectorAll('#sidebar-nav .nav-item');
    navItems.forEach(el=>{
      const page = el.dataset.page;
      if(!page) return;
      const count = _getNavBadgeCount(page);
      let badge = el.querySelector('.nav-badge');
      if(count > 0){
        if(!badge){
          badge = document.createElement('span');
          badge.className = 'nav-badge';
          el.appendChild(badge);
        }
        badge.textContent = count;
      } else if(badge){
        badge.remove();
      }
    });
  } catch(e){}
}

function buildNav(){
  const sess=DB.auth.session();
  const navEl=document.getElementById('sidebar-nav');
  const items=[
    {page:'dashboard',icon:'📊',label:'Dashboard',mod:'dashboard'},
    {page:'calendar',icon:'📅',label:'ปฏิทินงาน',mod:'dashboard'},
    {section:'ทีมขาย (Sales)'},
    {page:'customers',icon:'👥',label:'CRM — ลูกค้า',mod:'customers'},
    {page:'quotation',icon:'📝',label:'ใบเสนอราคา',mod:'sales'},
    {page:'sales',icon:'💼',label:'Project & Handover',mod:'sales'},
    {section:'Operation'},
    {page:'op_checklist',icon:'✅',label:'เตรียมงาน (Checklist)',mod:'op_prep'},
    {page:'op_station_checklist',icon:'📋',label:'Checklist Station',mod:'op_checklist'},
    {page:'op_prep',icon:'📋',label:'ใบแจ้งงาน',mod:'op_prep'},
    {page:'op_onsite',icon:'🚑',label:'Onsite',mod:'op_onsite'},
    {section:'ห้องปฏิบัติการ'},
    {page:'lab',icon:'🔬',label:'Lab & TAT',mod:'lab'},
    {section:'เอกซเรย์ X-ray'},
    {page:'xray',icon:'📡',label:'X-Ray — อ่านฟิล์ม',mod:'xray'},
    {section:'ทีมทำผล (Report)'},
    {page:'report',icon:'📄',label:'Report & Plan',mod:'report'},
    {section:'OPD'},
    {page:'opd',icon:'🏥',label:'OPD — ตรวจครบ',mod:'opd'},
    {section:'เวชระเบียน'},
    {page:'medical',icon:'📋',label:'เวชระเบียน',mod:'medical'},
    {section:'การเงิน'},
    {page:'billing',icon:'💰',label:'Billing & Invoice',mod:'billing'},
    {section:'Gen Assessment'},
    {page:'assessment',icon:'⭐',label:'สร้าง QR แบบประเมิน',mod:'assessment'},
    {section:'รายงาน'},
    {page:'op_report',icon:'📊',label:'รายงานสรุปค่าใช้จ่าย',mod:'op_report'},
    {page:'assessment_report',icon:'🌟',label:'ผลประเมินความพึงพอใจ',mod:'assessment_report'},
    {section:'ข้อมูล Part-Time'},
    {page:'parttime',icon:'⏰',label:'Part-Time',mod:'parttime'},
    {page:'parttime_history',icon:'📊',label:'รายงานประวัติ PT',mod:'parttime_history'},
    {section:'ระบบ'},
    {page:'exam_config',icon:'🧪',label:'รายการตรวจ',mod:'config'},
    {page:'config',icon:'⚙',label:'ตั้งค่าระบบ',mod:'config'},
    {page:'config_checklist',icon:'📋',label:'ตั้งค่า Checklist',mod:'config'},
    {page:'config_stations',icon:'🩺',label:'ตั้งค่า Station',mod:'config'},
    {page:'config_station_checklist',icon:'📋',label:'ตั้งค่า Checklist Station',mod:'config'},
    {page:'staff',icon:'👤',label:'ตั้งค่ารายชื่อ',mod:'staff'},
    {page:'config_assessment',icon:'🎯',label:'ตั้งค่าแบบประเมิน',mod:'config_assessment'}
  ];
  let html='';
  items.forEach(it=>{
    if(it.section){html+=`<div class="nav-section">${it.section}</div>`;return;}
    if(!DB.auth.can('view',it.mod))return;
    const badgeCount = _getNavBadgeCount(it.page);
    const badge = badgeCount>0 ? `<span class="nav-badge">${badgeCount}</span>` : '';
    html+=`<a class="nav-item" data-page="${it.page}" onclick="Router.navigate('${it.page}')"><span class="icon">${it.icon}</span><span class="nav-label">${it.label}</span>${badge}</a>`;
  });
  navEl.innerHTML=html;
  document.getElementById('user-name').textContent=sess.name;
  document.getElementById('user-role').textContent=sess.role;
  const hn=document.getElementById('header-user-name');
  const hr=document.getElementById('header-user-role');
  const av=document.getElementById('user-avatar');
  if(hn)hn.textContent=sess.name;
  if(hr)hr.textContent=sess.role;
  if(av)av.textContent=(sess.name||'U').charAt(0).toUpperCase();
}
function updateAlerts(){
  try {
    const a=DB.checkAlerts()||[];
    const b=document.getElementById('alert-count');
    if(b){
      b.textContent=a.length;
      b.style.display=a.length>0?'inline-block':'none';
    }
    // อัปเดต nav badges (Part-Time pending count, etc.)
    updateNavBadges();
  } catch(e){}
}

/* ===== AUTOCOMPLETE HELPERS ===== */
function acCustomer(inputId,hiddenId){
  const inp=document.getElementById(inputId);
  const hid=document.getElementById(hiddenId);
  const list=document.createElement('div');list.className='ac-list';list.id=inputId+'_list';
  inp.parentElement.style.position='relative';
  inp.parentElement.appendChild(list);
  inp.addEventListener('input',async ()=>{
    const q=inp.value.toLowerCase();
    const all=await DB.customer.listCustomers();
    const custs=(all||[]).filter(c=>c.company_name.toLowerCase().includes(q));
    if(!q||custs.length===0){list.classList.remove('open');return;}
    list.innerHTML=custs.slice(0,8).map(c=>`<div class="ac-item" data-id="${c.id}" data-name="${U.esc(c.company_name)}"><strong>${U.esc(c.company_name)}</strong><br><span class="t-sm t-muted">${c.contact_name||''} — ${c.phone||''}</span></div>`).join('');
    list.classList.add('open');
    list.querySelectorAll('.ac-item').forEach(el=>el.addEventListener('click',async ()=>{
      inp.value=el.dataset.name;hid.value=el.dataset.id;list.classList.remove('open');
      const c=await DB.customer.getCustomer(parseInt(el.dataset.id));
      if(c){
        const f=id=>document.getElementById(id);
        if(f('ac_loc'))f('ac_loc').value=c.address||'';
        if(f('ac_coord'))f('ac_coord').value=c.contact_name||'';
        if(f('ac_cphone'))f('ac_cphone').value=c.phone||'';
        if(f('ac_head'))f('ac_head').value=c.employee_count||'';
      }
    }));
  });
  document.addEventListener('click',e=>{if(!inp.contains(e.target)&&!list.contains(e.target))list.classList.remove('open');});
}
function acProject(inputId,hiddenId,cb){
  const inp=document.getElementById(inputId);
  const hid=document.getElementById(hiddenId);
  const list=document.createElement('div');list.className='ac-list';list.id=inputId+'_list';
  inp.parentElement.style.position='relative';
  inp.parentElement.appendChild(list);
  inp.addEventListener('input',async ()=>{
    const q=inp.value.toLowerCase();
    const all=await DB.sales.listProjects();
    const projs=(all||[]).filter(p=>p.project_code.toLowerCase().includes(q)||p.company_name.toLowerCase().includes(q));
    if(!q||projs.length===0){list.classList.remove('open');return;}
    list.innerHTML=projs.slice(0,8).map(p=>`<div class="ac-item" data-id="${p.id}"><strong>${U.esc(p.project_code)}</strong> — ${U.esc(p.company_name)}<br><span class="t-sm t-muted">${U.fmtD(p.onsite_date)} | ${(p.headcount||0).toLocaleString()} คน</span></div>`).join('');
    list.classList.add('open');
    list.querySelectorAll('.ac-item').forEach(el=>el.addEventListener('click',async ()=>{
      const p=DB.sales.getProject(parseInt(el.dataset.id));
      if(p){inp.value=p.project_code+' — '+p.company_name;hid.value=p.id;list.classList.remove('open');cb&&cb(p);}
    }));
  });
  document.addEventListener('click',e=>{if(!inp.contains(e.target)&&!list.contains(e.target))list.classList.remove('open');});
}

/* ===== PAGES ===== */
const Pages={};


/* ══════════════════════════════════════════════════
   XRAY PAGE — งาน X-Ray อ่านฟิล์ม
   แสดงเมื่อ Onsite ปิดหน่วยแล้ว
══════════════════════════════════════════════════ */
Pages.xray={
  _STEPS:[
    {key:'film_sent',      label:'ส่งฟิล์มอ่านผล'},
    {key:'interpreting',   label:'รอแปลผล'},
    {key:'report_done',    label:'จัดทำผล'},
    {key:'approved',       label:'Approve ผล'},
    {key:'write_cd',       label:'Write CD'},
    {key:'send_excel',     label:'ส่ง File Excel'},
    {key:'send_media',     label:'ส่ง CD/DVD/Flash Drive'},
  ],

  _statusLabel(meta){
    if(!meta)return{label:'รอรับงาน',cls:'b-draft'};
    const steps=this._STEPS;
    // Check all done
    if(steps.every(s=>meta[s.key])){return{label:'Complete',cls:'b-closed'};}
    // Find latest done step
    for(let i=steps.length-1;i>=0;i--){
      if(meta[steps[i].key]) return{label:steps[i].label,cls:'b-onsite'};
    }
    return{label:'รอส่งฟิล์ม',cls:'b-draft'};
  },

  async render(){
    const canEdit=DB.auth.can('edit','xray');
    // Load projects that have closed onsite (status=Lab,Report,Billing,Completed)
    const allProjs=await DB.sales.listProjects();
    const projs=(allProjs||[]).filter(p=>['Lab','Report','Billing','Completed'].includes(p.status));
    // Search
    const searchQ=(document.getElementById('xr_search_val')||{value:''}).value||'';
    const statusF=(document.getElementById('xr_status_val')||{value:''}).value||'';

    const mkCk=(pid,key,meta,label)=>{
      const done=!!(meta&&meta[key]);
      const dateVal=meta&&meta[key+'_date']||'';
      if(done){
        return`<td style="text-align:center;vertical-align:middle;padding:6px 4px" title="${label} — ${U.fmtD(dateVal)}">
          <div style="display:inline-flex;flex-direction:column;align-items:center;gap:1px">
            <span style="font-size:16px">✅</span>
            ${dateVal?`<div style="font-size:9px;color:#6EE7B7">${U.fmtD(dateVal)}</div>`:''}
          </div>
        </td>`;
      }
      return`<td style="text-align:center;vertical-align:middle;padding:6px 4px">
        ${canEdit?`<input type="checkbox" style="width:16px;height:16px;accent-color:#0E9F6E;cursor:pointer"
          onchange="Pages.xray.toggleStep(${pid},'${key}',this.checked)" title="${label}"/>`:'⬜'}
      </td>`;
    };

    const rows=await Promise.all(projs.map(async p=>{
      const meta=DB.xray.getMeta(p.id);
      const st=this._statusLabel(meta);
      const xrFilter=!statusF||(statusF==='complete'&&st.cls==='b-closed')||(statusF==='pending'&&st.cls!=='b-closed');
      const txtFilter=!searchQ||(p.project_code+' '+p.company_name).toLowerCase().includes(searchQ.toLowerCase());
      if(!xrFilter||!txtFilter)return null;
      return`<tr>
        <td class="fw6 mono" style="color:var(--c-gold-lt,#E2C46A)">${U.esc(p.project_code)}</td>
        <td class="fw6">${U.esc(p.company_name)}</td>
        <td>${(p.headcount||0).toLocaleString()}</td>
        <td>${U.fmtD(p.onsite_date)}</td>
        ${this._STEPS.map(s=>mkCk(p.id,s.key,meta,s.label)).join('')}
        <td><span class="badge ${st.cls}" style="font-size:10px">${st.label}</span></td>
        <td>
          ${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.xray.editMeta(${p.id})">แก้ไข</button>`:''} 
          <button class="btn btn-out btn-xs" onclick="Pages.xray.attachFile(${p.id})">📎</button>
        </td>
      </tr>`;
    }));

    const filteredRows=rows.filter(Boolean);
    const hdr=this._STEPS.map(s=>`<th style="text-align:center;font-size:8.5px;max-width:60px;white-space:normal;line-height:1.3">${s.label}</th>`).join('');
    document.getElementById('content').innerHTML=`
    <div class="ph">
      <div><h2>📡 X-Ray — อ่านฟิล์มและรายงานผล</h2><p>ติดตามความคืบหน้างาน X-Ray ต่อ Project</p></div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.06)">
        <div style="position:relative;flex:7">
          <span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:13px;pointer-events:none;opacity:.5">🔍</span>
          <input id="xr_search_val" placeholder="ค้นหา Project Code, บริษัท..." autocomplete="off"
            oninput="Pages.xray.render()"
            onfocus="this.style.borderColor='var(--c-teal)'" onblur="this.style.borderColor='rgba(255,255,255,.1)'"
            style="width:100%;padding:9px 12px 9px 34px;border:1.5px solid rgba(255,255,255,.1);border-radius:9px;font-size:13px;background:rgba(255,255,255,.06);color:#fff;font-family:'IBM Plex Sans Thai',sans-serif;outline:none"/>
        </div>
        <select id="xr_status_val" onchange="Pages.xray.render()"
          style="flex:3;padding:9px 12px;border:1.5px solid rgba(255,255,255,.1);border-radius:9px;font-size:13px;background:rgba(255,255,255,.06);color:#fff">
          <option value="">ทุกสถานะ</option>
          <option value="pending">กำลังดำเนินการ</option>
          <option value="complete">Complete</option>
        </select>
      </div>
      <div style="height:8px"></div>
      <div class="tbl-wrap">
        <table>
          <thead><tr>
            <th>Project Code</th><th>บริษัท</th><th>จำนวน</th><th>วันตรวจ</th>
            ${hdr}
            <th>สถานะ</th><th></th>
          </tr></thead>
          <tbody>${filteredRows.join('')||'<tr><td colspan="14" class="empty"><div class="icon">📡</div><p>ยังไม่มีงาน X-Ray (รอ Onsite ปิดหน่วยก่อน)</p></td></tr>'}</tbody>
        </table>
      </div>
    </div>`;
  },

  async toggleStep(pid,key,val){
    const meta=DB.xray.getMeta(pid)||{project_id:pid};
    meta[key]=val;
    if(val) meta[key+'_date']=new Date().toISOString().substr(0,10);
    else delete meta[key+'_date'];
    DB.xray.saveMeta(meta);
    // Update status in project if all done
    const allDone=this._STEPS.every(s=>meta[s.key]);
    if(allDone){
      const p=DB.sales.getProject(pid);
      if(p&&p.status==='Onsite') DB.sales.saveProject({...p,status:'Lab'});
    }
    await this.render();
    U.toast(val?'✅ บันทึกอัตโนมัติ':'↩ ยกเลิก');
  },

  async editMeta(pid){
    const meta=DB.xray.getMeta(pid)||{};
    const p=DB.sales.getProject(pid);
    Modal.open(`
    <div style="padding:10px 14px;background:var(--s-2);border-radius:9px;margin-bottom:14px">
      <div class="fw6">${U.esc(p?.project_code||'')} | ${U.esc(p?.company_name||'')}</div>
    </div>
    ${this._STEPS.map(s=>`
    <label style="display:flex;align-items:center;gap:10px;padding:9px 13px;margin-bottom:6px;background:${meta[s.key]?'rgba(14,159,110,.08)':'var(--s-2,#172236)'};border:1.5px solid ${meta[s.key]?'rgba(14,159,110,.4)':'var(--b-1,rgba(255,255,255,.08))'};border-radius:8px;cursor:pointer;transition:all .15s">
      <input type="checkbox" id="xr_${s.key}" ${meta[s.key]?'checked':''} style="width:17px;height:17px;accent-color:#0E9F6E;flex-shrink:0"/>
      <span style="flex:1;font-size:13px;color:${meta[s.key]?'#6EE7B7':'var(--t-body,#C2CEDF)'};font-weight:${meta[s.key]?'600':'500'}">${meta[s.key]?'✅ ':''}${s.label}</span>
    </label>`).join('')}
    <div class="fg mt2"><label>หมายเหตุ</label>
      <textarea id="xr_note" style="min-height:60px">${U.esc(meta.note||'')}</textarea>
    </div>`,
    `แก้ไขงาน X-Ray — ${p?.project_code||pid}`, async ()=>{
      const newMeta={project_id:pid};
      const today=new Date().toISOString().substr(0,10);
      this._STEPS.forEach(s=>{
        const cb=document.getElementById('xr_'+s.key);
        const wasChecked=!!meta[s.key];
        const nowChecked=!!cb?.checked;
        newMeta[s.key]=nowChecked?1:0;
        if(nowChecked){
          // คงวันที่เดิมถ้าเคยติ๊ก, ใช้วันนี้ถ้าเพิ่งติ๊กใหม่
          newMeta[s.key+'_date']=wasChecked?(meta[s.key+'_date']||today):today;
        } else {
          newMeta[s.key+'_date']=null;
        }
      });
      newMeta.note=document.getElementById('xr_note')?.value||'';
      DB.xray.saveMeta(newMeta);
      Modal.close();await this.render();U.toast('✅ บันทึกแล้ว');
    });
  },

  async attachFile(pid){
    const p=DB.sales.getProject(pid);
    Modal.open(`
    <div class="sec-title">${U.esc(p?.project_code||'')} — แนบไฟล์ X-Ray</div>
    <div class="file-zone" onclick="document.getElementById('xr_file_inp').click()">
      <div style="font-size:28px;margin-bottom:6px">📎</div>
      <p class="t-sm t-muted">คลิกเพื่อเลือกไฟล์ (PDF, JPG, PNG, ZIP, ≤5MB)</p>
      <input id="xr_file_inp" type="file" accept=".pdf,.jpg,.jpeg,.png,.zip" style="display:none"
        onchange="Pages.xray._handleFile(${pid},this)"/>
    </div>
    <div id="xr_file_list" style="margin-top:10px"></div>`,
    'แนบไฟล์ X-Ray', null);
    // Load existing files
    setTimeout(async ()=>{
      const files=await DB.files.listByContext('xray_'+pid);
      const el=document.getElementById('xr_file_list');
      if(el&&files&&files.length){
        el.innerHTML='<div class="sec-title">ไฟล์ที่แนบแล้ว</div>'+
          files.map(f=>`<div class="sr t-sm"><span>📄 ${U.esc(f.file_name||f.name)} <span class="t-muted">(${f.file_size_label||f.size||''})</span></span><button class="btn btn-danger btn-xs" onclick="Pages.xray._delFile(${f.id},${pid})">ลบ</button></div>`).join('');
      }
    },100);
  },

  async _handleFile(pid,inp){
    const f=inp.files[0];if(!f)return;
    if(f.size>5*1024*1024){U.toast('ไฟล์ใหญ่เกิน 5MB','danger');return;}
    U.toast('⏳ กำลังอัปโหลด...');
    await DB.files.uploadFile('xray_'+pid,f,'xray','X-Ray Film');
    const el=document.getElementById('xr_file_list');
    if(el){const files=await DB.files.listByContext('xray_'+pid);
      el.innerHTML='<div class="sec-title">ไฟล์ที่แนบแล้ว</div>'+
        files.map(f=>`<div class="sr t-sm"><span>📄 ${U.esc(f.file_name||f.name)}</span><button class="btn btn-danger btn-xs" onclick="Pages.xray._delFile(${f.id},${pid})">ลบ</button></div>`).join('');}
    U.toast('✅ อัปโหลดแล้ว');
  },

  async _delFile(fid,pid){
    if(!U.confirm('ลบไฟล์นี้?'))return;
    await DB.files.deleteFile(fid);
    const files=await DB.files.listByContext('xray_'+pid);
    const el=document.getElementById('xr_file_list');
    if(el) el.innerHTML='<div class="sec-title">ไฟล์ที่แนบแล้ว</div>'+
      files.map(f=>`<div class="sr t-sm"><span>📄 ${U.esc(f.file_name||f.name)}</span><button class="btn btn-danger btn-xs" onclick="Pages.xray._delFile(${f.id},${pid})">ลบ</button></div>`).join('');
  },
};

/* ══════════════════════════════════════════════════
   PAGES.OP_REPORT — รายงานสรุปค่าใช้จ่าย Operation
   คิดเฉพาะ Part-time (ไม่คิดในองค์กร)
══════════════════════════════════════════════════ */
Pages.op_report={
  _sq:'', _sd:'', _ss:'',

  _calcJob(jo, selProfs){
    // selProfs = array of profession strings to include, or null = ทั้งหมด
    const sts=DB.operation.listStations(jo.id);
    const eqs=DB.operation.listEquipments(jo.id);
    const mp=DB.manpowerCost.list();
    // ───── สร้าง list ของ Part-time persons (1 entry ต่อคน) จาก staff_list[] ของแต่ละ Station ─────
    const ptPersons = [];
    sts.forEach(s=>{
      const list = s.staff_list || [];
      if(list.length > 0){
        // Modern format: iterate each person
        list.forEach(p=>{
          if(!p.staff_type || !p.staff_type.toLowerCase().includes('part')) return;
          if(selProfs && selProfs.length && !selProfs.includes(p.profession||'ไม่ระบุ')) return;
          let wage = p.wage_per_day;
          if(wage===undefined||wage===null||wage===''){
            const r=mp.find(m=>m.role===p.profession);
            wage=r?r.cost_per_day:0;
          }
          ptPersons.push({
            station: s,
            profession: p.profession||'-',
            staff_name: p.staff_name||'-',
            staff_type: p.staff_type,
            phone: p.phone||'',
            remark: p.remark||'',
            wage: parseFloat(wage)||0
          });
        });
      } else {
        // Legacy fallback: station-level fields (multiply by staff_count if no list)
        if(!s.staff_type||!s.staff_type.toLowerCase().includes('part')) return;
        if(selProfs&&selProfs.length&&!selProfs.includes(s.profession||'ไม่ระบุ')) return;
        let wage=s.wage_per_day;
        if(wage===undefined||wage===null||wage===''){
          const r=mp.find(m=>m.role===s.profession||m.role===s.staff_name);
          wage=r?r.cost_per_day:0;
        }
        wage=parseFloat(wage)||0;
        const cnt = parseInt(s.staff_count)||1;
        for(let i=0;i<cnt;i++){
          ptPersons.push({
            station: s,
            profession: s.profession||'-',
            staff_name: i===0?(s.staff_name||'-'):'',
            staff_type: s.staff_type,
            phone: s.phone||'',
            remark: '',
            wage
          });
        }
      }
    });
    const laborCost = ptPersons.reduce((sum,p)=>sum+p.wage, 0);
    const eqCost = eqs.reduce((sum,e)=>sum+(e.price||0), 0);
    // Backward compat: parttimeSts = distinct stations that have any Part-time
    const stationIds = new Set(ptPersons.map(p=>p.station.id));
    const parttimeSts = sts.filter(s=>stationIds.has(s.id));
    return{
      parttimeSts,
      ptPersons,
      laborCost,
      eqCost,
      total: laborCost+eqCost,
      ptCount: ptPersons.length  // นับเป็นคน (ไม่ใช่ stations)
    };
  },

  render(){
    const sq=this._sq||'';
    const sd=this._sd||'';
    const ss=this._ss||'';
    const jos=DB.operation.listJobOrders();
    const filtered=jos.filter(jo=>{
      const p=DB.sales.getProject(jo.project_id)||{};
      const txt=(p.project_code||'')+' '+(p.company_name||'')+(jo.company_name||'');
      const matchTxt=!sq||txt.toLowerCase().includes(sq.toLowerCase());
      const matchDate=!sd||(p.onsite_date||'').startsWith(sd);
      const isComplete=['Lab','Report','Billing','Completed'].includes(p.status||'');
      const matchStatus=!ss||(ss==='complete'&&isComplete)||(ss==='pending'&&!isComplete);
      return matchTxt&&matchDate&&matchStatus;
    });
    const rows=filtered.map(jo=>{
      const p=DB.sales.getProject(jo.project_id)||{};
      const {parttimeSts,ptPersons,laborCost,eqCost,total}=this._calcJob(jo);
      const isComplete=['Lab','Report','Billing','Completed'].includes(p.status||'');
      return`<tr style="cursor:pointer" onclick="Pages.op_report.viewDetail(${jo.id})">
        <td class="fw6 mono" style="color:var(--c-gold-lt,#E2C46A)">${U.esc(p.project_code||'-')}</td>
        <td class="fw6">${U.esc(p.company_name||jo.company_name||'-')}</td>
        <td>${U.fmtD(p.onsite_date)}</td>
        <td style="text-align:right">${ptPersons.length} คน</td>
        <td style="text-align:right">฿${U.fmt(laborCost)}</td>
        <td style="text-align:right">฿${U.fmt(eqCost)}</td>
        <td style="text-align:right;font-weight:700;color:var(--c-gold-lt,#E2C46A)">฿${U.fmt(total)}</td>
        <td><span class="badge ${isComplete?'b-closed':'b-onsite'}" style="font-size:10px">${isComplete?'Complete':'Onsite'}</span></td>
        <td style="white-space:nowrap">
          <button class="btn btn-out btn-xs" onclick="event.stopPropagation();Pages.op_report.viewDetail(${jo.id})">ดู</button>
        </td>
      </tr>`;
    }).join('');
    const grandTotal=filtered.reduce((s,jo)=>s+this._calcJob(jo).total,0);
    document.getElementById('content').innerHTML=`
    <div class="ph">
      <div><h2>📊 Operation — รายงานสรุปค่าใช้จ่าย</h2>
        <p>คิดเฉพาะ Part-time + เช่าอุปกรณ์ (ไม่รวมพนักงานในองค์กร)</p></div>
      <div class="btn-grp">
        <button class="btn btn-gold" onclick="Pages.op_report.exportDialog()">📤 Export PDF / Excel</button>
      </div>
    </div>
    <div class="card mb4">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:4px 0">
        <div style="position:relative;flex:6">
          <span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);opacity:.5;font-size:13px;pointer-events:none">🔍</span>
          <input id="opr_sq" placeholder="ค้นหาบริษัท / Project Code..." value="${U.esc(sq)}"
            oninput="Pages.op_report._sq=this.value;Pages.op_report.render()"
            style="width:100%;padding:9px 12px 9px 34px;border:1.5px solid rgba(255,255,255,.1);border-radius:9px;font-size:13px;background:rgba(255,255,255,.06);color:#fff;outline:none"/>
        </div>
        <div style="flex:2">
          <input id="opr_sd" type="month" value="${sd}"
            onchange="Pages.op_report._sd=this.value;Pages.op_report.render()"
            style="width:100%;padding:9px 10px;border:1.5px solid rgba(255,255,255,.1);border-radius:9px;font-size:13px;background:rgba(255,255,255,.06);color:#fff;outline:none"
            title="กรองตามเดือน"/>
        </div>
        <div style="flex:2">
          <select id="opr_ss" onchange="Pages.op_report._ss=this.value;Pages.op_report.render()"
            style="width:100%;padding:9px 10px;border:1.5px solid rgba(255,255,255,.1);border-radius:9px;font-size:13px;background:rgba(255,255,255,.06);color:#fff;outline:none">
            <option value="" ${!ss?'selected':''}>ทุกสถานะ</option>
            <option value="pending" ${ss==='pending'?'selected':''}>Onsite</option>
            <option value="complete" ${ss==='complete'?'selected':''}>Complete</option>
          </select>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="tbl-wrap"><table>
        <thead><tr>
          <th>Project</th><th>บริษัท</th><th>วันตรวจ</th>
          <th style="text-align:right">Part-time</th>
          <th style="text-align:right">ค่าแรง</th>
          <th style="text-align:right">เช่าอุปกรณ์</th>
          <th style="text-align:right">รวม</th>
          <th>สถานะ</th><th></th>
        </tr></thead>
        <tbody>${rows||'<tr><td colspan="9" class="empty"><div class="icon">📊</div><p>ไม่พบข้อมูล</p></td></tr>'}</tbody>
        ${filtered.length>1?`<tfoot><tr>
          <td colspan="6" class="fw6" style="padding:10px 14px">รวมทั้งหมด ${filtered.length} งาน</td>
          <td style="text-align:right;font-weight:800;color:var(--c-gold-lt,#E2C46A);padding:10px 14px">฿${U.fmt(grandTotal)}</td>
          <td colspan="2"></td>
        </tr></tfoot>`:''}
      </table></div>
    </div>`;
  },

  // ═══════════════════════════════════════════════
  //  EXPORT PER-PERSON (PDF + CSV)
  // ═══════════════════════════════════════════════
  _exportPerPersonPDF(persons, from, to, selTypes){
    try{
      const grandTotal = persons.reduce((s,p)=>s+p.totalWage, 0);
      const totalRows = persons.reduce((s,p)=>s+p.jobs.length, 0);
      const today = new Date().toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'});
      const rangeText = from && to ? `${U.fmtD(from)} — ${U.fmtD(to)}` : (from ? `ตั้งแต่ ${U.fmtD(from)}` : (to ? `ถึง ${U.fmtD(to)}` : 'ทั้งหมด'));

      const personCards = persons.map(p=>{
        // Sort jobs by date asc + day_no
        const sortedJobs = p.jobs.slice().sort((a,b)=>{
          const dA = new Date(a.onsite_date||0);
          const dB = new Date(b.onsite_date||0);
          if(dA.getTime() !== dB.getTime()) return dA - dB;
          return (a.day_no||0) - (b.day_no||0);
        });
        const rows = sortedJobs.map(j=>`<tr>
          <td><span style="font-family:'IBM Plex Mono',monospace;color:#1E40AF;font-weight:700;font-size:10.5px">${U.esc(j.project_code)}</span>${j.day_no>0?`<span style="background:linear-gradient(180deg,#F59E0B,#D97706);color:#FFF;font-size:8.5px;font-weight:700;padding:1px 5px;border-radius:3px;font-family:'IBM Plex Mono',monospace;margin-left:4px">วันที่ ${j.day_no}</span>`:''}</td>
          <td>${U.fmtD(j.onsite_date)}</td>
          <td>${U.esc(j.company_name)}</td>
          <td>${U.esc(j.station_name)}</td>
          <td>${U.esc(j.profession)}</td>
          <td style="text-align:right;font-family:'IBM Plex Mono',monospace;color:#065F46;font-weight:700">฿${U.fmt(j.wage)}</td>
        </tr>`).join('');

        return `<div class="person-card">
          <div class="hd">
            <div class="name">👤 ${U.esc(p.full_name)} <span style="font-size:9.5px;color:#6B7280;font-weight:500">· ${U.esc(p.profession)}${p.phone?` · 📞 ${U.esc(p.phone)}`:''}</span></div>
            <div class="meta">${p.jobs.length} รายการ</div>
          </div>
          <table class="p-tbl">
            <thead><tr><th style="width:18%">Project</th><th style="width:13%">วันที่</th><th style="width:22%">บริษัท</th><th style="width:17%">Station</th><th style="width:15%">วิชาชีพ</th><th style="text-align:right;width:15%">ค่าจ้าง</th></tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr><td colspan="5" style="text-align:right">รวมค่าจ้างของบุคคลนี้</td><td style="text-align:right;font-family:'IBM Plex Mono',monospace;color:#10B981;font-weight:800;font-size:13px">฿${U.fmt(p.totalWage)}</td></tr></tfoot>
          </table>
        </div>`;
      }).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>รายงานค่าจ้างรายบุคคล</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0;font-family:'Sarabun',sans-serif}
        @media print{ @page { size:A4; margin:10mm; } button{display:none!important} }
        body{padding:13mm;background:#FFFFFF;color:#1A2332;font-size:11.5px}
        .container{max-width:190mm;margin:0 auto}
        .header{background:linear-gradient(135deg,#0B2340,#1A3C65);color:#FFF;padding:13px 18px;border-radius:8px;margin-bottom:12px}
        .header h1{font-size:18px;font-weight:700;color:#FFF}
        .header p{font-size:11px;opacity:.92;color:#FFF}
        .meta-box{font-size:11px;color:#374151;margin-bottom:13px;padding:8px 12px;background:#F0FDF4;border-left:4px solid #10B981;border-radius:5px;line-height:1.6}
        .person-card{margin-bottom:11px;border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;page-break-inside:avoid}
        .person-card .hd{background:#F3F4F6;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0B2340}
        .person-card .hd .name{font-size:12px;font-weight:700;color:#0B2340}
        .person-card .hd .meta{font-size:10px;color:#6B7280;font-weight:600}
        .p-tbl{width:100%;border-collapse:collapse;font-size:10px}
        .p-tbl th{background:#FAFBFC;padding:6px 8px;text-align:left;font-size:9px;font-weight:700;color:#6B7280;border-bottom:1px solid #E5E7EB;text-transform:uppercase;letter-spacing:.3px}
        .p-tbl td{padding:6px 8px;border-bottom:1px solid #F3F4F6}
        .p-tbl tbody tr:nth-child(even) td{background:#FFFFFF}
        .p-tbl tfoot td{background:#F0FDF4;font-weight:700;color:#065F46;border-top:2px solid #10B981;font-size:11px}
        .grand{background:linear-gradient(135deg,#0B2340,#1A3C65);color:#FFF;padding:13px 18px;border-radius:7px;margin-top:13px;display:flex;justify-content:space-between;align-items:center}
        .grand .lbl{font-size:13px;font-weight:600;opacity:.9}
        .grand .val{font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:800}
        .footer{text-align:center;font-size:9.5px;color:#9CA3AF;margin-top:11px;font-weight:500}
        .print-btn{position:fixed;top:12px;right:12px;background:#0B2340;color:#FFF;border:0;padding:10px 18px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(0,0,0,.2);z-index:1000}
      </style>
      </head><body>
        <button class="print-btn" onclick="window.print()">🖨️ Print / Export PDF</button>
        <div class="container">
          <div class="header">
            <h1>👤 รายงานค่าจ้างรายบุคคล</h1>
            <p>Per-Person Payment Report · OcciCare Mobile Checkup System</p>
          </div>
          <div class="meta-box">
            📅 <strong>ช่วง:</strong> ${rangeText}
            · 👥 <strong>ประเภท:</strong> ${selTypes.join(', ')}
            · ✅ <strong>${persons.length}</strong> บุคคล · <strong>${totalRows}</strong> รายการ
          </div>
          ${personCards}
          <div class="grand">
            <span class="lbl">🎯 รวมทั้งหมด · ${persons.length} บุคคล · ${totalRows} รายการ</span>
            <span class="val">฿${U.fmt(grandTotal)}</span>
          </div>
          <div class="footer">© OcciCare Mobile Checkup System · พิมพ์เมื่อ ${today}</div>
        </div>
      </body></html>`;

      const w = window.open('', '_blank');
      w.document.write(html);
      w.document.close();
      setTimeout(()=>{ try{ w.print(); }catch(e){} }, 600);
    } catch(e){ U.toast('❌ Export PDF ผิดพลาด: '+e.message,'danger'); console.error(e); }
  },

  _exportPerPersonCSV(persons, from, to, selTypes){
    try{
      const today = new Date().toLocaleDateString('th-TH');
      const rangeText = from && to ? `${from} ถึง ${to}` : (from || to || 'ทั้งหมด');
      let csv = '\ufeff'; // UTF-8 BOM
      csv += `"รายงานค่าจ้างรายบุคคล","ช่วง: ${rangeText}","ประเภท: ${selTypes.join('|')}","พิมพ์: ${today}"\n\n`;
      csv += '"ชื่อ-สกุล","ตำแหน่ง","เบอร์","Project","วันที่","บริษัท","Station","วิชาชีพ","ประเภท","ค่าจ้าง"\n';
      let grand = 0;
      persons.forEach(p=>{
        const sortedJobs = p.jobs.slice().sort((a,b)=>{
          const dA = new Date(a.onsite_date||0);
          const dB = new Date(b.onsite_date||0);
          if(dA.getTime() !== dB.getTime()) return dA - dB;
          return (a.day_no||0) - (b.day_no||0);
        });
        sortedJobs.forEach(j=>{
          const projLabel = `${j.project_code}${j.day_no>0?` วันที่ ${j.day_no}`:''}`;
          csv += `"${p.full_name.replace(/"/g,'""')}","${p.profession.replace(/"/g,'""')}","${p.phone||''}","${projLabel}","${j.onsite_date||''}","${(j.company_name||'').replace(/"/g,'""')}","${(j.station_name||'').replace(/"/g,'""')}","${(j.profession||'').replace(/"/g,'""')}","${j.staff_type||''}",${j.wage}\n`;
          grand += j.wage;
        });
      });
      csv += `\n"-- รวมทั้งหมด --","","","","","","","","${persons.length} บุคคล",${grand}\n`;

      const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `รายงานค่าจ้างรายบุคคล_${(from||'all').replace(/-/g,'')}_${(to||'all').replace(/-/g,'')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      U.toast('✅ Export CSV สำเร็จ');
    } catch(e){ U.toast('❌ Export CSV ผิดพลาด: '+e.message,'danger'); console.error(e); }
  },

  viewDetail(joId){
    const jo=DB.operation.getJobOrderById(joId);
    if(!jo)return;
    const p=DB.sales.getProject(jo.project_id)||{};
    const sts=DB.operation.listStations(jo.id);
    const eqs=DB.operation.listEquipments(jo.id);
    const mp=DB.manpowerCost.list();
    // ใช้ _calcJob ที่ปรับใหม่ → ได้ ptPersons (1 entry ต่อคน)
    const {ptPersons, laborCost: laborTotal} = this._calcJob(jo);
    // Group ptPersons by station (เพื่อโชว์ rowspan สวยขึ้น)
    const personsByStation = {};
    ptPersons.forEach(p=>{
      const sid = p.station.id;
      if(!personsByStation[sid]) personsByStation[sid] = {station: p.station, persons: []};
      personsByStation[sid].persons.push(p);
    });
    const ptTable = Object.values(personsByStation).map(({station, persons})=>{
      return persons.map((p,i)=>{
        const cost = p.wage; // ต่อคน
        const isFirst = i === 0;
        return `<tr>
          ${isFirst?`<td rowspan="${persons.length}" style="vertical-align:middle">${U.esc(station.station_code||'')}</td>
          <td rowspan="${persons.length}" style="vertical-align:middle">${U.esc(station.station_name)}</td>`:''}
          <td>${U.esc(p.profession||'-')}</td>
          <td>${U.esc(p.staff_name||'-')}</td>
          <td style="text-align:center">1</td>
          <td style="text-align:right">฿${U.fmt(p.wage)}</td>
          <td style="text-align:right;font-weight:600">฿${U.fmt(cost)}</td>
        </tr>`;
      }).join('');
    }).join('');
    // In-org rows (สำหรับโชว์เฉยๆ ไม่คิดเงิน) — เช็คจาก staff_list หรือ legacy
    const inOrgPersons = [];
    sts.forEach(s=>{
      const list = s.staff_list || [];
      if(list.length > 0){
        list.forEach(p=>{
          if(!p.staff_type || !p.staff_type.toLowerCase().includes('part')){
            inOrgPersons.push({station: s, profession: p.profession||'', staff_name: p.staff_name||''});
          }
        });
      } else if(!s.staff_type || !s.staff_type.toLowerCase().includes('part')){
        inOrgPersons.push({station: s, profession: s.profession||'', staff_name: s.staff_name||''});
      }
    });
    let eqTotal=0;
    const eqTable=eqs.map(e=>{eqTotal+=(e.price||0);
      return`<tr><td colspan="4">${U.esc(e.item_name)}</td><td colspan="2" style="color:var(--t-muted)">${U.esc(e.remark||'-')}</td><td style="text-align:right;font-weight:600">฿${U.fmt(e.price||0)}</td></tr>`;
    }).join('');
    const grandTotal=laborTotal+eqTotal;
    const inOrgHtml=inOrgPersons.length?`<div style="margin-top:12px;padding:10px;background:rgba(255,255,255,.04);border-radius:8px;font-size:12px;color:var(--t-muted)">
      <div style="font-weight:500;margin-bottom:6px;color:var(--t-dim)">👥 พนักงานในองค์กร (ไม่คิดค่าใช้จ่าย) — ${inOrgPersons.length} คน</div>
      ${inOrgPersons.map(p=>`<div style="display:flex;gap:8px;padding:3px 0"><span>${U.esc(p.station.station_name)}</span><span>—</span><span>${U.esc(p.profession||'')}</span><span>${U.esc(p.staff_name||'-')}</span></div>`).join('')}
    </div>`:'';
    Modal.open(`
    <div style="background:var(--s-2);border-radius:9px;padding:12px 14px;margin-bottom:14px">
      <div class="fw6 mono" style="color:var(--c-gold-lt,#E2C46A)">${U.esc(p.project_code||'-')}</div>
      <div class="fw6" style="font-size:15px">${U.esc(p.company_name||jo.company_name||'-')}</div>
      <div class="t-sm t-muted">วันตรวจ: ${U.fmtD(p.onsite_date)} | ${(p.headcount||0).toLocaleString()} คน</div>
    </div>
    ${ptPersons.length?`
    <div style="font-size:12px;font-weight:600;color:var(--t-dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">💼 ค่าแรง Part-time</div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Code</th><th>Station</th><th>วิชาชีพ</th><th>ชื่อ</th><th style="text-align:center">คน</th><th style="text-align:right">ราคา/วัน</th><th style="text-align:right">รวม</th></tr></thead>
      <tbody>${ptTable}</tbody>
      <tfoot><tr><td colspan="6" class="fw6">รวมค่าแรง</td><td style="text-align:right;font-weight:700">฿${U.fmt(laborTotal)}</td></tr></tfoot>
    </table></div>`:'<div style="padding:12px;color:var(--t-muted);font-size:13px">ไม่มีพนักงาน Part-time</div>'}
    ${eqs.length?`
    <div style="font-size:12px;font-weight:600;color:var(--t-dim);text-transform:uppercase;letter-spacing:.06em;margin:14px 0 8px">🔧 เช่าอุปกรณ์</div>
    <div class="tbl-wrap"><table>
      <thead><tr><th colspan="4">รายการ</th><th colspan="2">หมายเหตุ</th><th style="text-align:right">ราคา</th></tr></thead>
      <tbody>${eqTable}</tbody>
      <tfoot><tr><td colspan="6" class="fw6">รวมค่าเช่า</td><td style="text-align:right;font-weight:700">฿${U.fmt(eqTotal)}</td></tr></tfoot>
    </table></div>`:''}
    ${inOrgHtml}
    <div style="margin-top:14px;padding:12px 16px;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);border-radius:9px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-weight:600;font-size:14px">ยอดรวมทั้งสิ้น</span>
      <span style="font-size:22px;font-weight:800;color:var(--c-gold-lt,#E2C46A)">฿${U.fmt(grandTotal)}</span>
    </div>`,
    `รายงานค่าใช้จ่าย — ${p.project_code||''}`, null);
  },

  _toggleAllProfs(checked){
    document.querySelectorAll('.ex-prof-cb').forEach(cb=>{
      cb.checked=checked;
      Pages.op_report._updateProfStyle(cb);
    });
  },
  _updateProfStyle(cb){
    const lbl=cb.closest('label');
    if(!lbl)return;
    if(cb.checked){
      lbl.style.borderColor='rgba(14,159,110,.35)';
      lbl.style.background='rgba(14,159,110,.12)';
      lbl.querySelector('span').style.color='#6EE7B7';
    } else {
      lbl.style.borderColor='rgba(255,255,255,.1)';
      lbl.style.background='rgba(255,255,255,.04)';
      lbl.querySelector('span').style.color='var(--t-muted)';
    }
    // Update "select all" checkbox
    const all=document.querySelectorAll('.ex-prof-cb');
    const allEl=document.getElementById('ex_prof_all');
    if(allEl)allEl.checked=[...all].every(c=>c.checked);
  },

  exportDialog(){
    const jos=DB.operation.listJobOrders();
    const projs=jos.map(jo=>{const p=DB.sales.getProject(jo.project_id)||{};return{id:jo.id,label:`${p.project_code||'-'} — ${p.company_name||jo.company_name||'-'} (${U.fmtD(p.onsite_date)})`,onsite_date:p.onsite_date||''};});
    const projOpts=projs.map(p=>`<option value="${p.id}">${U.esc(p.label)}</option>`).join('');
    // Default mode
    if(!this._exportMode) this._exportMode = 'project';
    Modal.open(`
    <div style="font-size:12px;font-weight:600;color:var(--t-dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:9px">📋 รูปแบบรายงาน</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <button id="ex_mode_project" onclick="Pages.op_report._setMode('project')"
        style="padding:11px 12px;border:1.5px solid ${this._exportMode==='project'?'#F0CD7F':'rgba(255,255,255,.15)'};background:${this._exportMode==='project'?'linear-gradient(180deg,#F0CD7F,#D4A845)':'#162338'};color:${this._exportMode==='project'?'#1A1A1A':'#FFFFFF'};border-radius:7px;cursor:pointer;font-family:inherit;font-weight:600;font-size:13px;text-align:center;transition:all .15s">
        <div style="font-size:18px;margin-bottom:3px">📊</div>ตาม Project
        <div style="font-size:10px;font-weight:500;margin-top:2px;color:${this._exportMode==='project'?'rgba(0,0,0,.65)':'rgba(255,255,255,.6)'}">รวมตามใบแจ้งงาน</div>
      </button>
      <button id="ex_mode_person" onclick="Pages.op_report._setMode('person')"
        style="padding:11px 12px;border:1.5px solid ${this._exportMode==='person'?'#F0CD7F':'rgba(255,255,255,.15)'};background:${this._exportMode==='person'?'linear-gradient(180deg,#F0CD7F,#D4A845)':'#162338'};color:${this._exportMode==='person'?'#1A1A1A':'#FFFFFF'};border-radius:7px;cursor:pointer;font-family:inherit;font-weight:600;font-size:13px;text-align:center;transition:all .15s">
        <div style="font-size:18px;margin-bottom:3px">👤</div>รายบุคคล
        <div style="font-size:10px;font-weight:500;margin-top:2px;color:${this._exportMode==='person'?'rgba(0,0,0,.65)':'rgba(255,255,255,.6)'}">รวมตามคน — ดูว่าใครได้กี่บาทรวม</div>
      </button>
    </div>
    <div style="font-size:12px;font-weight:600;color:var(--t-dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:9px">📅 ช่วงข้อมูล</div>
    <div class="tabs" style="margin-bottom:14px">
      <div class="tab active" onclick="switchTab(this,'ex_t1')">📅 ช่วงวันที่</div>
      <div class="tab" onclick="switchTab(this,'ex_t2')">📋 เลือก Project</div>
    </div>
    <div id="ex_t1" class="tp active">
      <div class="fr">
        <div class="fg"><label>วันที่เริ่มต้น</label><input id="ex_from" type="date"/></div>
        <div class="fg"><label>วันที่สิ้นสุด</label><input id="ex_to" type="date" value="${new Date().toISOString().substr(0,10)}"/></div>
      </div>
    </div>
    <div id="ex_t2" class="tp">
      <div class="fg"><label>เลือก Project / ใบแจ้งงาน</label>
        <select id="ex_proj" style="font-size:13px">
          <option value="">-- ทุก Project --</option>
          ${projOpts}
        </select>
      </div>
    </div>
    <div class="divider" style="margin:12px 0 8px"></div>
    <div style="font-size:12px;font-weight:600;color:var(--t-dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">🏷️ เลือกประเภท (เลือกได้หลายประเภท)</div>
    <div style="background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2);border-radius:10px;padding:12px 14px">
      <label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:8px;cursor:pointer">
        <input type="checkbox" id="ex_type_all" checked
          style="width:18px;height:18px;accent-color:#C9A84C;cursor:pointer;flex-shrink:0"
          onchange="Pages.op_report._toggleAllTypes(this.checked)"/>
        <span style="font-size:13px;font-weight:700;color:var(--c-gold-lt,#E2C46A)">เลือกทั้งหมด</span>
      </label>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
        <label style="display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:8px;border:1.5px solid rgba(201,168,76,.35);background:rgba(201,168,76,.12);cursor:pointer;transition:all .18s" data-type-label="ในองค์กร">
          <input type="checkbox" class="ex-type-cb" value="ในองค์กร" checked
            style="width:16px;height:16px;accent-color:#C9A84C;cursor:pointer;flex-shrink:0"
            onchange="Pages.op_report._updateTypeStyle(this)"/>
          <span style="flex:1;font-size:12px;font-weight:600;color:var(--c-gold-lt,#E2C46A)">🏢 ในองค์กร</span>
        </label>
        <label style="display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:8px;border:1.5px solid rgba(201,168,76,.35);background:rgba(201,168,76,.12);cursor:pointer;transition:all .18s" data-type-label="Part-time">
          <input type="checkbox" class="ex-type-cb" value="Part-time" checked
            style="width:16px;height:16px;accent-color:#C9A84C;cursor:pointer;flex-shrink:0"
            onchange="Pages.op_report._updateTypeStyle(this)"/>
          <span style="flex:1;font-size:12px;font-weight:600;color:var(--c-gold-lt,#E2C46A)">👥 Part-time</span>
        </label>
        <label style="display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:8px;border:1.5px solid rgba(201,168,76,.35);background:rgba(201,168,76,.12);cursor:pointer;transition:all .18s" data-type-label="Out Source">
          <input type="checkbox" class="ex-type-cb" value="Out Source" checked
            style="width:16px;height:16px;accent-color:#C9A84C;cursor:pointer;flex-shrink:0"
            onchange="Pages.op_report._updateTypeStyle(this)"/>
          <span style="flex:1;font-size:12px;font-weight:600;color:var(--c-gold-lt,#E2C46A)">🌐 Out Source</span>
        </label>
      </div>
    </div>
    <div class="divider" style="margin:12px 0 8px"></div>
    <div class="btn-grp" style="justify-content:center;gap:12px">
      <button class="btn btn-pri" onclick="Pages.op_report._doExport('pdf')" style="min-width:140px">
        🖨️ Export PDF (A4)
      </button>
      <button class="btn btn-out" onclick="Pages.op_report._doExport('csv')" style="min-width:140px">
        📊 Export Excel (.csv)
      </button>
    </div>`,
    'Export รายงานสรุปค่าใช้จ่าย', null);
  },

  _setMode(mode){
    this._exportMode = mode;
    Modal.close();
    setTimeout(()=>this.exportDialog(), 50);
  },
  _toggleAllTypes(checked){
    document.querySelectorAll('.ex-type-cb').forEach(cb=>{cb.checked=checked;Pages.op_report._updateTypeStyle(cb);});
  },
  _updateTypeStyle(cb){
    const lbl=cb.closest('label');
    if(!lbl)return;
    if(cb.checked){
      lbl.style.borderColor='rgba(201,168,76,.35)';
      lbl.style.background='rgba(201,168,76,.12)';
      lbl.querySelector('span').style.color='var(--c-gold-lt,#E2C46A)';
    } else {
      lbl.style.borderColor='rgba(255,255,255,.1)';
      lbl.style.background='rgba(255,255,255,.04)';
      lbl.querySelector('span').style.color='var(--t-muted)';
    }
    const all=document.querySelectorAll('.ex-type-cb');
    const allEl=document.getElementById('ex_type_all');
    if(allEl)allEl.checked=[...all].every(c=>c.checked);
  },

  _doExport(type){
    // อ่านจาก tab ที่ active
    const tab1=document.getElementById('ex_t1');
    const tab2=document.getElementById('ex_t2');
    const isDateTab=tab1&&tab1.classList.contains('active');
    const isProjTab=tab2&&tab2.classList.contains('active');
    const fromDate=(isDateTab&&document.getElementById('ex_from')?.value)||'';
    const toDate=(isDateTab&&document.getElementById('ex_to')?.value)||'';
    const selProj=(isProjTab&&document.getElementById('ex_proj')?.value)||'';
    // เลือกประเภท (ในองค์กร / Part-time / Out Source)
    const checkedTypes=[...document.querySelectorAll('.ex-type-cb:checked')];
    const selTypes=checkedTypes.length>0?checkedTypes.map(c=>c.value):['ในองค์กร','Part-time','Out Source'];
    const jos=DB.operation.listJobOrders();
    let filtered=jos;
    if(selProj){
      filtered=jos.filter(jo=>String(jo.id)===String(selProj));
    } else if(fromDate||toDate){
      filtered=jos.filter(jo=>{
        const p=DB.sales.getProject(jo.project_id)||{};
        const d=p.onsite_date||'';
        if(fromDate&&d<fromDate)return false;
        if(toDate&&d>toDate)return false;
        return true;
      });
    }
    if(!filtered.length){U.toast('⚠ ไม่พบข้อมูลให้ Export — ลองปรับเงื่อนไข','warning');return;}
    if(!selTypes.length){U.toast('⚠ กรุณาเลือกประเภทอย่างน้อย 1 รายการ','warning');return;}
    // Route by mode
    if(this._exportMode === 'person'){
      const persons = this._aggregatePersons(filtered, selTypes);
      if(persons.length === 0){U.toast('⚠ ไม่พบบุคคลตามเงื่อนไข','warning');return;}
      if(type==='pdf') this._exportPerPersonPDF(persons, fromDate, toDate, selTypes);
      else this._exportPerPersonCSV(persons, fromDate, toDate, selTypes);
    } else {
      if(type==='pdf') this._exportPDF(filtered, fromDate, toDate, selTypes);
      else this._exportCSV(filtered, fromDate, toDate, selTypes);
    }
  },

  // ─── Aggregate persons from JOs (group by ชื่อ-สกุล + วิชาชีพ) ───
  _aggregatePersons(jos, selTypes){
    const mp = DB.manpowerCost.list();
    const matchType=(st)=>{
      const t=(st||'').trim();
      return selTypes.some(sel=>{
        const s=sel.trim();
        if(s==='Part-time') return t.toLowerCase().includes('part');
        if(s==='Out Source') return t.toLowerCase().includes('out');
        if(s==='ในองค์กร') return t==='ในองค์กร'||t.toLowerCase().includes('inhouse')||t.toLowerCase().includes('in-house');
        return t===s;
      });
    };
    // Map: "name|profession" → {full_name, profession, phone, jobs: [...], totalWage}
    const personsMap = {};
    jos.forEach(jo=>{
      const proj = DB.sales.getProject(jo.project_id) || {};
      const sts = DB.operation.listStations(jo.id);
      const projectInfo = {
        project_code: proj.project_code || `JO-${jo.id}`,
        company_name: proj.company_name || jo.company_name || '-',
        onsite_date: jo.onsite_date || proj.onsite_date || '',
        day_no: jo.day_no || 0,
        total_days: jo.total_days || 1
      };
      sts.forEach(s=>{
        const list = s.staff_list || [];
        if(list.length > 0){
          list.forEach(p=>{
            if(!matchType(p.staff_type)) return;
            if(!p.staff_name || !p.staff_name.trim()) return; // skip empty
            const name = p.staff_name.trim();
            const profession = (p.profession||'-').trim();
            const key = `${name.toLowerCase()}|${profession.toLowerCase()}`;
            let wage = p.wage_per_day;
            if(wage===undefined||wage===null||wage===''){
              const r=mp.find(m=>m.role===p.profession);
              wage=r?r.cost_per_day:0;
            }
            wage = parseFloat(wage)||0;
            if(!personsMap[key]){
              personsMap[key] = {
                full_name: name, profession, phone: p.phone||'',
                jobs: [], totalWage: 0
              };
            }
            personsMap[key].jobs.push({
              ...projectInfo,
              station_name: s.station_name||'-',
              station_code: s.station_code||'',
              profession: profession,
              staff_type: p.staff_type||'',
              wage: wage
            });
            personsMap[key].totalWage += wage;
          });
        } else if(matchType(s.staff_type)){
          // Legacy fallback
          if(!s.staff_name||!s.staff_name.trim()) return;
          const name = s.staff_name.trim();
          const profession = (s.profession||'-').trim();
          const key = `${name.toLowerCase()}|${profession.toLowerCase()}`;
          let wage = s.wage_per_day;
          if(wage===undefined||wage===null||wage===''){
            const r=mp.find(m=>m.role===s.profession);
            wage=r?r.cost_per_day:0;
          }
          wage = parseFloat(wage)||0;
          if(!personsMap[key]){
            personsMap[key] = {
              full_name: name, profession, phone: s.phone||'',
              jobs: [], totalWage: 0
            };
          }
          personsMap[key].jobs.push({
            ...projectInfo,
            station_name: s.station_name||'-',
            station_code: s.station_code||'',
            profession: profession,
            staff_type: s.staff_type||'',
            wage: wage
          });
          personsMap[key].totalWage += wage;
        }
      });
    });
    // Sort: by total wage desc
    return Object.values(personsMap).sort((a,b)=>b.totalWage - a.totalWage);
  },

  // คำนวณค่าใช้จ่ายตามประเภท (array of staff_type filter)
  _calcByTypes(jo,selTypes){
    const sts=DB.operation.listStations(jo.id);
    const eqs=DB.operation.listEquipments(jo.id);
    const mp=DB.manpowerCost.list();
    // Match staff_type with selected types (normalize case)
    const matchType=(st)=>{
      const t=(st||'').trim();
      return selTypes.some(sel=>{
        const s=sel.trim();
        if(s==='Part-time')return t.toLowerCase().includes('part');
        if(s==='Out Source')return t.toLowerCase().includes('out');
        if(s==='ในองค์กร')return t==='ในองค์กร'||t.toLowerCase().includes('inhouse')||t.toLowerCase().includes('in-house');
        return t===s;
      });
    };
    // Iterate staff_list[] per person — modern format
    const personList = [];
    sts.forEach(s=>{
      const list = s.staff_list || [];
      if(list.length > 0){
        list.forEach(p=>{
          if(!matchType(p.staff_type)) return;
          let wage = p.wage_per_day;
          if(wage===undefined||wage===null||wage===''){
            const r=mp.find(m=>m.role===p.profession);
            wage=r?r.cost_per_day:0;
          }
          personList.push({
            station: s,
            profession: p.profession||'-',
            staff_name: p.staff_name||'-',
            staff_type: p.staff_type||'',
            phone: p.phone||'',
            remark: p.remark||'',
            wage: parseFloat(wage)||0
          });
        });
      } else if(matchType(s.staff_type)){
        // Legacy fallback: station-level fields
        let wage = s.wage_per_day;
        if(wage===undefined||wage===null||wage===''){
          const r=mp.find(m=>m.role===s.profession||m.role===s.staff_name);
          wage=r?r.cost_per_day:0;
        }
        wage=parseFloat(wage)||0;
        const cnt = parseInt(s.staff_count)||1;
        for(let i=0;i<cnt;i++){
          personList.push({
            station: s,
            profession: s.profession||'-',
            staff_name: i===0?(s.staff_name||'-'):'',
            staff_type: s.staff_type||'',
            phone: s.phone||'',
            remark: '',
            wage
          });
        }
      }
    });
    const laborCost = personList.reduce((sum,p)=>sum+p.wage, 0);
    const eqCost = eqs.reduce((sum,e)=>sum+(e.price||0), 0);
    // Backward compat: filteredSts = stations that have any matching person
    const stationIds = new Set(personList.map(p=>p.station.id));
    const filteredSts = sts.filter(s=>stationIds.has(s.id));
    return{filteredSts, personList, laborCost, eqCost, total: laborCost+eqCost};
  },

  _exportCSV(jos,from,to,selTypes){
    const title=from||to?`ช่วงวันที่ ${from||'-'} ถึง ${to||'-'}`:(jos.length===1?'Project เดียว':'ทุก Project');
    const typeLabel=`ประเภท: ${selTypes.join(', ')}`;
    let csv='\ufeff';
    csv+=`"รายงานสรุปค่าใช้จ่าย Operation — ${title}"\n`;
    csv+=`"${typeLabel}"\n`;
    csv+=`"สร้างเมื่อ: ${new Date().toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}"\n\n`;
    csv+='Project Code,บริษัท,วันตรวจ,จำนวนคน,ค่าแรง (บาท),เช่าอุปกรณ์ (บาท),รวม (บาท),สถานะ\n';
    let grand=0;
    jos.forEach(jo=>{
      const p=DB.sales.getProject(jo.project_id)||{};
      const {personList,laborCost,eqCost,total}=this._calcByTypes(jo,selTypes);
      const isComplete=['Lab','Report','Billing','Completed'].includes(p.status||'');
      grand+=total;
      csv+=`"${p.project_code||'-'}","${(p.company_name||jo.company_name||'-').replace(/"/g,'""')}","${p.onsite_date||'-'}",${personList.length},${laborCost},${eqCost},${total},"${isComplete?'Complete':'Onsite'}"\n`;
    });
    csv+=`\n"รวมทั้งหมด",,,,,,"${grand}",""\n`;
    csv+='\n"รายละเอียดพนักงานแต่ละ Project"\n';
    csv+='Project,Station,วิชาชีพ,ชื่อ-สกุล,ประเภท,คน,ค่าแรง/วัน (บาท),รวม (บาท)\n';
    const mp=DB.manpowerCost.list();
    jos.forEach(jo=>{
      const p=DB.sales.getProject(jo.project_id)||{};
      const {personList}=this._calcByTypes(jo,selTypes);
      personList.forEach(person=>{
        const cost = person.wage;
        csv+=`"${p.project_code||'-'}","${(person.station.station_name||'').replace(/"/g,'""')}","${person.profession||'-'}","${(person.staff_name||'-').replace(/"/g,'""')}","${person.staff_type||''}",1,${person.wage},${cost}\n`;
      });
    });
    try{
      const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=from?`Report_${from}_${to||'now'}.csv`:(jos.length===1?`Report_${jos[0].id}.csv`:'Report_all.csv');
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url),2000);
      Modal.close();
      U.toast(`✅ Export Excel สำเร็จ (${jos.length} งาน)`);
    }catch(e){U.toast('❌ Export ผิดพลาด: '+e.message,'danger');console.error(e);}
  },

  _exportPDF(jos,from,to,selTypes){
    const mp=DB.manpowerCost.list();
    const TH='padding:5px 8px;border:1px solid #E5E7EB;font-weight:600;text-align:left';
    const TD='padding:5px 8px;border:1px solid #E5E7EB';
    const title=from||to?`ช่วงวันที่ ${from||'-'} ถึง ${to||'-'}`:(jos.length===1?'Project เดียว':'ทุก Project');
    const typeLabel=`ประเภท: ${selTypes.join(', ')}`;
    const today=new Date().toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'});
    let grandTotal=0;
    const summaryRows=jos.map(jo=>{
      const p=DB.sales.getProject(jo.project_id)||{};
      const {filteredSts,personList,laborCost,eqCost,total}=this._calcByTypes(jo,selTypes);
      grandTotal+=total;
      const isComplete=['Lab','Report','Billing','Completed'].includes(p.status||'');
      return`<tr>
        <td>${p.project_code||'-'}</td>
        <td>${p.company_name||jo.company_name||'-'}</td>
        <td style="text-align:center">${p.onsite_date||'-'}</td>
        <td style="text-align:center">${personList.length}</td>
        <td style="text-align:right">${U.fmt(laborCost)}</td>
        <td style="text-align:right">${U.fmt(eqCost)}</td>
        <td style="text-align:right;font-weight:700">${U.fmt(total)}</td>
        <td style="text-align:center"><span style="font-size:10px;padding:1px 6px;border-radius:3px;background:${isComplete?'#D1FAE5':'#FEF3C7'};color:${isComplete?'#065F46':'#92400E'}">${isComplete?'Complete':'Onsite'}</span></td>
      </tr>`;
    }).join('');
    let detailHTML='';
    jos.forEach(jo=>{
      const p=DB.sales.getProject(jo.project_id)||{};
      const {filteredSts, personList}=this._calcByTypes(jo,selTypes);
      const eqs=DB.operation.listEquipments(jo.id);
      if(!personList.length&&!eqs.length)return;
      let labSum=0;
      // Group persons by station
      const groupByStation = {};
      personList.forEach(p=>{
        const sid = p.station.id;
        if(!groupByStation[sid]) groupByStation[sid] = {station: p.station, persons: []};
        groupByStation[sid].persons.push(p);
      });
      const ptRows = Object.values(groupByStation).map(({station, persons})=>{
        return persons.map((p,i)=>{
          const cost = p.wage; // ต่อคน
          labSum += cost;
          const isFirst = (i === 0);
          return `<tr>
            ${isFirst?`<td rowspan="${persons.length}" style="vertical-align:middle">${station.station_name||'-'}</td>`:''}
            <td>${p.profession||'-'}</td>
            <td>${p.staff_name||'-'}</td>
            <td style="text-align:center">${p.staff_type||'-'}</td>
            <td style="text-align:center">1</td>
            <td style="text-align:right">${U.fmt(p.wage)}</td>
            <td style="text-align:right">${U.fmt(cost)}</td>
          </tr>`;
        }).join('');
      }).join('');
      let eqSum=0;
      const eqRows=eqs.map(e=>{eqSum+=(e.price||0);return`<tr><td colspan="5">${e.item_name||'-'}</td><td style="color:#6B7280">${e.remark||'-'}</td><td style="text-align:right">${U.fmt(e.price||0)}</td></tr>`;}).join('');
      detailHTML+=`
      <div style="margin-top:12px;border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;page-break-inside:avoid">
        <div style="background:#1E3A5F;color:#fff;padding:6px 12px;font-weight:700;font-size:12px;display:flex;justify-content:space-between">
          <span>${p.project_code||'-'} — ${p.company_name||'-'}</span>
          <span>วันตรวจ: ${p.onsite_date||'-'}</span>
        </div>
        ${filteredSts.length?`<table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr style="background:#F3F4F6"><th style="${TH}">Station</th><th style="${TH}">วิชาชีพ</th><th style="${TH}">ชื่อ-สกุล</th><th style="${TH};text-align:center">ประเภท</th><th style="${TH};text-align:center">คน</th><th style="${TH};text-align:right">ราคา/วัน</th><th style="${TH};text-align:right">รวม</th></tr></thead>
          <tbody>${ptRows}</tbody>
          <tfoot><tr style="background:#F9FAFB"><td colspan="6" style="${TD};font-weight:700">รวมค่าแรง</td><td style="${TD};text-align:right;font-weight:700">฿${U.fmt(labSum)}</td></tr></tfoot>
        </table>`:''}
        ${eqs.length?`<table style="width:100%;border-collapse:collapse;font-size:11px;border-top:1px solid #E5E7EB">
          <thead><tr style="background:#F3F4F6"><th colspan="5" style="${TH}">เช่าอุปกรณ์</th><th style="${TH}">หมายเหตุ</th><th style="${TH};text-align:right">ราคา</th></tr></thead>
          <tbody>${eqRows}</tbody>
          <tfoot><tr style="background:#F9FAFB"><td colspan="6" style="${TD};font-weight:700">รวมค่าเช่า</td><td style="${TD};text-align:right;font-weight:700">฿${U.fmt(eqSum)}</td></tr></tfoot>
        </table>`:''}
      </div>`;
    });
    const html=`<!DOCTYPE html><html lang="th"><head><meta charset="utf-8">
    <title>รายงานค่าใช้จ่าย</title>
    <style>
      @page{size:A4 landscape;margin:12mm 10mm 12mm 10mm}
      body{font-family:'Sarabun','TH Sarabun New',sans-serif;font-size:12px;color:#1A2332;margin:0}
      table{width:100%;border-collapse:collapse}
      th,td{padding:5px 8px;border:1px solid #CBD5E1;font-size:11px}
      thead tr{background:#1E3A5F;color:#fff}
      tfoot tr{background:#F1F5F9}
      tr:nth-child(even) td{background:#F8FAFC}
      .total-box{background:#1E3A5F;color:#fff;padding:10px 16px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;margin-top:14px}
    </style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;border-bottom:3px solid #1E3A5F;padding-bottom:8px">
      <div>
        <div style="font-size:16px;font-weight:800;color:#1E3A5F">รายงานสรุปค่าใช้จ่าย — Operation</div>
        <div style="font-size:11px;color:#6B7280;margin-top:2px">${title}</div>
        <div style="font-size:10px;color:#9CA3AF;margin-top:1px">${typeLabel}</div>
      </div>
      <div style="text-align:right;font-size:10px;color:#6B7280">
        <div>OcciCare Mobile Checkup</div>
        <div>พิมพ์: ${today}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Project Code</th><th>บริษัท</th><th style="text-align:center">วันตรวจ</th><th style="text-align:center">จำนวนคน</th><th style="text-align:right">ค่าแรง (฿)</th><th style="text-align:right">เช่าอุปกรณ์ (฿)</th><th style="text-align:right">รวม (฿)</th><th style="text-align:center">สถานะ</th></tr></thead>
      <tbody>${summaryRows||'<tr><td colspan="8" style="text-align:center;padding:16px;color:#6B7280">ไม่พบข้อมูล</td></tr>'}</tbody>
      <tfoot><tr><td colspan="6" style="font-weight:800;font-size:13px">รวมทั้งหมด ${jos.length} งาน</td><td style="text-align:right;font-weight:800;font-size:14px">฿${U.fmt(grandTotal)}</td><td></td></tr></tfoot>
    </table>
    <div style="margin-top:16px;font-size:12px;font-weight:700;color:#1E3A5F;border-bottom:2px solid #1E3A5F;padding-bottom:4px;margin-bottom:8px">รายละเอียดค่าใช้จ่ายต่อ Project</div>
    ${detailHTML}
    <div class="total-box">
      <span style="font-size:14px;font-weight:700">ยอดรวมทั้งสิ้น (${selTypes.join(' + ')} + เช่าอุปกรณ์)</span>
      <span style="font-size:22px;font-weight:900">฿${U.fmt(grandTotal)}</span>
    </div>
    </body></html>`;
    try{
      const blob=new Blob([html],{type:'text/html;charset=utf-8'});
      const url=URL.createObjectURL(blob);
      const oldFr=document.getElementById('pdf_print_frame');
      if(oldFr)oldFr.remove();
      const fr=document.createElement('iframe');
      fr.id='pdf_print_frame';
      fr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:none;visibility:hidden';
      fr.src=url;
      document.body.appendChild(fr);
      fr.onload=()=>{
        setTimeout(()=>{
          try{fr.contentWindow.focus();fr.contentWindow.print();}
          catch(e){const w=window.open(url,'_blank');if(!w)U.toast('⚠ กรุณาอนุญาต popup','warning');}
          setTimeout(()=>URL.revokeObjectURL(url),60000);
        },400);
      };
      Modal.close();
      U.toast(`✅ เปิดหน้าพิมพ์ PDF (${jos.length} งาน)`);
    }catch(e){U.toast('❌ Export PDF ผิดพลาด: '+e.message,'danger');console.error(e);}
  },
};
/* ── DASHBOARD ── */
Pages.dashboard={
  _filter:'all',
  async render(){
  const projs=DB.sales.listProjects();
  const invs=DB.billing.listInvoices();
  const allAlerts=DB.checkAlerts();
  // ─── Filter alerts by current user's role permissions ───
  // Category → required module mapping
  const categoryToModule = {
    'TAT-Lab':     'lab',
    'SLA-Report':  'report',
    'Billing':     'billing',
    'Onsite':      'op_onsite',
    'X-Ray':       'xray',
    'OPD':         'opd',
    'Medical':     'medical',
    'CRM':         'customers',
    'Quotation':   'sales',
    'Sales':       'sales',
    'Op-Prep':     'op_prep',
    'PT':          'parttime'
  };
  const alerts = allAlerts.filter(a=>{
    const cat = a.category || '';
    // ไม่มี category mapping → admin เท่านั้น (กรณีไม่รู้)
    const mod = categoryToModule[cat];
    if(!mod){
      // ดูจาก type 'danger'/'warning' — ทุก role เห็น
      return DB.auth.can('view','dashboard');
    }
    return DB.auth.can('view', mod);
  });
  const rev=invs.reduce((s,i)=>s+(i.revenue||0),0);
  const prf=invs.reduce((s,i)=>s+(i.profit||0),0);
  const pend=invs.filter(i=>i.status==='Pending');
  const sc={};projs.forEach(p=>{sc[p.status]=(sc[p.status]||0)+1;});
  let aHtml=alerts.length?`<div class="card mb4">
    <div class="card-header">
      <span class="card-title">🔔 ระบบแจ้งเตือน (${alerts.length})</span>
      <div class="t-sm t-muted">รายการที่ต้องดำเนินการ</div>
    </div>
    <div style="padding:12px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
    ${alerts.map(a=>`<div class="ab ${a.type}" style="margin:0;border-radius:9px;border-left-width:4px;align-items:flex-start">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;flex-wrap:wrap">
          <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 7px;border-radius:4px;background:rgba(255,255,255,.08);white-space:nowrap">${a.category||a.type}</span>
          <span class="fw6" style="font-size:13px">${a.title||a.msg}</span>
        </div>
        ${a.msg&&a.title?`<div style="font-size:12px;font-weight:600;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis">${a.msg}</div>`:''}
        ${a.detail?`<div style="font-size:11px;color:var(--t-muted);margin-bottom:3px;line-height:1.5">${a.detail}</div>`:''}
        ${a.action?`<div style="font-size:10px;font-weight:700;color:var(--c-gold-lt,#E2C46A)">📌 ${a.action}</div>`:''}
      </div>
      ${a.project_id?`<button class="btn btn-out btn-xs" onclick="(()=>{const p=DB.sales.getProject(${a.project_id});if(p){U.toast('Project: '+p.project_code);}})()" style="margin-left:6px;flex-shrink:0">ดู</button>`:''}
    </div>`).join('')}
    </div>
  </div>`:'';
  const statusOpts=['all',...STATUS_FLOW].map(s=>`<option value="${s}" ${this._filter===s?'selected':''}>${s==='all'?'ทุกสถานะ':s}</option>`).join('');
  const filtered=this._filter==='all'?projs.slice().reverse():projs.slice().reverse().filter(p=>p.status===this._filter);
  // Build NEW workflow cards — Department-based progress (Sales, Report, เวชระเบียน, Operation, Lab, X-Ray, Billing, OPD)
  const wfCards=filtered.map(p=>{
    const jo=DB.operation.getJobOrder(p.id);
    const lp=DB.lab.getLabProject(p.id);
    const rp=DB.report.getPlan(p.id);
    const inv=DB.billing.getInvoice(p.id);
    const h=DB.sales.getHandover(p.id);
    const xrayData = DB.xray ? DB.xray.getMeta(p.id) : null;
    const medMeta = DB.medical ? DB.medical.getMeta(p.id) : {};
    const ckl = DB.checklist ? DB.checklist.getByProject(p.id) : {};
    const cklDone = Object.keys(ckl).filter(k=>!k.endsWith('_note')&&ckl[k]).length;
    const cklTotal = Pages.config_checklist ? Pages.config_checklist.getActive().length : 10;
    const stationCk = DB.station_checklist ? DB.station_checklist.getForProject(p.id) : null;
    const rpMeta = (()=>{try{return JSON.parse(localStorage.getItem('rp_meta_'+p.id)||'{}');}catch{return {};}})();
    const opdMeta = (()=>{try{return JSON.parse(localStorage.getItem('opd_meta_'+p.id)||'null');}catch{return null;}})();
    const onsiteLogs = DB.operation.listOnsiteLogs(p.id);
    const hasMissing = onsiteLogs.some(l=>(l.missing||0)>0);
    const cust = DB.customer.getCustomer(p.customer_id);
    const isWalkin = cust && (cust.job_type2==='Walkin' || cust.exam_location==='Walk in');
    const isClosed = ['Closed','Onsite','Lab','Report','Billing','Completed'].includes(p.status);
    const dueDateOverdue = p.due_date && new Date(p.due_date) < new Date() && !['Completed'].includes(p.status);
    const fmtRel = (d) => d ? U.fmtD(d) : '—';

    // Helper: build department object
    // Steps: [{label, done, date}]
    // Returns: {key, name, icon, iconClass, fillClass, steps, currentStep, status, lastDate, hidden}
    const mkDept = (key, name, icon, iconClass, fillClass, steps, hidden=false) => {
      const doneSteps = steps.filter(s=>s.done);
      const doneCount = doneSteps.length;
      const total = steps.length;
      const firstPending = steps.find(s=>!s.done);
      const isAllDone = doneCount === total && total > 0;
      const isIdle = doneCount === 0;
      const isActive = doneCount > 0 && !isAllDone;
      let status = 'idle';
      let currentText = 'ยังไม่เริ่ม';
      if(isAllDone){ status='done'; currentText='<strong>✓ จบงาน</strong>'; }
      else if(isActive){ status='active'; currentText='กำลัง<strong>'+(firstPending?firstPending.label:'-')+'</strong>'; }
      else if(!isIdle){ status='wait'; currentText='รอ<strong>'+(firstPending?firstPending.label:'-')+'</strong>'; }
      else { currentText='รอ<strong>'+(firstPending?firstPending.label:'-')+'</strong>'; }
      // Last activity date — latest date among done steps
      const lastDate = doneSteps.length>0 ? doneSteps.reduce((latest,s)=>{
        if(!s.date) return latest;
        if(!latest) return s.date;
        return new Date(s.date) > new Date(latest) ? s.date : latest;
      }, null) : null;
      // Overdue check (Report only) — if due_date passed and not done
      if(key==='report' && dueDateOverdue && !isAllDone) status='overdue';
      return {key, name, icon, iconClass, fillClass, doneCount, total, status, currentText, lastDate, hidden, pct: total>0 ? Math.round(doneCount/total*100) : 0};
    };

    // SALES dept (2 steps)
    const sales = mkDept('sales','Sales','💼','ic-sales','fill-sales',[
      {label:'ปิดการขาย', done:isClosed, date:p.closed_at||p.updated_at||null},
      {label:'เวียนเอกสาร', done:!!(h&&p.handover_sent), date:p.handover_date||null}
    ]);

    // REPORT dept (7 steps)
    const reportDept = mkDept('report','Report','📄','ic-report','fill-report',[
      {label:'Set Plan', done:!!(rp?.set_plan||rpMeta.set_plan), date:rp?.set_plan_date||rpMeta.set_plan_date},
      {label:'เวียนเอกสาร', done:!!(rp?.send_doc||rpMeta.send_doc), date:rp?.send_doc_date||rpMeta.send_doc_date},
      {label:'รับผลดิบ', done:!!(rp?.receive_raw||rpMeta.receive_raw), date:rp?.receive_raw_date||rpMeta.receive_raw_date},
      {label:'คีย์ผลดิบ', done:!!(rp?.key_raw||rpMeta.key_raw), date:rp?.key_raw_date||rpMeta.key_raw_date},
      {label:'แปลผล', done:!!(rp?.interpret||rpMeta.interpret), date:rp?.interpret_date||rpMeta.interpret_date},
      {label:'ทำเล่ม', done:!!(rp?.booklet||rpMeta.booklet), date:rp?.booklet_date||rpMeta.booklet_date},
      {label:'ส่งผล', done:!!(rp?.ready_to_send||rpMeta.ready_to_send||rp?.status==='sent'), date:rp?.ready_to_send_date||rpMeta.ready_to_send_date||rp?.sent_at}
    ]);

    // MEDICAL (เวชระเบียน) — 3 steps · show only after Closed
    const medical = mkDept('medical','เวชระเบียน','📋','ic-medical','fill-medical',[
      {label:'Download/Upload', done:!!medMeta.download_upload, date:medMeta.download_upload_date},
      {label:'เอกสาร', done:!!medMeta.document, date:medMeta.document_date},
      {label:'อุปกรณ์', done:!!medMeta.equipment, date:medMeta.equipment_date}
    ], !isClosed);

    // OPERATION (4 steps: JO, Op Checklist, Onsite, Station Checklist)
    const operation = mkDept('op','Operation','🚑','ic-op','fill-op',[
      {label:'ใบแจ้งงาน', done:!!(jo&&jo.status!=='Draft'), date:jo?.updated_at||jo?.created_at},
      {label:'Op Checklist', done:cklTotal>0&&cklDone>=cklTotal, date:null},
      {label:'Onsite', done:!['Closed','Prospect'].includes(p.status), date:p.onsite_date},
      {label:'Checklist Station', done:!!(stationCk&&stationCk.is_complete), date:stationCk?.completed_at}
    ]);

    // LAB (2 steps)
    const lab = mkDept('lab','Lab','🔬','ic-lab','fill-lab',[
      {label:'รับ Specimen', done:!!lp, date:lp?.received_date||lp?.created_at},
      {label:'รายงานผล', done:lp?.status==='reported', date:lp?.report_date||lp?.updated_at}
    ]);

    // X-RAY (3 steps)
    const xray = mkDept('xray','X-Ray','📡','ic-xray','fill-xray',[
      {label:'ส่งฟิล์ม', done:!!(xrayData&&xrayData.film_sent), date:xrayData?.film_sent_date},
      {label:'อ่านฟิล์ม', done:!!(xrayData&&xrayData.film_read), date:xrayData?.film_read_date},
      {label:'ส่งผล', done:!!(xrayData&&xrayData.report_sent), date:xrayData?.report_sent_date}
    ]);

    // BILLING (2 steps)
    const billing = mkDept('billing','Billing','💰','ic-billing','fill-billing',[
      {label:'ออก Invoice', done:!!inv, date:inv?.created_at||inv?.issued_date},
      {label:'รับชำระ', done:inv?.status==='Paid', date:inv?.paid_at||inv?.paid_date}
    ]);

    // OPD (เก็บตก / Walkin) — 2 steps · conditional
    const showOpd = hasMissing || isWalkin;
    const opd = mkDept('opd','OPD','🏥','ic-opd','fill-opd',[
      {label:'ตรวจครบ', done:!!(opdMeta&&opdMeta.exam_complete), date:opdMeta?.exam_complete_date},
      {label:'ส่งเอกสาร', done:!!(opdMeta&&opdMeta.doc_sent), date:opdMeta?.doc_sent_date}
    ], !showOpd);

    // ลำดับตามที่ user request: Sales → Report → เวชระเบียน → Operation → Lab → X-Ray → Billing → OPD (conditional)
    const depts = [sales, reportDept, medical, operation, lab, xray, billing, opd].filter(d=>!d.hidden);

    // Overall progress (sum of all visible departments)
    const totalSteps = depts.reduce((s,d)=>s+d.total,0);
    const totalDone = depts.reduce((s,d)=>s+d.doneCount,0);
    const overallPct = totalSteps>0 ? Math.round(totalDone/totalSteps*100) : 0;

    const daysLeft = p.onsite_date ? Math.ceil((new Date(p.onsite_date)-new Date())/86400000) : null;

    // Status badge labels for dept
    const statLabels = {done:'DONE', active:'ACTIVE', wait:'PENDING', idle:'IDLE', overdue:'OVERDUE'};

    return `<div class="wf-card">
      <div class="wf-header" style="background:linear-gradient(180deg,var(--s-2,#162338) 0%,var(--s-1,#0F1A2E) 100%)">
        <div style="flex:1;min-width:0">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:700;color:var(--c-gold-lt,#F0CD7F)">${p.project_code}</div>
          <div style="font-size:15.5px;font-weight:700;color:#FFFFFF;margin-top:3px">${U.esc(p.company_name)}</div>
          <div style="font-size:11.5px;color:#FFFFFF;opacity:.75;margin-top:5px">📆 ${U.fmtD(p.onsite_date)} · ${(p.headcount||0).toLocaleString()} คน${daysLeft!==null&&daysLeft>=0&&daysLeft<=3?` · <span style="color:var(--warn,#FCD34D);font-weight:700">⚠ อีก ${daysLeft} วัน</span>`:''}${p.due_date?` · 🎯 กำหนดส่ง: ${U.fmtD(p.due_date)}`:''}</div>
          <div style="margin-top:9px;display:flex;align-items:center;gap:9px">
            <span style="font-size:11.5px;color:#F0CD7F;font-weight:700;font-family:'IBM Plex Mono',monospace">${totalDone}/${totalSteps}</span>
            <div style="flex:1;height:6px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden">
              <div style="height:100%;background:linear-gradient(90deg,#6EE7B7,#F0CD7F);border-radius:3px;width:${overallPct}%;transition:width .35s ease"></div>
            </div>
            <span style="font-size:10.5px;opacity:.7;font-weight:400">${overallPct}%</span>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:8px;flex-shrink:0;margin-left:14px">
          ${U.badge(p.status)}
          <button class="btn btn-gold btn-xs" onclick="event.stopPropagation();Pages.dashboard.viewOnsiteSummary(${p.id})" style="flex-shrink:0" title="สรุปยอด Onsite">📊 สรุปยอด</button>
        </div>
      </div>
      <div class="wf-dept-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:9px;padding:14px 16px">
        ${depts.map(d=>{
          const statClass = {done:'stat-done',active:'stat-active',wait:'stat-wait',idle:'stat-idle',overdue:'stat-overdue'}[d.status]||'stat-idle';
          const statColors = {
            done:'background:rgba(110,231,183,.18);color:#6EE7B7',
            active:'background:rgba(240,205,127,.18);color:#F0CD7F',
            wait:'background:rgba(252,211,77,.12);color:#FCD34D',
            idle:'background:rgba(255,255,255,.06);color:rgba(255,255,255,.5)',
            overdue:'background:rgba(252,165,165,.18);color:#FCA5A5'
          }[d.status]||'';
          const iconColors = {
            'ic-sales':'background:rgba(110,231,183,.15);color:#6EE7B7',
            'ic-op':'background:rgba(168,85,247,.15);color:#C4B5FD',
            'ic-lab':'background:rgba(56,189,248,.15);color:#7DD3FC',
            'ic-xray':'background:rgba(99,102,241,.15);color:#A5B4FC',
            'ic-report':'background:rgba(244,114,182,.15);color:#F9A8D4',
            'ic-opd':'background:rgba(252,211,77,.15);color:#FCD34D',
            'ic-medical':'background:rgba(251,146,60,.15);color:#FDBA74',
            'ic-billing':'background:rgba(240,205,127,.18);color:#F0CD7F'
          }[d.iconClass]||'';
          const fillColors = {
            'fill-sales':'background:linear-gradient(90deg,#6EE7B7,#34D399)',
            'fill-op':'background:linear-gradient(90deg,#C4B5FD,#A78BFA)',
            'fill-lab':'background:linear-gradient(90deg,#7DD3FC,#38BDF8)',
            'fill-xray':'background:linear-gradient(90deg,#A5B4FC,#818CF8)',
            'fill-report':'background:linear-gradient(90deg,#F9A8D4,#F472B6)',
            'fill-opd':'background:linear-gradient(90deg,#FCD34D,#FBBF24)',
            'fill-medical':'background:linear-gradient(90deg,#FDBA74,#FB923C)',
            'fill-billing':'background:linear-gradient(90deg,#F0CD7F,#D4A845)'
          }[d.fillClass]||'';
          const pulseAnim = d.status==='overdue'?'animation:wfDeptPulse 2s ease-in-out infinite':'';
          return `<div class="wf-dept" style="background:var(--s-2,#162338);border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:11px 12px;transition:all .15s">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;${iconColors}">${d.icon}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:700;color:#FFFFFF;line-height:1.2">${d.name}</div>
                <div style="font-size:10.5px;color:#FFFFFF;opacity:.7;margin-top:1px;font-weight:400;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.currentText}</div>
              </div>
              <span style="font-size:9px;padding:2px 6px;border-radius:3px;font-weight:700;font-family:'IBM Plex Mono',monospace;letter-spacing:.3px;text-transform:uppercase;${statColors};${pulseAnim}">${statLabels[d.status]}</span>
            </div>
            <div style="height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;margin-bottom:6px">
              <div style="height:100%;border-radius:2px;transition:width .35s ease;width:${d.pct}%;${fillColors}"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:10.5px;color:#FFFFFF;font-weight:500">
              <span style="font-family:'IBM Plex Mono',monospace;color:#F0CD7F;font-weight:600;font-size:10.5px">${d.doneCount}/${d.total}</span>
              <span style="opacity:.6;font-size:10px;font-weight:400">${fmtRel(d.lastDate)}</span>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  });
  const wfCardsHtml = wfCards.join('');
  document.getElementById('content').innerHTML=`
  <div class="ph"><div><h2>📊 Dashboard</h2><p>OcciCare Mobile Checkup System</p></div>
    <div class="btn-grp">
      ${DB.auth.can('add','config')?`<button class="btn btn-out btn-sm" onclick="Pages.dashboard.reset()">🔄 รีเซ็ต</button>`:''}
    </div>
  </div>
  ${aHtml?`<div class="mb4">${aHtml}</div>`:''}
  ${(()=>{
    // ── KPI: Group Projects by job_type (จาก CRM ลูกค้า) — แสดงครบทุกประเภท ──
    const customers = DB.customer ? DB.customer.listCustomers() : [];
    const projects = projs;
    // ประเภทงานทั้งหมด (fix list — แสดงครบเสมอ)
    const ALL_TYPES = ['ตรวจสุขภาพ','OS XRAY','ตรวจซ้ำ','เก็บอาหาร ตัวอย่าง','อบรม First Aid','Consult','อื่นๆ'];
    // Map job_type → count + project list
    const typeData = {};
    ALL_TYPES.forEach(t=>{typeData[t] = [];});
    typeData['ไม่ระบุ'] = [];
    projects.forEach(p=>{
      const cust = customers.find(c=>c.id===p.customer_id);
      const jt = (cust && cust.job_type) ? cust.job_type : 'ไม่ระบุ';
      if(!typeData[jt]) typeData[jt] = [];
      typeData[jt].push(p);
    });
    const totalProj = projects.length;
    const usedTypes = Object.keys(typeData).filter(k=>typeData[k].length>0).length;
    // สีตามประเภทงาน
    const colorOf = (jt)=>{
      const map = {
        'ตรวจสุขภาพ': {c1:'#6EE7B7', c2:'#10B981'},
        'OS XRAY': {c1:'#7DD3FC', c2:'#0EA5E9'},
        'ตรวจซ้ำ': {c1:'#FCD34D', c2:'#F59E0B'},
        'เก็บอาหาร ตัวอย่าง': {c1:'#FCA5A5', c2:'#DC2626'},
        'อบรม First Aid': {c1:'#C4B5FD', c2:'#7C3AED'},
        'Consult': {c1:'#FDA4AF', c2:'#E11D48'},
        'อื่นๆ': {c1:'#9CA3AF', c2:'#6B7280'},
        'ไม่ระบุ': {c1:'#94A3B8', c2:'#475569'}
      };
      return map[jt] || {c1:'#94A3B8', c2:'#475569'};
    };
    // Total card (clickable → all)
    const totalCard = `<div class="metric-card" onclick="Pages.dashboard.viewByJobType('__ALL__')" style="background:rgba(240,205,127,.04);border:1px solid rgba(240,205,127,.3);position:relative;overflow:hidden;cursor:pointer;transition:transform .15s,box-shadow .15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(240,205,127,.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#F0CD7F,#D4A845)"></div>
      <div class="metric-label" style="color:#F0CD7F">ประเภทงานทั้งหมด</div>
      <div class="metric-value">${totalProj}</div>
      <div class="metric-sub">${usedTypes} ประเภท</div>
    </div>`;
    // แสดงเฉพาะใน ALL_TYPES (always) + 'ไม่ระบุ' (ถ้ามี)
    const showList = [...ALL_TYPES];
    if(typeData['ไม่ระบุ'] && typeData['ไม่ระบุ'].length>0) showList.push('ไม่ระบุ');
    const typeCards = showList.map(jt=>{
      const list = typeData[jt] || [];
      const n = list.length;
      const col = colorOf(jt);
      const pct = totalProj>0 ? Math.round(n*100/totalProj) : 0;
      const dimStyle = n===0 ? 'opacity:.5' : '';
      return `<div class="metric-card" onclick="Pages.dashboard.viewByJobType('${U.esc(jt)}')" style="position:relative;overflow:hidden;cursor:pointer;transition:transform .15s,box-shadow .15s;${dimStyle}" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(${col.c1==='#6EE7B7'?'110,231,183':col.c1==='#7DD3FC'?'56,189,248':col.c1==='#FCD34D'?'252,211,77':col.c1==='#FCA5A5'?'252,165,165':col.c1==='#C4B5FD'?'196,181,253':col.c1==='#FDA4AF'?'253,164,175':'148,163,184'},.18)';this.style.opacity='1'" onmouseout="this.style.transform='';this.style.boxShadow='';this.style.opacity='${n===0?'.5':''}'">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,${col.c1},${col.c2})"></div>
        <div class="metric-label" style="color:${col.c1}">${U.esc(jt)}</div>
        <div class="metric-value">${n}</div>
        <div class="metric-sub">${n===0?'ยังไม่มี':pct+'% ของทั้งหมด'}</div>
      </div>`;
    }).join('');
    return `<div class="metrics-grid">${totalCard}${typeCards}</div>`;
  })()}
  <div class="card">
    <div class="card-header">
      <span class="card-title">📊 สถานะงานทุก Project (Workflow Tracker)</span>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="t-sm t-muted">${filtered.length} รายการ</span>
        <div style="display:flex;align-items:center;gap:8px">
          <input id="dash_search" placeholder="🔍 ค้นหา Project / บริษัท..." oninput="Pages.dashboard.filterSearch(this.value)"
            style="padding:6px 12px;border:1.5px solid rgba(255,255,255,.1);border-radius:8px;font-size:12px;background:var(--s-3,#1D2B42);color:var(--t-bright,#F0F4FA);font-family:'IBM Plex Sans Thai',sans-serif;outline:none;width:220px"/>
        </div>
        <select onchange="Pages.dashboard.filterStatus(this.value)" style="padding:6px 10px;border:1.5px solid rgba(255,255,255,.1);border-radius:8px;font-size:12px;background:var(--s-3,#1D2B42);color:var(--t-bright,#F0F4FA);">
          ${statusOpts}
        </select>
        ${this._filter!=='all'?`<button class="btn btn-out btn-xs" onclick="Pages.dashboard.filterStatus('all')">✕</button>`:''}
      </div>
    </div>
    ${wfCardsHtml||`<div class="empty"><div class="icon">📋</div><p>ไม่พบ Project${this._filter!=='all'?` สถานะ "${this._filter}"`:''}  <button class="btn btn-out btn-sm" onclick="Pages.sales.addProject()">+ สร้างใหม่</button></p></div>`}
  </div>`;
},
viewOnsiteSummary(pid){
  const p=DB.sales.getProject(pid);
  if(!p){U.toast('ไม่พบข้อมูล Project','warning');return;}
  const logs=DB.operation.listOnsiteLogs(pid);
  const rpts=DB._get('operation_db','onsite_reports')||[];
  const rpt=rpts.find(r=>r.project_id===pid);
  const isComplete=['Lab','Report','Billing','Completed'].includes(p.status);
  const totalExpected=logs.length?Math.max(...logs.map(l=>l.total_expected||0)):0;
  const totalDone=logs.length?Math.max(...logs.map(l=>l.total_done||0)):0;
  const totalMiss=logs.reduce((s,l)=>s+(l.missing||0),0);
  const totalRef=logs.reduce((s,l)=>s+(l.refused||0),0);
  const logRows=logs.map(l=>`<tr>
    <td><span style="background:rgba(56,189,248,.15);color:#38BDF8;padding:1px 7px;border-radius:4px;font-size:11px;font-weight:700">${l.station_code||'-'}</span></td>
    <td class="fw6">${U.esc(l.station_name||'')}</td>
    <td style="text-align:center">${l.total_expected||0}</td>
    <td style="text-align:center;color:#6EE7B7;font-weight:700">${l.total_done||0}</td>
    <td style="text-align:center;color:#FCD34D">${l.missing||0}</td>
    <td style="text-align:center;color:#FCA5A5">${l.refused||0}</td>
    <td style="color:var(--t-muted)">${U.esc(l.note||'-')}</td>
  </tr>`).join('');
  const qLabels=['อุปกรณ์ครบพร้อม','ออกเดินทางตรงเวลา','ถึงสถานที่ตรงเวลา','จัดสถานที่พร้อม','ประชุม Brief ก่อนเริ่ม','ความร่วมมือเจ้าหน้าที่','ไม่มีปัญหาหน้างาน'];
  const qHtml=rpt?qLabels.map((lbl,i)=>{
    const qKey=['q1_equip_ok','q2_depart_ok','q3_arrive_ok','q4_setup_ok','q5_brief_ok','q6_coop_ok','q7_issue_ok'][i];
    const dKey=['q1_detail','q2_detail','q3_detail','q4_detail','q5_detail','q6_detail','q7_detail'][i];
    const val=rpt[qKey];
    return`<div style="display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)">
      <span style="font-size:16px">${val===1?'✅':val===0?'❌':'➖'}</span>
      <div style="flex:1"><div style="font-size:13px;font-weight:500">${lbl}</div>
      ${rpt[dKey]?`<div style="font-size:12px;color:var(--t-muted);margin-top:2px">${U.esc(rpt[dKey])}</div>`:''}</div>
    </div>`;
  }).join(''):'<p style="color:var(--t-muted);font-size:13px">ยังไม่มีบันทึกงานออกหน่วย</p>';
  Modal.open(`
  <div class="ab info" style="margin-bottom:12px">
    <div style="flex:1">
      <div class="fw6" style="margin-bottom:3px">👁 โหมดดูอย่างเดียว (Read-only)</div>
      <div class="t-sm">ข้อมูลนี้ไม่สามารถแก้ไขได้จากหน้า Dashboard — หากต้องการแก้ไข กรุณาไปที่หน้า Operation — Onsite</div>
    </div>
  </div>
  <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;padding:10px 14px;background:var(--s-2,#172236);border-radius:9px">
    <div>
      <div class="fw6 mono" style="color:var(--c-gold-lt,#E2C46A)">${U.esc(p.project_code)}</div>
      <div class="fw6" style="font-size:15px">${U.esc(p.company_name)}</div>
      <div class="t-sm t-muted">${U.fmtD(p.onsite_date)} | ${(p.headcount||0).toLocaleString()} คน</div>
    </div>
    <div style="margin-left:auto">${isComplete?'<span class="badge b-closed">✅ Complete</span>':'<span class="badge b-onsite">🚑 Onsite</span>'}</div>
  </div>
  <div class="tabs" style="margin-bottom:12px">
    <div class="tab active" onclick="switchTab(this,'dvs_t1')">สรุปยอด Station</div>
    <div class="tab" onclick="switchTab(this,'dvs_t2')">บันทึกงานออกหน่วย</div>
  </div>
  <div id="dvs_t1" class="tp active">
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">
      <div style="background:var(--s-2,#172236);border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:10px;color:var(--t-muted)">เป้าหมาย</div>
        <div style="font-size:20px;font-weight:700">${totalExpected||(p.headcount||0)}</div>
      </div>
      <div style="background:var(--s-2,#172236);border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:10px;color:var(--t-muted)">สำเร็จ</div>
        <div style="font-size:20px;font-weight:700;color:#6EE7B7">${totalDone}</div>
      </div>
      <div style="background:var(--s-2,#172236);border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:10px;color:var(--t-muted)">เก็บตก</div>
        <div style="font-size:20px;font-weight:700;color:#FCD34D">${totalMiss}</div>
      </div>
      <div style="background:var(--s-2,#172236);border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:10px;color:var(--t-muted)">ปฏิเสธ</div>
        <div style="font-size:20px;font-weight:700;color:#FCA5A5">${totalRef}</div>
      </div>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Code</th><th>Station</th><th style="text-align:center">เป้า</th><th style="text-align:center">สำเร็จ</th><th style="text-align:center">เก็บตก</th><th style="text-align:center">ปฏิเสธ</th><th>หมายเหตุ</th></tr></thead>
      <tbody>${logRows||'<tr><td colspan="8" class="empty"><p style="color:var(--t-muted)">ยังไม่มีข้อมูล Station</p></td></tr>'}</tbody>
    </table></div>
  </div>
  <div id="dvs_t2" class="tp">${qHtml}</div>`,
  `👁 สรุปยอด Onsite — ${p.project_code}`, null, true);
},
filterStatus(s){this._filter=s;this._search='';this.render();},

// ─── คลิก KPI card → ดูรายการ Projects ของประเภทงานนั้น ───
viewByJobType(jt){
  const projs = DB.sales.listProjects();
  const customers = DB.customer ? DB.customer.listCustomers() : [];
  const ALL_TYPES = ['ตรวจสุขภาพ','OS XRAY','ตรวจซ้ำ','เก็บอาหาร ตัวอย่าง','อบรม First Aid','Consult','อื่นๆ'];
  // Filter list
  let list = projs;
  let title = '👁 ทุก Project (ทุกประเภทงาน)';
  if(jt !== '__ALL__'){
    list = projs.filter(p=>{
      const c = customers.find(x=>x.id===p.customer_id);
      const cjt = (c && c.job_type) ? c.job_type : 'ไม่ระบุ';
      return cjt === jt;
    });
    title = `👁 ประเภทงาน: ${jt} (${list.length} Project)`;
  }
  if(list.length === 0){
    Modal.open(`<div style="padding:30px;text-align:center;color:#FFFFFF;opacity:.55">
      <div style="font-size:42px;margin-bottom:10px">📋</div>
      <p style="font-size:14px;font-weight:600">ยังไม่มี Project ประเภทนี้</p>
      <p style="font-size:11.5px;margin-top:6px">เริ่มต้นที่หน้า CRM ลูกค้า หรือสร้าง Project ใหม่</p>
    </div>`, title, null, false);
    return;
  }
  // Sort: newest onsite_date first
  list = list.slice().sort((a,b)=>{
    return new Date(b.onsite_date||0) - new Date(a.onsite_date||0);
  });
  // Build table rows
  const rows = list.map(p=>{
    const c = customers.find(x=>x.id===p.customer_id);
    const customerName = c ? c.company_name : '-';
    const customerJobType = (c && c.job_type) ? c.job_type : '-';
    return `<tr style="cursor:pointer" onclick="Modal.close();Router.navigate('sales');setTimeout(()=>{const el=document.querySelector('[data-project-id=\'${p.id}\']');if(el)el.scrollIntoView({block:'center'});},300)" title="คลิกไปดูที่หน้า Sales">
      <td style="padding:9px 11px;border-bottom:1px solid rgba(255,255,255,.06);font-family:'IBM Plex Mono',monospace;color:#F0CD7F;font-weight:700;font-size:11.5px">${U.esc(p.project_code||'-')}</td>
      <td style="padding:9px 11px;border-bottom:1px solid rgba(255,255,255,.06);font-weight:600;font-size:12px">${U.esc(p.company_name||'-')}</td>
      <td style="padding:9px 11px;border-bottom:1px solid rgba(255,255,255,.06);font-size:11.5px;color:rgba(255,255,255,.75)">${U.esc(customerName)}<br><span style="font-size:9.5px;color:rgba(255,255,255,.5);font-family:'IBM Plex Mono',monospace">${U.esc(customerJobType)}</span></td>
      <td style="padding:9px 11px;border-bottom:1px solid rgba(255,255,255,.06);font-size:11.5px">${U.fmtD(p.onsite_date)}</td>
      <td style="padding:9px 11px;border-bottom:1px solid rgba(255,255,255,.06);text-align:right;font-size:11.5px;font-family:'IBM Plex Mono',monospace">${(p.headcount||0).toLocaleString()}</td>
      <td style="padding:9px 11px;border-bottom:1px solid rgba(255,255,255,.06)">${U.badge(p.status||'Draft')}</td>
    </tr>`;
  }).join('');
  // Summary stats
  const totalHC = list.reduce((s,p)=>s+(p.headcount||0), 0);
  const statusBreak = {};
  list.forEach(p=>{ statusBreak[p.status||'Draft'] = (statusBreak[p.status||'Draft']||0)+1; });
  const statusChips = Object.entries(statusBreak).map(([s,n])=>`${U.badge(s)} <span style="color:rgba(255,255,255,.7);font-size:11px;margin-right:8px">${n}</span>`).join('');
  Modal.open(`
    <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:10px 14px;margin-bottom:13px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center">
      <div>
        <div style="font-size:13px;font-weight:700">📊 รวม ${list.length} Project · ${totalHC.toLocaleString()} คน</div>
        <div style="font-size:10.5px;color:rgba(255,255,255,.6);margin-top:3px;font-weight:500">เรียงจากวันออกตรวจล่าสุด</div>
      </div>
      <div style="font-size:11px">${statusChips}</div>
    </div>
    <div style="background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.08);border-radius:8px;overflow:hidden;max-height:55vh;overflow-y:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead style="position:sticky;top:0;background:#162338;z-index:1">
          <tr>
            <th style="padding:9px 11px;text-align:left;font-size:10.5px;font-weight:700;color:#FFFFFF">Project Code</th>
            <th style="padding:9px 11px;text-align:left;font-size:10.5px;font-weight:700;color:#FFFFFF">บริษัท</th>
            <th style="padding:9px 11px;text-align:left;font-size:10.5px;font-weight:700;color:#FFFFFF">ลูกค้า / ประเภท</th>
            <th style="padding:9px 11px;text-align:left;font-size:10.5px;font-weight:700;color:#FFFFFF">วันออกตรวจ</th>
            <th style="padding:9px 11px;text-align:right;font-size:10.5px;font-weight:700;color:#FFFFFF">จำนวนคน</th>
            <th style="padding:9px 11px;text-align:left;font-size:10.5px;font-weight:700;color:#FFFFFF">สถานะ</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="font-size:10.5px;color:#FFFFFF;opacity:.55;margin-top:10px;text-align:center;font-style:italic">
      คลิกที่ row เพื่อไปดูใน Sales — Project & Handover
    </div>
  `, title, null, false);
},
filterSearch(q){
  this._search=q.toLowerCase().trim();
  const cards=document.querySelectorAll('.wf-card');
  cards.forEach(card=>{
    const txt=card.textContent.toLowerCase();
    card.style.display=(!this._search||txt.includes(this._search))?'':'none';
  });
},
showAlerts(){
  const alerts=DB.checkAlerts();
  if(!alerts.length){U.toast('✅ ไม่มีการแจ้งเตือน');return;}
  const html=alerts.map(a=>`<div class="ab ${a.type}" style="margin-bottom:6px">${a.msg}</div>`).join('');
  Modal.open(`<div>${html}</div>`,'การแจ้งเตือนทั้งหมด');
},
reset(){U.toast('ฟีเจอร์ Reset ถูกปิดใช้งานใน SQL mode','warning');}
};

/* ── CUSTOMERS ── */
Pages.customers={async render(){
  const custs=DB.customer.listCustomers();
  const canAdd=DB.auth.can('add','customers'),canEdit=DB.auth.can('edit','customers'),canDel=DB.auth.can('delete','customers');
  const rows=custs.map(c=>`<tr>
    <td class="fw6">${U.esc(c.company_name)}</td>
    <td>${U.esc(c.contact_name||'-')}<br><span class="t-sm t-muted">${U.esc(c.contact_role||'')}</span></td>
    <td>${U.esc(c.phone||'-')}</td>
    <td>${(c.employee_count||0).toLocaleString()}</td>
    <td>${c.job_type?`<span class="badge b-draft">${U.esc(c.job_type)}</span>`:'<span class="t-muted t-sm">-</span>'}</td>
    <td>${U.badge(c.sales_status)}</td>
    <td>${U.fmtD(c.last_contact)}</td>
    <td>${U.recordedByCell(c.recorded_by)}</td>
    <td>
      ${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.customers.edit(${c.id})">แก้ไข</button>`:''}
      <button class="btn btn-out btn-xs" onclick="Pages.customers.logs(${c.id})">Log</button>
      ${canDel?`<button class="btn btn-danger btn-xs" onclick="Pages.customers.del(${c.id})">ลบ</button>`:''}
    </td>
  </tr>`).join('');
  document.getElementById('content').innerHTML=`<div class="ph"><div><h2>👥 CRM — ลูกค้า</h2><p>จัดการข้อมูลบริษัทและประวัติการติดต่อ</p></div>${canAdd?`<button class="btn btn-pri" onclick="Pages.customers.edit(null)">+ เพิ่มลูกค้า</button>`:''}</div>
  <div class="card">
    <div style="padding:14px 18px 12px;border-bottom:1px solid rgba(255,255,255,.06)">
      <div style="position:relative">
        <span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:13px;pointer-events:none;opacity:.5">🔍</span>
        <input id="crm_search" placeholder="ค้นหาบริษัท, ผู้ติดต่อ, เบอร์, ประเภทงาน..." autocomplete="off"
          oninput="Pages.customers._filter(this.value)"
          onfocus="this.style.borderColor='var(--c-teal,#00B8AA)'" onblur="this.style.borderColor='rgba(255,255,255,.1)'"
          style="width:100%;padding:9px 12px 9px 34px;border:1.5px solid rgba(255,255,255,.1);border-radius:9px;font-size:13px;background:rgba(255,255,255,.06);color:#fff;font-family:'IBM Plex Sans Thai',sans-serif;outline:none;transition:border-color .2s"/>
      </div>
    </div>
    <div style="height:12px"></div>
    <div class="tbl-wrap"><table id="crm_table"><thead><tr><th>บริษัท</th><th>ผู้ติดต่อ</th><th>เบอร์</th><th>พนักงาน</th><th>ประเภทงาน</th><th>สถานะ</th><th>ติดต่อล่าสุด</th><th>ผู้บันทึก</th><th></th></tr></thead><tbody id="crm_tbody">${rows||'<tr><td colspan="8" class="empty"><div class="icon">👥</div><p>ยังไม่มีข้อมูลลูกค้า</p></td></tr>'}</tbody></table></div></div>`;
},
_filter(q){
  const tb=document.getElementById('crm_tbody');if(!tb)return;
  q=(q||'').toLowerCase().trim();
  Array.from(tb.querySelectorAll('tr')).forEach(tr=>{
    const txt=tr.textContent.toLowerCase();
    tr.style.display=(!q||txt.includes(q))?'':'none';
  });
},
async edit(id){
  const c=id?DB.customer.getCustomer(id):{};
  const f=(k,d='')=>U.esc(c[k]||d);
  const sOpts=U.sel(['Prospect','Follow up','Negotiation','Closed'],f('sales_status'));
  const jtOpts=['','ตรวจสุขภาพ','OS XRAY','ตรวจซ้ำ','เก็บอาหาร ตัวอย่าง','อบรม First Aid','Consult','อื่นๆ'].map(function(t){return'<option value="'+t+'"'+(c.job_type===t?' selected':'')+'>'+(t||'-- เลือกประเภทงาน --')+'</option>';}).join('');;
  const lat=c.lat||'',lng=c.lng||'';
  Modal.open(`
  <div class="fr">
    <div class="fg"><label class="req">ชื่อบริษัท/องค์กร</label><input id="fc_co" value="${f('company_name')}"/></div>
    <div class="fg"><label>จำนวนพนักงาน</label><input id="fc_emp" type="number" value="${c.employee_count||0}"/></div>
  </div>
  <div class="fg"><label>ที่อยู่</label><textarea id="fc_addr">${f('address')}</textarea></div>
  <div class="fr">
    <div class="fg"><label>เบอร์ติดต่อ</label><input id="fc_ph" value="${f('phone')}"/></div>
    <div class="fg"><label>อีเมล</label><input id="fc_em" value="${f('email')}"/></div>
  </div>
  <div class="fr">
    <div class="fg"><label class="req">ผู้ติดต่อหลัก (HR/Safety/Owner)</label><input id="fc_cn" value="${f('contact_name')}"/></div>
    <div class="fg"><label>ตำแหน่ง</label><input id="fc_cr" value="${f('contact_role')}"/></div>
  </div>
  <div class="fr">
    <div class="fg"><label>ประเภทงาน</label><select id="fc_jt">${jtOpts}</select></div>
    <div class="fg"><label>สถานะการขาย</label><select id="fc_st"><option value="">-- เลือก --</option>${sOpts}</select></div>
  </div>
  <div class="fr">
    <div class="fg"><label>วันที่ติดต่อล่าสุด</label><input id="fc_lc" type="date" value="${f('last_contact')}"/></div>
    <div class="fg"><label>ประเภทงาน 2</label>
      <select id="fc_jt2">
        <option value="" ${!c.job_type2?'selected':''}>-- เลือก --</option>
        <option value="Mobile" ${c.job_type2==='Mobile'?'selected':''}>Mobile</option>
        <option value="Walkin" ${c.job_type2==='Walkin'?'selected':''}>Walkin</option>
      </select>
    </div>
    <div class="fg"><label>ตรวจที่</label>
      <select id="fc_exloc">
        <option value="" ${!c.exam_location?'selected':''}>-- เลือก --</option>
        <option value="Mobile Checkup" ${c.exam_location==='Mobile Checkup'?'selected':''}>Mobile Checkup</option>
        <option value="Walk in" ${c.exam_location==='Walk in'?'selected':''}>Walk in</option>
      </select>
    </div>
  </div>
  <div class="fg"><label>Note (บันทึกการคุย)</label><textarea id="fc_nt">${f('note')}</textarea></div>
  <div style="margin-top:10px">${U.recordedByField(c.recorded_by,'cust_rb')}</div>
  <div class="divider"></div>
  <div class="sec-title">📍 ปักหมุด Location</div>
  <div class="fr">
    <div class="fg"><label>Latitude</label><input id="fc_lat" value="${lat}" placeholder="เช่น 13.7563"/></div>
    <div class="fg"><label>Longitude</label><input id="fc_lng" value="${lng}" placeholder="เช่น 100.5018"/></div>
  </div>
  <div class="btn-grp mb4">
    <button type="button" class="btn btn-out btn-sm" onclick="if(navigator.geolocation){navigator.geolocation.getCurrentPosition(p=>{document.getElementById('fc_lat').value=p.coords.latitude.toFixed(6);document.getElementById('fc_lng').value=p.coords.longitude.toFixed(6);U.toast('✅ ได้ตำแหน่งแล้ว');});}">📍 ตำแหน่งปัจจุบัน</button>
    <button type="button" class="btn btn-out btn-sm" onclick="const lat2=document.getElementById('fc_lat').value,lng2=document.getElementById('fc_lng').value,addr2=document.getElementById('fc_addr').value;window.open('https://maps.google.com/maps?q='+(lat2&&lng2?lat2+','+lng2:encodeURIComponent(addr2)),'_blank')">🗺 Google Maps</button>
  </div>
  ${lat&&lng?`<div style="border-radius:10px;overflow:hidden;height:150px;border:1px solid var(--bdr)"><iframe src="https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed" style="width:100%;height:100%;border:none" loading="lazy"></iframe></div>`:'<p class="t-sm t-muted">ใส่ Lat/Lng แล้วกด ตำแหน่งปัจจุบัน</p>'}`,
  id?'แก้ไขข้อมูลลูกค้า':'เพิ่มลูกค้าใหม่',async () =>{
    const co=document.getElementById('fc_co').value.trim();
    if(!co)return U.toast('กรุณาใส่ชื่อบริษัท','danger');
    DB.customer.saveCustomer({
      id:id||undefined,
      company_name:co,
      address:document.getElementById('fc_addr').value.trim(),
      phone:document.getElementById('fc_ph').value.trim(),
      email:document.getElementById('fc_em').value.trim(),
      contact_name:document.getElementById('fc_cn').value.trim(),
      contact_role:document.getElementById('fc_cr').value.trim(),
      employee_count:parseInt(document.getElementById('fc_emp').value)||0,
      job_type:document.getElementById('fc_jt').value,
      job_type2:document.getElementById('fc_jt2')?.value||'',
      exam_location:document.getElementById('fc_exloc')?.value||'',
      sales_status:document.getElementById('fc_st').value,
      last_contact:document.getElementById('fc_lc').value,
      note:document.getElementById('fc_nt').value.trim(),
      lat:document.getElementById('fc_lat').value.trim(),
      lng:document.getElementById('fc_lng').value.trim(),
    _override_recorded_by:U.recordedByValue('cust_rb')||undefined});
    Modal.close();Pages.customers.render();U.toast(id?'✅ อัปเดตแล้ว':'✅ เพิ่มลูกค้าแล้ว');
  },true);
},
async del(id){if(U.confirm('ลบลูกค้านี้?')){DB.customer.deleteCustomer(id);this.render();U.toast('✅ ลบแล้ว');}},
logs(cid){
  const c=DB.customer.getCustomer(cid);
  const logs=DB.customer.listSalesLogs(cid);
  let html=`<p class="fw6 mb4">${c.company_name}</p><div class="mb4" style="max-height:200px;overflow-y:auto">`;
  if(!logs.length)html+='<p class="t-muted">ยังไม่มีบันทึก</p>';
  else logs.forEach(l=>{html+=`<div style="padding:8px 0;border-bottom:1px solid var(--bdr)"><div class="fw6 t-sm">${l.note}</div><div class="t-sm t-muted">${U.fmtDT(l.created_at)}</div></div>`;});
  html+=`</div><div class="fg"><label>เพิ่มบันทึก</label><textarea id="nl" placeholder="บันทึกการติดต่อ..."></textarea></div>`;
  Modal.open(html,'บันทึกการติดต่อ',()=>{const n=document.getElementById('nl').value.trim();if(!n)return;DB.customer.addSalesLog({customer_id:cid,note:n});Modal.close();U.toast('✅ บันทึกแล้ว');});
}};

/* ── SALES ── */

/* ══════════════════════════════════════════════════
   QUOTATION — ใบเสนอราคา Mobile Checkup (v2)
   - Multi-package support
   - Pulls exam items from Config DB
   - Margin calculation
   - Per-quotation custom packages
══════════════════════════════════════════════════ */
Pages.quotation={
  _canApprove(){
    const sess=DB.auth.session();if(!sess)return false;
    // Check special qt_approve permission OR admin
    if(sess.role==='admin')return true;
    const rp=DB.auth.getRolePermission(sess.role);
    return !!(rp?.modules?.qt_approve?.approve);
  },
  TERMS:`1. ราคาข้างต้นเป็นราคารวมค่าบริการตรวจสุขภาพ ณ สถานประกอบการ (Onsite)
2. ราคาดังกล่าวยังไม่รวมภาษีมูลค่าเพิ่ม (VAT 7%)
3. กรณีจำนวนผู้เข้าตรวจน้อยกว่า 50 คน อาจมีค่าใช้จ่ายเพิ่มเติมในการออกหน่วย
4. บริษัทขอสงวนสิทธิ์ในการปรับราคาตามระยะทาง/พื้นที่ห่างไกล
5. ใบเสนอราคานี้มีอายุ 30 วัน นับจากวันที่ออกเอกสาร
6. กรณีตกลงใช้บริการ กรุณาแจ้งล่วงหน้าอย่างน้อย 14 วันก่อนวันตรวจ
7. ราคาพิเศษสำหรับลูกค้าที่มีจำนวนพนักงาน 200 คนขึ้นไป`,

  /* ─── helpers ─── */
  _qBadge(s){const m={draft:'b-draft',pending:'b-pending',approved:'b-completed',rejected:'b-danger',sent:'b-onsite',closed:'b-billing'};const l={draft:'ร่าง',pending:'รออนุมัติ',approved:'อนุมัติแล้ว',rejected:'ไม่อนุมัติ',sent:'ส่งแล้ว',closed:'ปิดการขาย'};return`<span class="badge ${m[s]||'b-draft'}">${l[s]||s}</span>`;},

  async render(){
    const qts=DB.quotation.listQuotations() || [];
    const canAdd=DB.auth.can('add','sales');
    const canEdit=DB.auth.can('edit','sales');
    const canDel=DB.auth.can('delete','sales');
    const rows=qts.slice().reverse().map(q=>{
      const items=DB.quotation.listItems(q.id);
      const subtotal=items.reduce((s,it)=>s+(it.qty*(it.unit_price||0)),0);
      const vat=subtotal*.07;
      const role=DB.auth.session()?.role;
      return`<tr data-status="${q.status}">
        <td class="fw6 mono">${q.qt_no}</td>
        <td>${U.esc(q.company_name)}</td>
        <td>${(q.headcount||0).toLocaleString()} คน</td>
        <td>${U.fmtD(q.issue_date||q.created_at)}</td>
        <td class="fw6">฿${U.fmt(Math.round(subtotal+vat))}</td>
        <td>${this._qBadge(q.status)}</td>
        <td>
          <button class="btn btn-out btn-xs" onclick="Pages.quotation.view(${q.id})">ดู</button>
          ${canEdit&&['draft','rejected'].includes(q.status)?`<button class="btn btn-out btn-xs" onclick="Pages.quotation.editQt(${q.id})">แก้ไข</button>`:''}
          ${canEdit&&q.status==='draft'?`<button class="btn btn-pri btn-xs" onclick="Pages.quotation.submitApproval(${q.id})">ส่งอนุมัติ</button>`:''}
          ${Pages.quotation._canApprove()&&q.status==='pending'?`<button class="btn btn-gold btn-xs" onclick="Pages.quotation.approve(${q.id},true)">✓ อนุมัติ</button><button class="btn btn-danger btn-xs" onclick="Pages.quotation.approve(${q.id},false)">✕</button>`:''}
          ${canEdit&&q.status==='approved'?`<button class="btn btn-suc btn-xs" onclick="Pages.quotation.markSent(${q.id})">ส่งลูกค้า</button>`:''}
          ${canEdit&&q.status==='sent'?`<button class="btn btn-suc btn-xs" onclick="Pages.quotation.closeWin(${q.id})">ปิดการขาย</button>`:''}
          <button class="btn btn-out btn-xs" onclick="Pages.quotation.print(${q.id})">🖨</button>
          ${canDel&&q.status==='draft'?`<button class="btn btn-danger btn-xs" onclick="Pages.quotation.del(${q.id})">ลบ</button>`:''}
        </td>
      </tr>`;
    }).join('');
    const total=qts.length;
    const pending=qts.filter(q=>q.status==='pending').length;
    const approved=qts.filter(q=>['approved','sent'].includes(q.status)).length;
    const closed=qts.filter(q=>q.status==='closed').length;
    const totalVal=qts.reduce((s,q)=>{const items=DB.quotation.listItems(q.id);return s+items.reduce((ss,it)=>ss+(it.qty*(it.unit_price||0)),0)*1.07;},0);
    document.getElementById('content').innerHTML=`
    <div class="ph">
      <div><h2>📝 ใบเสนอราคา (Quotation)</h2><p>จัดการใบเสนอราคาและ follow-up</p></div>
    </div>
    <div class="metrics-grid">
      <div class="metric-card acc"><div class="metric-label">ทั้งหมด</div><div class="metric-value">${total}</div></div>
      <div class="metric-card warn"><div class="metric-label">รออนุมัติ</div><div class="metric-value">${pending}</div></div>
      <div class="metric-card suc"><div class="metric-label">อนุมัติ/ส่งแล้ว</div><div class="metric-value">${approved}</div></div>
      <div class="metric-card gold"><div class="metric-label">ปิดการขาย</div><div class="metric-value">${closed}</div></div>
      <div class="metric-card"><div class="metric-label">มูลค่ารวม(VAT)</div><div class="metric-value" style="font-size:18px">฿${U.fmt(Math.round(totalVal/1000))}K</div></div>
    </div>
    <div class="card">
      <!-- Toolbar Row: 60% | 20% | 20% -->
      <div style="display:flex;align-items:center;gap:10px;padding:16px 18px 14px;border-bottom:1px solid rgba(255,255,255,.06)">
        <div style="position:relative;flex:6">
          <input id="qt_search" placeholder="🔍 ค้นหาเลขที่ใบเสนอราคา, บริษัท, Project..." autocomplete="off"
            oninput="Pages.quotation._filterTable(this.value)"
            style="width:100%;padding:9px 14px;border:1.5px solid rgba(255,255,255,.1);border-radius:9px;font-size:13px;background:rgba(255,255,255,.06);color:#fff;font-family:'IBM Plex Sans Thai',sans-serif;outline:none;transition:border-color .2s"
            onfocus="this.style.borderColor='var(--c-teal,#00B8AA)'" onblur="this.style.borderColor='rgba(255,255,255,.1)'"/>
          <div id="qt_ac_list" style="display:none;position:absolute;top:calc(100%+4px);left:0;right:0;background:var(--s-2,#172236);border:1px solid rgba(255,255,255,.12);border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.5);z-index:500;max-height:200px;overflow-y:auto"></div>
        </div>
        <select id="qt_status_filter"
          onchange="Pages.quotation._filterTable(document.getElementById('qt_search')?.value||'')"
          style="flex:2;padding:9px 12px;border:1.5px solid rgba(255,255,255,.1);border-radius:9px;font-size:13px;background:rgba(255,255,255,.06);color:#fff;min-width:0">
          <option value="">ทุกสถานะ</option>
          <option value="draft">📝 ร่าง</option>
          <option value="pending">⏳ รออนุมัติ</option>
          <option value="approved">✅ อนุมัติแล้ว</option>
          <option value="rejected">❌ ไม่อนุมัติ</option>
          <option value="sent">📤 ส่งแล้ว</option>
          <option value="closed">🏆 ปิดการขาย</option>
        </select>
        ${canAdd?`<button class="btn btn-pri" style="flex:2;min-width:0;white-space:nowrap;justify-content:center" onclick="Pages.quotation.create()">+ สร้างใบเสนอราคา</button>`:'<div style="flex:2"></div>'}
      </div>
      <div style="height:6px"></div>
      <div style="height:10px"></div>
      <div class="tbl-wrap"><table>
        <thead><tr><th style="color:#fff">เลขที่</th><th style="color:#fff">บริษัท</th><th>จำนวน</th><th>วันที่</th><th>มูลค่า(VAT)</th><th>สถานะ</th><th></th></tr></thead>
        <tbody>${rows||'<tr><td colspan="7" class="empty"><div class="icon">📝</div><p>ยังไม่มีใบเสนอราคา</p></td></tr>'}</tbody>
      </table></div>
    </div>`;
  },

  /* ─── Step 1: Requirement Gathering ─── */
  async create(){
    const custs=DB.customer.listCustomers();
    const cOpts='<option value="">-- เลือกลูกค้า --</option>'+custs.map(c=>`<option value="${c.id}">${c.sales_status==='Closed'?'⭐':''} ${U.esc(c.company_name)} (${c.sales_status||'-'})</option>`).join('');
    Modal.open(`
    <div class="ab info mb4"><div class="fw6">📋 ขั้นตอนที่ 1 — เก็บ Customer Requirement</div></div>
    <div class="fr">
      <div class="fg"><label class="req">บริษัท / ลูกค้า</label>
        <select id="qt_cust" onchange="Pages.quotation._fillCust(this.value)">${cOpts}</select>
      </div>
      <div class="fg"><label class="req">จำนวนพนักงาน</label>
        <input id="qt_head" type="number" placeholder="0" oninput="Pages.quotation._suggestPkg()"/>
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label>สถานที่ตรวจ</label><input id="qt_loc" placeholder="บริษัท ที่อยู่ เขต จังหวัด"/></div>
      <div class="fg"><label>งบประมาณ (฿/คน)</label><input id="qt_budget" type="number" placeholder="เช่น 1200" oninput="Pages.quotation._suggestPkg()"/></div>
    </div>
    <div class="fg"><label>ความต้องการพิเศษ</label>
      <textarea id="qt_req" placeholder="เช่น มีพนักงานหญิง 60% ต้องการ Pap Smear..."></textarea>
    </div>
    <div id="qt_suggest_wrap" style="display:none"></div>`,
    'สร้างใบเสนอราคา',async () =>{
      const cid=parseInt(document.getElementById('qt_cust').value);
      const cust=DB.customer.getCustomer(cid);
      if(!cid||!cust)return U.toast('กรุณาเลือกลูกค้า','danger');
      const head=parseInt(document.getElementById('qt_head').value)||0;
      if(!head)return U.toast('กรุณาใส่จำนวนพนักงาน','danger');
      Modal.close();
      this._openBuilder(null,cust,head,document.getElementById('qt_loc').value,document.getElementById('qt_budget').value,document.getElementById('qt_req').value);
    });
  },

  _fillCust(cid){
    const c=DB.customer.getCustomer(parseInt(cid));if(!c)return;
    const l=document.getElementById('qt_loc');const h=document.getElementById('qt_head');
    if(l&&!l.value)l.value=c.address||'';
    if(h&&!h.value&&c.employee_count)h.value=c.employee_count;
    this._suggestPkg();
  },

  _suggestPkg(){
    const head=parseInt(document.getElementById('qt_head')?.value)||0;
    const budget=parseInt(document.getElementById('qt_budget')?.value)||0;
    const wrap=document.getElementById('qt_suggest_wrap');if(!wrap||!head)return;
    let pkgName='Standard (PKG-B)';let est=1200;
    if(budget>0&&budget<=700){pkgName='Basic (PKG-A)';est=500;}
    else if(budget>=1800){pkgName='Premium (PKG-C)';est=2200;}
    wrap.style.display='block';
    wrap.innerHTML=`<div class="ab success" style="flex-direction:column;align-items:flex-start">
      <div class="fw6">🤖 AI แนะนำ: ${pkgName}</div>
      <div style="font-size:12px;margin-top:2px">ประมาณ ฿${U.fmt(Math.round(est*head*1.07))} (${head.toLocaleString()} คน รวม VAT)</div>
    </div>`;
  },

  /* ─── Builder: Multi-Package Form ─── */
  _openBuilder(qtId,cust,head,loc,budget,requirements){
    const sess=DB.auth.session();
    const today=new Date().toISOString().substr(0,10);
    const expire=new Date(Date.now()+30*86400000).toISOString().substr(0,10);
    // Load existing if editing
    const existing=qtId?DB.quotation.getQuotation(qtId):null;
    const existItems=qtId?DB.quotation.listItems(qtId):[];
    // Load exam items from config for selection
    const examItems=DB.examItems.list();
    const examCats=[...new Set(examItems.map(e=>e.category))].sort();
    const examOpts=examItems.map(e=>`<option value="${e.id}" data-cost="${e.cost}" data-price="${e.list_price}">${U.esc(e.name)} (฿${e.list_price})</option>`).join('');
    // Manpower from config
    const mpList=DB.manpowerCost.list();
    // Build existing packages for edit
    const existPkgs=existItems.filter(it=>it.type==='package');
    const existMp=existItems.filter(it=>it.type==='manpower');

    // Count packages for initial render (start with 1)
    Pages.quotation._pkgCount=existPkgs.length||1;

    const buildPkgBlock=(idx,pkg)=>{
      const isEdit=!!pkg;
      return`<div id="qt_pkg_block_${idx}" style="border:1.5px solid var(--bdr);border-radius:10px;padding:14px;margin-bottom:12px;background:var(--surf2)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="fw6" style="color:var(--navy)">Package ${idx+1}</div>
          ${idx>0?`<button type="button" class="btn btn-danger btn-xs" onclick="Pages.quotation._removePkg(${idx})">ลบ Package นี้</button>`:''}
        </div>
        <div class="fg"><label class="req">ชื่อ Package</label>
          <input id="qt_pkgname_${idx}" value="${U.esc(pkg?.name||'')}" placeholder="เช่น PKG-B Standard, Package พนักงาน..."/></div>
        <div class="fg"><label>รายการตรวจ (เลือกจากรายการ Config หรือพิมพ์เอง)</label>
          <div style="display:flex;gap:6px;margin-bottom:6px">
            <select id="qt_exam_sel_${idx}" style="flex:1" onchange="Pages.quotation._addExamFromSel(${idx})">
              <option value="">-- เลือกรายการตรวจจาก Config --</option>${examOpts}
            </select>
            <button type="button" class="btn btn-out btn-sm" onclick="Pages.quotation._addExamFromSel(${idx})">+ เพิ่ม</button>
          </div>
          <textarea id="qt_items_${idx}" placeholder="รายการตรวจ (แต่ละรายการขึ้นบรรทัดใหม่)\nเช่น:\nCBC\nFBS\nX-Ray ปอด" style="min-height:80px">${U.esc(pkg?.items_detail||'')}</textarea>
        </div>
        <div class="fr">
          <div class="fg"><label class="req">ราคาขาย/คน (฿)</label>
            <input type="number" id="qt_price_${idx}" value="${pkg?.unit_price||0}" oninput="Pages.quotation._calcAll()"/>
          </div>
          <div class="fg"><label>ต้นทุนรวม/คน (฿) <span style="font-size:10px;color:var(--txt-lt)">(จาก Config + ปรับได้)</span></label>
            <input type="number" id="qt_cost_${idx}" value="${pkg?.cost_per_unit||0}" oninput="Pages.quotation._calcAll()"/>
          </div>
        </div>
        <div id="qt_margin_${idx}" class="t-xs" style="color:var(--txt-lt);padding:4px 0"></div>
      </div>`;
    };

    const mpRows=existMp.length?existMp.map((m,i)=>`<div class="qt_mp_row" style="display:flex;gap:6px;margin-bottom:6px;align-items:center">
      <input value="${U.esc(m.role)}" placeholder="วิชาชีพ" style="flex:2;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:8px;font-size:12px;font-family:'Sarabun',sans-serif"/>
      <input type="number" value="${m.qty||1}" placeholder="จำนวน" style="width:70px;padding:7px 8px;border:1.5px solid var(--bdr);border-radius:8px;font-size:12px;font-family:'Sarabun',sans-serif"/>
      <input type="number" value="${m.unit_price||0}" placeholder="฿/คน" style="width:90px;padding:7px 8px;border:1.5px solid var(--bdr);border-radius:8px;font-size:12px;font-family:'Sarabun',sans-serif" oninput="Pages.quotation._calcAll()"/>
      <button type="button" class="btn btn-danger btn-xs" onclick="this.closest('.qt_mp_row').remove();Pages.quotation._calcAll()">✕</button>
    </div>`):'';

    let pkgsHtml='';
    if(existPkgs.length){existPkgs.forEach((p,i)=>{pkgsHtml+=buildPkgBlock(i,p);});}
    else pkgsHtml+=buildPkgBlock(0,null);

    Modal.open(`
    <div class="ab info mb4">
      <div><div class="fw6">${U.esc(cust.company_name)} | ${(head||0).toLocaleString()} คน</div>
        <div style="font-size:11px;margin-top:1px">${U.esc(loc||'')} ${budget?'| งบ ฿'+parseInt(budget).toLocaleString()+'/คน':''}</div>
      </div>
    </div>
    <div id="qt_pkgs_wrap">${pkgsHtml}</div>
    <button type="button" class="btn btn-out btn-sm mb4" onclick="Pages.quotation._addPkg()">+ เพิ่ม Package</button>

    <div class="sec-title">👥 ต้นทุนอัตรากำลัง (สำหรับคำนวณ Margin)</div>
    <div id="qt_mp_wrap">${mpRows}</div>
    <div style="display:flex;gap:6px;margin-bottom:14px">
      <select id="qt_mp_sel" style="flex:1">
        <option value="">-- เลือกจาก Config --</option>
        ${mpList.map(m=>`<option value="${m.id}" data-role="${U.esc(m.role)}" data-cost="${m.cost_per_day}">${U.esc(m.role)} (฿${U.fmt(m.cost_per_day)}/${m.unit})</option>`).join('')}
      </select>
      <button type="button" class="btn btn-out btn-sm" onclick="Pages.quotation._addMpFromSel()">+ เพิ่ม</button>
      <button type="button" class="btn btn-ghost btn-sm" onclick="Pages.quotation._addMpRow()">+ แถวว่าง</button>
    </div>

    <div class="fr">
      <div class="fg"><label class="req">จำนวนพนักงาน (คน)</label>
        <input id="qt_qty" type="number" value="${head}" oninput="Pages.quotation._calcAll()"/></div>
      <div class="fg"><label>วันที่ออก</label><input id="qt_date" type="date" value="${existing?.issue_date||today}"/></div>
      <div class="fg"><label>วันหมดอายุ</label><input id="qt_exp" type="date" value="${existing?.expiry_date||expire}"/></div>
    </div>
    <div class="fr">
      <div class="fg"><label>หมายเหตุ</label><textarea id="qt_note">${U.esc(existing?.note||requirements||'')}</textarea></div>
      <div class="fg"><label>จัดทำโดย</label><input id="qt_by" value="${U.esc(existing?.created_by||sess?.name||'')}"/></div>
    </div>
    <div style="background:linear-gradient(90deg,var(--navy),var(--navy-lt));border-radius:12px;padding:16px;margin-top:4px">
      <div id="qt_total_summary" style="color:#fff;font-size:13px">
        <div style="color:rgba(255,255,255,.5);font-size:11px">กรอกราคาและจำนวนเพื่อดูสรุป...</div>
      </div>
    </div>`,
    qtId?'แก้ไขใบเสนอราคา':'สร้างใบเสนอราคา',async ()=>{
      const qty=parseInt(document.getElementById('qt_qty').value)||0;
      if(!qty)return U.toast('กรุณาใส่จำนวนพนักงาน','danger');
      const itemsToSave=[];
      // Collect packages
      let pkgCount=0;
      for(let i=0;i<(Pages.quotation._pkgCount||1)+5;i++){
        const nameEl=document.getElementById('qt_pkgname_'+i);
        const priceEl=document.getElementById('qt_price_'+i);
        if(!nameEl)break;
        const name=nameEl.value.trim();
        const price=parseFloat(priceEl?.value)||0;
        if(!name)continue;
        const costEl=document.getElementById('qt_cost_'+i);
        const itemsEl=document.getElementById('qt_items_'+i);
        const cost=parseFloat(costEl?.value)||0;
        itemsToSave.push({type:'package',code:'PKG-'+i,name,items_detail:itemsEl?.value||'',qty,unit_price:price,cost_per_unit:cost,discount_per_unit:0,subtotal:price*qty});
        pkgCount++;
      }
      if(!pkgCount)return U.toast('กรุณาใส่อย่างน้อย 1 Package','danger');
      // Collect manpower
      document.querySelectorAll('.qt_mp_row').forEach(row=>{
        const inputs=row.querySelectorAll('input');
        if(inputs[0]&&inputs[0].value&&inputs[2]&&inputs[2].value){
          const mpRole=inputs[0].value.trim();
          const mpQty=parseInt(inputs[1]?.value)||1;
          const mpCost=parseFloat(inputs[2].value)||0;
          itemsToSave.push({type:'manpower',code:'MP',name:mpRole,items_detail:'',qty:mpQty,unit_price:mpCost,cost_per_unit:mpCost,discount_per_unit:0,subtotal:mpCost*mpQty});
        }
      });
      const qt=DB.quotation.saveQuotation({
        id:qtId||undefined,
        customer_id:cust.id,company_name:cust.company_name,
        headcount:qty,location:loc,budget:parseInt(budget)||0,requirements,
        created_by:document.getElementById('qt_by').value,
        issue_date:document.getElementById('qt_date').value,
        expiry_date:document.getElementById('qt_exp').value,
        note:document.getElementById('qt_note').value,
        status:existing?.status||'draft',
      });
      DB.quotation.saveItems(qt.id,itemsToSave);
      Modal.close();Pages.quotation.render();
      U.toast(qtId?`✅ อัปเดต ${qt.qt_no} แล้ว`:`✅ สร้าง ${qt.qt_no} สำเร็จ`);
      if(typeof NavBadges!=='undefined')NavBadges.update();
    },true);
    setTimeout(()=>Pages.quotation._calcAll(),80);
  },

  _pkgCount:1,

  _addPkg(){
    const wrap=document.getElementById('qt_pkgs_wrap');if(!wrap)return;
    const idx=this._pkgCount++;
    const block=document.createElement('div');
    block.id='qt_pkg_block_'+idx;
    const examItems=DB.examItems.list();
    const examOpts=examItems.map(e=>`<option value="${e.id}" data-cost="${e.cost}" data-price="${e.list_price}">${U.esc(e.name)} (฿${e.list_price})</option>`).join('');
    block.innerHTML=`<div style="border:1.5px solid var(--bdr);border-radius:10px;padding:14px;background:var(--surf2)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="fw6" style="color:var(--navy)">Package ${idx+1}</div>
        <button type="button" class="btn btn-danger btn-xs" onclick="Pages.quotation._removePkg(${idx})">ลบ Package นี้</button>
      </div>
      <div class="fg"><label class="req">ชื่อ Package</label><input id="qt_pkgname_${idx}" placeholder="เช่น PKG-B Standard, Package ผู้บริหาร..."/></div>
      <div class="fg"><label>รายการตรวจ</label>
        <div style="display:flex;gap:6px;margin-bottom:6px">
          <select id="qt_exam_sel_${idx}" style="flex:1" onchange="Pages.quotation._addExamFromSel(${idx})"><option value="">-- เลือกจาก Config --</option>${examOpts}</select>
          <button type="button" class="btn btn-out btn-sm" onclick="Pages.quotation._addExamFromSel(${idx})">+ เพิ่ม</button>
        </div>
        <textarea id="qt_items_${idx}" placeholder="รายการตรวจ..." style="min-height:60px"></textarea>
      </div>
      <div class="fr">
        <div class="fg"><label class="req">ราคาขาย/คน (฿)</label><input type="number" id="qt_price_${idx}" value="0" oninput="Pages.quotation._calcAll()"/></div>
        <div class="fg"><label>ต้นทุน/คน (฿)</label><input type="number" id="qt_cost_${idx}" value="0" oninput="Pages.quotation._calcAll()"/></div>
      </div>
      <div id="qt_margin_${idx}" class="t-xs" style="color:var(--txt-lt);padding:4px 0"></div>
    </div>`;
    wrap.appendChild(block);
    this._calcAll();
  },

  _removePkg(idx){document.getElementById('qt_pkg_block_'+idx)?.remove();this._calcAll();},

  _addExamFromSel(pkgIdx){
    const sel=document.getElementById('qt_exam_sel_'+pkgIdx);if(!sel||!sel.value)return;
    const opt=sel.selectedOptions[0];const name=opt.text.split('(')[0].trim();
    const cost=parseFloat(opt.dataset.cost)||0;const price=parseFloat(opt.dataset.price)||0;
    const ta=document.getElementById('qt_items_'+pkgIdx);
    if(ta){const cur=ta.value.trim();ta.value=cur?cur+'\n'+name:name;}
    // Add to cost estimate
    const costEl=document.getElementById('qt_cost_'+pkgIdx);
    if(costEl)costEl.value=(parseFloat(costEl.value)||0)+cost;
    const priceEl=document.getElementById('qt_price_'+pkgIdx);
    if(priceEl&&!parseFloat(priceEl.value))priceEl.value=price;
    sel.value='';this._calcAll();
  },

  _addMpFromSel(){
    const sel=document.getElementById('qt_mp_sel');if(!sel||!sel.value)return;
    const opt=sel.selectedOptions[0];
    const role=opt.dataset.role||opt.text.split('(')[0].trim();
    const cost=parseFloat(opt.dataset.cost)||0;
    this._addMpRow(role,1,cost);sel.value='';
  },

  _addMpRow(role,qty,cost){
    const wrap=document.getElementById('qt_mp_wrap');if(!wrap)return;
    const row=document.createElement('div');row.className='qt_mp_row';
    row.style.cssText='display:flex;gap:6px;margin-bottom:6px;align-items:center';
    row.innerHTML=`<input value="${U.esc(role||'')}" placeholder="วิชาชีพ" style="flex:2;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:8px;font-size:12px;font-family:'Sarabun',sans-serif"/>
      <input type="number" value="${qty||1}" placeholder="จำนวน" style="width:70px;padding:7px 8px;border:1.5px solid var(--bdr);border-radius:8px;font-size:12px;font-family:'Sarabun',sans-serif"/>
      <input type="number" value="${cost||0}" placeholder="฿" style="width:90px;padding:7px 8px;border:1.5px solid var(--bdr);border-radius:8px;font-size:12px;font-family:'Sarabun',sans-serif" oninput="Pages.quotation._calcAll()"/>
      <button type="button" class="btn btn-danger btn-xs" onclick="this.closest('.qt_mp_row').remove();Pages.quotation._calcAll()">✕</button>`;
    wrap.appendChild(row);this._calcAll();
  },

  _calcAll(){
    const qty=parseInt(document.getElementById('qt_qty')?.value)||0;
    let totalRevenue=0,totalCost=0,totalMpCost=0;
    // Packages
    for(let i=0;i<(this._pkgCount||1)+5;i++){
      const priceEl=document.getElementById('qt_price_'+i);
      const costEl=document.getElementById('qt_cost_'+i);
      if(!priceEl)break;
      const price=parseFloat(priceEl.value)||0;
      const cost=parseFloat(costEl?.value)||0;
      const subtotal=price*qty;const costTotal=cost*qty;
      totalRevenue+=subtotal;totalCost+=costTotal;
      const mEl=document.getElementById('qt_margin_'+i);
      if(mEl&&price>0){
        const m=price>0?((price-cost)/price*100).toFixed(1):0;
        const mc=parseFloat(m)>=30?'var(--suc)':parseFloat(m)>=15?'var(--warn)':'var(--danger)';
        mEl.innerHTML=`<span style="color:${mc};font-weight:600">Margin ${m}%</span> — ราคาขาย ฿${U.fmt(price)} | ต้นทุน ฿${U.fmt(cost)} | กำไร ฿${U.fmt(Math.round(price-cost))}/คน`;
      }else if(mEl){mEl.innerHTML='';}
    }
    // Manpower
    document.querySelectorAll('.qt_mp_row').forEach(row=>{
      const inputs=row.querySelectorAll('input');
      const mpQty=parseInt(inputs[1]?.value)||1;
      const mpCost=parseFloat(inputs[2]?.value)||0;
      totalMpCost+=mpCost*mpQty;
    });
    const vat=totalRevenue*.07;const total=totalRevenue+vat;
    const totalCostAll=totalCost+totalMpCost;
    const profit=totalRevenue-totalCostAll;
    const margin=totalRevenue>0?(profit/totalRevenue*100).toFixed(1):0;
    const mColor=parseFloat(margin)>=30?'var(--gold-lt)':parseFloat(margin)>=15?'#FCD34D':'#FCA5A5';
    const wrap=document.getElementById('qt_total_summary');
    if(wrap&&qty>0){wrap.innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
        <div><div style="font-size:9px;color:rgba(255,255,255,.45)">ราคาขาย (${qty} คน)</div><div class="fw6">฿${U.fmt(Math.round(totalRevenue))}</div></div>
        <div><div style="font-size:9px;color:rgba(255,255,255,.45)">VAT 7%</div><div>฿${U.fmt(Math.round(vat))}</div></div>
        <div><div style="font-size:9px;color:rgba(255,255,255,.45)">ต้นทุนรวม</div><div style="color:#FCA5A5">฿${U.fmt(Math.round(totalCostAll))}</div></div>
        <div><div style="font-size:9px;color:var(--gold-lt)">กำไร / Margin</div><div style="font-size:16px;font-weight:700;color:${mColor}">฿${U.fmt(Math.round(profit))} (${margin}%)</div></div>
      </div>
      <div style="font-size:11px;margin-top:8px;color:rgba(255,255,255,.45)">รวมทั้งสิ้น (VAT): <span style="color:#fff;font-weight:700;font-size:14px">฿${U.fmt(Math.round(total))}</span> | อัตรากำลัง: ฿${U.fmt(Math.round(totalMpCost))}</div>`;}
  },

  /* ─── Edit existing quotation ─── */
  async editQt(id){
    const q=DB.quotation.getQuotation(id);if(!q)return;
    const cust=DB.customer.getCustomer(q.customer_id)||{id:q.customer_id,company_name:q.company_name,address:q.location};
    this._openBuilder(id,cust,q.headcount,q.location,q.budget,q.requirements||q.note);
  },

  /* ─── View popup ─── */
  view(id){
    const q=DB.quotation.getQuotation(id);if(!q)return;
    const items=DB.quotation.listItems(id);
    const pkgs=items.filter(it=>it.type==='package');
    const mps=items.filter(it=>it.type==='manpower');
    const totalRev=pkgs.reduce((s,it)=>s+(it.qty*(it.unit_price||0)),0);
    const totalCost=items.reduce((s,it)=>s+(it.qty*(it.cost_per_unit||0)),0);
    const vat=totalRev*.07;const total=totalRev+vat;
    const profit=totalRev-totalCost;const margin=totalRev>0?(profit/totalRev*100).toFixed(1):0;
    const approvals=DB.quotation.listApprovals(id);const last=approvals.slice(-1)[0];
    const col={draft:'#9CA3AF',pending:'#F59E0B',approved:'#059669',rejected:'#E63B52',sent:'#2563EB',closed:'#10B981'}[q.status]||'#888';
    const role=DB.auth.session()?.role;
    Modal.open(`
    <div style="background:linear-gradient(90deg,#0B1D35,#172E55);border-radius:12px;padding:16px 20px;margin-bottom:14px;border:1px solid rgba(201,168,76,.2)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><div style="font-family:'IBM Plex Mono',monospace;font-size:18px;font-weight:700;color:var(--gold-lt)">${q.qt_no}</div>
          <div style="color:rgba(255,255,255,.6);font-size:12px;margin-top:2px">${U.esc(q.company_name)} | ${(q.headcount||0).toLocaleString()} คน</div></div>
        <span class="badge" style="background:${col}22;color:${col};border:1px solid ${col}44">${{draft:'ร่าง',pending:'รออนุมัติ',approved:'อนุมัติแล้ว',rejected:'ไม่อนุมัติ',sent:'ส่งแล้ว',closed:'ปิดการขาย'}[q.status]||q.status}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px">
        <div><div style="font-size:9px;color:rgba(255,255,255,.4)">วันที่ออก</div><div style="color:#fff;font-size:11px">${U.fmtD(q.issue_date)}</div></div>
        <div><div style="font-size:9px;color:rgba(255,255,255,.4)">หมดอายุ</div><div style="color:#fff;font-size:11px">${U.fmtD(q.expiry_date)}</div></div>
        <div><div style="font-size:9px;color:rgba(255,255,255,.4)">จัดทำโดย</div><div style="color:#fff;font-size:11px">${U.esc(q.created_by||'-')}</div></div>
      </div>
    </div>
    ${last?`<div class="ab ${last.approved?'success':'danger'} mb4"><div><div class="fw6">${last.approved?'✅ อนุมัติโดย':'❌ ไม่อนุมัติโดย'} ${U.esc(last.approver)}</div>${last.comment?`<div style="font-size:11px;margin-top:1px">${U.esc(last.comment)}</div>`:''}</div></div>`:''}
    <div class="sec-title">Package & รายการตรวจ</div>
    ${pkgs.map(it=>`<div style="padding:10px;background:var(--surf2);border-radius:9px;border:1px solid var(--bdr);margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div class="fw6">${U.esc(it.name)}</div>
        <div style="text-align:right;flex-shrink:0;margin-left:10px">
          <div class="t-xs t-muted">${it.qty.toLocaleString()} คน × ฿${U.fmt(it.unit_price)}</div>
          <div class="fw6">฿${U.fmt(Math.round(it.subtotal))}</div>
          ${it.cost_per_unit?`<div style="font-size:9px;color:var(--txt-lt)">ต้นทุน ฿${U.fmt(it.cost_per_unit)}/คน</div>`:''}
        </div>
      </div>
      ${it.items_detail?`<div style="font-size:11px;color:var(--t-muted,#7D92AB);margin-top:5px;white-space:pre-line;line-height:1.7">${U.esc(it.items_detail)}</div>`:''}
    </div>`).join('')}
    ${mps.length?`<div class="sec-title" style="margin-top:10px">อัตรากำลัง (ต้นทุน)</div>
    ${mps.map(m=>`<div class="sr t-sm"><span>${U.esc(m.name)} × ${m.qty}</span><span class="t-muted">฿${U.fmt(Math.round(m.unit_price*m.qty))}</span></div>`).join('')}`:''}
    <div style="display:flex;justify-content:flex-end;margin-top:12px">
      <div style="min-width:260px;background:var(--surf2);border-radius:10px;border:1px solid var(--bdr);padding:12px 16px">
        <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px"><span>ราคาก่อน VAT</span><span>฿${U.fmt(Math.round(totalRev))}</span></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px"><span>VAT 7%</span><span>฿${U.fmt(Math.round(vat))}</span></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px;color:var(--danger)"><span>ต้นทุนรวม</span><span>฿${U.fmt(Math.round(totalCost))}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0 0;margin-top:5px;border-top:2px solid var(--bdr-dk);font-size:14px;font-weight:700;color:var(--suc)"><span>กำไร / Margin</span><span>฿${U.fmt(Math.round(profit))} (${margin}%)</span></div>
        <div style="display:flex;justify-content:space-between;padding:5px 0 0;font-size:16px;font-weight:700;color:var(--navy)"><span>รวมทั้งสิ้น</span><span style="color:var(--teal)">฿${U.fmt(Math.round(total))}</span></div>
      </div>
    </div>
    ${q.note?`<div style="margin-top:10px;padding:10px 14px;background:var(--surf2);border-radius:9px;border:1px solid var(--bdr);font-size:12px"><strong>หมายเหตุ:</strong> ${U.esc(q.note)}</div>`:''}
    <div class="divider"></div>
    <div class="sec-title">เงื่อนไข (Terms & Conditions)</div>
    <div style="font-size:11px;color:var(--txt-md);white-space:pre-line;line-height:1.8;background:var(--surf2);padding:12px;border-radius:9px;border:1px solid var(--bdr)">${this.TERMS}</div>
    <div class="btn-grp mt4 no-print">
      <button class="btn btn-pri btn-sm" onclick="Pages.quotation.print(${id})">🖨 พิมพ์</button>
      ${Pages.quotation._canApprove()&&q.status==='pending'?`<button class="btn btn-gold btn-sm" onclick="Pages.quotation.approve(${id},true)">✅ อนุมัติ</button><button class="btn btn-danger btn-sm" onclick="Pages.quotation.approve(${id},false)">❌ ไม่อนุมัติ</button>`:''}
    </div>`,`ใบเสนอราคา — ${q.qt_no}`,null,true);
  },

  async submitApproval(id){
    if(!U.confirm('ส่งขออนุมัติจาก Manager?'))return;
    const q=DB.quotation.getQuotation(id);if(!q)return;
    DB.quotation.saveQuotation({...q,status:'pending'});
    this.render();U.toast('✅ ส่งขออนุมัติแล้ว');
    if(typeof NavBadges!=='undefined')NavBadges.update();
  },

  async approve(id,approved){
    const q=DB.quotation.getQuotation(id);if(!q)return;
    Modal.open(`<div class="ab ${approved?'success':'danger'} mb4">${approved?'✅ อนุมัติใบเสนอราคา':'❌ ไม่อนุมัติ — ส่งกลับแก้ไข'}</div>
    <div class="fg"><label>ความคิดเห็น</label><textarea id="ap_comment" placeholder="${approved?'ดีมาก ส่งลูกค้าได้เลย':'เหตุผลที่ไม่อนุมัติ...'}"></textarea></div>`,
    approved?'อนุมัติ':'ไม่อนุมัติ', async () => {
      DB.quotation.saveApproval({quotation_id:id,approved,approver:DB.auth.session()?.name||'Manager',comment:document.getElementById('ap_comment')?.value||'',approved_at:DB._now()});
      DB.quotation.saveQuotation({...q,status:approved?'approved':'rejected'});
      Modal.close();this.render();U.toast(approved?'✅ อนุมัติแล้ว':'❌ ส่งกลับแก้ไข');
    });
  },

  async markSent(id){
    const q=DB.quotation.getQuotation(id);if(!q)return;
    if(!U.confirm('ยืนยันว่าส่งใบเสนอราคาให้ลูกค้าแล้ว?'))return;
    DB.quotation.saveQuotation({...q,status:'sent',sent_at:DB._now()});
    this.render();U.toast('✅ บันทึกส่งลูกค้าแล้ว');
  },

  async closeWin(id){
    const q=DB.quotation.getQuotation(id);if(!q)return;
    if(!U.confirm('ลูกค้าตกลงใช้บริการ — ปิดการขาย?\nระบบจะสร้าง Project + Job Order skeleton ให้อัตโนมัติ\nจะปรากฏในทุกทีม Operation/Lab/Report/Billing'))return;
    DB.quotation.saveQuotation({...q,status:'closed',closed_at:DB._now()});
    const c=DB.customer.getCustomer(q.customer_id);
    if(c&&c.sales_status!=='Closed')DB.customer.saveCustomer({...c,sales_status:'Closed',closed_at:DB._now()});
    // ── Auto-create Project ที่ status='Closed' ให้ Role อื่นเห็นทันที ──
    let proj=DB.sales.listProjects().find(p=>p.customer_id===q.customer_id&&p.status==='Closed'&&!DB.operation.getJobOrder(p.id));
    if(!proj){
      const items=DB.quotation.listItems(id);
      const pkg=items.find(i=>i.type==='package')||items[0]||{};
      proj=DB.sales.saveProject({
        customer_id:q.customer_id,
        company_name:q.company_name||(c?c.company_name:''),
        quotation_id:id,
        package_code:pkg.code||'',
        package_name:pkg.name||'',
        headcount:q.headcount||(c?c.employee_count:0)||0,
        location:q.location||(c?c.address:'')||'',
        status:'Closed',
        created_by:DB.auth.session()?.name||'Sales',
        handover_sent:0
      });
    }
    U.toast('🎉 ปิดการขาย + สร้าง Project แล้ว! ทีม Operation เห็นแล้ว');
    this.render();
    if(typeof NavBadges!=='undefined')NavBadges.update();
  },

  async _filterTable(q){
    const statusSel=document.getElementById('qt_status_filter');
    const statusFilter=statusSel?statusSel.value:'';
    q=(q||'').toLowerCase().trim();
    // Autocomplete suggestions
    const acList=document.getElementById('qt_ac_list');
    if(acList){
      if(q.length>=1){
        const qts=DB.quotation.listQuotations();
        const matches=qts.filter(qt=>
          qt.qt_no?.toLowerCase().includes(q)||
          qt.company_name?.toLowerCase().includes(q)
        ).slice(0,6);
        if(matches.length){
          acList.style.display='block';
          acList.innerHTML=matches.map(qt=>`<div onclick="document.getElementById('qt_search').value='${qt.qt_no}';Pages.quotation._filterTable('${qt.qt_no}');document.getElementById('qt_ac_list').style.display='none'"
            style="padding:8px 12px;cursor:pointer;font-size:12px;color:var(--t-bright,#F0F4FA);border-bottom:1px solid rgba(255,255,255,.06)"
            onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background=''">
            <span style="font-family:monospace;color:var(--c-gold-lt,#E2C46A)">${qt.qt_no}</span>
            <span style="margin-left:8px">${U.esc(qt.company_name)}</span>
          </div>`).join('');
        }else{acList.style.display='none';}
      }else{acList.style.display='none';}
    }
    // Filter rows
    const tbody=document.querySelector('#content table tbody');
    if(!tbody)return;
    Array.from(tbody.querySelectorAll('tr')).forEach(tr=>{
      const txt=tr.textContent.toLowerCase();
      const matchQ=!q||txt.includes(q);
      const matchS=!statusFilter||tr.dataset.status===statusFilter;
      tr.style.display=(matchQ&&matchS)?'':'none';
    });
  },
  async del(id){
    if(!U.confirm('ลบใบเสนอราคานี้?'))return;
    DB.quotation.deleteQuotation(id);this.render();U.toast('✅ ลบแล้ว');
  },

  /* ─── Print A4 ─── */
  print(id){
    const q=DB.quotation.getQuotation(id);if(!q)return;
    const items=DB.quotation.listItems(id);
    const pkgs=items.filter(it=>it.type==='package');
    const mps=items.filter(it=>it.type==='manpower');
    const totalRev=pkgs.reduce((s,it)=>s+(it.qty*(it.unit_price||0)),0);
    const vat=totalRev*.07;const total=totalRev+vat;
    const compName=localStorage.getItem('cfg__company_name')||'OcciCare Co., Ltd.';
    const LOGO='https://occicare.com/wp-content/uploads/2025/08/occicare-logo.webp';
    const today=new Date().toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'});
    const css=`*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Sarabun,sans-serif;color:#0D1E30;background:#fff;padding:24px;font-size:13px;}.doc{max-width:760px;margin:0 auto;}.hd{background:linear-gradient(135deg,#0B2340,#1A3C65);color:#fff;padding:24px 28px;border-radius:12px 12px 0 0;}.hd-inner{display:flex;justify-content:space-between;align-items:flex-start;}.brand{display:flex;align-items:center;gap:14px;}.brand-logo{width:52px;height:52px;border-radius:10px;background:#fff;padding:4px;}.brand-logo img{width:100%;height:100%;object-fit:contain;}.brand h1{font-size:16px;font-weight:700;margin-bottom:2px;}.brand p{font-size:10px;color:rgba(255,255,255,.55);}.meta{text-align:right;}.qt-no{font-family:monospace;font-size:20px;font-weight:700;}.badge-gold{display:inline-block;margin-top:5px;padding:2px 14px;border-radius:20px;background:linear-gradient(90deg,#A07A3A,#DEC07E);font-size:10px;font-weight:700;}.body{padding:22px 28px;border:1px solid #DCE5EF;border-top:none;border-radius:0 0 12px 12px;}.parties{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px;}.party h4{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#7A90A6;margin-bottom:6px;}.party-name{font-size:14px;font-weight:700;color:#0B2340;margin-bottom:3px;}.party p{font-size:11px;color:#3A5166;line-height:1.6;}.sr{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #DCE5EF;font-size:12px;}.pkg-block{padding:12px;background:#F7FAFC;border-radius:9px;border:1px solid #DCE5EF;margin-bottom:10px;}.pkg-name{font-size:14px;font-weight:700;color:#0B2340;margin-bottom:6px;}.pkg-items{font-size:11px;color:#3A5166;white-space:pre-line;line-height:1.8;}.pkg-price{text-align:right;font-size:13px;font-weight:600;margin-top:6px;}.summary{display:flex;justify-content:flex-end;margin:12px 0;}.sum-box{width:260px;background:#F7FAFC;border-radius:9px;border:1px solid #DCE5EF;padding:12px 14px;}.sum-row{display:flex;justify-content:space-between;padding:3px 0;font-size:12px;}.sum-total{display:flex;justify-content:space-between;padding:9px 0 0;margin-top:5px;border-top:2px solid #B4C4D4;font-weight:700;font-size:15px;color:#0B2340;}.terms{background:#F7FAFC;border-radius:9px;border:1px solid #DCE5EF;padding:12px 14px;margin-top:14px;white-space:pre-line;font-size:10.5px;color:#3A5166;line-height:1.8;}.signs{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px;padding-top:14px;border-top:1px solid #DCE5EF;}.sign{text-align:center;}.sline{height:60px;border-bottom:1px dashed #B4C4D4;margin-bottom:7px;}.slabel{font-size:9px;font-weight:700;text-transform:uppercase;color:#7A90A6;}.footer{display:flex;justify-content:space-between;margin-top:12px;padding-top:8px;border-top:1px solid #DCE5EF;font-size:9px;color:#B4C4D4;}.no-print{padding:0 0 16px;}.btn-p{padding:8px 20px;background:linear-gradient(135deg,#0B2340,#1A3C65);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;}@media print{@page{size:A4;margin:12mm;}.no-print{display:none!important;}}`;
    const pkgHtml=pkgs.map(it=>'<div class="pkg-block"><div class="pkg-name">'+U.esc(it.name)+'</div>'+(it.items_detail?'<div class="pkg-items">'+U.esc(it.items_detail)+'</div>':'')+'<div class="pkg-price">'+it.qty.toLocaleString()+' คน × ฿'+U.fmt(it.unit_price)+' = ฿'+U.fmt(Math.round(it.subtotal))+'</div></div>').join('');
    const w=window.open('','_blank');
    w.document.write('<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>Quotation '+q.qt_no+'</title>'+
      '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">'+
      '<style>'+css+'</style></head><body><div class="doc">'+
      '<div class="no-print"><button class="btn-p" onclick="window.print()">🖨 พิมพ์ A4</button></div>'+
      '<div class="hd"><div class="hd-inner">'+
        '<div class="brand"><div class="brand-logo"><img src="'+LOGO+'" onerror="this.parentElement.innerHTML=\'🏥\'" alt=""/></div>'+
          '<div><h1>'+compName+'</h1><p>Mobile Checkup Health Service</p></div></div>'+
        '<div class="meta"><div class="qt-no">'+q.qt_no+'</div>'+
          '<div style="font-size:10px;color:rgba(255,255,255,.55);margin-top:2px">วันที่: '+today+'</div>'+
          '<div class="badge-gold">ใบเสนอราคา / QUOTATION</div></div></div></div>'+
      '<div class="body">'+
        '<div class="parties"><div class="party"><h4>ผู้เสนอราคา</h4><div class="party-name">'+compName+'</div><p>บริการตรวจสุขภาพเคลื่อนที่</p></div>'+
          '<div class="party"><h4>ลูกค้า</h4><div class="party-name">'+U.esc(q.company_name)+'</div><p>สถานที่: '+U.esc(q.location||'-')+'</p></div></div>'+
        '<div class="sr"><span>จำนวนพนักงาน</span><span><strong>'+q.headcount.toLocaleString()+' คน</strong></span></div>'+
        '<div class="sr"><span>วันที่ออก</span><span>'+U.fmtD(q.issue_date)+'</span></div>'+
        '<div class="sr"><span>หมดอายุ</span><span>'+U.fmtD(q.expiry_date)+'</span></div>'+
        '<div class="sr" style="margin-bottom:12px"><span>จัดทำโดย</span><span>'+U.esc(q.created_by||'-')+'</span></div>'+
        pkgHtml+
        '<div class="summary"><div class="sum-box">'+
          '<div class="sum-row"><span>รวมก่อน VAT</span><span>฿'+U.fmt(Math.round(totalRev))+'</span></div>'+
          '<div class="sum-row"><span>VAT 7%</span><span>฿'+U.fmt(Math.round(vat))+'</span></div>'+
          '<div class="sum-total"><span>รวมทั้งสิ้น</span><span>฿'+U.fmt(Math.round(total))+'</span></div>'+
        '</div></div>'+
        (q.note?'<div style="padding:10px 14px;background:#F7FAFC;border-radius:9px;border:1px solid #DCE5EF;font-size:12px;margin-bottom:10px"><strong>หมายเหตุ:</strong> '+U.esc(q.note)+'</div>':'')+
        '<div class="terms"><strong>เงื่อนไข (Terms & Conditions)</strong>\n'+this.TERMS+'</div>'+
        '<div class="signs"><div class="sign"><div class="sline"></div><div class="slabel">ผู้จัดทำ</div><div class="sname">'+U.esc(q.created_by||'')+'</div></div>'+
          '<div class="sign"><div class="sline"></div><div class="slabel">ผู้มีอำนาจอนุมัติ</div></div></div>'+
        '<div class="footer"><span>'+compName+'</span><span>พิมพ์: '+today+'</span></div>'+
      '</div></div></body></html>');w.document.close();
  },
};


Pages.sales={async render(){
  const projs=DB.sales.listProjects();
  const canAdd=DB.auth.can('add','sales'),canEdit=DB.auth.can('edit','sales'),canDel=DB.auth.can('delete','sales');
  const rows=projs.slice().reverse().map(p=>{
    const ticked=!!p.handover_sent;
    let hasFiles=false;try{hasFiles=DB.files&&DB.files.listByContext?DB.files.listByContext('proj_'+p.id).length>0:false;}catch(e){hasFiles=false;}
    return`<tr>
      <td class="fw6">${p.project_code}</td>
      <td>${U.esc(p.company_name)}</td>
      <td>${(p.headcount||0).toLocaleString()}</td>
      <td>${U.fmtD(p.onsite_date)}</td>
      <td>${p.due_date?U.fmtD(p.due_date):'<span class="t-muted t-sm">-</span>'}</td>
      <td>${U.badge(p.status)}</td>
      <td style="text-align:center;vertical-align:middle;padding:6px 4px">
        ${ticked
          ?`<div style="display:inline-flex;flex-direction:column;align-items:center;gap:1px;cursor:pointer" onclick="${canEdit?`Pages.sales.tickHandover(${p.id},false)`:''}" title="${canEdit?'คลิกเพื่อยกเลิก':''}">
              <span style="font-size:16px">✅</span>
              ${p.handover_date?`<div style="font-size:9.5px;color:#6EE7B7;font-weight:600">${U.fmtD(p.handover_date)}</div>`:''}
            </div>`
          :(canEdit
            ?`<input type="checkbox" style="width:16px;height:16px;cursor:pointer" onchange="Pages.sales.tickHandover(${p.id},this.checked)" title="คลิกเพื่อบันทึกเวียนเอกสาร"/>`
            :'⬜')}
      </td>
      <td>${U.recordedByCell(p.recorded_by)}</td>
      <td style="text-align:center">
        ${canEdit?`<button class="btn btn-xs" onclick="Pages.sales.openStaffing(${p.id})" title="${(()=>{const st=DB.sales.getStaffing(p.id);return st&&st.stations&&st.stations.length>0?'อัตรากำลัง: '+st.stations.length+' Station':'ลงอัตรากำลัง';})()}" style="${(()=>{const st=DB.sales.getStaffing(p.id);const has=st&&st.stations&&st.stations.length>0;return has?'background:rgba(110,231,183,.12);border:1px solid rgba(110,231,183,.4);color:#6EE7B7':'background:rgba(240,205,127,.08);border:1px solid rgba(240,205,127,.3);color:#F0CD7F';})()};border-radius:6px;padding:4px 10px;font-size:11px;font-weight:600;font-family:inherit;cursor:pointer;white-space:nowrap">${(()=>{const st=DB.sales.getStaffing(p.id);const has=st&&st.stations&&st.stations.length>0;return has?'👥 '+st.stations.length+' Station':'👤 ลงอัตรากำลัง';})()}</button>`:'-'}
      </td>
      <td>
        ${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.sales.editProject(${p.id})">แก้ไข</button>`:''}
        <button class="btn btn-out btn-xs" onclick="Pages.sales.viewHandover(${p.id})">เอกสาร</button>
        <button class="btn btn-out btn-xs" onclick="Pages.sales.manageFiles(${p.id})" title="ไฟล์แนบ">${hasFiles?'📎✓':'📎'}</button>
        ${canDel?`<button class="btn btn-danger btn-xs" onclick="Pages.sales.deleteProj(${p.id})">ลบ</button>`:''}
      </td>
    </tr>`;
  }).join('');
  document.getElementById('content').innerHTML=`<div class="ph"><div><h2>💼 Sales — Project & Handover</h2><p>ปิดการขายและส่งเอกสารเวียน</p></div>${canAdd?`<button class="btn btn-pri" onclick="Pages.sales.addProject()">+ ปิดการขาย / สร้าง Project</button>`:''}</div>
  <div class="card">
    <div style="padding:14px 18px 14px;border-bottom:1px solid rgba(255,255,255,.06)">
      <input id="sales_search" placeholder="🔍 ค้นหา Project Code, บริษัท..." autocomplete="off"
        oninput="(function(q){const tb=document.querySelector('#sales_table tbody');if(!tb)return;q=q.toLowerCase();Array.from(tb.querySelectorAll('tr')).forEach(tr=>{tr.style.display=(!q||tr.textContent.toLowerCase().includes(q))?'':'none';});})(this.value)"
        style="flex:1;padding:8px 14px;border:1.5px solid rgba(255,255,255,.1);border-radius:9px;font-size:13px;background:rgba(255,255,255,.06);color:#fff;font-family:'IBM Plex Sans Thai',sans-serif;outline:none"
        onfocus="this.style.borderColor='var(--c-teal,#00B8AA)'" onblur="this.style.borderColor='rgba(255,255,255,.1)'"/>
    </div>
    <div style="height:10px"></div>
    <div class="tbl-wrap"><table id="sales_table"><thead><tr><th>Project Code</th><th>บริษัท</th><th>จำนวน</th><th>วันตรวจ</th><th>กำหนดส่งผล</th><th>สถานะ</th><th style="text-align:center;min-width:90px">เวียนเอกสาร</th><th>ผู้บันทึก</th><th style="text-align:center;min-width:130px;color:#6EE7B7">👥 อัตรากำลัง</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="10" class="empty"><div class="icon">💼</div><p>ยังไม่มี Project</p></td></tr>'}</tbody></table></div></div>`;
},
// ═══ ลงอัตรากำลัง — Staffing modal ═══
openStaffing(pid){
  const p = DB.sales.getProject(pid);
  if(!p){U.toast('ไม่พบ Project','danger');return;}
  const existing = DB.sales.getStaffing(pid)||{};
  const allStations = getStations().filter(s=>s.active!==false);
  const savedStations = existing.stations||[];
  const savedMap = {};
  savedStations.forEach(s=>{savedMap[s.code]=s;});

  const rowsHtml = allStations.map(st=>{
    const saved = savedMap[st.code];
    const checked = !!saved;
    const staffCount = saved?.staff_count||'';
    const examCount = saved?.exam_count||(p.headcount||'');
    const note = saved?.note||'';
    return `<div class="staff-row" data-stcode="${st.code}" style="display:grid;grid-template-columns:30px 1fr 80px 90px 1fr;gap:8px;align-items:center;padding:8px 11px;background:${checked?'rgba(240,205,127,.05)':'var(--s-2,#162338)'};border:1px solid ${checked?'rgba(240,205,127,.25)':'rgba(255,255,255,.06)'};border-radius:7px;margin-bottom:5px;transition:all .15s">
      <input type="checkbox" data-stf="check" ${checked?'checked':''} 
        style="width:15px;height:15px;accent-color:#F0CD7F;margin:0"
        onchange="(function(el){const r=el.closest('.staff-row');const c=el.checked;r.style.background=c?'rgba(240,205,127,.05)':'var(--s-2,#162338)';r.style.borderColor=c?'rgba(240,205,127,.25)':'rgba(255,255,255,.06)';r.querySelectorAll('input[type=number],input[type=text]').forEach(x=>{x.disabled=!c;x.style.opacity=c?'1':'.45';});})(this)"/>
      <div style="min-width:0">
        <div style="font-size:12px;font-weight:600;color:#FFFFFF">${U.esc(st.code)} ${U.esc(st.name)}</div>
      </div>
      <input type="number" data-stf="staff" value="${staffCount}" placeholder="คน" ${!checked?'disabled':''} style="padding:5px 8px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.15);border-radius:4px;color:#FFFFFF;font-size:11.5px;text-align:center;font-family:inherit;opacity:${checked?'1':'.45'}"/>
      <input type="number" data-stf="exam" value="${examCount}" placeholder="ตรวจ" ${!checked?'disabled':''} style="padding:5px 8px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.15);border-radius:4px;color:#FFFFFF;font-size:11.5px;text-align:center;font-family:inherit;opacity:${checked?'1':'.45'}"/>
      <input type="text" data-stf="note" value="${U.esc(note)}" placeholder="-" ${!checked?'disabled':''} style="padding:5px 8px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.15);border-radius:4px;color:#FFFFFF;font-size:11.5px;font-family:inherit;opacity:${checked?'1':'.45'}"/>
    </div>`;
  }).join('');

  Modal.open(`
    <div class="ab info" style="margin-bottom:11px;font-size:12px">
      <div style="flex:1"><div class="fw6">📌 เลือก Station ที่จะใช้และกำหนดจำนวนเจ้าหน้าที่</div>
      <div class="t-sm" style="margin-top:2px">ข้อมูลนี้จะใช้เป็นค่า default เมื่อ Operation สร้างใบแจ้งงาน</div></div>
    </div>
    <div style="background:var(--s-2,#162338);padding:10px 13px;border-radius:7px;margin-bottom:11px;font-size:12px">
      <div style="font-family:'IBM Plex Mono',monospace;color:#F0CD7F;font-weight:700;font-size:12px">${U.esc(p.project_code)}</div>
      <div class="fw6">${U.esc(p.company_name)}</div>
      <div class="t-sm t-muted">${U.fmtD(p.onsite_date)} · ${(p.headcount||0).toLocaleString()} คน</div>
    </div>
    <div style="display:grid;grid-template-columns:30px 1fr 80px 90px 1fr;gap:8px;padding:5px 11px;font-size:10.5px;color:#FFFFFF;opacity:.75;font-family:'IBM Plex Mono',monospace;font-weight:600;letter-spacing:.5px;text-transform:uppercase">
      <div></div><div>Station</div><div style="text-align:center">เจ้าหน้าที่</div><div style="text-align:center">จำนวนตรวจ</div><div>หมายเหตุ</div>
    </div>
    <div id="staffing_list" style="max-height:340px;overflow-y:auto">${rowsHtml}</div>
    <div class="fg" style="margin-top:12px"><label>หมายเหตุภาพรวม</label>
      <textarea id="staff_note" style="width:100%;min-height:50px;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-family:inherit;font-size:12px;resize:vertical" placeholder="หมายเหตุเพิ่มเติม...">${U.esc(existing.note||'')}</textarea>
    </div>
    <div style="margin-top:11px;padding-top:11px;border-top:1px solid rgba(255,255,255,.06)">${U.recordedByField(existing.recorded_by||'','sf_rb')}</div>
  `, `👥 ลงอัตรากำลัง — ${p.project_code}`, ()=>{
    const stations = [];
    document.querySelectorAll('.staff-row').forEach(row=>{
      const checkbox = row.querySelector('[data-stf="check"]');
      if(!checkbox || !checkbox.checked) return;
      const code = row.dataset.stcode;
      const stConfig = allStations.find(s=>s.code===code);
      stations.push({
        code: code,
        name: stConfig?.name||'',
        staff_count: parseInt(row.querySelector('[data-stf="staff"]').value)||0,
        exam_count: parseInt(row.querySelector('[data-stf="exam"]').value)||0,
        note: row.querySelector('[data-stf="note"]').value.trim()
      });
    });
    DB.sales.saveStaffing({
      project_id: pid,
      stations: stations,
      note: document.getElementById('staff_note').value.trim(),
      _override_recorded_by: U.recordedByValue('sf_rb')||undefined
    });
    Modal.close();
    this.render();
    U.toast(`✅ บันทึกอัตรากำลัง ${stations.length} Station`);
  }, true);
},

async addProject(){
  const allCusts=DB.customer.listCustomers();
  if(!allCusts.length){U.toast('ยังไม่มีลูกค้า กรุณาเพิ่มลูกค้าใน CRM ก่อน','warning');Router.navigate('customers');return;}
  // Show all, but mark Closed with ⭐
  const cOpts='<option value="">-- เลือกบริษัท --</option>'+allCusts.map(c=>`<option value="${c.id}">${c.sales_status==='Closed'?'⭐':''} ${U.esc(c.company_name)} (${c.sales_status||'-'})</option>`).join('');
  const sess=DB.auth.session();
  Modal.open(`
  <div class="fg"><label class="req">บริษัท/ลูกค้า (เฉพาะสถานะ Closed)</label>
    <select id="sp_cust_sel" onchange="Pages.sales._fillFromCust(this.value)"><option value="">-- เลือกบริษัท --</option>${cOpts}</select>
  </div>
  <div class="fr"><div class="fg"><label class="req">วันที่ออกตรวจ</label><input id="sp_date" type="date"/></div>
    <div class="fg"><label class="req">วันที่กำหนดส่งผล</label><input id="sp_due" type="date"/></div>
  </div>
  <div class="fr"><div class="fg"><label>เวลาเริ่ม</label><input id="sp_ts" type="time" value="07:00"/></div>
    <div class="fg"><label>เวลาสิ้นสุด</label><input id="sp_te" type="time" value="16:00"/></div>
      <div class="fg"><label>วันที่สิ้นสุด</label><input id="sp_end" type="date"/></div>
  </div>
  <div class="fg"><label class="req">จำนวนคน</label><input id="ac_head" type="number"/></div>
  <div class="fg"><label class="req">สถานที่</label><input id="ac_loc" placeholder="ที่อยู่เต็ม"/></div>
  <div class="fr"><div class="fg"><label class="req">ชื่อผู้ประสานงาน</label><input id="ac_coord"/></div>
    <div class="fg"><label class="req">เบอร์โทร</label><input id="ac_cphone"/></div>
  </div>
  <div class="fr"><div class="fg"><label>เงื่อนไขพิเศษ</label><textarea id="sp_cond"></textarea></div>
    <div class="fg"><label>สร้างโดย</label><input id="sp_by" value="${sess?U.esc(sess.name):''}"/></div>
  </div>
  <div class="divider"></div>
  <div class="sec-title">📋 เวียนเอกสาร</div>
  <div class="ab info" style="font-size:12px;padding:8px 12px">ติ๊กได้หลังจากส่งเอกสารเวียนให้ทีมที่เกี่ยวข้องแล้ว</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
    <label style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--surf2);border:1.5px solid var(--bdr);border-radius:9px;cursor:pointer;font-size:13px" id="sp_hw_lbl">
      <input type="checkbox" id="sp_hw" style="width:15px;height:15px;accent-color:var(--suc)"
        onchange="(function(el){const l=document.getElementById('sp_hw_lbl');const d=document.getElementById('sp_hw_date');l.style.background=el.checked?'#F0FDF4':'var(--surf2)';l.style.borderColor=el.checked?'#86EFAC':'var(--bdr)';if(el.checked&&d&&!d.value)d.value=new Date().toISOString().substr(0,10);})(this)"/>
      ส่งเอกสารเวียนแล้ว
    </label>
    <div class="fg" style="margin:0"><label style="font-size:11px;color:var(--txt-lt)">วันที่ส่งเวียน</label>
      <input type="date" id="sp_hw_date" style="padding:6px 10px;font-size:12px"/>
    </div>
  </div>`,
  'ปิดการขาย / สร้าง Project ใหม่', async () => {
    const cid=parseInt(document.getElementById('sp_cust_sel').value);
    const cust=DB.customer.getCustomer(cid);
    if(!cid||!cust)return U.toast('กรุณาเลือกบริษัท','danger');
    const head=parseInt(document.getElementById('ac_head').value)||0;
    const date=document.getElementById('sp_date').value;
    const due=document.getElementById('sp_due').value;
    if(!head||!date)return U.toast('กรุณากรอกข้อมูลให้ครบ','danger');
    const hwSent=document.getElementById('sp_hw')?.checked||false;
    const hwDate=document.getElementById('sp_hw_date')?.value||null;
    const proj=DB.sales.saveProject({customer_id:cid,company_name:cust.company_name,headcount:head,onsite_date:date,end_date:document.getElementById('sp_end')?.value||null,due_date:due,onsite_time:document.getElementById('sp_ts').value,onsite_time_end:document.getElementById('sp_te').value,location:document.getElementById('ac_loc').value.trim(),coordinator_name:document.getElementById('ac_coord').value.trim(),coordinator_phone:document.getElementById('ac_cphone').value.trim(),status:'Closed',created_by:document.getElementById('sp_by').value.trim(),handover_sent:hwSent,handover_date:hwDate});
    DB.sales.saveHandover({project_id:proj.id,conditions:document.getElementById('sp_cond').value.trim(),sent_at:DB._now()});
    Modal.close();this.render();U.toast(`✅ สร้าง Project ${proj.project_code} สำเร็จ`);
    if(typeof LineNotify!=='undefined')LineNotify.send(`📋 [MCK] สร้าง Project ใหม่\n${proj.project_code}\n🏢 ${cust.company_name}\n📆 วันตรวจ: ${proj.onsite_date}`);
    if(typeof NavBadges!=='undefined')NavBadges.update();
  });
},
_fillFromCust(cid){
  const c=DB.customer.getCustomer(parseInt(cid));if(!c)return;
  const el=id=>document.getElementById(id);
  if(el('ac_loc'))el('ac_loc').value=c.address||'';
  if(el('ac_coord'))el('ac_coord').value=c.contact_name||'';
  if(el('ac_cphone'))el('ac_cphone').value=c.phone||'';
  if(el('ac_head'))el('ac_head').value=c.employee_count||'';
},
async editProject(id){
  const p=DB.sales.getProject(id);
  Modal.open(`<div class="fg"><label>Project Code</label><input value="${p.project_code}" disabled/></div>
  <div class="fr3"><div class="fg"><label>จำนวนคน</label><input id="ep_h" type="number" value="${p.headcount}"/></div>
    <div class="fg"><label>วันตรวจ</label><input id="ep_d" type="date" value="${p.onsite_date}"/></div>
    <div class="fg"><label>วันที่สิ้นสุด</label><input id="ep_end" type="date" value="${p.end_date||''}"/></div></div>
    <div style="margin-top:10px">${U.recordedByField(p.recorded_by||'','ep_rb')}</div>
  <div class="fr"><div class="fg"><label>เวลาเริ่ม</label><input id="ep_ts" type="time" value="${p.onsite_time||'07:00'}"/></div>
    <div class="fg"><label>เวลาสิ้นสุด</label><input id="ep_te" type="time" value="${p.onsite_time_end||'16:00'}"/></div></div>
  <div class="fr"><div class="fg"><label>สถานที่</label><input id="ep_loc" value="${U.esc(p.location||'')}"/></div>
    <div class="fg"><label>กำหนดส่งผล</label><input id="ep_due" type="date" value="${p.due_date||''}"/></div></div>
  <div class="fr"><div class="fg"><label>ผู้ประสานงาน</label><input id="ep_co" value="${U.esc(p.coordinator_name||'')}"/></div>
    <div class="fg"><label>เบอร์ประสานงาน</label><input id="ep_cp" value="${U.esc(p.coordinator_phone||'')}"/></div></div>
  <div class="divider"></div>
  <div class="sec-title">📋 เวียนเอกสาร</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    <label style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:${p.handover_sent?'#F0FDF4':'var(--surf2)'};border:1.5px solid ${p.handover_sent?'#86EFAC':'var(--bdr)'};border-radius:9px;cursor:pointer;font-size:13px" id="ep_hw_lbl">
      <input type="checkbox" id="ep_hw" ${p.handover_sent?'checked':''} style="width:15px;height:15px;accent-color:var(--suc)"
        onchange="(function(el){const l=document.getElementById('ep_hw_lbl');const d=document.getElementById('ep_hw_date');l.style.background=el.checked?'#F0FDF4':'var(--surf2)';l.style.borderColor=el.checked?'#86EFAC':'var(--bdr)';if(el.checked&&d&&!d.value)d.value=new Date().toISOString().substr(0,10);})(this)"/>
      ${p.handover_sent?'✅ ':''}ส่งเวียนเอกสารแล้ว
    </label>
    <div class="fg" style="margin:0"><label style="font-size:11px;color:var(--txt-lt)">วันที่ส่งเวียน</label>
      <input type="date" id="ep_hw_date" value="${p.handover_date||''}" style="padding:6px 10px;font-size:12px"/>
    </div>
  </div>`,
  'แก้ไข Project', async () => {
    const hwS=document.getElementById('ep_hw')?.checked||false;
    const hwD=document.getElementById('ep_hw_date')?.value||null;
    DB.sales.saveProject({...p,headcount:parseInt(document.getElementById('ep_h').value)||p.headcount,onsite_date:document.getElementById('ep_d').value,end_date:document.getElementById('ep_end').value||null,onsite_time:document.getElementById('ep_ts').value,onsite_time_end:document.getElementById('ep_te').value,location:document.getElementById('ep_loc').value,due_date:document.getElementById('ep_due').value,coordinator_name:document.getElementById('ep_co').value,coordinator_phone:document.getElementById('ep_cp').value,handover_sent:hwS,handover_date:hwD,_override_recorded_by:U.recordedByValue('ep_rb')||undefined});
    Modal.close();this.render();U.toast('✅ อัปเดต Project แล้ว');
  });
},
async viewHandover(id){
  const p=DB.sales.getProject(id),h=DB.sales.getHandover(id);
  Modal.open(`<div class="ab success mb4">📄 Internal Handover Document</div>
  <div class="sr"><span>Project Code</span><span class="fw6">${p.project_code}</span></div>
  <div class="sr"><span>บริษัท</span><span class="fw6">${p.company_name}</span></div>
  <div class="sr"><span>วันตรวจ</span><span>${U.fmtD(p.onsite_date)} เวลา ${p.onsite_time||'-'} – ${p.onsite_time_end||'-'}</span></div>
  <div class="sr"><span>สถานที่</span><span>${p.location||'-'}</span></div>
  <div class="sr"><span>จำนวน</span><span class="fw6">${(p.headcount||0).toLocaleString()} คน</span></div>
  <div class="sr"><span>Package</span><span>${p.package_code||'-'}</span></div>
  <div class="sr"><span>ผู้ประสานงาน</span><span>${p.coordinator_name||'-'} โทร ${p.coordinator_phone||'-'}</span></div>
  <div class="divider"></div>
  <div class="sr"><span>เงื่อนไขพิเศษ</span><span>${h?.conditions||'-'}</span></div>
  <div class="sr"><span>ไฟล์ Layout</span><span class="tag">${h?.layout_file||'ยังไม่มี'}</span></div>
  <div class="sr"><span>ไฟล์รายชื่อ</span><span class="tag">${h?.name_list_file||'ยังไม่มี'}</span></div>
  <div class="sr"><span>ใบเสนอราคา</span><span class="tag">${h?.quotation_file||'ยังไม่มี'}</span></div>`,
  'เอกสารเวียนภายใน');
},
async tickHandover(id,val){
  const p=DB.sales.getProject(id);if(!p)return;
  const today=new Date().toISOString().substr(0,10);
  DB.sales.saveProject({...p,handover_sent:val,handover_date:val?today:null});
  this.render();
  U.toast(val?`✅ บันทึกเวียนเอกสาร — ${new Date().toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'})}`:'↩ ยกเลิก');
  if(typeof NavBadges!=='undefined')NavBadges.update();
},
async deleteProj(id){
  if(!U.confirm('ลบ Project นี้ทั้งหมด?'))return;
  DB.sales.deleteProject(id);this.render();
  U.toast('✅ ลบ Project แล้ว');
  if(typeof NavBadges!=='undefined')NavBadges.update();
},
async manageFiles(id){
  const p=DB.sales.getProject(id);
  const cats=[
    {key:'namelist',  label:'ไฟล์รายชื่อ',       icon:'👥'},
    {key:'layout',    label:'Layout',             icon:'🗺'},
    {key:'report_doc',label:'เอกสารเวียนทำผล',   icon:'📋'},
    {key:'contract',  label:'ข้อตกลงใช้บริการ',  icon:'📝'},
  ];
  const ctx='proj_'+id;
  const allFiles=DB.files.listByContext(ctx);
  const mimeIcon=m=>{if(!m)return'📎';if(m.includes('image'))return'🖼';if(m.includes('pdf'))return'📄';if(m.includes('sheet')||m.includes('excel')||m.includes('csv'))return'📊';if(m.includes('word'))return'📝';return'📎';};
  let html=`<div class="ab success mb4">💾 ไฟล์ทั้งหมดเก็บใน Database — ${U.esc(p.project_code)} | ${U.esc(p.company_name)}</div>`;
  cats.forEach(cat=>{
    const files=allFiles.filter(f=>f.category===cat.key);
    html+=`<div style="margin-bottom:16px">
      <div class="sec-title">${cat.icon} ${cat.label} <span class="badge b-draft">${files.length} ไฟล์</span></div>
      ${files.map(f=>`<div style="display:flex;align-items:center;gap:9px;padding:8px 12px;background:var(--surf2);border:1px solid var(--bdr);border-radius:9px;margin-bottom:5px;font-size:12px">
        <span style="font-size:18px;flex-shrink:0">${mimeIcon(f.mime_type)}</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${U.esc(f.name)}</div>
          <div class="t-xs t-muted">${f.size_label} · ${f.uploaded_by||'-'} · ${U.fmtD(f.created_at)}</div>
        </div>
        ${f.data?`<button class="btn btn-out btn-xs" onclick="Pages.sales._downloadFile(${f.id})">⬇ ดาวน์โหลด</button>`:'<span class="t-xs t-muted">ไฟล์ใหญ่</span>'}
        <button style="background:none;border:none;cursor:pointer;color:var(--danger);font-size:15px;padding:2px 5px;border-radius:5px" onclick="Pages.sales._rmFile(${f.id},${id})">✕</button>
      </div>`).join('')}
      ${!files.length?`<div style="padding:6px 0;font-size:12px;color:var(--txt-lt)">ยังไม่มีไฟล์</div>`:''}
      <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:2px dashed var(--bdr-dk);border-radius:var(--r);cursor:pointer;color:var(--txt-lt);background:var(--surf2);transition:all .2s;margin-top:5px">
        <span style="font-size:20px">📁</span>
        <div><div style="font-size:13px;font-weight:500">คลิกเพื่อแนบไฟล์</div><div class="t-xs t-muted">รองรับทุกประเภท ขนาดสูงสุด 5MB/ไฟล์ (เก็บใน DB)</div></div>
        <input type="file" multiple style="display:none" onchange="Pages.sales._addFile(${id},'${cat.key}','${cat.label}',this)" accept="*/*"/>
      </label>
    </div>`;
  });
  Modal.open(html,'จัดการไฟล์แนบ — เก็บในฐานข้อมูล',null,true);
},
_addFile(pid,catKey,catLabel,inp){
  const ctx='proj_'+pid;
  DB.files.addFiles(ctx,catKey,catLabel,inp.files).then(results=>{
    U.toast(`✅ บันทึก ${results.length} ไฟล์ลง Database แล้ว`);
    this.manageFiles(pid);
  }).catch(()=>U.toast('เกิดข้อผิดพลาดในการอ่านไฟล์','danger'));
},
_downloadFile(fileId){
  const f=DB.files.getFile(fileId);
  if(!f||!f.data){U.toast('ไม่มีข้อมูลไฟล์ (ไฟล์ใหญ่เกิน 5MB)','warning');return;}
  const a=document.createElement('a');
  a.href=f.data;
  a.download=f.name;
  a.click();
},
_rmFile(fileId,pid){
  if(!U.confirm('ลบไฟล์นี้ออกจากฐานข้อมูล?'))return;
  DB.files.deleteFile(fileId);
  this.manageFiles(pid);
  U.toast('✅ ลบไฟล์แล้ว');
}};

/* ── OP CHECKLIST (เตรียมงาน) ── */
Pages.op_checklist={
  async render(){
    // เฉพาะ Project ที่ปิดการขายแล้วและกำลังเตรียมงาน
    const projs=DB.sales.listProjects().filter(p=>['Closed','Onsite','Lab','Report','Billing','Completed'].includes(p.status));
    const canEdit=DB.auth.can('edit','op_prep');
    const pOpts=`<option value="">-- เลือก Project --</option>`+projs.map(p=>`<option value="${p.id}">${p.project_code} — ${p.company_name} (${U.fmtD(p.onsite_date)})</option>`).join('');
    document.getElementById('content').innerHTML=`
    <div class="ph"><div><h2>✅ Operation — เตรียมงาน (Checklist)</h2><p>บันทึกสถานะการเตรียมงานก่อนออกหน่วย</p></div></div>
    <div class="card mb4">
      <div class="fg"><label>เลือก Project</label>
        <select id="ckl_sel" onchange="Pages.op_checklist.loadProject(parseInt(this.value))">
          ${pOpts}
        </select>
      </div>
    </div>
    <div id="ckl_detail"><div class="empty"><div class="icon">📋</div><p>กรุณาเลือก Project เพื่อดู Checklist</p></div></div>`;
  },
  async loadProject(pid){
    if(!pid){document.getElementById('ckl_detail').innerHTML='<div class="empty"><div class="icon">📋</div><p>กรุณาเลือก Project</p></div>';return;}
    const p=DB.sales.getProject(pid);
    if(!p)return;
    document.getElementById('ckl_sel').value=pid;
    const jo=DB.operation.getJobOrder(pid);
    const saved=DB.checklist.getByProject(pid)||{};
    const canEdit=DB.auth.can('edit','op_prep');
    // Load items from Config Checklist (with custom items)
    const configItems=Pages.config_checklist?Pages.config_checklist.getActive():[];
    const ITEMS=configItems.map(ci=>({
      key:ci.key,group:ci.group,label:ci.label,icon:ci.icon||'📌',
      note:ci.key==='select_company'?p.company_name:ci.key==='job_order'?(jo?`สร้างแล้ว — สถานะ: ${jo.status||'Draft'}`:'ยังไม่ได้สร้าง'):(saved[ci.key+'_note']||''),
      warn:ci.key==='job_order'&&!jo
    }));
    const groups=[...new Set(ITEMS.map(i=>i.group))];
    const doneCount=ITEMS.filter(i=>saved[i.key]).length;
    const pct=Math.round(doneCount/ITEMS.length*100);
    let html=`
    <div class="metrics-grid">
      <div class="metric-card acc"><div class="metric-label">รายการทั้งหมด</div><div class="metric-value">${ITEMS.length}</div></div>
      <div class="metric-card suc"><div class="metric-label">ทำแล้ว</div><div class="metric-value">${doneCount}</div></div>
      <div class="metric-card ${doneCount<ITEMS.length?'warn':'suc'}"><div class="metric-label">ความคืบหน้า</div><div class="metric-value">${pct}%</div></div>
    </div>
    <!-- progress bar -->
    <div style="background:var(--bdr);border-radius:8px;height:10px;margin-bottom:20px;overflow:hidden">
      <div style="background:${pct===100?'var(--suc)':'var(--acc)'};height:100%;width:${pct}%;transition:width .4s;border-radius:8px"></div>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">📋 Checklist — ${p.project_code} | ${p.company_name}</span>
        <div class="btn-grp">
          ${canEdit?`<button class="btn btn-suc btn-sm" onclick="Pages.op_checklist.saveAll(${pid})">💾 บันทึกทั้งหมด</button>`:''}
          <button class="btn btn-out btn-sm" onclick="Pages.op_checklist.printChecklist(${pid})">🖨 พิมพ์</button>
        </div>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px">วันตรวจ: ${U.fmtD(p.onsite_date)} | สถานที่: ${p.location||'-'} | จำนวน: ${(p.headcount||0).toLocaleString()} คน</div>`;
    groups.forEach(g=>{
      html+=`<div class="sec-title" style="margin-top:16px">${g}</div>`;
      ITEMS.filter(i=>i.group===g).forEach(item=>{
        const checked=!!saved[item.key];
        const warnStyle=item.warn?'border-left:3px solid var(--warn);':'';
        html+=`<div style="display:flex;align-items:flex-start;gap:12px;padding:10px 12px;border-radius:8px;margin-bottom:6px;background:${checked?'rgba(14,159,110,.08)':'transparent'};border:1px solid ${checked?'rgba(14,159,110,.3)':'rgba(255,255,255,.06)'};${warnStyle}">
          <input type="checkbox" id="ck_${item.key}" ${checked?'checked':''} ${canEdit?'':`disabled`}
            style="width:18px;height:18px;cursor:pointer;flex-shrink:0;margin-top:2px"
            onchange="Pages.op_checklist.toggle(${pid},'${item.key}',this.checked)"/>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:${checked?'700':'400'};color:${checked?'#6EE7B7':'var(--t-body,#C2CEDF)'}">
              ${item.icon} ${item.label}${item.warn&&!checked?' <span style="color:var(--warn);font-size:11px">(⚠ ยังไม่ดำเนินการ)</span>':''}
            </div>
            ${item.note?`<div style="font-size:12px;color:var(--muted);margin-top:2px">${item.note}</div>`:''}
            ${canEdit?`<input type="text" id="ck_note_${item.key}" value="${U.esc(saved[item.key+'_note']||'')}" placeholder="บันทึกเพิ่มเติม..."
              style="margin-top:6px;padding:4px 8px;border:1px solid var(--bdr);border-radius:5px;font-size:12px;width:100%;max-width:400px;font-family:Sarabun,sans-serif"/>`:
              (saved[item.key+'_note']?`<div style="font-size:12px;color:var(--muted);font-style:italic;margin-top:4px">"${saved[item.key+'_note']}"</div>`:'')}
          </div>
          <div style="font-size:18px;flex-shrink:0">${checked?'✅':'⬜'}</div>
        </div>`;
      });
    });
    html+=`</div>`;
    if(doneCount===ITEMS.length){
      html+=`<div class="ab success mt4">🎉 เตรียมงานครบทุกรายการแล้ว พร้อมออกหน่วย!</div>`;
    }
    document.getElementById('ckl_detail').innerHTML=html;
  },
  _key(pid){return`ckl__${pid}`;},
  _load(pid){try{return JSON.parse(localStorage.getItem(this._key(pid))||'{}')}catch{return{};}},
  _save(pid,data){localStorage.setItem(this._key(pid),JSON.stringify(data));},
  toggle(pid,key,val){
    // Auto-save immediately on tick
    const noteEl=document.getElementById('ck_note_'+key);
    const note=noteEl?noteEl.value:'';
    const configItems=Pages.config_checklist?Pages.config_checklist.list():[];
    const ci=configItems.find(c=>c.key===key)||{label:key,group:''};
    DB.checklist.save(pid,key,ci.label||key,ci.group||'',val,note);
    // update icon instantly
    const box=document.getElementById('ck_'+key)?.closest('div[style]');
    if(box){
      box.style.background=val?'rgba(14,159,110,.08)':'transparent';
      box.style.borderColor=val?'rgba(14,159,110,.3)':'rgba(255,255,255,.06)';
      const lbl=box.querySelector('div[style*="font-size:14px"]');
      if(lbl){lbl.style.color=val?'#6EE7B7':'var(--t-body,#C2CEDF)';lbl.style.fontWeight=val?'700':'400';}
      box.lastElementChild.textContent=val?'✅':'⬜';
    }
    // update progress bar
    const cfgItems=Pages.config_checklist?Pages.config_checklist.getActive():[];
    const TOTAL=Math.max(cfgItems.length,10);
    const d2=this._load(pid);
    const done=cfgItems.length>0
      ?cfgItems.filter(ci=>d2[ci.key]).length
      :Object.keys(d2).filter(k=>!k.endsWith('_note')&&d2[k]).length;
    const pct=Math.round(done/TOTAL*100);
    const bar=document.querySelector('[style*="transition:width"]');
    if(bar){bar.style.width=pct+'%';bar.style.background=pct===100?'linear-gradient(90deg,var(--c-suc,#0E9F6E),var(--c-teal,#00B8AA))':'linear-gradient(90deg,var(--c-navy-3,#172E55),var(--c-teal,#00B8AA))';}
    // Show auto-save toast
    U.toast(val?'✅ บันทึกอัตโนมัติ':'↩ ยกเลิก');
  },
  saveAll(pid){
    const d=this._load(pid);
    const ITEMS=['select_company','job_order','manpower','equipment','vehicle','specimen_kit','xray_ready','doc_ready','briefing','depart_check'];
    ITEMS.forEach(k=>{
      const noteEl=document.getElementById('ck_note_'+k);
      if(noteEl)d[k+'_note']=noteEl.value;
    });
    this._save(pid,d);
    this.loadProject(pid);
    U.toast('✅ บันทึก Checklist แล้ว');
  },
  async printChecklist(pid){
    const p=DB.sales.getProject(pid);
    const saved=DB.checklist.getByProject(pid)||{};
    const ITEMS=[
      {key:'select_company',group:'ก่อนออกหน่วย',label:'เลือกบริษัท / ยืนยันข้อมูลลูกค้า'},
      {key:'job_order',group:'ก่อนออกหน่วย',label:'จัดทำใบแจ้งงาน'},
      {key:'manpower',group:'ก่อนออกหน่วย',label:'จัดอัตรากำลัง'},
      {key:'equipment',group:'ก่อนออกหน่วย',label:'เตรียมอุปกรณ์'},
      {key:'vehicle',group:'ก่อนออกหน่วย',label:'จัดยานพาหนะ'},
      {key:'specimen_kit',group:'ก่อนออกหน่วย',label:'เตรียม Kit เจาะเลือด / แล็บ'},
      {key:'xray_ready',group:'ก่อนออกหน่วย',label:'เตรียมเครื่อง X-Ray'},
      {key:'doc_ready',group:'เอกสาร',label:'เตรียมเอกสารลงทะเบียน'},
      {key:'briefing',group:'วันออกหน่วย',label:'ประชุม Brief ทีม'},
      {key:'depart_check',group:'วันออกหน่วย',label:'ตรวจสอบการออกเดินทาง'},
    ];
    const rows=ITEMS.map(i=>`<tr><td style="text-align:center;font-size:16px">${saved[i.key]?'☑':'☐'}</td><td>${i.group}</td><td>${i.label}</td><td>${saved[i.key+'_note']||''}</td></tr>`).join('');
    const w=window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Checklist เตรียมงาน</title>
    <style>@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
    body{font-family:'Sarabun',sans-serif;font-size:13px;margin:20px;}h2{text-align:center;font-size:16px;font-weight:700;margin-bottom:4px;}
    table{width:100%;border-collapse:collapse;margin-top:12px;}th,td{border:1px solid #999;padding:6px 10px;font-size:13px;}
    th{background:#e8f0fe;font-weight:600;}@media print{button{display:none!important;}}</style></head><body>
    <h2>Checklist เตรียมงาน — ก่อนออกหน่วย</h2>
    <p style="text-align:center;color:#555;margin-bottom:8px">${p.project_code} — ${p.company_name}<br>วันตรวจ: ${U.fmtD(p.onsite_date)} | สถานที่: ${p.location||'-'}</p>
    <table><thead><tr><th style="width:40px">✓</th><th style="width:120px">หมวด</th><th>รายการ</th><th>บันทึก</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p style="margin-top:12px;font-size:11px;color:#888">พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}</p>
    <div style="text-align:right;margin-top:12px"><button onclick="window.print()" style="padding:8px 20px;background:#0F4C75;color:#fff;border:none;border-radius:6px;cursor:pointer;font-family:Sarabun,sans-serif;font-size:13px">🖨 พิมพ์</button></div>
    </body></html>`);
    w.document.close();w.focus();
  }
};

/* ── OP PREP (ใบแจ้งงาน) ── */
Pages.op_prep={
  currentJO:null,
  async render(){
    const jos=DB.operation.listJobOrders();
    const allProjs=DB.sales.listProjects();
    const canAdd=DB.auth.can('add','op_prep'),canEdit=DB.auth.can('edit','op_prep'),canDel=DB.auth.can('delete','op_prep');
    // ── 1) Project ที่ Closed แล้วแต่ยังไม่ได้สร้างใบแจ้งงาน ──
    const pendingProjs=allProjs.filter(p=>['Closed','Onsite','Lab','Report','Billing','Completed'].includes(p.status)&&!jos.find(jo=>jo.project_id===p.id));
    const pendingRows=pendingProjs.slice().reverse().map(p=>`<tr style="background:rgba(245,158,11,.05)">
      <td class="fw6 mono" style="color:var(--c-gold-lt,#E2C46A)">${p.project_code||'-'}</td>
      <td>${U.esc(p.company_name)}</td>
      <td>${U.fmtD(p.onsite_date)}</td>
      <td>${(p.headcount||0).toLocaleString()}</td>
      <td>${U.badge(p.status)}</td>
      <td><span class="badge b-draft" style="font-size:10px">⏳ ยังไม่สร้างใบแจ้งงาน</span></td>
      <td>
        ${canAdd?`<button class="btn btn-pri btn-xs" onclick="Pages.op_prep.createJOFromProject(${p.id})">+ สร้างใบแจ้งงาน</button>`:''}
      </td>
    </tr>`).join('');
    // ── 2) Job Orders ที่สร้างแล้ว — sort by project then onsite_date+day_no ──
    // Group by project for visual highlighting
    const projGroups = {};
    jos.forEach(jo=>{
      if(!projGroups[jo.project_id]) projGroups[jo.project_id] = [];
      projGroups[jo.project_id].push(jo);
    });
    // Sort within each group + overall newest project first
    const sortedJos = [];
    const projIds = Object.keys(projGroups).map(Number);
    // Sort projects by max onsite_date (newest first)
    projIds.sort((a,b)=>{
      const aMax = Math.max(...projGroups[a].map(j=>new Date(j.onsite_date||0).getTime()));
      const bMax = Math.max(...projGroups[b].map(j=>new Date(j.onsite_date||0).getTime()));
      return bMax - aMax;
    });
    projIds.forEach(pid=>{
      // Within project: sort by day_no, then onsite_date
      const grp = projGroups[pid].slice().sort((a,b)=>{
        const dnA = parseInt(a.day_no)||0, dnB = parseInt(b.day_no)||0;
        if(dnA !== dnB) return dnA - dnB;
        return new Date(a.onsite_date||0) - new Date(b.onsite_date||0);
      });
      grp.forEach((jo,idx)=>{ jo._isFirstInGroup = (idx===0); jo._groupSize = grp.length; });
      sortedJos.push(...grp);
    });
    // Render rows
    const rows=sortedJos.map(jo=>{
      const p=DB.sales.getProject(jo.project_id);
      const ckl=DB.checklist?DB.checklist.getByProject(jo.project_id):{};
      const cklDone=Object.keys(ckl).filter(k=>!k.endsWith('_note')&&ckl[k]).length;
      const totalCk=Pages.config_checklist?Pages.config_checklist.getActive().length:10;
      const isReady=cklDone>=totalCk&&totalCk>0&&(jo.status==='Confirmed'||jo.status==='Completed');
      const dayNo = parseInt(jo.day_no)||0;
      const totalDays = parseInt(jo.total_days)||jo._groupSize||1;
      // Badge: วันที่ N (gold)
      const dayBadge = dayNo > 0
        ? `<span style="background:linear-gradient(180deg,#F0CD7F,#D4A845);color:#1A1A1A;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:4px;font-family:'IBM Plex Mono',monospace;margin-left:5px;vertical-align:1px">วันที่ ${dayNo}</span>`
        : '';
      // Badge: 📅 N วัน (blue) — only on first JO of multi-day project
      const totalBadge = (jo._isFirstInGroup && totalDays > 1)
        ? `<span style="background:rgba(56,189,248,.15);color:#7DD3FC;font-size:9.5px;font-weight:700;padding:1px 7px;border-radius:4px;margin-left:6px;vertical-align:1px">📅 ${totalDays} วัน</span>`
        : '';
      // Highlight same-project rows (rest of group after first)
      const rowStyle = (jo._groupSize > 1) ? 'background:rgba(110,231,183,.04)' : '';
      // ชื่อบริษัท: opacity reduced for non-first rows in group
      const companyOpacity = (!jo._isFirstInGroup && jo._groupSize > 1) ? 'opacity:.65' : '';
      return`<tr style="${rowStyle}">
        <td><span class="fw6 mono" style="color:var(--c-gold-lt,#E2C46A)">${p?.project_code||'-'}</span>${dayBadge}${totalBadge}</td>
        <td style="${companyOpacity}">${U.esc(jo.company_name)}</td>
        <td>${U.fmtD(jo.onsite_date)}</td>
        <td>${(jo.headcount||0).toLocaleString()}</td>
        <td>${U.badge(jo.status||'Draft')}</td>
        <td>${U.recordedByCell(jo.recorded_by)}</td>
        <td>
          ${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.op_prep.editJO(${jo.id})">แก้ไข</button>`:''}
          <button class="btn btn-pri btn-xs" onclick="Pages.op_prep.viewJO(${jo.id})">ดู/พิมพ์</button>
          ${canDel?`<button class="btn btn-danger btn-xs" onclick="Pages.op_prep.delJO(${jo.id})">ลบ</button>`:''}
        </td>
      </tr>`;
    }).join('');
    // รวม pending rows ก่อน job orders
    const allRows=pendingRows+rows;
    document.getElementById('content').innerHTML=`<div class="ph"><div><h2>📋 Operation — ใบแจ้งงาน</h2><p>สร้างและจัดการใบแจ้งงาน พร้อมพิมพ์ A4</p></div>${canAdd?`<button class="btn btn-pri" onclick="Pages.op_prep.createJO()">+ สร้างใบแจ้งงาน</button>`:''}</div>
    <div class="card">
      <div style="padding:14px 18px 14px;border-bottom:1px solid rgba(255,255,255,.06)">
        <input id="op_search" placeholder="🔍 ค้นหา Project, บริษัท, วันตรวจ..." autocomplete="off"
          oninput="(function(q){const tb=document.querySelector('#op_table tbody');if(!tb)return;q=q.toLowerCase();Array.from(tb.querySelectorAll('tr')).forEach(tr=>{tr.style.display=(!q||tr.textContent.toLowerCase().includes(q))?'':'none';});})(this.value)"
          style="flex:1;padding:8px 14px;border:1.5px solid rgba(255,255,255,.1);border-radius:9px;font-size:13px;background:rgba(255,255,255,.06);color:#fff;font-family:'IBM Plex Sans Thai',sans-serif;outline:none"
          onfocus="this.style.borderColor='var(--c-teal,#00B8AA)'" onblur="this.style.borderColor='rgba(255,255,255,.1)'"/>
      </div>
      <div class="tbl-wrap"><table id="op_table"><thead><tr><th>Project</th><th>บริษัท</th><th>วันตรวจ</th><th>จำนวน</th><th>สถานะใบแจ้งงาน</th><th>ผู้จัดทำ</th><th></th></tr></thead><tbody>${allRows||'<tr><td colspan="7" class="empty">ยังไม่มีใบแจ้งงาน</td></tr>'}</tbody></table></div>
    </div>`;
  },
  createJOFromProject(pid){
    // Auto-fill modal with project data and open createJO
    setTimeout(()=>{
      const sel=document.getElementById('cjo_p');
      if(sel){
        sel.value=pid;
        if(typeof Pages.op_prep._fillFromProject==='function'){
          Pages.op_prep._fillFromProject(pid);
        }
      }
    },150);
    this.createJO();
  },

  // ─── Helper: prefill stations จาก Sales staffing สำหรับ 1 JO ───
  _prefillStationsFromSales(joId, pid){
    try {
      const staffing = DB.sales.getStaffing(pid);
      if(!staffing || !staffing.stations || staffing.stations.length === 0) return 0;
      staffing.stations.forEach((s,i)=>{
        const cnt = parseInt(s.staff_count)||1;
        const staffList = [];
        for(let k=0;k<cnt;k++){
          staffList.push({profession:'เจ้าหน้าที่',staff_name:'',staff_type:'ในองค์กร',wage_per_day:0,phone:'',remark:''});
        }
        DB.operation.saveStation({
          job_order_id: joId, order_no: i+1,
          station_code: s.code, station_name: s.name,
          staff_count: cnt, exam_count: s.exam_count||0, staff_list: staffList,
          profession:'เจ้าหน้าที่', staff_name:'', staff_type:'ในองค์กร',
          wage_per_day:0, phone:'', remark: s.note||''
        });
      });
      return staffing.stations.length;
    } catch(e){ console.warn('prefillStations failed:',e); return 0; }
  },

  // ─── Re-render multi-day list rows when จำนวนวัน changes ───
  _renderDayList(){
    const st = window._cjoState || {};
    const n = parseInt(st.numDays)||1;
    const baseDate = st.baseDate || new Date().toISOString().slice(0,10);
    const totalHc = parseInt(st.totalHc)||0;
    const perDayHc = n>0 ? Math.floor(totalHc/n) : 0;
    let rows = '';
    for(let i=0;i<n;i++){
      const d = new Date(baseDate);
      d.setDate(d.getDate()+i);
      const dStr = d.toISOString().slice(0,10);
      // ใช้ค่าเดิมถ้า user แก้ไว้
      const existing = st.days && st.days[i] ? st.days[i] : {};
      const dateVal = existing.date || dStr;
      const startVal = existing.start || '07:00';
      const endVal = existing.end || '16:00';
      const hcVal = existing.hc !== undefined ? existing.hc : (i===n-1 ? totalHc - perDayHc*(n-1) : perDayHc);
      rows += `<div class="cjo-day-row" data-i="${i}" style="display:grid;grid-template-columns:70px 1fr 1fr 1fr 90px;gap:7px;padding:7px 5px;border-bottom:1px solid rgba(255,255,255,.04);align-items:center">
        <div style="background:linear-gradient(180deg,#F0CD7F,#D4A845);color:#1A1A1A;font-size:10.5px;font-weight:700;padding:4px 9px;border-radius:5px;font-family:'IBM Plex Mono',monospace;text-align:center">วันที่ ${i+1}</div>
        <input type="date" data-f="date" value="${dateVal}" onchange="Pages.op_prep._captureDayRows()" style="padding:5px 8px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.15);border-radius:5px;color:#FFFFFF;font-size:11.5px;font-family:inherit;width:100%"/>
        <input type="time" data-f="start" value="${startVal}" onchange="Pages.op_prep._captureDayRows()" style="padding:5px 8px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.15);border-radius:5px;color:#FFFFFF;font-size:11.5px;font-family:inherit;width:100%"/>
        <input type="time" data-f="end" value="${endVal}" onchange="Pages.op_prep._captureDayRows()" style="padding:5px 8px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.15);border-radius:5px;color:#FFFFFF;font-size:11.5px;font-family:inherit;width:100%"/>
        <input type="number" data-f="hc" value="${hcVal}" min="0" onchange="Pages.op_prep._captureDayRows()" style="padding:5px 8px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.15);border-radius:5px;color:#FFFFFF;font-size:11.5px;font-family:inherit;text-align:center;width:100%"/>
      </div>`;
    }
    const wrap = document.getElementById('cjo_day_list');
    if(wrap) wrap.innerHTML = rows;
    // sync summary
    this._updateCjoSummary();
  },

  _captureDayRows(){
    const st = window._cjoState || {};
    st.days = st.days || [];
    document.querySelectorAll('.cjo-day-row').forEach(row=>{
      const i = parseInt(row.dataset.i);
      st.days[i] = {
        date: row.querySelector('[data-f="date"]')?.value,
        start: row.querySelector('[data-f="start"]')?.value,
        end: row.querySelector('[data-f="end"]')?.value,
        hc: parseInt(row.querySelector('[data-f="hc"]')?.value)||0
      };
    });
    window._cjoState = st;
    this._updateCjoSummary();
  },

  _updateCjoSummary(){
    const st = window._cjoState || {};
    const sumEl = document.getElementById('cjo_sum');
    if(!sumEl) return;
    const n = parseInt(st.numDays)||1;
    let totalHc = 0;
    if(st.days){
      st.days.slice(0,n).forEach(d=>{ totalHc += (parseInt(d?.hc)||0); });
    } else {
      totalHc = parseInt(st.totalHc)||0;
    }
    sumEl.innerHTML = `📊 รวม <span style="color:#6EE7B7;font-weight:700;font-family:'IBM Plex Mono',monospace">${n} ใบแจ้งงาน</span> · <span style="color:#6EE7B7;font-weight:700;font-family:'IBM Plex Mono',monospace">${totalHc.toLocaleString()} คน</span>`;
  },

  _setNumDays(n){
    this._captureDayRows();
    const st = window._cjoState || {};
    st.numDays = n;
    // ถ้าเป็น value ใหม่ที่ใหญ่กว่าเดิม — ขยาย days array
    if(st.days && st.days.length < n){
      const baseDate = st.baseDate;
      const totalHc = parseInt(st.totalHc)||0;
      const perDay = n>0 ? Math.floor(totalHc/n) : 0;
      for(let i=st.days.length; i<n; i++){
        const d = new Date(baseDate); d.setDate(d.getDate()+i);
        st.days.push({date:d.toISOString().slice(0,10), start:'07:00', end:'16:00', hc:(i===n-1?totalHc-perDay*(n-1):perDay)});
      }
    }
    window._cjoState = st;
    // Update day-btn active state
    document.querySelectorAll('.cjo-day-btn').forEach(b=>{
      b.classList.toggle('active', parseInt(b.dataset.n)===n);
    });
    // Custom input sync
    const ci = document.getElementById('cjo_num_custom');
    if(ci) ci.value = n>7 ? n : '';
    this._renderDayList();
  },

  async createJO(){
    const _all_projs_raw=DB.sales.listProjects();
    const projs=(_all_projs_raw||[]).filter(p=>['Closed','Onsite'].includes(p.status));
    if(!projs.length)return U.toast('ไม่มี Project ที่พร้อม','warning');
    const pOpts=U.sel(projs.map(p=>({v:p.id,l:`${p.project_code} — ${p.company_name}`})),'');

    // Initialize state
    window._cjoState = { numDays:1, days:[], baseDate:'', totalHc:0 };

    Modal.open(`<div class="ab info mb4">สร้างใบแจ้งงานจาก Project ที่ปิดการขายแล้ว · รองรับ <strong>หลายวัน</strong> ในคลิกเดียว</div>
    <div class="fg"><label class="req">เลือก Project</label><select id="cjo_p" onchange="Pages.op_prep._fillFromProject(this.value)">${pOpts}</select></div>

    <div class="divider"></div><div class="sec-title">📅 จำนวนวันออกตรวจ</div>
    <div style="display:flex;gap:5px;margin-bottom:11px;flex-wrap:wrap;align-items:center">
      ${[1,2,3,4,5,6,7].map(n=>`<button type="button" class="cjo-day-btn${n===1?' active':''}" data-n="${n}" onclick="Pages.op_prep._setNumDays(${n})" style="padding:6px 14px;border:1.5px solid rgba(255,255,255,.15);background:#162338;color:#FFFFFF;border-radius:7px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;min-width:46px;text-align:center;transition:all .15s">${n}</button>`).join('')}
      <input id="cjo_num_custom" type="number" min="1" max="30" placeholder="N" oninput="if(this.value){Pages.op_prep._setNumDays(parseInt(this.value)||1)}" style="width:60px;padding:5px;background:#162338;border:1.5px solid rgba(255,255,255,.15);border-radius:7px;color:#FFFFFF;font-size:12.5px;text-align:center;font-family:inherit"/>
    </div>

    <div class="ab info mb4" style="background:rgba(56,189,248,.06);border:1px solid rgba(56,189,248,.25);color:#7DD3FC;font-size:11.5px;display:flex;align-items:flex-start;gap:7px">
      ℹ️ <div><strong>Auto-fill:</strong> วันที่จะเรียงต่อกันจากวันที่ออกตรวจของ Project · จำนวนคนต่อวันจะหารยอดรวม · แก้ได้ทีละช่อง · บันทึก = สร้างทั้งหมดในคลิกเดียว</div>
    </div>

    <div style="font-size:10.5px;color:rgba(255,255,255,.85);text-transform:uppercase;font-weight:700;margin-bottom:6px;font-family:'IBM Plex Mono',monospace;letter-spacing:.5px">รายละเอียดแต่ละวัน</div>
    <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:8px;max-height:240px;overflow-y:auto;margin-bottom:11px">
      <div style="display:grid;grid-template-columns:70px 1fr 1fr 1fr 90px;gap:7px;padding-bottom:7px;border-bottom:1px solid rgba(255,255,255,.06);font-size:10px;color:rgba(255,255,255,.6);text-transform:uppercase;font-weight:600;font-family:'IBM Plex Mono',monospace;letter-spacing:.5px">
        <div></div><div>วันที่</div><div>เริ่ม</div><div>สิ้นสุด</div><div style="text-align:center">จำนวนคน</div>
      </div>
      <div id="cjo_day_list"></div>
    </div>

    <div id="cjo_sum" style="background:rgba(110,231,183,.07);border:1px solid rgba(110,231,183,.25);padding:8px 12px;border-radius:6px;font-size:12px;color:#FFFFFF;font-weight:500;margin-bottom:11px">📊 รวม <span style="color:#6EE7B7;font-weight:700">1 ใบแจ้งงาน</span></div>

    <div class="divider"></div><div class="sec-title">⚙ ค่าเริ่มต้น (ใช้กับทุกใบ)</div>
    <div class="fr"><div class="fg"><label>เวลาออกเดินทาง</label><input id="cjo_dep" type="time" value="05:30"/></div>
      <div class="fg"><label>Director</label>${U.staffAutocomplete('cjo_dir', '', 'ค้นหาจากชื่อ/ชื่อเล่น/แผนก/ตำแหน่ง/รหัส')}</div></div>
    <div class="fr"><div class="fg"><label>ประเภทงาน</label><select id="cjo_jt">${U.sel(JOB_TYPES,'ตรวจสุขภาพ')}</select></div>
      <div class="fg"><label>กะทำงาน</label><input id="cjo_sh" value="เช้า"/></div></div>
    <div class="fg"><label>หมายเหตุ</label><input id="cjo_rm"/></div>

    <div class="divider"></div><div class="sec-title">ลายเซ็นผู้รับผิดชอบ</div>
    <div class="fr3"><div class="fg"><label>ผู้จัดทำ</label>${U.staffAutocomplete('cjo_s1','','ค้นหาผู้จัดทำ')}</div>
      <div class="fg"><label>หัวหน้าแผนก</label>${U.staffAutocomplete('cjo_s2','','ค้นหาหัวหน้าแผนก')}</div>
      <div class="fg"><label>HR</label>${U.staffAutocomplete('cjo_s3','','ค้นหา HR')}</div></div>
    <style>.cjo-day-btn:hover{border-color:rgba(240,205,127,.4)!important}.cjo-day-btn.active{background:linear-gradient(180deg,#F0CD7F,#D4A845)!important;color:#1A1A1A!important;border-color:#F0CD7F!important}</style>`,
    'สร้างใบแจ้งงาน', async () => {
      this._captureDayRows();
      const pid=parseInt(document.getElementById('cjo_p').value);
      if(!pid)return U.toast('กรุณาเลือก Project','danger');
      const p=DB.sales.getProject(pid);
      const st = window._cjoState || {};
      const n = parseInt(st.numDays)||1;
      const days = (st.days||[]).slice(0,n);
      // หา max day_no ที่มีอยู่ของ project นี้ (สำหรับการสร้างซ้ำ)
      const existingJOs = DB.operation.listJobOrders().filter(j=>j.project_id===pid);
      let maxDayNo = existingJOs.reduce((m,j)=>Math.max(m, parseInt(j.day_no)||0), 0);
      // คอมมอน fields
      const common = {
        project_id: pid,
        company_name: p.company_name,
        location: p.location||'',
        depart_time: document.getElementById('cjo_dep').value,
        director: document.getElementById('cjo_dir').value,
        job_type: document.getElementById('cjo_jt').value,
        shift: document.getElementById('cjo_sh').value,
        remark: document.getElementById('cjo_rm').value,
        signer_creator: document.getElementById('cjo_s1').value,
        signer_head: document.getElementById('cjo_s2').value,
        signer_hr: document.getElementById('cjo_s3').value,
        status: 'Draft'
      };
      let createdJOs = [];
      for(let i=0; i<n; i++){
        const d = days[i] || {};
        const dayNo = maxDayNo + i + 1;
        const jo = DB.operation.saveJobOrder({
          ...common,
          onsite_date: d.date || p.onsite_date,
          start_time: d.start || '07:00',
          end_time: d.end || '16:00',
          headcount: parseInt(d.hc) || Math.floor((p.headcount||0)/n),
          day_no: dayNo,
          total_days: maxDayNo + n,  // total รวม (จะ update ภายหลังถ้ามีสร้างเพิ่ม)
        });
        createdJOs.push(jo);
        // Sales staffing prefill — สร้าง station ให้ทุกใบ
        Pages.op_prep._prefillStationsFromSales(jo.id, pid);
      }
      // Update total_days บนใบเก่าด้วย
      const newTotal = maxDayNo + n;
      existingJOs.forEach(oj=>{
        DB.operation.saveJobOrder({...oj, total_days: newTotal});
      });
      window._cjoState = null;
      Modal.close();
      this.render();
      U.toast(`✅ สร้างใบแจ้งงาน ${n} ใบเรียบร้อย`);
      if(n===1){
        setTimeout(()=>this.viewJO(createdJOs[0].id),300);
      }
    });

    // Initialize after modal opens
    setTimeout(()=>{
      const projSel = document.getElementById('cjo_p');
      if(projSel && projSel.value){
        Pages.op_prep._fillFromProject(projSel.value);
      } else {
        Pages.op_prep._renderDayList();
      }
    }, 50);
  },
  _fillFromProject(pid){
    if(!pid)return;
    const p=DB.sales.getProject(parseInt(pid));
    if(!p)return;
    // Set state with project data
    const st = window._cjoState || {};
    st.baseDate = p.onsite_date || new Date().toISOString().slice(0,10);
    st.totalHc = parseInt(p.headcount)||0;
    st.days = []; // reset days to use new defaults
    window._cjoState = st;
    Pages.op_prep._renderDayList();
  },
  editJO(id){
    const jo=DB.operation.getJobOrderById(id);
    Modal.open(`<div class="tabs"><div class="tab active" onclick="switchTab(this,'jt1')">ข้อมูลทั่วไป</div><div class="tab" onclick="switchTab(this,'jt2')">Station & อัตรากำลัง</div><div class="tab" onclick="switchTab(this,'jt3')">ยานพาหนะ</div><div class="tab" onclick="switchTab(this,'jt4')">เช่าอุปกรณ์</div><div class="tab" onclick="switchTab(this,'jt5')">ลายเซ็น</div></div>
    <div id="jt1" class="tp active">${this._generalForm(jo)}</div>
    <div id="jt2" class="tp">${this._stationTable(id)}</div>
    <div id="jt3" class="tp">${this._vehicleTable(id)}</div>
    <div id="jt4" class="tp">${this._equipmentTable(id)}</div>
    <div id="jt5" class="tp">${this._signForm(jo)}</div>`,
    'แก้ไขใบแจ้งงาน',()=>{
      this._saveGeneral(jo);this._saveSign(jo);
      Modal.close();this.render();U.toast('✅ บันทึกแล้ว');
    },true);
  },
  _generalForm(jo){return`
  <div class="fr"><div class="fg"><label>ชื่อบริษัท</label><input id="jo_co" value="${U.esc(jo.company_name||'')}"/></div>
    <div class="fg"><label>วันที่ออกหน่วย</label><input id="jo_dt" type="date" value="${jo.onsite_date||''}"/></div></div>
  <div class="fg"><label>สถานที่</label><input id="jo_loc" value="${U.esc(jo.location||'')}"/></div>
  <div class="fr3"><div class="fg"><label>จำนวนพนักงาน</label><input id="jo_hc" type="number" value="${jo.headcount||0}"/></div>
    <div class="fg"><label>เวลาออกเดินทาง</label><input id="jo_dep" type="time" value="${jo.depart_time||'05:30'}"/></div>
    <div class="fg"><label>เวลาเริ่มตรวจ</label><input id="jo_st" type="time" value="${jo.start_time||'07:00'}"/></div></div>
  <div class="fr3"><div class="fg"><label>เวลาสิ้นสุด</label><input id="jo_et" type="time" value="${jo.end_time||'16:00'}"/></div>
    <div class="fg"><label>Director</label>${U.staffAutocomplete('jo_dir', jo.director||'', 'ค้นหาจากชื่อ/ชื่อเล่น/แผนก/ตำแหน่ง/รหัส')}</div>
    <div class="fg"><label>ประเภทงาน</label><select id="jo_jt">${U.sel(JOB_TYPES,jo.job_type||'ตรวจสุขภาพ')}</select></div></div>
  <div class="fr"><div class="fg"><label>กะทำงาน</label><input id="jo_sh" value="${U.esc(jo.shift||'')}"/></div>
    <div class="fg"><label>หมายเหตุ</label><input id="jo_rm" value="${U.esc(jo.remark||'')}"/></div></div>
  <div class="fg"><label>สถานะใบแจ้งงาน</label>
    <select id="jo_status">${['Draft','Confirmed','Completed','Cancelled'].map(s=>`<option value="${s}" ${jo.status===s?'selected':''}>${s}</option>`).join('')}</select>
  </div>`;},
  _signForm(jo){return`<div class="fr3"><div class="fg"><label>ผู้จัดทำ</label>${U.staffAutocomplete('jo_s1', jo.signer_creator||'', 'ค้นหาผู้จัดทำ')}</div>
    <div class="fg"><label>หัวหน้าแผนก</label>${U.staffAutocomplete('jo_s2', jo.signer_head||'', 'ค้นหาหัวหน้าแผนก')}</div>
    <div class="fg"><label>HR</label>${U.staffAutocomplete('jo_s3', jo.signer_hr||'', 'ค้นหา HR')}</div></div>`;},
  _saveGeneral(jo){DB.operation.saveJobOrder({...jo,company_name:document.getElementById('jo_co')?.value||jo.company_name,onsite_date:document.getElementById('jo_dt')?.value||jo.onsite_date,location:document.getElementById('jo_loc')?.value||jo.location,headcount:parseInt(document.getElementById('jo_hc')?.value)||jo.headcount,depart_time:document.getElementById('jo_dep')?.value||jo.depart_time,start_time:document.getElementById('jo_st')?.value||jo.start_time,end_time:document.getElementById('jo_et')?.value||jo.end_time,director:document.getElementById('jo_dir')?.value||jo.director,job_type:document.getElementById('jo_jt')?.value||jo.job_type,shift:document.getElementById('jo_sh')?.value||jo.shift,remark:document.getElementById('jo_rm')?.value||jo.remark,status:document.getElementById('jo_status')?.value||jo.status||'Confirmed',_override_recorded_by:U.recordedByValue('jo_rb')||undefined});},
  _saveSign(jo){DB.operation.saveJobOrder({...DB.operation.getJobOrderById(jo.id),signer_creator:document.getElementById('jo_s1')?.value||jo.signer_creator,signer_head:document.getElementById('jo_s2')?.value||jo.signer_head,signer_hr:document.getElementById('jo_s3')?.value||jo.signer_hr});},
  _stationTable(joid){
    const sts=DB.operation.listStations(joid);
    const totalWage=sts.reduce((s,st)=>{
      // Sum across all staff_list entries (if available), else fallback to staff_count×wage
      if(st.staff_list && st.staff_list.length>0){
        return s + st.staff_list.reduce((ss,p)=>ss+(parseFloat(p.wage_per_day)||0),0);
      }
      return s + (st.wage_per_day||0)*(st.staff_count||1);
    },0);
    // ใช้ rowspan: 1 station = N row (1 ต่อคน) — เห็นข้อมูลครบทุกคน
    const rows=sts.map((s,i)=>{
      // Normalize: ถ้าไม่มี staff_list ให้ใช้ field เดิมเป็นคนเดียว + pad ตาม staff_count
      let people = (s.staff_list && s.staff_list.length>0)
        ? s.staff_list
        : [{profession:s.profession||'',staff_name:s.staff_name||'',staff_type:s.staff_type||'',wage_per_day:s.wage_per_day||0,phone:s.phone||''}];
      const targetCnt = parseInt(s.staff_count)||1;
      while(people.length < targetCnt){
        people.push({profession:'',staff_name:'',staff_type:'',wage_per_day:0,phone:''});
      }
      const cnt = people.length;
      const totalRowWage = people.reduce((ss,p)=>ss+(parseFloat(p.wage_per_day)||0),0);

      // วาด N tr ต่อ Station — แถวแรก has rowspan สำหรับ station-level columns
      return people.map((p,pi)=>{
        const isFirst = pi===0;
        const personTypeCell = `<td><span style="font-size:11px;padding:1px 7px;border-radius:4px;background:${(p.staff_type||'').includes('Part')?'rgba(245,158,11,.15)':'rgba(255,255,255,.08)'};color:${(p.staff_type||'').includes('Part')?'#FCD34D':'var(--t-muted)'}">${p.staff_type||'-'}</span></td>`;
        const personRowStyle = pi>0 ? 'style="background:rgba(255,255,255,.015);border-top:1px dashed rgba(255,255,255,.06)"' : '';
        return `<tr ${personRowStyle}>
          ${isFirst?`<td rowspan="${cnt}" style="text-align:center;vertical-align:middle;border-right:1px solid rgba(255,255,255,.04)">${s.order_no}</td>
          <td rowspan="${cnt}" style="vertical-align:middle;border-right:1px solid rgba(255,255,255,.04)"><span style="font-family:monospace;font-size:11px;background:rgba(56,189,248,.15);color:#38BDF8;padding:1px 6px;border-radius:4px">${s.station_code}</span> ${s.station_name}</td>
          <td rowspan="${cnt}" style="text-align:center;vertical-align:middle">${cnt}</td>
          <td rowspan="${cnt}" style="text-align:center;vertical-align:middle;color:${s.exam_count?'#6EE7B7':'var(--t-muted)'}">${s.exam_count||'-'}</td>`:''}
          <td><span style="font-size:10px;color:#F0CD7F;background:rgba(240,205,127,.1);padding:1px 5px;border-radius:3px;margin-right:5px;font-family:'IBM Plex Mono',monospace;font-weight:600">${pi+1}</span>${p.profession||'-'}</td>
          <td>${p.staff_name?`<strong>${U.esc(p.staff_name)}</strong>`:'<span style="color:#FCD34D;font-size:11px">⚠ ยังไม่ได้กรอก</span>'}</td>
          ${personTypeCell}
          <td style="text-align:right;font-weight:600;color:${p.wage_per_day?'var(--c-gold-lt,#E2C46A)':'var(--t-muted)'}">${p.wage_per_day?'฿'+U.fmt(p.wage_per_day):'-'}</td>
          <td style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:${p.phone?'#7DD3FC':'var(--t-muted)'}">${p.phone||'-'}</td>
          <td style="color:var(--t-muted)">${isFirst?(s.remark||''):''}</td>
          <td>${isFirst?`<button class="btn btn-out btn-xs" onclick="Pages.op_prep.editStation(${s.id},${joid})" style="margin-right:3px">แก้ไข</button>
            <button class="btn btn-danger btn-xs" onclick="Pages.op_prep.delStation(${s.id},${joid})">ลบ</button>`:''}</td>
        </tr>`;
      }).join('');
    }).join('');
    return`<div class="mb4" style="display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;gap:6px">
        <button class="btn btn-pri btn-sm" onclick="Pages.op_prep.addStation(${joid})">+ เพิ่ม Station</button>
        <button class="btn btn-out btn-sm" onclick="Pages.op_prep._pullFromSales(${joid})" title="ดึงข้อมูลอัตรากำลังที่ Sales ลงไว้">📥 ดึงจาก Sales</button>
      </div>
      ${totalWage>0?`<div style="font-weight:700;color:var(--c-gold-lt,#E2C46A);font-size:13px">รวมค่าแรง: ฿${U.fmt(totalWage)}</div>`:''}
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th style="text-align:center">#</th><th>Station</th><th style="text-align:center">คน</th><th style="text-align:center">จำนวนตรวจ</th><th>วิชาชีพ</th><th>ชื่อ-สกุล</th><th>ประเภท</th><th style="text-align:right">ค่าแรง/วัน</th><th>เบอร์โทร</th><th>หมายเหตุ</th><th></th></tr></thead>
      <tbody id="st_tbody">${rows||'<tr><td colspan="11" class="empty t-sm">ยังไม่มี Station — กด "+ เพิ่ม Station" หรือ "📥 ดึงจาก Sales"</td></tr>'}</tbody>
    </table></div>`;
  },
  _vehicleTable(joid){
    const vs=DB.operation.listVehicles(joid);
    const rows=vs.map(v=>`<tr><td>${v.order_no}</td><td>${v.vehicle_name}</td><td>${v.staff_type}</td><td>${v.responsible_name}</td><td>${v.phone}</td><td>${v.remark||''}</td>
    <td><button class="btn btn-danger btn-xs" onclick="Pages.op_prep.delVehicle(${v.id},${joid})">ลบ</button></td></tr>`).join('');
    return`<div class="mb4 btn-grp"><button class="btn btn-pri btn-sm" onclick="Pages.op_prep.addVehicle(${joid})">+ เพิ่มยานพาหนะ</button></div>
    <div class="tbl-wrap"><table><thead><tr><th>#</th><th>ยานพาหนะ</th><th>ประเภท</th><th>ผู้รับผิดชอบ</th><th>เบอร์</th><th>หมายเหตุ</th><th></th></tr></thead>
    <tbody>${rows||'<tr><td colspan="7" class="empty t-sm">ยังไม่มี</td></tr>'}</tbody></table></div>`;
  },
  // ─── ดึงข้อมูลอัตรากำลังจาก Sales (override Stations ทั้งหมด) ───
  _pullFromSales(joid){
    const jo = DB.operation.getJobOrder(joid);
    if(!jo){U.toast('ไม่พบใบแจ้งงาน','danger');return;}
    const staffing = DB.sales.getStaffing(jo.project_id);
    if(!staffing||!staffing.stations||staffing.stations.length===0){
      U.toast('Sales ยังไม่ได้ลงอัตรากำลังของ Project นี้','warning');
      return;
    }
    if(!confirm(`พบ ${staffing.stations.length} Station ที่ Sales ลงไว้\nต้องการดึงมาเพิ่มหรือไม่? (รายการ Station เดิมจะคงอยู่)`)) return;
    const existing = DB.operation.listStations(joid);
    const existingCodes = new Set(existing.map(s=>s.station_code));
    let nextNo = existing.length>0?Math.max(...existing.map(s=>s.order_no))+1:1;
    let added = 0;
    staffing.stations.forEach(s=>{
      if(existingCodes.has(s.code)) return; // skip ที่มีอยู่แล้ว
      const cnt = parseInt(s.staff_count)||1;
      const staffList = [];
      for(let k=0;k<cnt;k++){
        staffList.push({profession:'เจ้าหน้าที่',staff_name:'',staff_type:'ในองค์กร',wage_per_day:0,phone:''});
      }
      DB.operation.saveStation({
        job_order_id: joid,
        order_no: nextNo++,
        station_code: s.code,
        station_name: s.name,
        staff_count: cnt,
        exam_count: s.exam_count||0,
        staff_list: staffList,
        profession: 'เจ้าหน้าที่',
        staff_name: '',
        staff_type: 'ในองค์กร',
        wage_per_day: 0,
        phone: '',
        remark: s.note||''
      });
      added++;
    });
    this.editJO(joid);
    U.toast(added>0?`✅ ดึงมา ${added} Station (ข้าม ${staffing.stations.length-added} ซ้ำ)`:'⚠ ทุก Station มีอยู่แล้ว');
  },

  // ─── Dynamic person entry helpers (used by add/edit Station) ───
  _stationModalRender(mode, joid, sid){
    // mode = 'add' | 'edit'
    const mp = DB.manpowerCost.list();
    let station = null;
    let staffList = [];
    let nextNo = 1;
    if(mode==='edit'){
      station = DB.operation.listStations(joid).find(x=>x.id===sid);
      if(!station) return null;
      // Migrate old data (no staff_list) → seed from old fields + pad
      const existing = station.staff_list || [];
      if(existing.length === 0){
        staffList = [{
          profession: station.profession||'',
          staff_name: station.staff_name||'',
          staff_type: station.staff_type||'',
          wage_per_day: station.wage_per_day||0,
          phone: station.phone||'',
          remark: ''
        }];
        const targetCnt = parseInt(station.staff_count)||1;
        while(staffList.length < targetCnt){
          staffList.push({profession:'',staff_name:'',staff_type:'',wage_per_day:0,phone:'',remark:''});
        }
      } else {
        staffList = existing.map(p=>({...p}));
      }
    } else {
      // add mode — start with 1 empty person
      const sts = DB.operation.listStations(joid);
      nextNo = sts.length>0 ? Math.max(...sts.map(s=>s.order_no))+1 : 1;
      staffList = [{profession:'',staff_name:'',staff_type:'',wage_per_day:0,phone:''}];
    }
    // Store state on window for the modal
    window._stationModalState = {mode, joid, sid, station, staffList, nextNo, mp};
    return window._stationModalState;
  },

  _renderPersonCards(){
    const st = window._stationModalState;
    if(!st) return '';
    const mp = st.mp || [];
    const mpData = JSON.stringify(mp.map(m=>({r:m.role,c:m.cost_per_day})));
    return st.staffList.map((person, idx) => `
      <div class="sm-person" data-pidx="${idx}" style="background:var(--s-2,#162338);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:11px 13px;margin-bottom:8px;transition:all .15s">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;padding-bottom:7px;border-bottom:1px solid rgba(255,255,255,.05)">
          <div style="display:inline-flex;align-items:center;gap:8px">
            <span style="background:linear-gradient(180deg,#F0CD7F,#D4A845);color:#1A1A1A;font-size:11px;font-weight:700;padding:3px 10px;border-radius:5px;font-family:'IBM Plex Mono',monospace">คนที่ ${idx+1}</span>
            <span style="font-size:12px;font-weight:600;color:${person.staff_name?'#FFFFFF':'#FCD34D'};opacity:.85">${person.staff_name?U.esc(person.staff_name):'ยังไม่ได้กรอก'}</span>
          </div>
          ${st.staffList.length>1?`<button type="button" class="btn btn-danger btn-xs" onclick="Pages.op_prep._removePerson(${idx})" style="padding:3px 8px;font-size:10.5px" title="ลบคนนี้">×</button>`:''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:7px">
          <div class="fg" style="margin-bottom:0">
            <label style="font-size:10.5px;color:#FFFFFF;opacity:.85;margin-bottom:3px;font-weight:600;display:block">วิชาชีพ</label>
            <select data-pidx="${idx}" data-person="profession" onchange="(function(v,idx){const mp=${mpData};const m=mp.find(x=>x.r===v);if(m){const w=document.querySelector('[data-pidx=\''+idx+'\'][data-person=wage_per_day]');if(w)w.value=m.c;}})(this.value,${idx})" style="width:100%;padding:6px 9px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:11.5px;font-family:inherit">
              ${U.sel(PROFESSIONS, person.profession||'เจ้าหน้าที่')}
            </select>
          </div>
          <div class="fg" style="margin-bottom:0">
            <label style="font-size:10.5px;color:#FFFFFF;opacity:.85;margin-bottom:3px;font-weight:600;display:block">ชื่อ-สกุล <span style="color:#FCA5A5">*</span></label>
            ${U.staffAutocomplete('sm_name_'+idx, person.staff_name||'', 'พิมพ์เพื่อค้นหา (กรองตามประเภท)', 'auto')}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
          <div class="fg" style="margin-bottom:0">
            <label style="font-size:10.5px;color:#FFFFFF;opacity:.85;margin-bottom:3px;font-weight:600;display:block">ประเภท</label>
            <select data-pidx="${idx}" data-person="staff_type" onchange="(function(idx){const inp=document.getElementById('sm_name_'+idx);if(inp){inp.value='';inp.dataset.staffId='';inp.dataset.ptId='';inp.dataset.empId='';inp.dataset.src='';inp.focus();}})(${idx})" style="width:100%;padding:6px 9px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:11.5px;font-family:inherit">
              ${U.sel(STAFF_TYPES, person.staff_type||'ในองค์กร')}
            </select>
          </div>
          <div class="fg" style="margin-bottom:0">
            <label style="font-size:10.5px;color:#FFFFFF;opacity:.85;margin-bottom:3px;font-weight:600;display:block">ราคาจ้าง/วัน</label>
            <input type="number" data-pidx="${idx}" data-person="wage_per_day" value="${person.wage_per_day||0}" min="0" style="width:100%;padding:6px 9px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:11.5px;font-family:inherit"/>
          </div>
          <div class="fg" style="margin-bottom:0">
            <label style="font-size:10.5px;color:#FFFFFF;opacity:.85;margin-bottom:3px;font-weight:600;display:block">เบอร์โทร</label>
            <input type="tel" data-pidx="${idx}" data-person="phone" value="${U.esc(person.phone||'')}" placeholder="08x-xxx-xxxx" style="width:100%;padding:6px 9px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:11.5px;font-family:inherit"/>
          </div>
        </div>
        <div style="margin-top:7px">
          <div class="fg" style="margin-bottom:0">
            <label style="font-size:10.5px;color:#FFFFFF;opacity:.85;margin-bottom:3px;font-weight:600;display:block">📝 หมายเหตุ <span style="font-weight:400;opacity:.65;font-size:9.5px">(ของคนนี้)</span></label>
            <input type="text" data-pidx="${idx}" data-person="remark" value="${U.esc(person.remark||'')}" placeholder="เช่น หัวหน้าทีม, ขับรถ ฯลฯ" style="width:100%;padding:6px 9px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:11.5px;font-family:inherit"/>
          </div>
        </div>
      </div>
    `).join('');
  },

  // อ่านค่าจาก form กลับเข้า state ปัจจุบัน
  _capturePersons(){
    const st = window._stationModalState;
    if(!st) return;
    st.staffList.forEach((person, idx)=>{
      const nameInput = document.getElementById('sm_name_'+idx);
      if(nameInput) person.staff_name = nameInput.value.trim();
      ['profession','staff_type','wage_per_day','phone','remark'].forEach(field=>{
        const el = document.querySelector(`[data-pidx="${idx}"][data-person="${field}"]`);
        if(el){
          if(field==='wage_per_day') person[field] = parseFloat(el.value)||0;
          else person[field] = el.value;
        }
      });
    });
  },

  _addPerson(){
    this._capturePersons();
    const st = window._stationModalState;
    if(!st) return;
    st.staffList.push({profession:'',staff_name:'',staff_type:'ในองค์กร',wage_per_day:0,phone:'',remark:''});
    this._refreshPersons();
  },

  _removePerson(idx){
    this._capturePersons();
    const st = window._stationModalState;
    if(!st || st.staffList.length<=1) return;
    const person = st.staffList[idx];
    const hasData = person && (person.staff_name||person.phone||person.wage_per_day>0);
    if(hasData && !confirm(`ลบ "${person.staff_name||'คนที่ '+(idx+1)}" ออก?`)) return;
    st.staffList.splice(idx, 1);
    this._refreshPersons();
  },

  _refreshPersons(){
    const container = document.getElementById('sm_person_cards');
    const countBadge = document.getElementById('sm_count_badge');
    const cntInput = document.getElementById('sm_staff_count');
    if(container){
      container.innerHTML = this._renderPersonCards();
    }
    const len = window._stationModalState ? window._stationModalState.staffList.length : 0;
    if(countBadge) countBadge.textContent = len + ' คน';
    if(cntInput) cntInput.value = len;
  },

  // ─── Handle จำนวนคน input change: auto-add cards (increase only) ───
  _syncStaffCount(inputEl){
    this._capturePersons();
    const st = window._stationModalState;
    if(!st) return;
    const newCount = parseInt(inputEl.value)||1;
    const curCount = st.staffList.length;
    if(newCount === curCount) return;
    if(newCount > curCount){
      // Auto-add empty cards to reach new count
      for(let k=curCount; k<newCount; k++){
        st.staffList.push({profession:'',staff_name:'',staff_type:'ในองค์กร',wage_per_day:0,phone:'',remark:''});
      }
      this._refreshPersons();
      U.toast(`✅ เพิ่ม ${newCount - curCount} คน`);
    } else {
      // Cannot decrease via input — must use × button
      inputEl.value = curCount; // snap back
      U.toast('⚠ ลดจำนวนคน → กดปุ่ม × ของคนที่ต้องการลบ', 'warning');
    }
  },

  // เก็บ staff_list จาก form → validate → คืน array หรือ null ถ้า invalid
  _collectStaffList(){
    this._capturePersons();
    const st = window._stationModalState;
    if(!st) return null;
    // Validate — staff_name required for ALL persons
    for(let i=0; i<st.staffList.length; i++){
      if(!st.staffList[i].staff_name || !st.staffList[i].staff_name.trim()){
        U.toast(`กรุณากรอกชื่อ-สกุล ของคนที่ ${i+1}`, 'danger');
        const inp = document.getElementById('sm_name_'+i);
        if(inp){inp.focus(); inp.style.borderColor='#FCA5A5';}
        return null;
      }
    }
    return st.staffList;
  },

  addStation(joid){
    const st = this._stationModalRender('add', joid);
    Modal.open(`
    <div style="display:grid;grid-template-columns:1fr 110px 130px;gap:9px">
      <div class="fg"><label class="req">Station</label><select id="as_code">${U.stationOpts()}</select></div>
      <div class="fg"><label>จำนวนคน</label><input id="sm_staff_count" type="number" value="${st.staffList.length}" min="1" onchange="Pages.op_prep._syncStaffCount(this)" title="พิมพ์ตัวเลขเพื่อเพิ่มคน · กด × ใต้บัตรเพื่อลด"/></div>
      <div class="fg"><label>จำนวนตรวจ</label><input id="as_exam" type="number" value="" min="0" placeholder="จำนวนผู้รับบริการ"/></div>
    </div>
    <div style="display:flex;align-items:center;gap:9px;margin:14px 0 9px;padding-top:11px;border-top:1px solid rgba(255,255,255,.08)">
      <span style="font-size:11.5px;font-weight:700;color:#F0CD7F;text-transform:uppercase;letter-spacing:.5px;font-family:'IBM Plex Mono',monospace">👥 รายละเอียดเจ้าหน้าที่</span>
      <div style="flex:1;height:1px;background:rgba(240,205,127,.15)"></div>
      <span id="sm_count_badge" style="background:rgba(240,205,127,.15);color:#F0CD7F;padding:2px 9px;border-radius:9px;font-size:10.5px;font-weight:700;font-family:'IBM Plex Mono',monospace">${st.staffList.length} คน</span>
    </div>
    <div id="sm_person_cards">${this._renderPersonCards()}</div>
    <button type="button" class="btn btn-out btn-sm" onclick="Pages.op_prep._addPerson()" style="width:100%;margin-top:6px;background:rgba(110,231,183,.06);border:1px dashed rgba(110,231,183,.35);color:#6EE7B7;padding:9px;font-weight:500">+ เพิ่มคน</button>
    <div class="fg" style="margin-top:12px"><label>หมายเหตุ</label><input id="as_rm"/></div>`,
    'เพิ่ม Station', ()=>{
      const staffList = this._collectStaffList();
      if(!staffList) return; // validation failed
      const sel=document.getElementById('as_code');
      const stCode=sel.value, stName=sel.options[sel.selectedIndex]?.text.replace(stCode+' ','');
      const firstPerson = staffList[0]||{};
      DB.operation.saveStation({
        job_order_id:joid, order_no:st.nextNo,
        station_code:stCode, station_name:stName,
        staff_count: staffList.length,
        exam_count:parseInt(document.getElementById('as_exam').value)||0,
        staff_list: staffList,
        // backward compat — first person mirrored to top-level fields
        profession: firstPerson.profession||'',
        staff_name: firstPerson.staff_name||'',
        staff_type: firstPerson.staff_type||'',
        wage_per_day: firstPerson.wage_per_day||0,
        phone: firstPerson.phone||'',
        remark:document.getElementById('as_rm').value,
      });
      Modal.close();
      window._stationModalState = null;
      if(stCode==='ST-05'){
        setTimeout(()=>Pages.op_prep._promptTubes(joid),200);
      } else {
        this.editJO(joid);
      }
      U.toast('✅ เพิ่ม Station แล้ว ('+staffList.length+' คน)');
    });
  },

  _promptTubes(joid){
    // แสดง modal ให้เลือก tube เพิ่ม (Clot, CBC, FBS, อื่นๆ)
    Modal.open(`
    <div class="ab info" style="margin-bottom:12px">
      <div style="flex:1">
        <div class="fw6" style="margin-bottom:3px">🩸 Station ST-05 เจาะเลือด</div>
        <div class="t-sm">เลือก Tube ที่ใช้ในการเจาะเลือด (เลือกได้หลาย Tube)</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <label style="display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:8px;border:1.5px solid rgba(201,168,76,.3);background:rgba(201,168,76,.08);cursor:pointer">
        <input type="checkbox" class="tube-cb" value="ST-05A" style="width:17px;height:17px;accent-color:#C9A84C"/>
        <span style="flex:1;font-weight:600;font-size:13px">🩸 Tube Clot</span>
      </label>
      <label style="display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:8px;border:1.5px solid rgba(201,168,76,.3);background:rgba(201,168,76,.08);cursor:pointer">
        <input type="checkbox" class="tube-cb" value="ST-05B" style="width:17px;height:17px;accent-color:#C9A84C"/>
        <span style="flex:1;font-weight:600;font-size:13px">🔬 Tube CBC</span>
      </label>
      <label style="display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:8px;border:1.5px solid rgba(201,168,76,.3);background:rgba(201,168,76,.08);cursor:pointer">
        <input type="checkbox" class="tube-cb" value="ST-05C" style="width:17px;height:17px;accent-color:#C9A84C"/>
        <span style="flex:1;font-weight:600;font-size:13px">💉 Tube FBS</span>
      </label>
      <label style="display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:8px;border:1.5px solid rgba(201,168,76,.3);background:rgba(201,168,76,.08);cursor:pointer">
        <input type="checkbox" id="tube_other_cb" style="width:17px;height:17px;accent-color:#C9A84C" onchange="document.getElementById('tube_other_wrap').style.display=this.checked?'block':'none'"/>
        <span style="flex:1;font-weight:600;font-size:13px">➕ อื่นๆ (เพิ่ม Tube ใหม่)</span>
      </label>
    </div>
    <div id="tube_other_wrap" style="display:none;margin-top:8px;padding:10px 12px;background:rgba(201,168,76,.05);border-radius:8px;border:1px dashed rgba(201,168,76,.3)">
      <div class="fg"><label>ชื่อ Tube ใหม่</label><input id="tube_other_name" placeholder="เช่น Tube EDTA"/></div>
      <div class="t-xs t-muted">Tube ใหม่จะถูกเพิ่มเป็น Station เจาะเลือดอัตโนมัติ</div>
    </div>
    <div class="divider"></div>
    <div class="fr"><div class="fg"><label>จำนวนคน (ทุก Tube)</label><input id="tube_cnt" type="number" value="1" min="1"/></div>
      <div class="fg"><label>วิชาชีพ</label><select id="tube_prof">${U.sel(PROFESSIONS,'MT')}</select></div></div>
    <div class="fr"><div class="fg"><label>ประเภท</label><select id="tube_type">${U.sel(STAFF_TYPES,'ในองค์กร')}</select></div>
      <div class="fg"><label>ราคา/วัน (฿)</label><input id="tube_wage" type="number" value="0" min="0"/></div></div>`,
    '🩸 เพิ่ม Tube สำหรับ ST-05',()=>{
      const checkedTubes=[...document.querySelectorAll('.tube-cb:checked')].map(c=>c.value);
      const otherCk=document.getElementById('tube_other_cb').checked;
      const otherName=(document.getElementById('tube_other_name')?.value||'').trim();
      if(!checkedTubes.length&&!(otherCk&&otherName)){
        Modal.close();Pages.op_prep.editJO(joid);return;
      }
      const cnt=parseInt(document.getElementById('tube_cnt').value)||1;
      const prof=document.getElementById('tube_prof').value;
      const type=document.getElementById('tube_type').value;
      const wage=parseFloat(document.getElementById('tube_wage').value)||0;
      const sts=DB.operation.listStations(joid);
      let nextNo=sts.length>0?Math.max(...sts.map(s=>s.order_no))+1:1;
      // Add pre-defined tubes
      checkedTubes.forEach(tubeCode=>{
        const st=STATIONS.find(s=>s.code===tubeCode);
        if(!st)return;
        DB.operation.saveStation({
          job_order_id:joid, order_no:nextNo++,
          station_code:tubeCode, station_name:st.name,
          staff_count:cnt, profession:prof, staff_name:'', staff_type:type, wage_per_day:wage, remark:''
        });
      });
      // Add custom tube
      if(otherCk&&otherName){
        const customCode='ST-05Z'+Math.floor(Math.random()*1000);
        DB.operation.saveStation({
          job_order_id:joid, order_no:nextNo++,
          station_code:customCode, station_name:otherName+' (เจาะเลือด)',
          staff_count:cnt, profession:prof, staff_name:'', staff_type:type, wage_per_day:wage, remark:'Custom Tube'
        });
      }
      Modal.close();Pages.op_prep.editJO(joid);
      U.toast(`✅ เพิ่ม ${checkedTubes.length+(otherCk&&otherName?1:0)} Tube แล้ว`);
    });
  },

  editStation(sid,joid){
    const st = this._stationModalRender('edit', joid, sid);
    if(!st){U.toast('ไม่พบ Station','danger');return;}
    const s = st.station;
    Modal.open(`
    <div style="display:grid;grid-template-columns:1fr 110px 130px;gap:9px">
      <div class="fg"><label class="req">Station</label><select id="es_code">${U.stationOpts(s.station_code)}</select></div>
      <div class="fg"><label>จำนวนคน</label><input id="sm_staff_count" type="number" value="${st.staffList.length}" min="1" onchange="Pages.op_prep._syncStaffCount(this)" title="พิมพ์ตัวเลขเพื่อเพิ่มคน · กด × ใต้บัตรเพื่อลด"/></div>
      <div class="fg"><label>จำนวนตรวจ</label><input id="es_exam" type="number" value="${s.exam_count||''}" min="0" placeholder="จำนวนผู้รับบริการ"/></div>
    </div>
    <div style="display:flex;align-items:center;gap:9px;margin:14px 0 9px;padding-top:11px;border-top:1px solid rgba(255,255,255,.08)">
      <span style="font-size:11.5px;font-weight:700;color:#F0CD7F;text-transform:uppercase;letter-spacing:.5px;font-family:'IBM Plex Mono',monospace">👥 รายละเอียดเจ้าหน้าที่</span>
      <div style="flex:1;height:1px;background:rgba(240,205,127,.15)"></div>
      <span id="sm_count_badge" style="background:rgba(240,205,127,.15);color:#F0CD7F;padding:2px 9px;border-radius:9px;font-size:10.5px;font-weight:700;font-family:'IBM Plex Mono',monospace">${st.staffList.length} คน</span>
    </div>
    <div id="sm_person_cards">${this._renderPersonCards()}</div>
    <button type="button" class="btn btn-out btn-sm" onclick="Pages.op_prep._addPerson()" style="width:100%;margin-top:6px;background:rgba(110,231,183,.06);border:1px dashed rgba(110,231,183,.35);color:#6EE7B7;padding:9px;font-weight:500">+ เพิ่มคน</button>
    <div class="fg" style="margin-top:12px"><label>หมายเหตุ</label><input id="es_rm" value="${U.esc(s.remark||'')}"/></div>`,
    'แก้ไข Station', ()=>{
      const staffList = this._collectStaffList();
      if(!staffList) return;
      const sel=document.getElementById('es_code');
      const stCode=sel.value, stName=sel.options[sel.selectedIndex]?.text.replace(stCode+' ','');
      const firstPerson = staffList[0]||{};
      DB.operation.saveStation({
        ...s,
        station_code:stCode, station_name:stName,
        staff_count: staffList.length,
        exam_count:parseInt(document.getElementById('es_exam').value)||0,
        staff_list: staffList,
        // backward compat — first person mirrored
        profession: firstPerson.profession||'',
        staff_name: firstPerson.staff_name||'',
        staff_type: firstPerson.staff_type||'',
        wage_per_day: firstPerson.wage_per_day||0,
        phone: firstPerson.phone||'',
        remark:document.getElementById('es_rm').value,
      });
      Modal.close();
      window._stationModalState = null;
      this.editJO(joid);
      U.toast('✅ บันทึกแล้ว ('+staffList.length+' คน)');
    });
  },
  delStation(id,joid){if(U.confirm('ลบ Station นี้?')){DB.operation.deleteStation(id);this.editJO(joid);}},
  _equipmentTable(joid){
    const eq=DB.operation.listEquipments(joid);
    const rows=eq.map(e=>`<tr>
      <td>${U.esc(e.item_name)}</td>
      <td style="text-align:right;font-weight:600">฿${U.fmt(e.price||0)}</td>
      <td style="color:var(--t-muted)">${U.esc(e.remark||'')}</td>
      <td><button class="btn btn-danger btn-xs" onclick="Pages.op_prep.deleteEquipment(${e.id},${joid})">ลบ</button></td>
    </tr>`).join('');
    const total=eq.reduce((s,e)=>s+(e.price||0),0);
    return`<div class="mb4" style="display:flex;justify-content:space-between;align-items:center">
        <button class="btn btn-pri btn-sm" onclick="Pages.op_prep.addEquipment(${joid})">+ เพิ่มเช่าอุปกรณ์</button>
        ${total>0?`<div style="font-weight:700;color:var(--c-gold-lt)">รวม: ฿${U.fmt(total)}</div>`:''}
      </div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>รายการเช่าอุปกรณ์</th><th style="text-align:right">ราคาเช่า (฿)</th><th>หมายเหตุ</th><th></th></tr></thead>
        <tbody>${rows||'<tr><td colspan="4" class="empty" style="padding:16px;text-align:center">ยังไม่มีรายการเช่าอุปกรณ์</td></tr>'}</tbody>
      </table></div>`;
  },
  addEquipment(joid){
    Modal.open(`
    <div class="fg"><label class="req">รายการเช่าอุปกรณ์</label>
      <input id="eq_name" placeholder="เช่น เครื่อง EKG, อัลตราซาวด์ portable, เครื่อง Audiogram"/></div>
    <div class="fr">
      <div class="fg"><label class="req">ราคาเช่า (บาท)</label>
        <input id="eq_price" type="number" value="0" min="0"/></div>
      <div class="fg"><label>หมายเหตุ</label>
        <input id="eq_remark" placeholder="รายละเอียดเพิ่มเติม"/></div>
    </div>`,
    'เพิ่มเช่าอุปกรณ์',()=>{
      const name=document.getElementById('eq_name').value.trim();
      if(!name)return U.toast('กรุณาใส่รายการ','danger');
      DB.operation.saveEquipment({job_order_id:joid,item_name:name,price:parseFloat(document.getElementById('eq_price').value)||0,remark:document.getElementById('eq_remark').value});
      this.editJO(joid);U.toast('✅ เพิ่มแล้ว');
    });
  },
  deleteEquipment(id,joid){
    if(!U.confirm('ลบรายการเช่านี้?'))return;
    DB.operation.deleteEquipment(id);
    this.editJO(joid);U.toast('✅ ลบแล้ว');
  },
  addVehicle(joid){
    const vs=DB.operation.listVehicles(joid);const nextNo=vs.length>0?Math.max(...vs.map(v=>v.order_no))+1:1;
    Modal.open(`<div class="fr"><div class="fg"><label class="req">ยานพาหนะ</label><select id="av_veh">${U.sel(VEHICLES,'')}</select></div>
      <div class="fg"><label>ประเภท</label><select id="av_type">${U.sel(STAFF_TYPES,'ในองค์กร')}</select></div></div>
    <div class="fr"><div class="fg"><label>ชื่อ-สกุล ผู้รับผิดชอบ</label>${U.staffAutocomplete('av_name', '', 'ค้นหาผู้รับผิดชอบยานพาหนะ')}</div>
      <div class="fg"><label>เบอร์โทร</label><input id="av_ph"/></div></div>
    <div class="fg"><label>หมายเหตุ</label><input id="av_rm"/></div>`,
    'เพิ่มยานพาหนะ', async () => {
      DB.operation.saveVehicle({job_order_id:joid,order_no:nextNo,vehicle_name:document.getElementById('av_veh').value,staff_type:document.getElementById('av_type').value,responsible_name:document.getElementById('av_name').value,phone:document.getElementById('av_ph').value,remark:document.getElementById('av_rm').value});
      Modal.close();this.editJO(joid);U.toast('✅ เพิ่มยานพาหนะแล้ว');
    });
  },
  delVehicle(id,joid){if(U.confirm('ลบ?')){DB.operation.deleteVehicle(id);this.editJO(joid);}},
  delJO(id){if(U.confirm('ลบใบแจ้งงานนี้?')){const sts=DB._get('operation_db','job_stations').filter(s=>s.job_order_id!==id);DB._set('operation_db','job_stations',sts);const vs=DB._get('operation_db','job_vehicles').filter(v=>v.job_order_id!==id);DB._set('operation_db','job_vehicles',vs);DB._set('operation_db','job_orders',DB._get('operation_db','job_orders').filter(r=>r.id!==id));this.render();U.toast('✅ ลบแล้ว');}},
  async viewJO(id){
    const jo=DB.operation.getJobOrderById(id);
    const p=DB.sales.getProject(jo.project_id);
    Modal.open(`<div class="no-print btn-grp mb4">
      <button class="btn btn-pri" onclick="Pages.op_prep.printJO(${id})">🖨 พิมพ์ A4</button>
      <button class="btn btn-out" onclick="Modal.close();Pages.op_prep.editJO(${id})">✏️ แก้ไข</button>
    </div>
    <div id="jo-preview-wrap" style="background:#fff;border-radius:10px;padding:20px;border:1px solid #E4E9F0;margin-top:4px"></div>`,'ใบแจ้งงาน — ดูตัวอย่าง',null,true);
    setTimeoutasync (() => {
      const wrap=document.getElementById('jo-preview-wrap');
      if(wrap)wrap.innerHTML=Pages.op_prep._buildJOHTML(id);
    },50);
  },
  _buildJOHTML(id){
    const jo=DB.operation.getJobOrderById(id);
    const sts=DB.operation.listStations(id);
    const vs=DB.operation.listVehicles(id);
    const eqs=DB.operation.listEquipments(id);
    const eqRows=eqs.map(e=>`<tr><td>${U.esc(e.item_name)}</td><td style="text-align:right">฿${U.fmt(e.price||0)}</td><td>${U.esc(e.remark||'')}</td></tr>`).join('');
    const eqTotal=eqs.reduce((s,e)=>s+(e.price||0),0);
    const p=DB.sales.getProject(jo.project_id);
    const today=new Date().toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'});
    // Print 1 Station = N row (1 ต่อคน) — Cols: # | จุดตรวจ Station | คน | จำนวนตรวจ | ชื่อ-สกุล | ประเภท | หมายเหตุ (ต่อคน)
    const stRows=sts.map(s=>{
      let people = (s.staff_list && s.staff_list.length>0)
        ? s.staff_list
        : [{profession:s.profession||'',staff_name:s.staff_name||'',staff_type:s.staff_type||'',wage_per_day:s.wage_per_day||0,phone:s.phone||'',remark:s.remark||''}];
      const targetCnt = parseInt(s.staff_count)||1;
      while(people.length < targetCnt){
        people.push({profession:'',staff_name:'',staff_type:'',wage_per_day:0,phone:'',remark:''});
      }
      const cnt = people.length;
      return people.map((p,pi)=>{
        const isFirst = pi===0;
        return `<tr>
          ${isFirst?`<td rowspan="${cnt}" style="text-align:center;vertical-align:middle;font-weight:600">${s.order_no}</td>
          <td rowspan="${cnt}" style="vertical-align:middle">${s.station_name}</td>
          <td rowspan="${cnt}" style="text-align:center;vertical-align:middle;font-weight:600">${cnt}</td>
          <td rowspan="${cnt}" style="text-align:center;vertical-align:middle;color:${s.exam_count?'#065F46':'#B0BAC8'}">${s.exam_count||'-'}</td>`:''}
          <td style="font-weight:600">${p.staff_name?U.esc(p.staff_name):'<span style="color:#C9A84C">ยังไม่ได้กรอก</span>'}</td>
          <td>${p.staff_type||'-'}</td>
          <td style="color:#3A5166">${U.esc(p.remark||'')}</td>
        </tr>`;
      }).join('');
    }).join('');
    const vRows=vs.map(v=>`<tr><td style="text-align:center">${v.order_no}</td><td style="font-weight:600">${v.vehicle_name}</td><td>${v.staff_type}</td><td>${v.responsible_name}</td><td style="font-family:monospace">${v.phone}</td><td style="color:#8896A8">${v.remark||''}</td></tr>`).join('');
    // Inject global styles for JO preview (scoped via prefix)
    if(!document.getElementById('jo-preview-styles')){
      const s=document.createElement('style');s.id='jo-preview-styles';
      s.textContent=`
      #jo-preview-wrap .jo-print-doc{font-family:'Sarabun',sans-serif!important;color:#1A2332!important;font-size:13px;max-width:100%;background:#fff;padding:0;}
      #jo-preview-wrap *{box-sizing:border-box;}`;
      document.head.appendChild(s);
    }
    const JO_CSS=`<style>
      .jo-print-doc{font-family:'Sarabun',sans-serif;color:#1A2332;font-size:13px;max-width:760px;margin:0 auto;}
      .jo-doc-header{display:flex;align-items:center;justify-content:space-between;padding-bottom:9px;margin-bottom:10px;border-bottom:2px solid #0D2137;}
      .jo-doc-brand{display:flex;align-items:center;gap:12px;}
      .brand-mark{width:44px;height:44px;background:#0D2137;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;}
      .brand-text h1{font-size:15px;font-weight:700;color:#0D2137;margin-bottom:2px;}
      .brand-text p{font-size:11px;color:#8896A8;}
      .jo-doc-meta{text-align:right;}
      .doc-no{font-family:monospace;font-size:17px;font-weight:700;color:#0D2137;}
      .doc-date{font-size:10px;color:#8896A8;margin-top:2px;}
      .doc-badge{display:inline-block;margin-top:5px;padding:2px 12px;border-radius:20px;background:linear-gradient(90deg,#C9A84C,#E8C97A);color:#fff;font-size:10px;font-weight:700;}
      .jo-section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#8896A8;margin:14px 0 8px;display:flex;align-items:center;gap:8px;}
      .jo-section-title::after{content:'';flex:1;height:1px;background:#E4E9F0;}
      .jo-info-row{display:grid;gap:5px;margin-bottom:5px;}
      .jo-info-row.r1{grid-template-columns:2fr 1fr 1fr;}            /* 50/25/25 */
      .jo-info-row.r2{grid-template-columns:1fr;}                    /* 100 */
      .jo-info-row.r3{grid-template-columns:2fr 3fr 2fr 3fr;}        /* 20/30/20/30 */
      .jo-info-row.r4{grid-template-columns:3fr 7fr;}                /* 30/70 */
      .jo-info-cell{background:#F9FAFB;border-radius:5px;padding:5px 9px;border:1px solid #E4E9F0;}
      .jo-info-cell .lbl{font-size:8px;font-weight:700;color:#8896A8;text-transform:uppercase;letter-spacing:.04em;margin-bottom:1px;}
      .jo-info-cell .val{font-size:11px;font-weight:600;color:#1A2332;line-height:1.25;}
      .jo-info-cell.highlight{background:#F0FDF4;border-color:#86EFAC;}
      .jo-info-cell.highlight .val{color:#065F46;}
      .jo-table{table-layout:fixed;width:100%;}
      .jo-table{width:100%;border-collapse:collapse;margin-bottom:6px;font-size:10px;}
      .jo-table thead tr{background:#0D2137;}
      .jo-table thead{display:table-header-group;}  /* repeat on every print page */
      .jo-table tbody{display:table-row-group;}
      .jo-table th{padding:4px 7px;font-size:8.5px;font-weight:700;color:rgba(255,255,255,.85);text-transform:uppercase;letter-spacing:.04em;text-align:left;border:none;}
      .jo-table td{padding:4px 7px;border-bottom:1px solid #E4E9F0;vertical-align:middle;font-size:10px;line-height:1.3;}
      .jo-table tr:last-child td{border-bottom:none;}
      .jo-table tbody tr:nth-child(even) td{background:#FFFFFF;}
      .jo-sign-section{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:14px;padding-top:8px;border-top:1px solid #E4E9F0;page-break-inside:avoid;}
      .jo-sign-box{text-align:center;}
      .sign-line{height:38px;border-bottom:1px solid #C8D0DC;margin-bottom:4px;}
      .sign-label{font-size:10px;color:#8896A8;font-weight:600;text-transform:uppercase;letter-spacing:.06em;}
      .sign-name{font-size:11px;color:#1A2332;font-weight:600;margin-top:2px;}
      .jo-footer{margin-top:14px;padding-top:8px;border-top:1px solid #E4E9F0;display:flex;justify-content:space-between;font-size:9px;color:#B0BAC8;}
      .jo-summary-box{background:#F0F9FF;border-radius:9px;border:1px solid #BAE6FD;padding:12px 16px;margin-bottom:12px;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
      .jo-sum-item{text-align:center;}.jo-sum-val{font-size:20px;font-weight:700;color:#0D2137;}.jo-sum-lbl{font-size:9px;color:#8896A8;text-transform:uppercase;margin-top:2px;}
    </style>`;
    return JO_CSS+`<div class="jo-print-doc">
    <table class="jo-page-repeater">
      <thead>
        <tr><td>
          <!-- Running strip — repeats at top of EVERY printed page via thead display:table-header-group -->
          <div class="jo-running-strip">
            <div class="strip-ttl">📋 ใบแจ้งงาน<span class="strip-code">${p?.project_code||'-'}</span></div>
            <div class="strip-info">${U.esc(jo.company_name||'')} · ${U.fmtD(jo.onsite_date)} · ${(jo.headcount||0).toLocaleString()} คน</div>
          </div>
        </td></tr>
      </thead>
      <tbody>
        <tr><td>
      <div class="jo-doc-header">
        <div class="jo-doc-brand">
          <div class="brand-mark">🏥</div>
          <div class="brand-text">
            <h1>Mobile Checkup System</h1>
            <p>ใบแจ้งงานออกหน่วยตรวจสุขภาพ</p>
          </div>
        </div>
        <div class="jo-doc-meta">
          <div class="doc-no">${p?.project_code||'-'}</div>
          <div class="doc-date">วันที่พิมพ์: ${today}</div>
          <div class="doc-badge">${jo.job_type||'ตรวจสุขภาพ'}</div>
        </div>
      </div>
      <div class="jo-section-title">ข้อมูลทั่วไป</div>
      <!-- Row 1: 50/25/25 -->
      <div class="jo-info-row r1">
        <div class="jo-info-cell"><div class="lbl">ชื่อบริษัท / องค์กร</div><div class="val">${jo.company_name}</div></div>
        <div class="jo-info-cell highlight"><div class="lbl">วันที่ออกหน่วย</div><div class="val">${U.fmtD(jo.onsite_date)}</div></div>
        <div class="jo-info-cell"><div class="lbl">จำนวนพนักงาน</div><div class="val">${(jo.headcount||0).toLocaleString()} คน</div></div>
      </div>
      <!-- Row 2: สถานที่ (100%) -->
      <div class="jo-info-row r2">
        <div class="jo-info-cell"><div class="lbl">สถานที่</div><div class="val">${jo.location||'-'}</div></div>
      </div>
      <!-- Row 3: 20/30/20/30 (Director ย้ายมาที่นี่) -->
      <div class="jo-info-row r3">
        <div class="jo-info-cell"><div class="lbl">เวลาออกเดินทาง</div><div class="val">${jo.depart_time||'-'}</div></div>
        <div class="jo-info-cell"><div class="lbl">เวลาเริ่ม - สิ้นสุด</div><div class="val">${jo.start_time||'-'} - ${jo.end_time||'-'}</div></div>
        <div class="jo-info-cell"><div class="lbl">กะทำงาน</div><div class="val">${jo.shift||'-'}</div></div>
        <div class="jo-info-cell"><div class="lbl">Director</div><div class="val">${jo.director||'-'}</div></div>
      </div>
      <!-- Row 4: 30/70 -->
      <div class="jo-info-row r4">
        <div class="jo-info-cell"><div class="lbl">ประเภทงาน</div><div class="val">${jo.job_type||'-'}</div></div>
        <div class="jo-info-cell"><div class="lbl">หมายเหตุ</div><div class="val">${jo.remark||'-'}</div></div>
      </div>
      <div class="jo-section-title">จุดตรวจ Station และอัตรากำลัง</div>
      <table class="jo-table">
        <colgroup>
          <col style="width:3%"/>
          <col style="width:20%"/>
          <col style="width:5%"/>
          <col style="width:10%"/>
          <col style="width:25%"/>
          <col style="width:10%"/>
          <col style="width:27%"/>
        </colgroup>
        <thead><tr><th>#</th><th>จุดตรวจ Station</th><th style="text-align:center">คน</th><th style="text-align:center">จำนวนตรวจ</th><th>ชื่อ-สกุล</th><th>ประเภท</th><th>หมายเหตุ</th></tr></thead>
        <tbody>${stRows||'<tr><td colspan="7" style="text-align:center;padding:16px;color:#8896A8">ยังไม่มีรายการ Station</td></tr>'}</tbody>
      </table>
      <div class="jo-section-title">ยานพาหนะ</div>
      <table class="jo-table">
        <thead><tr><th>#</th><th>รายการ</th><th>ประเภท</th><th>ผู้รับผิดชอบ</th><th>เบอร์โทร</th><th>หมายเหตุ</th></tr></thead>
        <tbody>${vRows||'<tr><td colspan="6" style="text-align:center;padding:16px;color:#8896A8">ยังไม่มีรายการยานพาหนะ</td></tr>'}</tbody>
      </table>
      
      <div class="jo-sign-section">
        <div class="jo-sign-box"><div class="sign-line"></div><div class="sign-label">ผู้จัดทำ</div><div class="sign-name">${jo.signer_creator||'..................................'}</div></div>
        <div class="jo-sign-box"><div class="sign-line"></div><div class="sign-label">หัวหน้าแผนก</div><div class="sign-name">${jo.signer_head||'..................................'}</div></div>
        <div class="jo-sign-box"><div class="sign-line"></div><div class="sign-label">HR</div><div class="sign-name">${jo.signer_hr||'..................................'}</div></div>
      </div>
      <div class="jo-footer">
        <span>Mobile Checkup System — ใบแจ้งงานออกหน่วย</span>
        <span>พิมพ์: ${today}</span>
      </div>
        </td></tr>
      </tbody>
    </table>
    </div>`;
  },
  printJO(id){
    const html=this._buildJOHTML(id);
    const w=window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ใบแจ้งงาน</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&family=Prompt:wght@600;700&family=IBM+Plex+Mono&display=swap" rel="stylesheet">
    <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Sarabun',sans-serif;color:#1A2332;padding:12px;background:#fff;font-size:11.5px;}
    .jo-print-doc{max-width:780px;margin:0 auto;}
    .jo-doc-header{display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;margin-bottom:14px;border-bottom:3px solid #0D2137;}
    .jo-doc-brand{display:flex;align-items:center;gap:12px;}
    .brand-mark{width:36px;height:36px;background:#0D2137;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;}
    .brand-text h1{font-family:'Prompt',sans-serif;font-size:13px;font-weight:700;color:#0D2137;margin-bottom:1px;}
    .brand-text p{font-size:11px;color:#8896A8;}
    .jo-doc-meta{text-align:right;}
    .doc-no{font-family:'IBM Plex Mono',monospace;font-size:14px;font-weight:700;color:#0D2137;}
    .doc-date{font-size:10px;color:#8896A8;margin-top:2px;}
    .doc-badge{display:inline-block;margin-top:5px;padding:2px 12px;border-radius:20px;background:linear-gradient(90deg,#C9A84C,#E8C97A);color:#fff;font-size:10px;font-weight:700;}
    .jo-section-title{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#0D2137;margin:8px 0 4px;display:flex;align-items:center;gap:6px;}
    .jo-section-title::after{content:'';flex:1;height:1px;background:#E4E9F0;}
    .jo-info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:6px;}
    .jo-info-cell{background:#F9FAFB;border-radius:5px;padding:5px 8px;border:1px solid #E4E9F0;}
    .jo-info-cell .lbl{font-size:8.5px;font-weight:700;color:#8896A8;text-transform:uppercase;letter-spacing:.05em;}
    .jo-info-cell .val{font-size:11.5px;font-weight:600;color:#1A2332;margin-top:1px;}
    .jo-info-cell.highlight{background:#F0FDF4;border-color:#86EFAC;}
    .jo-info-cell.highlight .val{color:#065F46;}
    .jo-table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:11px;}
    .jo-table thead tr{background:#0D2137;}
    .jo-table th{padding:7px 9px;font-size:9px;font-weight:700;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.06em;text-align:left;border:none;}
    .jo-table td{padding:7px 9px;border-bottom:1px solid #E4E9F0;vertical-align:middle;}
    .jo-table tr:last-child td{border-bottom:none;}
    .jo-table tbody tr:nth-child(even) td{background:#FFFFFF;}
    .jo-sign-section{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:24px;padding-top:14px;border-top:1px solid #E4E9F0;}
    .jo-sign-box{text-align:center;}
    .sign-line{height:38px;border-bottom:1px solid #C8D0DC;margin-bottom:4px;}
    .sign-label{font-size:10px;color:#8896A8;font-weight:600;}
    .sign-name{font-size:11px;color:#1A2332;font-weight:600;margin-top:2px;}
    .jo-footer{margin-top:14px;padding-top:8px;border-top:1px solid #E4E9F0;display:flex;justify-content:space-between;font-size:9px;color:#B0BAC8;}
    /* Page repeater table — thead จะซ้ำที่บนทุกหน้าโดยอัตโนมัติ */
    .jo-page-repeater{width:100%;border-collapse:collapse;}
    .jo-page-repeater > thead{display:table-header-group;}
    .jo-page-repeater > tbody > tr > td{padding:0;}
    .jo-page-repeater > thead > tr > td{padding:0;}
    .jo-running-strip{
      background:linear-gradient(90deg,#0D2137,#1A3C65);
      color:#fff;
      padding:4px 10px;
      border-radius:4px;
      margin-bottom:6px;
      display:flex;
      justify-content:space-between;
      align-items:center;
      font-size:9.5px;
      page-break-inside:avoid;
    }
    .jo-running-strip *{color:#fff;}
    .jo-running-strip .strip-ttl{font-weight:700}
    .jo-running-strip .strip-code{background:#F0CD7F;color:#1A1A1A!important;padding:1px 6px;border-radius:3px;font-family:monospace;font-weight:700;font-size:9px;margin:0 4px}
    .jo-running-strip .strip-info{font-size:8.5px;opacity:.92}
    @media print{
      @page{
        size:A4;
        margin:8mm 9mm 10mm 9mm;
      }
      button{display:none!important;}
      body{padding:0!important;font-size:10.5px!important;}
      .jo-table{page-break-inside:auto}
      .jo-table tr{page-break-inside:avoid;page-break-after:auto}
      .jo-doc-header{page-break-after:avoid}
      .jo-section-title{page-break-after:avoid}
      .jo-info-row{page-break-inside:avoid}
      .jo-sign-section{page-break-before:avoid;page-break-inside:avoid}
    }
    .no-print{display:flex;gap:8px;margin-bottom:16px;}
    .btn-p{padding:8px 18px;background:#0D2137;color:#fff;border:none;border-radius:7px;font-family:Sarabun,sans-serif;font-size:13px;cursor:pointer;}
    </style></head><body>
    <div class="no-print"><button class="btn-p" onclick="window.print()">🖨 พิมพ์ A4</button></div>
    ${html}</body></html>`);
    w.document.close();w.focus();
  }
};

/* ── OP ONSITE ── */
Pages.op_onsite={
  currentPid:null,
  async render(){
    const projs=DB.sales.listProjects();
    const canAdd=DB.auth.can('add','op_onsite');
    // Build summary table of all onsite projects
    const onsiteProjs=projs.filter(p=>DB.operation.listOnsiteLogs(p.id).length>0||['Closed','Onsite','Lab','Report','Billing','Completed'].includes(p.status));
    const summaryRows=onsiteProjs.map(p=>{
      const logs=DB.operation.listOnsiteLogs(p.id);
      const isComplete=p.status==='Lab'||p.status==='Report'||p.status==='Billing'||p.status==='Completed';
      const statusBadge=isComplete
        ?`<span class="badge b-closed" style="font-size:10px">✅ Complete</span>`
        :`<span class="badge b-onsite" style="font-size:10px">🚑 Onsite</span>`;
      return`<tr>
        <td class="fw6 mono" style="color:var(--c-gold-lt,#E2C46A)">${U.esc(p.project_code)}</td>
        <td class="fw6">${U.esc(p.company_name)}</td>
        <td>${U.fmtD(p.onsite_date)}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-out btn-xs" onclick="Pages.op_onsite.viewSummary(${p.id})" style="margin-right:4px">👁 ดู</button>
          ${canAdd?`<button class="btn btn-pri btn-xs" onclick="Pages.op_onsite.loadProject(${p.id})" style="margin-right:4px">✏️ แก้ไข</button>`:''}
          ${DB.auth.can('delete','op_onsite')?`<button class="btn btn-danger btn-xs" onclick="Pages.op_onsite.deleteOnsite(${p.id})">ลบ</button>`:''}
        </td>
      </tr>`;
    }).join('');
    const pOpts=`<option value="">-- เลือก Project --</option>`+projs.map(p=>`<option value="${p.id}" ${this.currentPid===p.id?'selected':''}>${p.project_code} — ${p.company_name} (${U.fmtD(p.onsite_date)})</option>`).join('');
    document.getElementById('content').innerHTML=`
    <div class="ph"><div><h2>🚑 Operation — Onsite</h2><p>บันทึกสรุปยอดหน้างานแต่ละ Station</p></div></div>
    <div class="card mb4">
      <div class="card-header"><span class="card-title">📋 สรุปยอด Onsite ทั้งหมด</span></div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Project Code</th><th>บริษัท</th><th>วันตรวจ</th><th>สถานะงาน</th><th></th></tr></thead>
        <tbody>${summaryRows||'<tr><td colspan="5" class="empty"><div class="icon">🚑</div><p>ยังไม่มีข้อมูล Onsite</p></td></tr>'}</tbody>
      </table></div>
    </div>
    <div class="card mb4">
      <div class="fg"><label>เลือก Project เพื่อบันทึก / ดูรายละเอียด</label>
        <select id="ons_sel" onchange="Pages.op_onsite.loadProject(parseInt(this.value))">
          ${pOpts}
        </select>
      </div>
    </div>
    <div id="ons_detail"></div>`;
    if(this.currentPid)this.loadProject(this.currentPid);
  },
  loadProject(pid){
    if(!pid){document.getElementById('ons_detail').innerHTML='';this.currentPid=null;return;}
    const p=DB.sales.getProject(pid);
    if(!p)return;
    this.currentPid=pid;
    document.getElementById('ons_sel').value=pid;
    const logs=DB.operation.listOnsiteLogs(pid);
    const jo=DB.operation.getJobOrder(pid);
    const canAdd=DB.auth.can('add','op_onsite'),canDel=DB.auth.can('delete','op_onsite');
    // ตรวจสำเร็จ = นับจาก Station ลงทะเบียน (ST-01) เท่านั้น
    // เป้าหมาย + สำเร็จ = นับจาก Station ที่มียอดมากสุด (ไม่บวกทุก station)
    const totalExpected=logs.length?Math.max(...logs.map(l=>l.total_expected||0)):0;
    const totalDone=logs.length?Math.max(...logs.map(l=>l.total_done||0)):0;
    const totalMiss=logs.reduce((s,l)=>s+(l.missing||0),0);
    const totalRef=logs.reduce((s,l)=>s+(l.refused||0),0);
    const pct=p.headcount>0?Math.round(totalDone/p.headcount*100):0;
    const canEdit=DB.auth.can('edit','op_onsite');
    const files=Pages.op_onsite._getFiles(pid);
    const fileChips=files.map((f,i)=>`<span class="file-item" style="display:inline-flex;margin:2px 4px 2px 0">
      <span class="file-icon">${Pages.op_onsite._fileIcon(f.type)}</span>
      <span class="file-name">${U.esc(f.name)}</span>
      <span class="file-size">${f.size}</span>
      ${canEdit?`<button class="file-remove" onclick="Pages.op_onsite.removeFile(${pid},${i})">✕</button>`:''}
    </span>`).join('');
    const logRows=logs.map(l=>`<tr>
      <td><span class="badge b-onsite" style="font-family:monospace;font-size:10px">${l.station_code||''}</span></td>
      <td class="fw6">${l.station_name}</td>
      <td class="t-center">${l.total_expected}</td>
      <td class="t-center t-success fw6">${l.total_done}</td>
      <td class="t-center t-warn">${l.missing}</td>
      <td class="t-center t-danger">${l.refused}</td>
      <td class="t-sm t-muted">${l.note||'-'}</td>
      <td>
        ${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.op_onsite.editLog(${l.id},${pid})" style="margin-right:4px">แก้ไข</button>`:''}
        ${canDel?`<button class="btn btn-danger btn-xs" onclick="Pages.op_onsite.delLog(${l.id})">ลบ</button>`:''}
      </td>
    </tr>`).join('');
    document.getElementById('ons_detail').innerHTML=`
    <div class="metrics-grid">
      <div class="metric-card acc"><div class="metric-label">เป้าหมาย</div><div class="metric-value">${(p.headcount||0).toLocaleString()}</div><div class="metric-sub">คน</div></div>
      <div class="metric-card suc"><div class="metric-label">ตรวจสำเร็จ</div><div class="metric-value">${totalDone.toLocaleString()}</div><div class="metric-sub">${pct}%</div></div>
      <div class="metric-card warn"><div class="metric-label">เก็บตก/ลา</div><div class="metric-value">${totalMiss}</div></div>
      <div class="metric-card danger"><div class="metric-label">ปฏิเสธ</div><div class="metric-value">${totalRef}</div></div>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">📊 สรุปยอด — ${p.project_code} | ${p.company_name}</span>
        <div class="btn-grp">
          ${canAdd?`<button class="btn btn-pri btn-sm" onclick="Pages.op_onsite.addLog(${pid})">+ บันทึก Station</button>`:''}
          ${canAdd?`<button class="btn btn-gold btn-sm" onclick="EXT.onsite.recordForm(${pid})">📝 บันทึกงานออกหน่วย</button>`:''}
          <button class="btn btn-out btn-sm" onclick="Pages.op_onsite.printSummary(${pid})">🖨 พิมพ์</button>
          <button class="btn btn-out btn-sm" onclick="Pages.op_onsite.exportCSV(${pid})">📥 Excel</button>
        </div>
      </div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Code</th><th>Station</th><th style="text-align:center">เป้าหมาย</th><th style="text-align:center">สำเร็จ</th><th style="text-align:center">เก็บตก</th><th style="text-align:center">ปฏิเสธ</th><th>หมายเหตุ</th><th></th></tr></thead>
        <tbody>${logRows||'<tr><td colspan="8" class="empty"><div class="icon">📋</div><p>ยังไม่มีบันทึก กด "+ บันทึก Station"</p></td></tr>'}</tbody>
        ${logs.length>0?`<tfoot><tr>
          <td colspan="2" class="fw6">รวมทั้งหมด (ยอดสูงสุด)</td>
          <td class="fw6 t-center">${totalExpected}</td>
          <td class="fw6 t-center t-success">${totalDone}</td>
          <td class="fw6 t-center t-warn">${totalMiss}</td>
          <td class="fw6 t-center t-danger">${totalRef}</td>
          <td colspan="2"></td>
        </tr></tfoot>`:''}
      </table></div>
      ${canEdit?`<div class="divider"></div>
      <div class="card-title" style="margin-bottom:10px;font-size:13px">📎 ไฟล์แนบ</div>
      <div id="ons_files">${fileChips||'<span class="t-sm t-muted">ยังไม่มีไฟล์แนบ</span>'}</div>
      <div class="mt2">
        <input type="file" id="ons_file_inp" multiple style="display:none" onchange="Pages.op_onsite.attachFiles(${pid},this)"/>
        <button class="btn btn-out btn-sm" onclick="document.getElementById('ons_file_inp').click()">📎 แนบไฟล์</button>
        <span class="t-xs t-muted" style="margin-left:8px">รองรับทุกประเภทไฟล์</span>
      </div>`:''}
      ${logs.length>0&&canAdd?`<div class="divider"></div><div class="btn-grp">
        <button class="btn btn-suc" onclick="Pages.op_onsite.closeUnit(${pid})">✅ ปิดหน่วย + ส่งข้อมูล Lab & Report</button>
        <button class="btn btn-out btn-sm" onclick="Pages.op_onsite.manageSigner(${pid})">✍️ ลายเซ็น</button>
      </div>`:''}
    </div>`;
  },
  async addLog(pid){
    const jo=DB.operation.getJobOrder(pid);
    const sts=jo?DB.operation.listStations(jo.id):[];
    const existCodes=DB.operation.listOnsiteLogs(pid).map(l=>l.station_code);
    const available=sts.length>0
      ? sts.filter(s=>!existCodes.includes(s.station_code))
      : STATIONS.filter(s=>!existCodes.includes(s.code));
    let stOpts='';
    if(sts.length>0){
      stOpts=available.length>0
        ? available.map(s=>`<option value="${s.station_code}">${s.station_code} ${s.station_name}</option>`).join('')
        : U.stationOpts();
    } else {
      stOpts=U.stationOpts();
    }
    // also allow "รวมทุก Station"
    stOpts=`<option value="รวม">รวมทุก Station</option>`+stOpts;
    const p=DB.sales.getProject(pid);
    Modal.open(`
    <div class="fr">
      <div class="fg"><label class="req">Station</label><select id="ol_st">${stOpts}</select></div>
      <div class="fg"><label>เป้าหมาย (คน)</label><input id="ol_exp" type="number" value="${p?.headcount||0}"/></div>
    </div>
    <div class="fr3">
      <div class="fg"><label>ตรวจสำเร็จ</label><input id="ol_done" type="number" placeholder="0"/></div>
      <div class="fg"><label>เก็บตก/ลา</label><input id="ol_miss" type="number" value="0"/></div>
      <div class="fg"><label>ปฏิเสธ</label><input id="ol_ref" type="number" value="0"/></div>
    </div>
    <div class="fg"><label>หมายเหตุ</label><textarea id="ol_nt" placeholder="บันทึกปัญหาหรือเหตุการณ์พิเศษ..."></textarea></div>`,
    'บันทึกผล Onsite', async () => {
      const sel=document.getElementById('ol_st');
      const code=sel.value;
      const stName=code==='รวม'?'รวมทุก Station':sel.options[sel.selectedIndex]?.text.replace(code+' ','').trim()||code;
      DB.operation.saveOnsiteLog({
        project_id:pid, station_code:code, station_name:stName,
        total_expected:parseInt(document.getElementById('ol_exp').value)||0,
        total_done:parseInt(document.getElementById('ol_done').value)||0,
        missing:parseInt(document.getElementById('ol_miss').value)||0,
        refused:parseInt(document.getElementById('ol_ref').value)||0,
        note:document.getElementById('ol_nt').value
      });
      Modal.close();this.loadProject(pid);U.toast('✅ บันทึกแล้ว');
    });
  },
  editLog(id,pid){
    const l=DB.operation.listOnsiteLogs(pid).find(x=>x.id===id);
    if(!l)return;
    Modal.open(`
    <div class="fr">
      <div class="fg"><label>Station</label><input value="${U.esc(l.station_code+' '+l.station_name)}" disabled/></div>
      <div class="fg"><label>เป้าหมาย</label><input id="el_exp" type="number" value="${l.total_expected}"/></div>
    </div>
    <div class="fr3">
      <div class="fg"><label>ตรวจสำเร็จ</label><input id="el_done" type="number" value="${l.total_done}"/></div>
      <div class="fg"><label>เก็บตก/ลา</label><input id="el_miss" type="number" value="${l.missing}"/></div>
      <div class="fg"><label>ปฏิเสธ</label><input id="el_ref" type="number" value="${l.refused}"/></div>
    </div>
    <div class="fg"><label>หมายเหตุ</label><textarea id="el_nt">${U.esc(l.note||'')}</textarea></div>`,
    'แก้ไขบันทึก Onsite', async () => {
      DB.operation.saveOnsiteLog({...l,
        total_expected:parseInt(document.getElementById('el_exp').value)||0,
        total_done:parseInt(document.getElementById('el_done').value)||0,
        missing:parseInt(document.getElementById('el_miss').value)||0,
        refused:parseInt(document.getElementById('el_ref').value)||0,
        note:document.getElementById('el_nt').value
      });
      Modal.close();this.loadProject(pid);U.toast('✅ แก้ไขแล้ว');
    });
  },
  delLog(id){
    if(U.confirm('ลบรายการนี้?')){DB.operation.deleteOnsiteLog(id);this.loadProject(this.currentPid);}
  },
  _filesKey(pid){return`onsite_files_${pid}`;},
  _getFiles(pid){try{return JSON.parse(localStorage.getItem(this._filesKey(pid))||'[]')}catch{return[];}},
  _saveFiles(pid,files){localStorage.setItem(this._filesKey(pid),JSON.stringify(files));},
  _fileIcon(type){const t=type||'';if(t.includes('image'))return'🖼';if(t.includes('pdf'))return'📄';if(t.includes('sheet')||t.includes('excel'))return'📊';if(t.includes('word')||t.includes('doc'))return'📝';return'📎';},
  attachFiles(pid,inp){
    const existing=this._getFiles(pid);
    Array.from(inp.files).forEach(f=>{
      existing.push({name:f.name,size:f.size>1024*1024?`${(f.size/1024/1024).toFixed(1)}MB`:`${Math.round(f.size/1024)}KB`,type:f.type,added_at:new Date().toISOString()});
    });
    this._saveFiles(pid,existing);
    this.loadProject(pid);
    U.toast(`✅ แนบไฟล์ ${inp.files.length} ไฟล์แล้ว`);
  },
  removeFile(pid,idx){
    if(!U.confirm('ลบไฟล์แนบนี้?'))return;
    const files=this._getFiles(pid);files.splice(idx,1);
    this._saveFiles(pid,files);this.loadProject(pid);
  },
  manageSigner(pid){
    const key=`onsite_signer_${pid}`;
    let sg={};try{sg=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
    Modal.open(`
    <div class="ab info mb4">ลายเซ็นจะแสดงในใบสรุปยอดเมื่อพิมพ์</div>
    <div class="fg"><label>ผู้จัดทำ / ผู้บันทึก</label><input id="sg_a" value="${U.esc(sg.signer_a||'')}"/></div>
    <div class="fg"><label>ผู้ตรวจสอบ</label><input id="sg_b" value="${U.esc(sg.signer_b||'')}"/></div>
    <div class="fg"><label>หัวหน้างาน / Supervisor</label><input id="sg_c" value="${U.esc(sg.signer_c||'')}"/></div>`,
    'กำหนดลายเซ็นใบสรุปยอด', async () => {
      localStorage.setItem(key,JSON.stringify({signer_a:document.getElementById('sg_a').value,signer_b:document.getElementById('sg_b').value,signer_c:document.getElementById('sg_c').value}));
      Modal.close();U.toast('✅ บันทึกลายเซ็นแล้ว');
    });
  },
  closeUnit(pid){
    const p=DB.sales.getProject(pid);
    if(!U.confirm(`ปิดหน่วย ${p.project_code}\nและส่งข้อมูลให้ Lab + Report?`))return;
    DB.sales.saveProject({...p,status:'Lab'});
    const tat=DB.config.getTAT();
    const tatDays=(p.headcount||0)>tat.threshold?tat.large:tat.small;
    const td=new Date();td.setDate(td.getDate()+tatDays);
    const sd=new Date(td);sd.setDate(sd.getDate()+DB.config.getSLA().days_after_tat);
    if(!DB.lab.getLabProject(pid))DB.lab.saveLabProject({project_id:pid,received_at:DB._now(),headcount:p.headcount,tat_days:tatDays,tat_deadline:td.toISOString(),status:'analyzing'});
    if(!DB.report.getPlan(pid))DB.report.savePlan({project_id:pid,program_code:p.package_code,headcount:p.headcount,onsite_date:p.onsite_date,created_by:'Operation',tat_deadline:td.toISOString(),sla_deadline:sd.toISOString(),status:'pending'});
    this.render();U.toast('✅ ปิดหน่วยสำเร็จ — ส่ง Specimen + Raw Data แล้ว');
  },
  viewSummary(pid){
    const p=DB.sales.getProject(pid);
    const logs=DB.operation.listOnsiteLogs(pid);
    // Get onsite report (8-question form)
    const rpts=DB._get('operation_db','onsite_reports')||[];
    const rpt=rpts.find(r=>r.project_id===pid);
    const isComplete=['Lab','Report','Billing','Completed'].includes(p.status);
    // ตรวจสำเร็จ = นับจาก Station ลงทะเบียน (ST-01) เท่านั้น
    // เป้าหมาย + สำเร็จ = นับจาก Station ที่มียอดมากสุด (ไม่บวกทุก station)
    const totalExpected=logs.length?Math.max(...logs.map(l=>l.total_expected||0)):0;
    const totalDone=logs.length?Math.max(...logs.map(l=>l.total_done||0)):0;
    const totalMiss=logs.reduce((s,l)=>s+(l.missing||0),0);
    const totalRef=logs.reduce((s,l)=>s+(l.refused||0),0);
    const pct=p.headcount>0?Math.round(totalDone/p.headcount*100):0;
    const logRows=logs.map(l=>`<tr>
      <td><span style="background:rgba(56,189,248,.15);color:#38BDF8;padding:1px 7px;border-radius:4px;font-size:11px;font-weight:700">${l.station_code||'-'}</span></td>
      <td class="fw6">${U.esc(l.station_name||'')}</td>
      <td style="text-align:center">${l.total_expected}</td>
      <td style="text-align:center;color:#6EE7B7;font-weight:700">${l.total_done}</td>
      <td style="text-align:center;color:#FCD34D">${l.missing}</td>
      <td style="text-align:center;color:#FCA5A5">${l.refused}</td>
      <td style="color:var(--t-muted)">${U.esc(l.note||'-')}</td>
    </tr>`).join('');
    // Q answers
    const qLabels=['อุปกรณ์ครบพร้อม','ออกเดินทางตรงเวลา','ถึงสถานที่ตรงเวลา','จัดสถานที่พร้อม','ประชุม Brief ก่อนเริ่ม','ความร่วมมือเจ้าหน้าที่','ไม่มีปัญหาหน้างาน'];
    const qHtml=rpt?qLabels.map((lbl,i)=>{
      const n=i+1;
      const qKey=['q1_equip_ok','q2_depart_ok','q3_arrive_ok','q4_setup_ok','q5_brief_ok','q6_coop_ok','q7_issue_ok'][i];
      const dKey=['q1_detail','q2_detail','q3_detail','q4_detail','q5_detail','q6_detail','q7_detail'][i];
      const val=rpt[qKey];
      return`<div style="display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)">
        <span style="font-size:16px">${val===1?'✅':val===0?'❌':'➖'}</span>
        <div style="flex:1"><div style="font-size:13px;font-weight:500">${lbl}</div>
        ${rpt[dKey]?`<div style="font-size:12px;color:var(--t-muted);margin-top:2px">${U.esc(rpt[dKey])}</div>`:''}</div>
      </div>`;
    }).join(''):'<p style="color:var(--t-muted);font-size:13px">ยังไม่มีบันทึกงานออกหน่วย</p>';
    Modal.open(`
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;padding:10px 14px;background:var(--s-2);border-radius:9px">
      <div>
        <div class="fw6 mono" style="color:var(--c-gold-lt,#E2C46A)">${U.esc(p.project_code)}</div>
        <div class="fw6" style="font-size:15px">${U.esc(p.company_name)}</div>
        <div class="t-sm t-muted">${U.fmtD(p.onsite_date)} | ${(p.headcount||0).toLocaleString()} คน</div>
      </div>
      <div style="margin-left:auto">${isComplete?'<span class="badge b-closed">✅ Complete</span>':'<span class="badge b-onsite">🚑 Onsite</span>'}</div>
    </div>
    <div class="tabs" style="margin-bottom:12px">
      <div class="tab active" onclick="switchTab(this,'vs_t1')">สรุปยอด Station</div>
      <div class="tab" onclick="switchTab(this,'vs_t2')">บันทึกงานออกหน่วย</div>
    </div>
    <div id="vs_t1" class="tp active">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">
        <div style="background:var(--s-2);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--t-muted)">เป้าหมาย</div>
          <div style="font-size:20px;font-weight:700">${(p.headcount||0).toLocaleString()}</div>
        </div>
        <div style="background:var(--s-2);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--t-muted)">สำเร็จ</div>
          <div style="font-size:20px;font-weight:700;color:#6EE7B7">${totalDone}</div>
        </div>
        <div style="background:var(--s-2);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--t-muted)">เก็บตก</div>
          <div style="font-size:20px;font-weight:700;color:#FCD34D">${totalMiss}</div>
        </div>
        <div style="background:var(--s-2);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--t-muted)">ปฏิเสธ</div>
          <div style="font-size:20px;font-weight:700;color:#FCA5A5">${totalRef}</div>
        </div>
      </div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Code</th><th>Station</th><th style="text-align:center">เป้า</th><th style="text-align:center">สำเร็จ</th><th style="text-align:center">เก็บตก</th><th style="text-align:center">ปฏิเสธ</th><th>หมายเหตุ</th></tr></thead>
        <tbody>${logRows||'<tr><td colspan="7" class="empty">ยังไม่มีข้อมูล</td></tr>'}</tbody>
      </table></div>
    </div>
    <div id="vs_t2" class="tp">
      <div style="font-size:12px;color:var(--t-muted);margin-bottom:10px">ผู้บันทึก: ${U.esc(rpt?.recorded_by||'-')} | วันที่: ${rpt?U.fmtD(rpt.report_date):'-'}</div>
      ${qHtml}
      ${rpt?.q8_remark?`<div style="margin-top:10px;padding:10px;background:var(--s-2);border-radius:8px;font-size:13px"><b>หมายเหตุ:</b> ${U.esc(rpt.q8_remark)}</div>`:''}
    </div>`,
    `ดูข้อมูล Onsite — ${p.project_code}`, null);
  },
  deleteOnsite(pid){
    const p=DB.sales.getProject(pid);
    if(!U.confirm(`ลบข้อมูล Onsite ทั้งหมดของ ${p?.project_code}?\nรวมถึงบันทึก Station และบันทึกงานออกหน่วย`))return;
    // Delete all onsite logs for this project
    DB._set('operation_db','onsite_logs',DB._get('operation_db','onsite_logs').filter(r=>r.project_id!==pid));
    DB._set('operation_db','onsite_reports',(DB._get('operation_db','onsite_reports')||[]).filter(r=>r.project_id!==pid));
    this.render();U.toast('✅ ลบข้อมูล Onsite แล้ว');
  },
  exportCSV(pid){
    const p=DB.sales.getProject(pid);
    const logs=DB.operation.listOnsiteLogs(pid);
    let csv='\uFEFF';
    csv+=`"สรุปยอด Onsite — ${p?.project_code} ${p?.company_name}"\n`;
    csv+=`"วันตรวจ: ${U.fmtD(p?.onsite_date)}","สถานที่: ${p?.location||''}"\n\n`;
    csv+='Code,Station,เป้าหมาย,สำเร็จ,เก็บตก,ปฏิเสธ,หมายเหตุ\n';
    logs.forEach(l=>{csv+=`${l.station_code||''},${l.station_name},${l.total_expected},${l.total_done},${l.missing},${l.refused},"${l.note||''}"\n`;});
    csv+=`,รวม,${logs.reduce((s,l)=>s+l.total_expected,0)},${logs.reduce((s,l)=>s+l.total_done,0)},${logs.reduce((s,l)=>s+l.missing,0)},${logs.reduce((s,l)=>s+l.refused,0)},\n`;
    const a=document.createElement('a');
    a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    a.download=`Onsite_${p?.project_code||pid}.csv`;a.click();
    U.toast('✅ Export สำเร็จ');
  },
  printSummary(pid){
    const p=DB.sales.getProject(pid);
    const logs=DB.operation.listOnsiteLogs(pid);
    const files=this._getFiles(pid);
    const sgKey=`onsite_signer_${pid}`;
    let sg={};try{sg=JSON.parse(localStorage.getItem(sgKey)||'{}')}catch{}
    const totalExp=logs.reduce((s,l)=>s+l.total_expected,0);
    // ตรวจสำเร็จ = นับจาก Station ลงทะเบียน (ST-01) เท่านั้น
    // เป้าหมาย + สำเร็จ = นับจาก Station ที่มียอดมากสุด (ไม่บวกทุก station)
    const totalExpected=logs.length?Math.max(...logs.map(l=>l.total_expected||0)):0;
    const totalDone=logs.length?Math.max(...logs.map(l=>l.total_done||0)):0;
    const totalMiss=logs.reduce((s,l)=>s+(l.missing||0),0);
    const totalRef=logs.reduce((s,l)=>s+(l.refused||0),0);
    const pct=p.headcount>0?Math.round(totalDone/p.headcount*100):0;
    const today=new Date().toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'});
    const rows=logs.map((l,i)=>`<tr>
      <td style="text-align:center;color:#8896A8;font-size:11px">${i+1}</td>
      <td><span style="background:#EFF6FF;color:#1E40AF;padding:1px 7px;border-radius:4px;font-size:10px;font-weight:700;font-family:monospace">${l.station_code||'-'}</span></td>
      <td style="font-weight:600">${l.station_name}</td>
      <td style="text-align:center">${l.total_expected}</td>
      <td style="text-align:center;color:#065F46;font-weight:700">${l.total_done}</td>
      <td style="text-align:center;color:#92400E">${l.missing}</td>
      <td style="text-align:center;color:#991B1B">${l.refused}</td>
      <td style="color:#8896A8;font-size:11px">${l.note||''}</td>
    </tr>`).join('');
    const fileList=files.length>0?files.map(f=>`<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:#F9FAFB;border:1px solid #E4E9F0;border-radius:5px;font-size:10px;margin:2px">${this._fileIcon(f.type)} ${f.name}</span>`).join(''):'<span style="font-size:11px;color:#8896A8">ไม่มีไฟล์แนบ</span>';
    const w=window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>สรุปยอด Onsite — ${p.project_code}</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&family=Prompt:wght@600;700&family=IBM+Plex+Mono&display=swap" rel="stylesheet">
    <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Sarabun',sans-serif;color:#1A2332;background:#fff;padding:0;}
    .doc{max-width:780px;margin:0 auto;padding:24px;}
    /* Header */
    .doc-header{background:linear-gradient(135deg,#0D2137 0%,#1A3A5C 100%);color:#fff;padding:24px 28px;border-radius:12px 12px 0 0;margin:-0px;}
    .doc-header-inner{display:flex;justify-content:space-between;align-items:flex-start;}
    .doc-brand{display:flex;align-items:center;gap:14px;}
    .doc-brand .icon{width:48px;height:48px;background:rgba(201,168,76,.25);border:2px solid rgba(201,168,76,.4);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;}
    .doc-brand h1{font-family:'Prompt',sans-serif;font-size:18px;font-weight:700;margin-bottom:3px;}
    .doc-brand p{font-size:11px;color:rgba(255,255,255,.6);}
    .doc-meta{text-align:right;}
    .doc-code{font-family:'IBM Plex Mono',monospace;font-size:16px;font-weight:700;letter-spacing:.02em;}
    .doc-date{font-size:10px;color:rgba(255,255,255,.55);margin-top:3px;}
    .doc-type{display:inline-block;margin-top:6px;padding:3px 14px;border-radius:20px;background:linear-gradient(90deg,#C9A84C,#E8C97A);font-size:10px;font-weight:700;}
    /* Stats bar */
    .stats-bar{background:#142D4C;display:grid;grid-template-columns:repeat(4,1fr);padding:16px 28px;border-radius:0;margin-bottom:0;}
    .stat-item{text-align:center;padding:0 12px;border-right:1px solid rgba(255,255,255,.08);}
    .stat-item:last-child{border-right:none;}
    .stat-val{font-family:'Prompt',sans-serif;font-size:24px;font-weight:700;color:#fff;}
    .stat-lbl{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.45);margin-top:3px;}
    .stat-sub{font-size:10px;font-weight:600;color:rgba(255,255,255,.6);margin-top:2px;}
    .stat-item.suc .stat-val{color:#6EE7B7;}
    .stat-item.warn .stat-val{color:#FCD34D;}
    .stat-item.danger .stat-val{color:#FCA5A5;}
    /* Body */
    .doc-body{padding:20px 28px;border:1px solid #E4E9F0;border-top:none;border-radius:0 0 12px 12px;}
    .info-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px;}
    .info-cell{background:#F9FAFB;border-radius:7px;padding:8px 12px;border:1px solid #E4E9F0;}
    .info-cell .lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#8896A8;margin-bottom:2px;}
    .info-cell .val{font-size:12px;font-weight:600;color:#1A2332;}
    .sec-hd{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#8896A8;margin:14px 0 8px;display:flex;align-items:center;gap:8px;}
    .sec-hd::after{content:'';flex:1;height:1px;background:#E4E9F0;}
    .prog-wrap{background:#E4E9F0;border-radius:100px;height:7px;margin:8px 0 16px;overflow:hidden;}
    .prog-fill{height:100%;border-radius:100px;background:linear-gradient(90deg,#0D2137,#00C4B4);transition:width .5s;}
    table{width:100%;border-collapse:collapse;margin-bottom:10px;}
    thead tr{background:#0D2137;}
    th{padding:9px 10px;font-size:9.5px;font-weight:700;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.06em;text-align:left;border:none;}
    th:first-child{border-radius:6px 0 0 0;}th:last-child{border-radius:0 6px 0 0;}
    td{padding:9px 10px;border-bottom:1px solid #E4E9F0;font-size:12px;vertical-align:middle;}
    tr:last-child td{border-bottom:none;}
    tbody tr:nth-child(even) td{background:#F9FAFB;}
    tfoot td{background:#F0F4F8;font-weight:700;border-top:2px solid #C8D0DC;font-size:12px;}
    /* Signatures */
    .sign-section{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:24px;padding-top:16px;border-top:1px solid #E4E9F0;}
    .sign-box{text-align:center;}
    .sign-line{height:56px;border-bottom:1px dashed #C8D0DC;background:linear-gradient(transparent 90%,rgba(13,33,55,.04) 100%);margin-bottom:8px;}
    .sign-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#8896A8;}
    .sign-name{font-size:12px;font-weight:600;color:#1A2332;margin-top:3px;min-height:16px;}
    .doc-footer{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:10px;border-top:1px solid #E4E9F0;font-size:9px;color:#B0BAC8;}
    .no-print{display:flex;gap:8px;padding:12px 24px;background:#F9FAFB;border-bottom:1px solid #E4E9F0;}
    .btn-p{padding:8px 20px;background:linear-gradient(135deg,#0D2137,#1A3A5C);color:#fff;border:none;border-radius:7px;cursor:pointer;font-family:'Sarabun',sans-serif;font-size:13px;font-weight:600;}
    @media print{.no-print{display:none!important;}@page{size:A4;margin:12mm;}}
    </style></head><body>
    <div class="no-print">
      <button class="btn-p" onclick="window.print()">🖨 พิมพ์ A4</button>
    </div>
    <div class="doc">
      <div class="doc-header">
        <div class="doc-header-inner">
          <div class="doc-brand">
            <div class="icon">🏥</div>
            <div>
              <h1>สรุปยอดออกหน่วย Onsite</h1>
              <p>Mobile Checkup Health Management System</p>
            </div>
          </div>
          <div class="doc-meta">
            <div class="doc-code">${p.project_code}</div>
            <div class="doc-date">${today}</div>
            <div class="doc-type">${p.package_code||'HEALTH CHECK'}</div>
          </div>
        </div>
      </div>
      <div class="stats-bar">
        <div class="stat-item"><div class="stat-val">${(p.headcount||0).toLocaleString()}</div><div class="stat-lbl">เป้าหมาย</div></div>
        <div class="stat-item suc"><div class="stat-val">${totalDone.toLocaleString()}</div><div class="stat-lbl">ตรวจสำเร็จ</div><div class="stat-sub">${pct}%</div></div>
        <div class="stat-item warn"><div class="stat-val">${totalMiss}</div><div class="stat-lbl">เก็บตก / ลา</div></div>
        <div class="stat-item danger"><div class="stat-val">${totalRef}</div><div class="stat-lbl">ปฏิเสธ</div></div>
      </div>
      <div class="doc-body">
        <div class="info-row">
          <div class="info-cell"><div class="lbl">บริษัท</div><div class="val">${p.company_name}</div></div>
          <div class="info-cell"><div class="lbl">วันที่ออกตรวจ</div><div class="val">${U.fmtD(p.onsite_date)}</div></div>
          <div class="info-cell"><div class="lbl">สถานที่</div><div class="val">${p.location||'-'}</div></div>
        </div>
        <div class="sec-hd">ความคืบหน้า ${pct}%</div>
        <div class="prog-wrap"><div class="prog-fill" style="width:${pct}%"></div></div>
        <div class="sec-hd">รายการตรวจแต่ละ Station</div>
        <table>
          <thead><tr><th>#</th><th>Code</th><th>Station</th><th style="text-align:center">เป้าหมาย</th><th style="text-align:center">สำเร็จ</th><th style="text-align:center">เก็บตก</th><th style="text-align:center">ปฏิเสธ</th><th>หมายเหตุ</th></tr></thead>
          <tbody>${rows||'<tr><td colspan="8" style="text-align:center;padding:20px;color:#8896A8">ไม่มีข้อมูล</td></tr>'}</tbody>
          <tfoot><tr><td colspan="3" style="font-weight:700">รวมทั้งหมด</td><td style="text-align:center">${totalExp}</td><td style="text-align:center;color:#065F46">${totalDone}</td><td style="text-align:center;color:#92400E">${totalMiss}</td><td style="text-align:center;color:#991B1B">${totalRef}</td><td></td></tr></tfoot>
        </table>
        ${files.length>0?`<div class="sec-hd">ไฟล์แนบ</div><div style="margin-bottom:14px">${fileList}</div>`:''}
        <div class="sign-section">
          <div class="sign-box"><div class="sign-line"></div><div class="sign-label">ผู้จัดทำ / ผู้บันทึก</div><div class="sign-name">${sg.signer_a||''}</div></div>
          <div class="sign-box"><div class="sign-line"></div><div class="sign-label">ผู้ตรวจสอบ</div><div class="sign-name">${sg.signer_b||''}</div></div>
          <div class="sign-box"><div class="sign-line"></div><div class="sign-label">หัวหน้างาน / Supervisor</div><div class="sign-name">${sg.signer_c||''}</div></div>
        </div>
        <div class="doc-footer">
          <span>Mobile Checkup System — สรุปยอด Onsite</span>
          <span>พิมพ์: ${today}</span>
        </div>
      </div>
    </div></body></html>`);
    w.document.close();w.focus();
  }
};

/* ── LAB ── */
Pages.lab={async render(){
  const lps=DB.lab.listProjects();const alts=DB.lab.listAlerts();const unc=alts.filter(a=>!a.acknowledged);
  const canAdd=DB.auth.can('add','lab'),canEdit=DB.auth.can('edit','lab');
  const rows=lps.map(lp=>{
    const p=DB.sales.getProject(lp.project_id);
    return`<tr><td class="fw6">${p?.project_code||'-'}</td><td>${p?.company_name||'-'}</td><td>${(lp.headcount||0).toLocaleString()}</td><td>${U.fmtD(lp.received_at)}</td><td>${U.tatBadge(lp.tat_deadline)}</td><td>${U.badge(lp.status)}</td><td>
      ${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.lab.editLab(${lp.id})">อัปเดต</button>`:''}
      ${canAdd?`<button class="btn btn-danger btn-xs" onclick="Pages.lab.addCritical(${lp.project_id})">Critical</button>`:''}
    </td></tr>`;}).join('');
  const canDelLab=DB.auth.can('delete','lab');
  const aRows=alts.map(a=>`<tr>
    <td class="fw6 mono">${a.hn||'-'}</td>
    <td>${a.patient_name}</td>
    <td>${a.test_name}</td>
    <td class="t-danger fw6">${a.value}</td>
    <td class="t-muted">${a.normal_range}</td>
    <td class="t-sm">${a.note||'-'}</td>
    <td>${a.acknowledged?U.badge('reported'):'<span class="badge b-danger">ยังไม่รับทราบ</span>'}</td>
    <td>
      <div class="btn-grp">
        ${!a.acknowledged?`<button class="btn btn-suc btn-xs" onclick="Pages.lab.ackAlert(${a.id})">รับทราบ</button>`:''}
        ${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.lab.editAlert(${a.id})">แก้ไข</button>`:''}
        ${canDelLab?`<button class="btn btn-danger btn-xs" onclick="Pages.lab.delAlert(${a.id})">ลบ</button>`:''}
      </div>
    </td>
  </tr>`).join('');
  document.getElementById('content').innerHTML=`<div class="ph"><div><h2>🔬 Lab — ห้องปฏิบัติการ</h2><p>ติดตาม TAT, QC, Critical Values</p></div>${canAdd?`<button class="btn btn-pri" onclick="Pages.lab.addLabProject()">+ รับ Specimen</button>`:''}</div>
  ${unc.length>0?`<div class="ab critical mb4">🚨 มีค่าวิกฤต ${unc.length} ราย ต้องแจ้ง Sales + Report ทันที!</div>`:''}
  <div class="card mb4">
    <div style="padding:14px 18px 12px;border-bottom:1px solid rgba(255,255,255,.06)">
      <div style="position:relative">
        <span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:13px;pointer-events:none;opacity:.5">🔍</span>
        <input placeholder="ค้นหา Project, บริษัท, สถานะ..." autocomplete="off"
          oninput="(function(q){const tb=document.querySelector('#content .card .tbl-wrap tbody');if(!tb)return;q=q.toLowerCase();Array.from(tb.querySelectorAll('tr')).forEach(tr=>{tr.style.display=(!q||tr.textContent.toLowerCase().includes(q))?'':'none';});})(this.value)"
          onfocus="this.style.borderColor='var(--c-teal,#00B8AA)'" onblur="this.style.borderColor='rgba(255,255,255,.1)'"
          style="width:100%;padding:9px 12px 9px 34px;border:1.5px solid rgba(255,255,255,.1);border-radius:9px;font-size:13px;background:rgba(255,255,255,.06);color:#fff;font-family:'IBM Plex Sans Thai',sans-serif;outline:none;transition:border-color .2s"/>
      </div>
    </div>
    <div style="height:12px"></div>
    <div class="tbl-wrap"><table><thead><tr><th>Project</th><th>บริษัท</th><th>จำนวน</th><th>รับตัวอย่าง</th><th>TAT</th><th>สถานะ</th><th></th></tr></thead>
    <tbody>${rows||'<tr><td colspan="7" class="empty">ยังไม่มีข้อมูล</td></tr>'}</tbody></table></div></div>
  <div class="card"><div class="card-header"><span class="card-title">🚨 Critical Value Alerts</span></div>
  <div class="tbl-wrap"><table><thead><tr><th>HN</th><th>ชื่อ-สกุล</th><th>รายการ</th><th>ค่าที่พบ</th><th>ค่าปกติ</th><th>หมายเหตุ</th><th>สถานะ</th><th>Actions</th></tr></thead>
  <tbody>${aRows||'<tr><td colspan="8" class="empty">ไม่มีค่าวิกฤต</td></tr>'}</tbody></table></div></div>`;
},
async editLab(id){
  const lp=DB.lab.listProjects().find(r=>r.id===id);
  Modal.open(`<div class="fr"><div class="fg"><label>วันที่ Approve</label><input id="la_ap" type="date" value="${lp.approved_at?lp.approved_at.substr(0,10):''}"/></div>
    <div class="fg"><label>วันที่รายงานผล</label><input id="la_rp" type="date" value="${lp.reported_at?lp.reported_at.substr(0,10):''}"/></div></div>
  <div class="fg"><label>สถานะ</label><select id="la_st">${U.sel(['analyzing','approved','reported'],lp.status)}</select></div>`,
  'อัปเดต Lab', async () => {
    const ap=document.getElementById('la_ap').value;const rp=document.getElementById('la_rp').value;const st=document.getElementById('la_st').value;
    DB.lab.saveLabProject({...lp,approved_at:ap?new Date(ap).toISOString():lp.approved_at,reported_at:rp?new Date(rp).toISOString():lp.reported_at,status:st});
    if(st==='reported'){const p=DB.sales.getProject(lp.project_id);if(p&&p.status==='Lab')DB.sales.saveProject({...p,status:'Report'});}
    Modal.close();this.render();U.toast('✅ อัปเดตแล้ว');
  });
},
async addCritical(pid){
  const p=DB.sales.getProject(pid);
  Modal.open(`<div class="ab danger mb4">⚠ กรอกค่าวิกฤต — จะแจ้งเตือน Sales + Report ทันที</div>
  <div class="fr"><div class="fg"><label>HN</label><input id="cv_hn"/></div><div class="fg"><label>ชื่อ-สกุล</label><input id="cv_nm"/></div></div>
  <div class="fr"><div class="fg"><label>รายการตรวจ</label><input id="cv_ts"/></div><div class="fg"><label>ค่าที่พบ</label><input id="cv_vl"/></div></div>
  <div class="fr"><div class="fg"><label>ค่าปกติ</label><input id="cv_nr"/></div><div class="fg"><label>หมายเหตุ</label><input id="cv_nt"/></div></div>`,
  `Critical Value — ${p?.company_name}`, async () => {
    DB.lab.saveAlert({project_id:pid,hn:document.getElementById('cv_hn').value,patient_name:document.getElementById('cv_nm').value,test_name:document.getElementById('cv_ts').value,value:document.getElementById('cv_vl').value,normal_range:document.getElementById('cv_nr').value,note:document.getElementById('cv_nt').value,acknowledged:false,alerted_at:DB._now()});
    Modal.close();this.render();U.toast('🚨 บันทึก Critical Alert แล้ว','danger');
  });
},
async ackAlert(id){DB.lab.ackAlert(id);this.render();U.toast('✅ รับทราบแล้ว');},
editAlert(id){
  const a=DB.lab.listAlerts().find(r=>r.id===id);
  if(!a)return;
  Modal.open(`
  <div class="ab danger mb4">🚨 แก้ไขข้อมูล Critical Value Alert</div>
  <div class="fr"><div class="fg"><label>HN</label><input id="ea_hn" value="${U.esc(a.hn||'')}"/></div>
    <div class="fg"><label>ชื่อ-สกุล</label><input id="ea_nm" value="${U.esc(a.patient_name||'')}"/></div></div>
  <div class="fr"><div class="fg"><label>รายการตรวจ</label><input id="ea_ts" value="${U.esc(a.test_name||'')}"/></div>
    <div class="fg"><label>ค่าที่พบ</label><input id="ea_vl" value="${U.esc(a.value||'')}"/></div></div>
  <div class="fr"><div class="fg"><label>ค่าปกติ</label><input id="ea_nr" value="${U.esc(a.normal_range||'')}"/></div>
    <div class="fg"><label>สถานะรับทราบ</label>
      <select id="ea_ack">
        <option value="false" ${!a.acknowledged?'selected':''}>ยังไม่รับทราบ</option>
        <option value="true" ${a.acknowledged?'selected':''}>รับทราบแล้ว</option>
      </select></div></div>
  <div class="fg"><label>หมายเหตุ</label><textarea id="ea_nt">${U.esc(a.note||'')}</textarea></div>`,
  'แก้ไข Critical Alert', async () => {
    const rows=DB.lab.listAlerts();
    const idx=rows.findIndex(r=>r.id===id);
    if(idx<0)return;
    rows[idx]={...rows[idx],
      hn:document.getElementById('ea_hn').value,
      patient_name:document.getElementById('ea_nm').value,
      test_name:document.getElementById('ea_ts').value,
      value:document.getElementById('ea_vl').value,
      normal_range:document.getElementById('ea_nr').value,
      note:document.getElementById('ea_nt').value,
      acknowledged:document.getElementById('ea_ack').value==='true'
    };
    DB._set('lab_db','critical_alerts',rows);
    Modal.close();this.render();U.toast('✅ แก้ไข Alert แล้ว');
  });
},
delAlert(id){
  if(U.confirm('ลบ Critical Alert นี้?')){
    const rows=DB.lab.listAlerts().filter(r=>r.id!==id);
    DB._set('lab_db','critical_alerts',rows);
    this.render();U.toast('✅ ลบแล้ว');
  }
},
async addLabProject(){
  const _all_projs=await DB.sales.listProjects();
    const projs=(_all_projs||[]).filter(p=>p.status==='Lab');
  const existing=DB.lab.listProjects().map(l=>l.project_id);
  const avail=projs.filter(p=>!existing.includes(p.id));
  if(!avail.length)return U.toast('ไม่มี Project พร้อม','warning');
  const pOpts=U.sel(avail.map(p=>({v:p.id,l:`${p.project_code} — ${p.company_name}`})),'');
  Modal.open(`<div class="fg"><label>Project</label><select id="lp_p">${pOpts}</select></div>
  <div class="fg"><label>วันที่รับตัวอย่าง</label><input id="lp_rv" type="date" value="${new Date().toISOString().substr(0,10)}"/></div>`,
  'รับ Specimen เข้า Lab', async () => {
    const pid=parseInt(document.getElementById('lp_p').value);
    const p=DB.sales.getProject(pid);
    const tat=DB.config.getTAT();const td=(p?.headcount||0)>tat.threshold?tat.large:tat.small;
    const recv=new Date(document.getElementById('lp_rv').value);
    const dd=new Date(recv);dd.setDate(dd.getDate()+td);
    DB.lab.saveLabProject({project_id:pid,received_at:recv.toISOString(),headcount:p?.headcount||0,tat_days:td,tat_deadline:dd.toISOString(),status:'analyzing'});
    Modal.close();this.render();U.toast('✅ รับ Specimen เข้า Lab แล้ว');
  });
}};

/* ── REPORT ── */
Pages.report={async render(){
    // ─────────────────────────────────────────────────────────
    // AUTO-CREATE Project Plans สำหรับ Project ที่ Closed
    // (ผู้ใช้ไม่ต้องกด + สร้าง Project Plan)
    // ─────────────────────────────────────────────────────────
    try {
      const allProjs = DB.sales.listProjects()||[];
      const closedStatuses = ['Closed','Lab','Report','Billing','Completed','Onsite'];
      const existingPlans = DB.report.listPlans()||[];
      const existingPids = new Set(existingPlans.map(p=>p.project_id));
      allProjs.forEach(p=>{
        if(closedStatuses.includes(p.status) && !existingPids.has(p.id)){
          // คำนวณ TAT/SLA: ≤2000 คน → +15 วัน, >2000 → +20 วัน
          const tatDays = (p.headcount||0) > 2000 ? 20 : 15;
          const onsiteDate = p.onsite_date ? new Date(p.onsite_date) : new Date();
          const slaDeadline = new Date(onsiteDate.getTime() + tatDays*86400000);
          DB.report.savePlan({
            project_id: p.id,
            company_name: p.company_name,
            project_code: p.project_code,
            headcount: p.headcount||0,
            onsite_date: p.onsite_date,
            sla_deadline: slaDeadline.toISOString().substr(0,10),
            status: 'pending',
            set_plan: 0, send_doc: 0, receive_raw: 0, key_raw: 0,
            interpret: 0, booklet: 0, ready_to_send: 0,
            created_by: 'Auto-create',
            created_at: DB._now(), updated_at: DB._now()
          });
        }
      });
    } catch(e){ console.warn('Auto-create Report Plans skipped:', e); }

  const plans=DB.report.listPlans();
  const canAdd=DB.auth.can('add','report'),canEdit=DB.auth.can('edit','report');
  /* Project & Handover section */
  const projs=DB.sales.listProjects();
  const projRows=projs.slice().reverse().map(p=>`<tr><td class="fw6">${p.project_code}</td><td>${p.company_name}</td><td>${(p.headcount||0).toLocaleString()}</td><td>${U.fmtD(p.onsite_date)}</td><td>${U.badge(p.status)}</td><td>
    ${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.sales.editProject(${p.id})">แก้ไข</button>`:''}
    <button class="btn btn-out btn-xs" onclick="Pages.sales.viewHandover(${p.id})">เอกสาร</button>
  </td></tr>`).join('');
  // mkCk — sync (no async needed, reads DB directly)
  const mkCk=(rp_id,key,title,done,dateVal)=>{
    const dateLabel=dateVal?`<div style="font-size:9px;color:#6EE7B7;margin-top:1px">${U.fmtD(dateVal)}</div>`:'';
    return`<td style="text-align:center;vertical-align:middle;padding:6px 4px">
      ${done
        ?`<div style="display:inline-flex;flex-direction:column;align-items:center">
            <span style="font-size:18px;line-height:1">✅</span>${dateLabel}
          </div>`
        :canEdit
          ?`<input type="checkbox" style="width:16px;height:16px;accent-color:var(--suc);cursor:pointer"
              onchange="Pages.report._toggleMeta(${rp_id},'${key}',this.checked)" title="${title}" class="rp-ck"/>`
          :`<span style="color:var(--t-muted);font-size:16px">⬜</span>`
      }
    </td>`;
  };
  const rows=plans.map(rp=>{
    const p=DB.sales.getProject(rp.project_id);
    // Read progress from rp itself (DB fields) + localStorage fallback
    const meta=JSON.parse(localStorage.getItem('rp_meta_'+rp.project_id)||'{}');
    // Use DB fields first, then meta fallback
    const sp=!!(rp.set_plan||meta.set_plan);    const spd=rp.set_plan_date||meta.set_plan_date||'';
    const sd=!!(rp.send_doc||meta.send_doc);     const sdd=rp.send_doc_date||meta.send_doc_date||'';
    const rr=!!(rp.receive_raw||meta.receive_raw); const rrd=rp.receive_raw_date||meta.receive_raw_date||'';
    const kr=!!(rp.key_raw||meta.key_raw);       const krd=rp.key_raw_date||meta.key_raw_date||'';
    const ip=!!(rp.interpret||meta.interpret);   const ipd=rp.interpret_date||meta.interpret_date||'';
    const bk=!!(rp.booklet||meta.booklet);       const bkd=rp.booklet_date||meta.booklet_date||'';
    const rs=!!(rp.ready_to_send||meta.ready_to_send); const rsd=rp.ready_to_send_date||meta.ready_to_send_date||'';
    // คำนวณสถานะ: ถ้าติ๊กครบทั้ง 7 ขั้น = Complete
    const allDone=sp&&sd&&rr&&kr&&ip&&bk&&rs;
    const statusBadge=allDone
      ? '<span class="badge b-closed">✅ Complete</span>'
      : U.badge(rp.status);
    // SLA: ใช้ due_date จาก project แทน sla_deadline
    const slaBadge=allDone
      ? '<span class="badge b-closed">✅ เสร็จ</span>'
      : U.tatBadge(p?.due_date||rp.sla_deadline);
    return`<tr>
      <td class="fw6 mono" style="color:var(--c-gold-lt,#E2C46A)">${p?.project_code||'-'}</td>
      <td class="fw6">${U.esc(p?.company_name||'-')}</td>
      <td style="text-align:right">${(rp.headcount||0).toLocaleString()}</td>
      <td>${U.fmtD(rp.onsite_date)}</td>
      <td>${p?.due_date?U.fmtD(p.due_date):'<span class="t-muted t-sm">-</span>'}</td>
      ${mkCk(rp.project_id,'set_plan','Set Plan เสร็จแล้ว',sp,spd)}
      ${mkCk(rp.project_id,'send_doc','เวียนเอกสารแล้ว',sd,sdd)}
      ${mkCk(rp.project_id,'receive_raw','รับผลดิบแล้ว',rr,rrd)}
      ${mkCk(rp.project_id,'key_raw','คีย์ผลดิบแล้ว',kr,krd)}
      ${mkCk(rp.project_id,'interpret','แปลผลแล้ว',ip,ipd)}
      ${mkCk(rp.project_id,'booklet','ทำเล่มแล้ว',bk,bkd)}
      ${mkCk(rp.project_id,'ready_to_send','พร้อมส่ง',rs,rsd)}
      <td>${slaBadge}</td>
      <td>${statusBadge}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-out btn-xs" onclick="Pages.report.viewPlan(${rp.project_id})">ดูแผน</button>
        ${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.report.editPlan(${rp.id})">แก้ไข</button>`:''}
      </td>
    </tr>`;
  }).join('');
  document.getElementById('content').innerHTML=`<div class="ph"><div><h2>📋 Report — ทีมทำผล</h2><p>Project Plan, แปลผล และส่งผล</p></div>${canAdd?`<button class="btn btn-pri" onclick="Pages.report.addPlan()">+ สร้าง Project Plan</button>`:''}</div>
  <div class="card">
    <div style="padding:12px 16px 0;display:flex;gap:8px;align-items:center">
      <input id="rp_search" placeholder="🔍 ค้นหา Project / บริษัท..." style="max-width:320px;padding:7px 12px;border:1.5px solid var(--bdr);border-radius:8px;font-size:13px;font-family:'Sarabun',sans-serif;outline:none" oninput="Pages.report._filterTable(this.value)"/>
    </div>
    <div class="tbl-wrap"><table id="rp_table"><thead><tr><th>Project</th><th>บริษัท</th><th>จำนวน</th><th>วันตรวจ</th><th>กำหนดส่งผล</th><th style="text-align:center" title="Set Plan">Set Plan</th><th style="text-align:center" title="เวียนเอกสาร">เวียนเอกสาร</th><th style="text-align:center" title="รับผลดิบ">รับผลดิบ</th><th style="text-align:center" title="คีย์ผลดิบ">คีย์ผลดิบ</th><th style="text-align:center" title="แปลผล">แปลผล</th><th style="text-align:center" title="ทำเล่ม">ทำเล่ม</th><th style="text-align:center" title="รอส่ง">รอส่ง</th><th>SLA</th><th>สถานะ</th><th></th></tr></thead><tbody id="rp_tbody">${rows||'<tr><td colspan="15" class="empty"><div class="icon">📋</div><p>ยังไม่มี Project Plan</p></td></tr>'}</tbody></table></div>
  </div>`;
},
_toggleMeta(pid,key,val){
  const today=new Date().toISOString().substr(0,10);
  // 1. บันทึก localStorage (backward compat)
  const m=JSON.parse(localStorage.getItem('rp_meta_'+pid)||'{}');
  m[key]=val;
  if(val){m[key+'_date']=today;} else {delete m[key+'_date'];}
  localStorage.setItem('rp_meta_'+pid,JSON.stringify(m));
  // 2. บันทึก DB (source of truth สำหรับ Dashboard, Workflow Tracker, Alerts)
  const rp=DB.report.getPlan(pid);
  if(rp){
    rp[key]=val?1:0;
    if(val){rp[key+'_date']=today;} else {rp[key+'_date']=null;}
    // ถ้าครบทุก 7 ขั้นตอน → auto-set status=sent
    const allDone=!!(rp.set_plan||m.set_plan)&&!!(rp.send_doc||m.send_doc)&&!!(rp.receive_raw||m.receive_raw)&&!!(rp.key_raw||m.key_raw)&&!!(rp.interpret||m.interpret)&&!!(rp.booklet||m.booklet)&&!!(rp.ready_to_send||m.ready_to_send);
    if(allDone&&rp.status!=='sent'){rp.status='sent';rp.sent_at=DB._now();}
    DB.report.savePlan(rp);
  }
  // 3. Re-render
  Pages.report.render();
  if(typeof NavBadges!=='undefined') NavBadges.update();
  U.toast(val?`✅ บันทึกแล้ว — ${new Date().toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'})}`:'↩ ยกเลิก');
},
_filterTable(q){
  const tb=document.getElementById('rp_tbody');
  if(!tb)return;
  q=q.toLowerCase().trim();
  Array.from(tb.querySelectorAll('tr')).forEach(tr=>{
    const txt=tr.textContent.toLowerCase();
    tr.style.display=(!q||txt.includes(q))?'':'none';
  });
},
viewPlan(pid){
  const rp=DB.report.getPlan(pid),p=DB.sales.getProject(pid);
  Modal.open(`<div class="sr"><span>Project</span><span class="fw6">${p?.project_code}</span></div>
  <div class="sr"><span>บริษัท</span><span>${p?.company_name}</span></div>
  <div class="sr"><span>Program</span><span>${rp.program_code}</span></div>
  <div class="sr"><span>จำนวน</span><span>${(rp.headcount||0).toLocaleString()} คน</span></div>
  <div class="sr"><span>วันตรวจ</span><span>${U.fmtD(rp.onsite_date)}</span></div>
  <div class="sr"><span>สร้างโดย</span><span>${rp.created_by||'-'}</span></div>
  <div class="sr"><span>ตรวจสอบโดย</span><span class="${rp.verified_by?'t-success fw6':'t-danger'}">${rp.verified_by||'⚠ ยังไม่ได้ Verify'}</span></div>
  <div class="divider"></div>
  <div class="sr"><span>TAT Deadline</span><span>${U.tatBadge(rp.tat_deadline)} — ${U.fmtD(rp.tat_deadline)}</span></div>
  <div class="sr"><span>SLA Deadline</span><span>${U.tatBadge(rp.sla_deadline)} — ${U.fmtD(rp.sla_deadline)}</span></div>
  <div class="sr"><span>สถานะ</span><span>${U.badge(rp.status)}</span></div>
  <div class="sr"><span>วันที่ส่งผล</span><span>${U.fmtD(rp.sent_at)||'ยังไม่ส่ง'}</span></div>`,
  'Project Plan Details');
},
async editPlan(id){
  const rp=DB.report.listPlans().find(r=>r.id===id);
  const meta=JSON.parse(localStorage.getItem('rp_meta_'+rp.project_id)||'{}');
  const mkCk2=(key,label) => {
    const done=!!meta[key];
    return`<label style="display:flex;align-items:center;gap:9px;padding:9px 13px;background:${done?'#F0FDF4':'var(--surf2)'};border:1.5px solid ${done?'#86EFAC':'var(--bdr)'};border-radius:9px;cursor:pointer;font-size:13px;transition:all .2s" id="ep2_lbl_${key}">
      <input type="checkbox" id="ep2_${key}" ${done?'checked':''} style="width:16px;height:16px;accent-color:var(--suc);flex-shrink:0"
        onchange="(function(el,k){const lbl=document.getElementById('ep2_lbl_'+k);if(el.checked){lbl.style.background='#F0FDF4';lbl.style.borderColor='#86EFAC';}else{lbl.style.background='var(--surf2)';lbl.style.borderColor='var(--bdr)';}})(this,'${key}')"/>
      <span style="flex:1;font-weight:${done?'600':'500'};color:${done?'var(--suc)':'var(--txt)'}">${done?'✅ ':''} ${label}</span>
    </label>`;
  };
  Modal.open(`
  <div class="fr">
    <div class="fg"><label>ตรวจสอบโดย (Verify)</label><input id="rv_vf" value="${U.esc(rp.verified_by||'')}"/></div>
    <div style="margin-top:8px">${U.recordedByField(rp.recorded_by, 'rv_rb')}</div>
    <div class="fg"><label>สถานะ</label><select id="rv_st">${U.sel([{v:'pending',l:'รอดำเนินการ'},{v:'interpreting',l:'กำลังแปลผล'},{v:'Booklet',l:'Booklet'},{v:'sent',l:'ส่งผลแล้ว'}],rp.status)}</select></div>
  </div>
  <div class="fr">
    <div class="fg"><label>TAT Deadline</label><input id="rv_tat" type="date" value="${rp.tat_deadline?rp.tat_deadline.substr(0,10):''}"/></div>
    <div class="fg"><label>SLA Deadline</label><input id="rv_sla" type="date" value="${rp.sla_deadline?rp.sla_deadline.substr(0,10):''}"/></div>
  </div>
  <div class="fg"><label>วันที่ส่งผล</label><input id="rv_st_d" type="date" value="${rp.sent_at?rp.sent_at.substr(0,10):''}"/></div>
  <div class="divider"></div>
  <div class="sec-title">ความคืบหน้า</div>
  <div class="g2" style="gap:8px">
    ${mkCk2('set_plan','✏️ Set Plan')}
    ${mkCk2('send_doc','📤 เวียนเอกสาร')}
    ${mkCk2('receive_raw','📥 รับผลดิบ')}
    ${mkCk2('key_raw','⌨️ คีย์ผลดิบ')}
    ${mkCk2('interpret','🔬 แปลผล')}
    ${mkCk2('booklet','📘 ทำเล่ม')}
    ${mkCk2('ready_to_send','📦 รอส่ง')}
  </div>`,
  'แก้ไข Project Plan', async () => {
    const st=document.getElementById('rv_st').value;
    const ta_d=document.getElementById('rv_tat').value;
    const rv_d=document.getElementById('rv_sla').value;
    DB.report.savePlan({...rp,verified_by:document.getElementById('rv_vf').value,_override_recorded_by:U.recordedByValue('rv_rb')||undefined,status:st,tat_deadline:ta_d?new Date(ta_d).toISOString():rp.tat_deadline,sla_deadline:rv_d?new Date(rv_d).toISOString():rp.sla_deadline,sent_at:st==='sent'?(document.getElementById('rv_st_d').value?new Date(document.getElementById('rv_st_d').value).toISOString():DB._now()):rp.sent_at});
    if(st==='sent'){const p=DB.sales.getProject(rp.project_id);if(p)DB.sales.saveProject({...p,status:'Billing'});}
    const m=JSON.parse(localStorage.getItem('rp_meta_'+rp.project_id)||'{}');
    const today=new Date().toISOString().substr(0,10);
    ['set_plan','send_doc','receive_raw','key_raw','interpret','booklet','ready_to_send'].forEach(k=>{
      const el=document.getElementById('ep2_'+k);
      if(el){
        const wasChecked=!!m[k];
        m[k]=el.checked;
        if(el.checked){
          // Keep existing date if was checked before, use today otherwise
          m[k+'_date']=wasChecked?(m[k+'_date']||today):today;
        } else {
          delete m[k+'_date'];
        }
      }
    });
    localStorage.setItem('rp_meta_'+rp.project_id,JSON.stringify(m));
    Modal.close();this.render();U.toast('✅ อัปเดต Plan แล้ว');
  });
},
addPlan(){
  const projs=DB.sales.listProjects().filter(p=>['Lab','Report'].includes(p.status));
  const exist=DB.report.listPlans().map(r=>r.project_id);
  const avail=projs.filter(p=>!exist.includes(p.id));
  if(!avail.length)return U.toast('ไม่มี Project พร้อม','warning');
  const pOpts=U.sel(avail.map(p=>({v:p.id,l:`${p.project_code} — ${p.company_name}`})),'');
  Modal.open(`<div class="fg"><label>Project</label><select id="np_p">${pOpts}</select></div>
  <div class="fr"><div class="fg"><label>สร้างโดย</label><input id="np_cb"/></div><div class="fg"><label>ตรวจสอบโดย (คนละคน!)</label><input id="np_vb"/></div></div>
  <div class="fr"><div class="fg"><label>TAT Deadline</label><input id="np_tat" type="date"/></div><div class="fg"><label>SLA Deadline</label><input id="np_sla" type="date"/></div></div>`,
  'สร้าง Project Plan', async () => {
    const pid=parseInt(document.getElementById('np_p').value);const p=DB.sales.getProject(pid);
    DB.report.savePlan({project_id:pid,program_code:p.package_code,headcount:p.headcount,onsite_date:p.onsite_date,created_by:document.getElementById('np_cb').value,verified_by:document.getElementById('np_vb').value,tat_deadline:new Date(document.getElementById('np_tat').value).toISOString(),sla_deadline:new Date(document.getElementById('np_sla').value).toISOString(),status:'pending'});
    Modal.close();this.render();U.toast('✅ สร้าง Plan แล้ว');
  });
},
viewPatients(pid){
  const pts=DB.report.listPatients(pid),p=DB.sales.getProject(pid);
  let html=`<div class="flex-between mb4"><span class="fw6">${p?.company_name} — ${pts.length} ราย</span><button class="btn btn-pri btn-sm" onclick="Pages.report.addPatient(${pid})">+ เพิ่ม</button></div>`;
  html+='<div class="tbl-wrap"><table><thead><tr><th>HN</th><th>ชื่อ-สกุล</th><th>แผนก</th><th>Package</th><th>สถานะ</th></tr></thead><tbody>';
  pts.slice(0,30).forEach(pt=>{html+=`<tr><td>${pt.hn}</td><td>${pt.name}</td><td>${pt.department||'-'}</td><td>${pt.package}</td><td>${U.badge(pt.status)}</td></tr>`;});
  if(pts.length>30)html+=`<tr><td colspan="5" class="empty t-sm">...และอีก ${pts.length-30} ราย</td></tr>`;
  html+='</tbody></table></div>';
  Modal.open(html,'รายชื่อผู้เข้าตรวจ',null,true);
},
addPatient(pid){
  Modal.open(`<div class="fr"><div class="fg"><label>HN</label><input id="pt_hn"/></div><div class="fg"><label>ชื่อ-สกุล</label><input id="pt_nm"/></div></div>
  <div class="fr"><div class="fg"><label>แผนก</label><input id="pt_dp"/></div><div class="fg"><label>Package</label><input id="pt_pk" value="PKG-B"/></div></div>`,
  'เพิ่มรายชื่อ',()=>{DB.report.savePatient({project_id:pid,hn:document.getElementById('pt_hn').value,name:document.getElementById('pt_nm').value,department:document.getElementById('pt_dp').value,package:document.getElementById('pt_pk').value,status:'pending'});Modal.close();U.toast('✅ เพิ่มแล้ว');});
}};

/* ── BILLING ── */
/* ── CONFIG CHECKLIST PAGE ── */
Pages.config_checklist={
  _KEY:'sys_checklist_items',
  _defaults:[
    {key:'select_company',group:'ก่อนออกหน่วย',label:'เลือกบริษัท / ยืนยันข้อมูลลูกค้า',icon:'🏢',active:true},
    {key:'job_order',group:'ก่อนออกหน่วย',label:'จัดทำใบแจ้งงาน',icon:'📋',active:true},
    {key:'manpower',group:'ก่อนออกหน่วย',label:'จัดอัตรากำลัง (แพทย์/พยาบาล/MT/Part-time)',icon:'👥',active:true},
    {key:'equipment',group:'ก่อนออกหน่วย',label:'เตรียมอุปกรณ์ตามใบแจ้งงาน',icon:'🧰',active:true},
    {key:'vehicle',group:'ก่อนออกหน่วย',label:'จัดยานพาหนะ / ตรวจสอบรถ',icon:'🚑',active:true},
    {key:'specimen_kit',group:'ก่อนออกหน่วย',label:'เตรียม Kit เจาะเลือด / อุปกรณ์แล็บ',icon:'🧪',active:true},
    {key:'xray_ready',group:'ก่อนออกหน่วย',label:'เตรียมเครื่อง X-Ray / ตรวจสอบสภาพ',icon:'📡',active:true},
    {key:'doc_ready',group:'เอกสาร',label:'เตรียมเอกสารลงทะเบียน (ใบตรวจ/ฟอร์ม)',icon:'📄',active:true},
    {key:'briefing',group:'วันออกหน่วย',label:'ประชุม Brief ทีมก่อนออก',icon:'🗣',active:true},
    {key:'depart_check',group:'วันออกหน่วย',label:'ตรวจสอบการออกเดินทาง (เวลา/ทะเบียนรถ)',icon:'🚀',active:true},
  ],
  _load(){try{return JSON.parse(localStorage.getItem(this._KEY)||'null')||this._defaults;}catch{return this._defaults;}},
  _save(items){localStorage.setItem(this._KEY,JSON.stringify(items));},
  list(){return this._load();},
  async render(){
    const items=this.list();
    const canEdit=DB.auth.can('edit','config');
    const groups=[...new Set(items.map(i=>i.group))];
    let html=`<div class="ph"><div><h2>📋 ตั้งค่า Checklist เตรียมงาน</h2><p>กำหนดรายการที่จะแสดงใน Operation — เตรียมงาน (Checklist)</p></div>${canEdit?`<button class="btn btn-pri btn-sm" onclick="Pages.config_checklist.addItem()">+ เพิ่มรายการ</button>`:''}</div>
    <div class="ab info mb4">รายการเหล่านี้จะถูกใช้ใน <strong>Operation — เตรียมงาน (Checklist)</strong> ทุก Project — เปลี่ยนแปลงจะมีผลทันที</div>`;
    groups.forEach(g=>{
      const gItems=items.filter(i=>i.group===g);
      html+=`<div class="card mb4"><div class="card-header"><span class="card-title">${g} <span class="badge b-draft">${gItems.length}</span></span></div>
      <div class="tbl-wrap"><table><thead><tr><th style="color:#fff">ไอคอน</th><th style="color:#fff">รายการ</th><th style="color:#fff">หมวด</th><th style="color:#fff;text-align:center">แสดง</th><th></th></tr></thead><tbody>
      ${gItems.map((it,idx)=>`<tr data-ck="${it.key}" style="opacity:${it.active!==false?'1':'.5'};transition:opacity .2s">
        <td style="font-size:18px">${it.icon||'📌'}</td>
        <td class="fw6" style="color:var(--t-bright)">${U.esc(it.label)}</td>
        <td><span class="badge b-draft">${it.group}</span></td>
        <td style="text-align:center">
          ${canEdit?`<label style="cursor:pointer">
            <input type="checkbox" ${it.active?'checked':''} style="accent-color:#0E9F6E;width:17px;height:17px;cursor:pointer"
              onchange="Pages.config_checklist.toggleActive('${it.key}',this.checked);Pages.config_checklist._updateRow('${it.key}',this.checked)"/>
          </label>`:(it.active?'✅':'⬜')}
        </td>
        <td>${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.config_checklist.editItem('${it.key}')">แก้ไข</button>
          <button class="btn btn-danger btn-xs" onclick="Pages.config_checklist.delItem('${it.key}')">ลบ</button>`:''}</td>
      </tr>`).join('')}
      </tbody></table></div></div>`;
    });
    document.getElementById('content').innerHTML=html;
  },
  toggleActive(key,val){
    const items=this._load();
    const it=items.find(i=>i.key===key);
    if(it)it.active=val;
    this._save(items);U.toast(val?'✅ เปิดใช้งาน':'⬜ ปิดใช้งาน');
  },
  addItem(){
    const groups=['ก่อนออกหน่วย','เอกสาร','วันออกหน่วย','อื่นๆ'];
    Modal.open(`
    <div class="fr">
      <div class="fg"><label class="req">ชื่อรายการ</label><input id="cci_label" placeholder="เช่น ตรวจสอบถุงมือและหน้ากาก"/></div>
      <div class="fg"><label>ไอคอน</label><input id="cci_icon" value="📌" placeholder="Emoji"/></div>
    </div>
    <div class="fr">
      <div class="fg"><label>หมวดหมู่</label><select id="cci_group">${groups.map(g=>`<option>${g}</option>`).join('')}</select></div>
    </div>`,
    'เพิ่มรายการ Checklist',()=>{
      const label=document.getElementById('cci_label').value.trim();
      if(!label)return U.toast('กรุณาใส่ชื่อรายการ','danger');
      const items=this._load();
      const key='custom_'+Date.now();
      items.push({key,group:document.getElementById('cci_group').value,label,icon:document.getElementById('cci_icon').value||'📌',active:true});
      this._save(items);Modal.close();this.render();U.toast('✅ เพิ่มรายการแล้ว');
    });
  },
  editItem(key){
    const items=this._load();
    const it=items.find(i=>i.key===key);if(!it)return;
    const groups=['ก่อนออกหน่วย','เอกสาร','วันออกหน่วย','อื่นๆ'];
    Modal.open(`
    <div class="fr">
      <div class="fg"><label class="req">ชื่อรายการ</label><input id="cci_label" value="${U.esc(it.label)}"/></div>
      <div class="fg"><label>ไอคอน</label><input id="cci_icon" value="${U.esc(it.icon||'📌')}"/></div>
    </div>
    <div class="fg"><label>หมวดหมู่</label><select id="cci_group">${groups.map(g=>`<option ${it.group===g?'selected':''}>${g}</option>`).join('')}</select></div>`,
    'แก้ไขรายการ',()=>{
      it.label=document.getElementById('cci_label').value.trim();
      it.icon=document.getElementById('cci_icon').value||'📌';
      it.group=document.getElementById('cci_group').value;
      this._save(items);Modal.close();this.render();U.toast('✅ อัปเดตแล้ว');
    });
  },
  delItem(key){
    if(!U.confirm('ลบรายการนี้?'))return;
    const items=this._load().filter(i=>i.key!==key);
    this._save(items);this.render();U.toast('✅ ลบแล้ว');
  },
  _updateRow(key,active){
    // Update row style immediately without re-render
    const row=document.querySelector(`tr[data-ck="${key}"]`);
    if(row){
      row.style.opacity=active?'1':'.5';
    }
    U.toast(active?'✅ เปิดใช้งาน':'⬜ ปิดใช้งาน');
  },
  getActive(){return (this.list()||[]).filter(i=>i.is_active!==false&&i.active!==false);}
};




/* ══════════════════════════════════════════════════
   CONFIG STATIONS — ตั้งค่าจุดตรวจ Station
   ข้อมูลที่ตั้งไว้จะแสดงใน Operation — ใบแจ้งงาน (เลือก Station)
══════════════════════════════════════════════════ */
Pages.config_stations={
  _KEY:'sys_stations_config',
  _defaults:STATION_DEFAULTS,
  _load(){try{const raw=localStorage.getItem(this._KEY);if(raw){const arr=JSON.parse(raw);if(Array.isArray(arr)&&arr.length)return arr;}}catch{}return JSON.parse(JSON.stringify(this._defaults));},
  _save(items){localStorage.setItem(this._KEY,JSON.stringify(items));},
  list(){return this._load();},
  getActive(){return this._load().filter(s=>s.active!==false);},

  async render(){
    const items=this.list();
    const canEdit=DB.auth.can('edit','config');
    const active=items.filter(s=>s.active!==false).length;
    let html=`<div class="ph"><div><h2>🩺 ตั้งค่า Station</h2><p>กำหนดจุดตรวจทั้งหมดที่จะใช้ใน Operation — ใบแจ้งงาน</p></div>${canEdit?`<div class="btn-grp"><button class="btn btn-out btn-sm" onclick="Pages.config_stations.resetDefaults()">↻ รีเซ็ต Default</button><button class="btn btn-pri btn-sm" onclick="Pages.config_stations.addItem()">+ เพิ่ม Station</button></div>`:''}</div>
    <div class="metrics-grid mb4">
      <div class="metric-card acc"><div class="metric-label">Station ทั้งหมด</div><div class="metric-value">${items.length}</div></div>
      <div class="metric-card suc"><div class="metric-label">เปิดใช้งาน</div><div class="metric-value">${active}</div></div>
      <div class="metric-card warn"><div class="metric-label">ปิดใช้งาน</div><div class="metric-value">${items.length-active}</div></div>
    </div>
    <div class="ab info mb4">
      <div style="flex:1">
        <div class="fw6" style="margin-bottom:3px">📌 หมายเหตุ</div>
        <div class="t-sm">Station ที่เปิดใช้งานเท่านั้นจะปรากฏในหน้า <strong>Operation — ใบแจ้งงาน</strong> เมื่อเพิ่ม Station ใหม่</div>
      </div>
    </div>
    <div class="card"><div class="card-header"><span class="card-title">🩺 รายการจุดตรวจทั้งหมด</span></div>
      <div class="tbl-wrap"><table>
        <thead><tr>
          <th style="color:#fff">Code</th>
          <th style="color:#fff">ชื่อจุดตรวจ</th>
          <th style="color:#fff;text-align:center">เปิดใช้งาน</th>
          <th></th>
        </tr></thead>
        <tbody>
        ${items.map(s=>`<tr data-st="${s.code}" style="opacity:${s.active!==false?'1':'.5'};transition:opacity .2s">
          <td><span style="font-family:'IBM Plex Mono',monospace;font-size:11px;background:rgba(56,189,248,.15);color:#38BDF8;padding:2px 7px;border-radius:4px;font-weight:700">${U.esc(s.code)}</span></td>
          <td class="fw6" style="color:var(--t-bright,#F0F4FA)">${U.esc(s.name)}</td>
          <td style="text-align:center">
            ${canEdit?`<label style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center">
              <input type="checkbox" ${s.active!==false?'checked':''} style="accent-color:#0E9F6E;width:17px;height:17px;cursor:pointer"
                onchange="Pages.config_stations.toggleActive('${s.code}',this.checked)"/>
            </label>`:(s.active!==false?'✅':'⬜')}
          </td>
          <td>
            ${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.config_stations.editItem('${s.code}')">แก้ไข</button>
              <button class="btn btn-danger btn-xs" onclick="Pages.config_stations.delItem('${s.code}')">ลบ</button>`:''}
          </td>
        </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
    document.getElementById('content').innerHTML=html;
  },

  toggleActive(code,val){
    const items=this._load();
    const it=items.find(s=>s.code===code);
    if(it)it.active=val;
    this._save(items);
    this.render();
    U.toast(val?'✅ เปิดใช้งาน':'⬜ ปิดใช้งาน');
  },

  addItem(){
    const items=this._load();
    // Auto-generate next code
    const codes=items.map(s=>s.code).filter(c=>/^ST-\d+$/.test(c));
    const nums=codes.map(c=>parseInt(c.replace('ST-',''))||0);
    const next=nums.length?Math.max(...nums)+1:1;
    const nextCode='ST-'+String(next).padStart(2,'0');
    Modal.open(`
    <div class="ab info mb2"><div class="t-sm">Code จะถูกสร้างอัตโนมัติ หรือพิมพ์เองก็ได้ (ต้องไม่ซ้ำ)</div></div>
    <div class="fr">
      <div class="fg" style="max-width:140px"><label class="req">Code</label><input id="st_code" value="${nextCode}" placeholder="ST-XX"/></div>
      <div class="fg"><label class="req">ชื่อจุดตรวจ</label><input id="st_name" placeholder="เช่น ตรวจหัวใจ Echo"/></div>
    </div>`,
    'เพิ่ม Station',()=>{
      const code=(document.getElementById('st_code').value||'').trim().toUpperCase();
      const name=(document.getElementById('st_name').value||'').trim();
      if(!code||!name)return U.toast('กรุณาใส่ Code และชื่อจุดตรวจ','danger');
      const existing=this._load();
      if(existing.find(s=>s.code===code))return U.toast('Code นี้มีอยู่แล้ว','danger');
      existing.push({code,name,active:true});
      this._save(existing);
      Modal.close();this.render();
      U.toast('✅ เพิ่ม Station แล้ว');
    });
  },

  editItem(code){
    const items=this._load();
    const s=items.find(x=>x.code===code);
    if(!s)return;
    Modal.open(`
    <div class="fr">
      <div class="fg" style="max-width:140px"><label>Code</label><input id="est_code" value="${U.esc(s.code)}" readonly style="opacity:.7;cursor:not-allowed"/></div>
      <div class="fg"><label class="req">ชื่อจุดตรวจ</label><input id="est_name" value="${U.esc(s.name)}"/></div>
    </div>
    <div class="fg">
      <label style="display:flex;align-items:center;gap:9px;padding:9px 13px;background:${s.active!==false?'#F0FDF4':'var(--s-2,#172236)'};border:1.5px solid ${s.active!==false?'#86EFAC':'var(--b-1,rgba(255,255,255,.1))'};border-radius:9px;cursor:pointer">
        <input type="checkbox" id="est_active" ${s.active!==false?'checked':''} style="width:16px;height:16px;accent-color:#0E9F6E"/>
        <span style="flex:1;font-weight:600">เปิดใช้งาน</span>
      </label>
    </div>`,
    'แก้ไข Station',()=>{
      const name=(document.getElementById('est_name').value||'').trim();
      if(!name)return U.toast('กรุณาใส่ชื่อจุดตรวจ','danger');
      const existing=this._load();
      const it=existing.find(x=>x.code===code);
      if(it){
        it.name=name;
        it.active=document.getElementById('est_active').checked;
      }
      this._save(existing);
      Modal.close();this.render();
      U.toast('✅ อัปเดตแล้ว');
    });
  },

  delItem(code){
    if(!U.confirm(`ลบ Station ${code}?\n\n⚠ Station ที่ถูกใช้ใน Job Order เดิมจะยังคงอยู่ แต่จะไม่สามารถเพิ่มใหม่ได้`))return;
    const items=this._load().filter(s=>s.code!==code);
    this._save(items);
    this.render();
    U.toast('✅ ลบแล้ว');
  },

  resetDefaults(){
    if(!U.confirm('รีเซ็ตเป็น Default ทั้งหมด?\n\n⚠ การเปลี่ยนแปลงที่ตั้งไว้จะถูกลบทิ้ง'))return;
    localStorage.removeItem(this._KEY);
    this.render();
    U.toast('✅ รีเซ็ตเป็น Default แล้ว');
  }
};

/* ══════════════════════════════════════════════════
   OPD PAGE — ตรวจครบ
   แสดง Project ที่ (มีเก็บตก) หรือ (job_type2='Walkin')
══════════════════════════════════════════════════ */
Pages.opd={
  _search:'', _status:'',
  _STEPS:[
    {key:'exam_complete',   label:'ตรวจครบแล้ว'},
    {key:'doc_sent',        label:'ส่งเอกสารแล้ว'},
  ],
  _getMeta(pid){
    try{return JSON.parse(localStorage.getItem('opd_meta_'+pid)||'null');}catch{return null;}
  },
  _saveMeta(pid,data){
    localStorage.setItem('opd_meta_'+pid,JSON.stringify({...(this._getMeta(pid)||{}),...data}));
  },
  _statusLabel(meta){
    if(!meta)return{label:'รอดำเนินการ',cls:'b-draft'};
    if(meta.exam_complete&&meta.doc_sent)return{label:'✅ Complete',cls:'b-completed'};
    if(meta.exam_complete&&!meta.doc_sent)return{label:'รอส่งเอกสาร',cls:'b-onsite'};
    if(!meta.exam_complete&&meta.doc_sent)return{label:'รอตรวจครบ',cls:'b-onsite'};
    return{label:'รอดำเนินการ',cls:'b-draft'};
  },
  toggleStep(pid,key,val){
    const today=new Date().toISOString().substr(0,10);
    const patch={};
    patch[key]=val?true:false;
    patch[key+'_date']=val?today:null;
    this._saveMeta(pid,patch);
    this.render();
    U.toast(val?`✅ บันทึก — ${new Date().toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'})}`:'↩ ยกเลิก');
  },

  render(){
    const canEdit=DB.auth.can('edit','opd');
    const allProjs=DB.sales.listProjects();
    const custs=DB.customer.listCustomers();
    // Filter: Project ที่ (มีเก็บตก > 0) OR (customer.job_type2 === 'Walkin')
    const projs=allProjs.filter(p=>{
      const logs=DB.operation.listOnsiteLogs(p.id);
      const hasMissing=logs.some(l=>(l.missing||0)>0);
      const cust=custs.find(c=>c.id===p.customer_id);
      const isWalkin=cust&&(cust.job_type2==='Walkin'||cust.exam_location==='Walk in');
      return hasMissing||isWalkin;
    });

    const sq=(this._search||'').toLowerCase().trim();
    const statusF=this._status||'';
    const filtered=projs.filter(p=>{
      const txt=(p.project_code+' '+p.company_name).toLowerCase();
      const txtMatch=!sq||txt.includes(sq);
      const meta=this._getMeta(p.id);
      const st=this._statusLabel(meta);
      const stMatch=!statusF||(statusF==='complete'&&st.cls==='b-closed')||(statusF==='pending'&&st.cls!=='b-closed');
      return txtMatch&&stMatch;
    });

    const mkCk=(pid,meta,key,label)=>{
      const done=!!(meta&&meta[key]);
      const dateVal=meta&&meta[key+'_date']||'';
      if(done){
        return`<td style="text-align:center;vertical-align:middle;padding:6px 4px">
          <div style="display:inline-flex;flex-direction:column;align-items:center;gap:1px">
            <span style="font-size:18px;cursor:${canEdit?'pointer':'default'}" ${canEdit?`onclick="Pages.opd.toggleStep(${pid},'${key}',false)" title="คลิกเพื่อยกเลิก"`:''}>✅</span>
            ${dateVal?`<div style="font-size:9px;color:#6EE7B7;font-weight:600">${U.fmtD(dateVal)}</div>`:''}
          </div>
        </td>`;
      }
      return`<td style="text-align:center;vertical-align:middle;padding:6px 4px">
        ${canEdit?`<input type="checkbox" style="width:18px;height:18px;accent-color:#0E9F6E;cursor:pointer" onchange="Pages.opd.toggleStep(${pid},'${key}',this.checked)" title="${label}"/>`:'<span style="color:var(--t-muted);font-size:16px">⬜</span>'}
      </td>`;
    };

    const rows=filtered.map(p=>{
      const meta=this._getMeta(p.id);
      const st=this._statusLabel(meta);
      const logs=DB.operation.listOnsiteLogs(p.id);
      const missing=logs.reduce((s,l)=>s+(l.missing||0),0);
      const cust=custs.find(c=>c.id===p.customer_id);
      const isWalkin=cust&&cust.job_type2==='Walkin';
      const reason=isWalkin?'<span class="badge b-lab" style="font-size:10px">Walkin</span>':`<span class="badge b-draft" style="font-size:10px">เก็บตก ${missing} คน</span>`;
      return`<tr>
        <td class="fw6 mono" style="color:var(--c-gold-lt,#E2C46A)">${p.project_code}</td>
        <td class="fw6">${U.esc(p.company_name)}</td>
        <td>${U.fmtD(p.onsite_date)}</td>
        <td>${p.end_date?U.fmtD(p.end_date):'<span class="t-muted t-sm">-</span>'}</td>
        <td>${reason}</td>
        ${mkCk(p.id,meta,'exam_complete','ตรวจครบ')}
        ${mkCk(p.id,meta,'doc_sent','ส่งเอกสาร')}
        <td><span class="badge ${st.cls}" style="font-size:10px">${st.label}</span></td>
        <td style="white-space:nowrap">
          ${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.opd.editMeta(${p.id})">แก้ไข</button>`:''}
          ${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.opd.attachFile(${p.id})">📎</button>`:''}
          ${DB.auth.can('delete','opd')?`<button class="btn btn-danger btn-xs" onclick="Pages.opd.delMeta(${p.id})">ลบ</button>`:''}
        </td>
      </tr>`;
    }).join('');

    document.getElementById('content').innerHTML=`
    <div class="ph">
      <div><h2>🏥 OPD — ตรวจครบ</h2>
      <p>Project ที่มีเก็บตกหรือ Walkin</p></div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.06)">
        <div style="position:relative;flex:7">
          <span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:13px;pointer-events:none;opacity:.5">🔍</span>
          <input value="${U.esc(this._search||'')}" placeholder="ค้นหา Project / บริษัท..." autocomplete="off"
            oninput="Pages.opd._search=this.value;Pages.opd.render()"
            style="width:100%;padding:9px 12px 9px 34px;border:1.5px solid rgba(255,255,255,.1);border-radius:9px;font-size:13px;background:rgba(255,255,255,.06);color:#fff;outline:none"/>
        </div>
        <select onchange="Pages.opd._status=this.value;Pages.opd.render()"
          style="flex:3;padding:9px 12px;border:1.5px solid rgba(255,255,255,.1);border-radius:9px;font-size:13px;background:rgba(255,255,255,.06);color:#fff">
          <option value="">ทุกสถานะ</option>
          <option value="pending" ${this._status==='pending'?'selected':''}>รอดำเนินการ</option>
          <option value="complete" ${this._status==='complete'?'selected':''}>ตรวจครบ</option>
        </select>
      </div>
      <div class="tbl-wrap"><table>
        <thead><tr>
          <th>Project</th><th>บริษัท</th><th>วันตรวจ</th><th>วันที่สิ้นสุด</th>
          <th>เหตุผล</th>
          <th style="text-align:center">ตรวจครบ</th>
          <th style="text-align:center">ส่งเอกสาร</th>
          <th>สถานะ</th><th></th>
        </tr></thead>
        <tbody>${rows||`<tr><td colspan="9" class="empty"><div class="icon">🏥</div><p>ไม่พบ Project ที่มีเก็บตกหรือ Walkin</p></td></tr>`}</tbody>
      </table></div>
    </div>`;
  },

  editMeta(pid){
    const p=DB.sales.getProject(pid);
    const meta=this._getMeta(pid)||{};
    Modal.open(`
    <div class="sr"><span>Project</span><span class="fw6">${p.project_code}</span></div>
    <div class="sr"><span>บริษัท</span><span>${p.company_name}</span></div>
    <div class="sr"><span>วันตรวจ</span><span>${U.fmtD(p.onsite_date)}</span></div>
    <div class="sr"><span>วันที่สิ้นสุด</span><span>${p.end_date?U.fmtD(p.end_date):'-'}</span></div>
    <div class="divider"></div>
    <div class="sec-title">การดำเนินการ</div>
    <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${meta.exam_complete?'#F0FDF4':'var(--s-2,#172236)'};border:1.5px solid ${meta.exam_complete?'#86EFAC':'var(--b-1,rgba(255,255,255,.1))'};border-radius:9px;cursor:pointer;margin-bottom:8px;transition:all .15s">
      <input type="checkbox" id="opd_ck" ${meta.exam_complete?'checked':''} style="width:17px;height:17px;accent-color:#0E9F6E;flex-shrink:0"/>
      <span style="flex:1;font-weight:${meta.exam_complete?'600':'500'};color:${meta.exam_complete?'var(--c-suc)':'var(--t-bright)'}">${meta.exam_complete?'✅ ':''}ตรวจครบแล้ว</span>
    </label>
    <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${meta.doc_sent?'#F0FDF4':'var(--s-2,#172236)'};border:1.5px solid ${meta.doc_sent?'#86EFAC':'var(--b-1,rgba(255,255,255,.1))'};border-radius:9px;cursor:pointer;transition:all .15s">
      <input type="checkbox" id="opd_ds" ${meta.doc_sent?'checked':''} style="width:17px;height:17px;accent-color:#0E9F6E;flex-shrink:0"/>
      <span style="flex:1;font-weight:${meta.doc_sent?'600':'500'};color:${meta.doc_sent?'var(--c-suc)':'var(--t-bright)'}">${meta.doc_sent?'✅ ':''}ส่งเอกสารแล้ว</span>
    </label>
    <div class="fg" style="margin-top:12px"><label>หมายเหตุ</label><textarea id="opd_nt" style="min-height:60px">${U.esc(meta.note||'')}</textarea></div>
    <div style="margin-top:14px">${U.recordedByField(meta.recorded_by, 'opd_rb')}</div>`,
    'แก้ไข — OPD', ()=>{
      const ck=document.getElementById('opd_ck').checked;
      const ds=document.getElementById('opd_ds').checked;
      const nt=document.getElementById('opd_nt').value;
      const today=new Date().toISOString().substr(0,10);
      const wasExam=!!meta.exam_complete;
      const wasDoc=!!meta.doc_sent;
      const rb=U.recordedByValue('opd_rb');
      this._saveMeta(pid,{
        exam_complete:ck,
        exam_complete_date:ck?(wasExam?(meta.exam_complete_date||today):today):null,
        doc_sent:ds,
        doc_sent_date:ds?(wasDoc?(meta.doc_sent_date||today):today):null,
        note:nt,
        _override_recorded_by: rb || undefined
      });
      Modal.close();this.render();U.toast('✅ บันทึกแล้ว');
    });
  },

  attachFile(pid){
    const input=document.createElement('input');
    input.type='file';input.multiple=true;
    input.onchange=async e=>{
      const files=e.target.files;if(!files.length)return;
      if(typeof DB.files?.addFiles!=='function'){U.toast('⚠ ระบบไฟล์ไม่พร้อม','warning');return;}
      await DB.files.addFiles('opd_'+pid,'opd_doc','เอกสาร OPD',files);
      U.toast(`✅ แนบไฟล์ ${files.length} ไฟล์แล้ว`);
    };
    input.click();
  },

  delMeta(pid){
    if(!U.confirm('ลบข้อมูล OPD ของ Project นี้?'))return;
    localStorage.removeItem('opd_meta_'+pid);
    this.render();U.toast('✅ ลบแล้ว');
  }
};

Pages.billing={async render(){
  const invs=DB.billing.listInvoices();const canAdd=DB.auth.can('add','billing'),canEdit=DB.auth.can('edit','billing');
  const rev=invs.reduce((s,i)=>s+(i.revenue||0),0);const prf=invs.reduce((s,i)=>s+(i.profit||0),0);
  const rows=invs.map(inv=>{const p=DB.sales.getProject(inv.project_id);return`<tr><td class="fw6">${inv.invoice_no}</td><td>${p?.project_code||'-'}</td><td>${p?.company_name||'-'}</td><td>฿${U.fmt(inv.revenue)}</td><td>฿${U.fmt(Math.round(inv.total))}</td><td class="t-success fw6">฿${U.fmt(inv.profit)}</td><td>${(inv.margin||0).toFixed(1)}%</td><td>${U.badge(inv.status)}</td><td>
    <button class="btn btn-out btn-xs" onclick="Pages.billing.viewInv(${inv.id})">ดู</button>
    ${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.billing.editInv(${inv.id})">แก้ไข</button>`:''}
  </td></tr>`;}).join('');
  document.getElementById('content').innerHTML=`<div class="ph"><div><h2>💰 Billing — Invoice & กำไร</h2></div>${canAdd?`<button class="btn btn-pri" onclick="Pages.billing.createInv()">+ ออก Invoice</button>`:''}</div>
  <div class="metrics-grid">
    <div class="metric-card acc"><div class="metric-label">รายได้รวม</div><div class="metric-value">฿${U.fmt(Math.round(rev/1000))}K</div></div>
    <div class="metric-card suc"><div class="metric-label">กำไรรวม</div><div class="metric-value">฿${U.fmt(Math.round(prf/1000))}K</div></div>
    <div class="metric-card"><div class="metric-label">Margin</div><div class="metric-value">${rev>0?((prf/rev)*100).toFixed(1):0}%</div></div>
    <div class="metric-card warn"><div class="metric-label">Invoice ทั้งหมด</div><div class="metric-value">${invs.length}</div></div>
  </div>
  <div class="card">
    <div style="padding:14px 18px 14px;border-bottom:1px solid rgba(255,255,255,.06)">
      <input id="billing_search" placeholder="🔍 ค้นหา Invoice No, Project, บริษัท..." autocomplete="off"
        oninput="(function(q){const tb=document.querySelector('#billing_table tbody');if(!tb)return;q=q.toLowerCase();Array.from(tb.querySelectorAll('tr')).forEach(tr=>{tr.style.display=(!q||tr.textContent.toLowerCase().includes(q))?'':'none';});})(this.value)"
        style="flex:1;padding:8px 14px;border:1.5px solid rgba(255,255,255,.1);border-radius:9px;font-size:13px;background:rgba(255,255,255,.06);color:#fff;font-family:'IBM Plex Sans Thai',sans-serif;outline:none"
        onfocus="this.style.borderColor='var(--c-teal,#00B8AA)'" onblur="this.style.borderColor='rgba(255,255,255,.1)'"/>
    </div>
    <div style="height:10px"></div>
    <div class="tbl-wrap"><table id="billing_table"><thead><tr><th>Invoice No.</th><th>Project</th><th>บริษัท</th><th>รายได้</th><th>รวม(VAT)</th><th>กำไร</th><th>Margin</th><th>สถานะ</th><th></th></tr></thead>
    <tbody>${rows||'<tr><td colspan="9" class="empty">ยังไม่มี Invoice</td></tr>'}</tbody></table></div></div>`;
},
async createInv(){
  const allProjs=DB.sales.listProjects().filter(p=>['Report','Billing','Completed'].includes(p.status));
  const exist=DB.billing.listInvoices().map(i=>i.project_id);
  const avail=allProjs.filter(p=>!exist.includes(p.id));
  if(!avail.length)return U.toast('ไม่มี Project สถานะ Report/Billing พร้อมออก Invoice','warning');
  const pOpts='<option value="">-- เลือก Project --</option>'+avail.map(p=>`<option value="${p.id}">${p.project_code} — ${U.esc(p.company_name)}</option>`).join('');
  const compName=localStorage.getItem('cfg__company_name')||'OcciCare Co., Ltd.';
  Modal.open(`
  <div class="ab info mb4">📄 กรอกข้อมูลให้ครบถ้วนเพื่อออก Invoice อย่างเป็นทางการ</div>
  <div class="fr">
    <div class="fg"><label class="req">Project</label><select id="bi_p" onchange="Pages.billing._fillFromProj(this.value)">${pOpts}</select></div>
    <div class="fg"><label>วันที่ออก Invoice</label><input id="bi_date" type="date" value="${new Date().toISOString().substr(0,10)}"/></div>
  </div>
  <div class="fr">
    <div class="fg"><label>ชื่อบริษัทลูกค้า</label><input id="bi_cname" placeholder="จะดึงจาก Project อัตโนมัติ"/></div>
    <div class="fg"><label>ที่อยู่ลูกค้า</label><input id="bi_caddr" placeholder="ที่อยู่สำหรับออก Invoice"/></div>
  </div>
  <div class="sec-title mt4">รายการบริการ</div>
  <div class="fr">
    <div class="fg"><label class="req">รายการหลัก (Description)</label><input id="bi_desc" placeholder="บริการตรวจสุขภาพประจำปี..."/></div>
    <div class="fg"><label>จำนวนคน</label><input id="bi_qty" type="number" placeholder="0"/></div>
  </div>
  <div class="fr">
    <div class="fg"><label class="req">ราคาต่อหน่วย (บาท)</label><input id="bi_uprice" type="number" oninput="Pages.billing._calc()"/></div>
    <div class="fg"><label>ส่วนลด (บาท)</label><input id="bi_disc" type="number" value="0" oninput="Pages.billing._calc()"/></div>
  </div>
  <div class="sec-title mt4">ต้นทุน (สำหรับคำนวณกำไร — ไม่แสดงใน Invoice)</div>
  <div class="fr">
    <div class="fg"><label>ต้นทุนรวม (บาท)</label><input id="bi_ct" type="number" oninput="Pages.billing._calc()"/></div>
    <div class="fg"><label>เงื่อนไขชำระเงิน</label>
      <select id="bi_tm"><option value="">-- เลือก --</option>
        <option>ชำระภายใน 30 วัน</option>
        <option>ชำระภายใน 45 วัน</option>
        <option>ชำระภายใน 60 วัน</option>
        <option>ชำระทันที</option>
        <option>ตามที่ตกลง</option>
      </select>
    </div>
  </div>
  <div class="fg"><label>หมายเหตุ / เงื่อนไขพิเศษ</label><textarea id="bi_note" placeholder="หมายเหตุท้าย Invoice..."></textarea></div>
  <div id="bi_pv" class="ab info mt4" style="display:none"></div>`,
  'ออก Invoice ใหม่', async () => {
    const pid=parseInt(document.getElementById('bi_p').value);
    if(!pid)return U.toast('กรุณาเลือก Project','danger');
    const qty=parseInt(document.getElementById('bi_qty').value)||1;
    const up=parseFloat(document.getElementById('bi_uprice').value)||0;
    const disc=parseFloat(document.getElementById('bi_disc').value)||0;
    const rv=Math.max(0,(qty*up)-disc);
    if(!rv)return U.toast('กรุณาใส่ราคา','danger');
    const ct=parseFloat(document.getElementById('bi_ct').value)||0;
    const vat=rv*.07;const tot=rv+vat;const prf=rv-ct;const mg=rv>0?(prf/rv*100).toFixed(1):0;
    const inv=DB.billing.saveInvoice({
      project_id:pid,
      client_name:document.getElementById('bi_cname').value,
      client_address:document.getElementById('bi_caddr').value,
      description:document.getElementById('bi_desc').value,
      qty,unit_price:up,discount:disc,
      revenue:rv,vat,total:tot,cost:ct,profit:prf,margin:parseFloat(mg),
      payment_terms:document.getElementById('bi_tm').value,
      note:document.getElementById('bi_note').value,
      issued_date:document.getElementById('bi_date').value,
      status:'Pending',issued_at:DB._now()
    });
    const p=DB.sales.getProject(pid);if(p)DB.sales.saveProject({...p,status:'Billing'});
    Modal.close();this.render();U.toast(`✅ ออก ${inv.invoice_no} สำเร็จ`);
  });
},
async _fillFromProj(pid){
  const p=DB.sales.getProject(parseInt(pid));if(!p)return;
  const cust=p.customer_id?DB.customer.getCustomer(p.customer_id):null;
  const el=id=>document.getElementById(id);
  if(el('bi_cname'))el('bi_cname').value=p.company_name||'';
  if(el('bi_caddr')&&cust)el('bi_caddr').value=cust.address||'';
  if(el('bi_qty'))el('bi_qty').value=p.headcount||'';
  if(el('bi_desc'))el('bi_desc').value=`บริการตรวจสุขภาพประจำปี — ${p.company_name} วันที่ ${p.onsite_date||''}`;
},
_calc(){
  const qty=parseInt(document.getElementById('bi_qty')?.value)||1;
  const up=parseFloat(document.getElementById('bi_uprice')?.value)||0;
  const disc=parseFloat(document.getElementById('bi_disc')?.value)||0;
  const ct=parseFloat(document.getElementById('bi_ct')?.value)||0;
  const rv=Math.max(0,(qty*up)-disc);
  const pv=document.getElementById('bi_pv');
  if(pv&&rv>0){
    const vat=rv*.07;const tot=rv+vat;const prf=rv-ct;const mg=rv>0?((prf/rv)*100).toFixed(1):0;
    pv.style.display='flex';
    pv.textContent=`ราคาก่อน VAT: ฿${U.fmt(rv)} | VAT 7%: ฿${U.fmt(Math.round(vat))} | รวมทั้งสิ้น: ฿${U.fmt(Math.round(tot))} | กำไร: ฿${U.fmt(Math.round(prf))} (${mg}%)`;
  }
},
async viewInv(id){
  const inv=DB.billing.listInvoices().find(i=>i.id===id);const p=DB.sales.getProject(inv.project_id);
  const costs=DB.billing.listCostTracking(inv.project_id);
  const compName=localStorage.getItem('cfg__company_name')||'OcciCare Co., Ltd.';
  const LOGO_URL='https://occicare.com/wp-content/uploads/2025/08/occicare-logo.webp';
  let cHtml=costs.map(c=>`<div class="sr"><span>${U.esc(c.category)} — ${U.esc(c.description)}</span><span>฿${U.fmt(c.amount)}</span></div>`).join('');
  const invDate=inv.issued_date||inv.issued_at?.substr(0,10)||new Date().toISOString().substr(0,10);
  const dueDate=inv.payment_terms?.includes('30')?new Date(new Date(invDate).setDate(new Date(invDate).getDate()+30)).toISOString().substr(0,10):invDate;
  Modal.open(`
  <div class="no-print btn-grp mb4">
    <button class="btn btn-pri btn-sm" onclick="Pages.billing.printInv(${id})">🖨 พิมพ์ Invoice</button>
  </div>
  <div class="invoice-doc">
    <div class="inv-header">
      <div class="inv-header-inner">
        <div class="inv-brand">
          <div class="inv-brand-logo"><img src="${LOGO_URL}" alt="Logo" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.innerHTML='🏥'"/></div>
          <div><h1>${U.esc(compName)}</h1><p>Mobile Checkup Health Service</p></div>
        </div>
        <div class="inv-meta">
          <div class="inv-no">${inv.invoice_no}</div>
          <div class="inv-date">วันที่ออก: ${U.fmtD(invDate)}</div>
          <div class="inv-type-badge">TAX INVOICE</div>
        </div>
      </div>
    </div>
    <div class="inv-body">
      <div class="inv-parties">
        <div class="inv-party"><h4>ผู้ออก Invoice</h4><div class="inv-party-name">${U.esc(compName)}</div><p>บริการตรวจสุขภาพเคลื่อนที่</p></div>
        <div class="inv-party"><h4>ลูกค้า</h4><div class="inv-party-name">${U.esc(inv.client_name||p?.company_name||'-')}</div><p>${U.esc(inv.client_address||p?.location||'-')}</p></div>
      </div>
      <div class="sr"><span>Project</span><span class="fw6 mono">${p?.project_code||'-'}</span></div>
      <div class="sr"><span>วันตรวจ</span><span>${U.fmtD(p?.onsite_date)}</span></div>
      <div class="sr"><span>จำนวน</span><span>${(p?.headcount||0).toLocaleString()} คน</span></div>
      <div class="divider"></div>
      <table class="inv-items">
        <thead><tr><th>รายการ</th><th style="text-align:center">จำนวน</th><th style="text-align:right">ราคา/หน่วย</th><th style="text-align:right">ส่วนลด</th><th style="text-align:right">รวม</th></tr></thead>
        <tbody><tr>
          <td>${U.esc(inv.description||'บริการตรวจสุขภาพ')}</td>
          <td style="text-align:center">${inv.qty||p?.headcount||1} คน</td>
          <td style="text-align:right">฿${U.fmt(inv.unit_price||Math.round(inv.revenue/(inv.qty||1)))}</td>
          <td style="text-align:right">${inv.discount?`฿${U.fmt(inv.discount)}`:'-'}</td>
          <td style="text-align:right;font-weight:600">฿${U.fmt(inv.revenue)}</td>
        </tr></tbody>
      </table>
      <div class="inv-summary">
        <div class="inv-summary-box">
          <div class="inv-sum-row"><span>ราคาก่อน VAT</span><span>฿${U.fmt(inv.revenue)}</span></div>
          <div class="inv-sum-row"><span>VAT 7%</span><span>฿${U.fmt(Math.round(inv.vat))}</span></div>
          <div class="inv-sum-total"><span>รวมทั้งสิ้น</span><span style="color:var(--teal)">฿${U.fmt(Math.round(inv.total))}</span></div>
        </div>
      </div>
      ${inv.note?`<div class="inv-footer-note"><strong>หมายเหตุ:</strong> ${U.esc(inv.note)}</div>`:''}
      <div class="sr mt4"><span>เงื่อนไขชำระ</span><span>${U.esc(inv.payment_terms||'-')}</span></div>
      <div class="sr"><span>กำหนดชำระ</span><span class="fw6">${U.fmtD(dueDate)}</span></div>
      <div class="sr"><span>สถานะ</span><span>${U.badge(inv.status)}</span></div>
      <div class="divider"></div>
      <div class="sec-title">ต้นทุน & กำไร (Internal)</div>
      ${cHtml||'<p class="t-muted t-sm mb2">ยังไม่มีรายการต้นทุน</p>'}
      <div class="sr"><span>ต้นทุนรวม</span><span class="t-danger">฿${U.fmt(inv.cost)}</span></div>
      <div class="sr"><span class="fw6">กำไรสุทธิ</span><span class="fw6 t-success">฿${U.fmt(inv.profit)}</span></div>
      <div class="sr"><span>Gross Margin</span><span class="fw6 t-gold">${(inv.margin||0).toFixed(1)}%</span></div>
      <div class="inv-sign-section">
        <div class="inv-sign-box"><div class="inv-sign-line"></div><div class="inv-sign-label">ผู้จัดทำ</div><div class="inv-sign-name">${inv.created_by||''}</div></div>
        <div class="inv-sign-box"><div class="inv-sign-line"></div><div class="inv-sign-label">ผู้อนุมัติ</div><div class="inv-sign-name">${inv.approved_by||''}</div></div>
      </div>
    </div>
  </div>`,`Invoice — ${inv.invoice_no}`,null,true);
},
async printInv(id){
  const inv=DB.billing.listInvoices().find(i=>i.id===id);
  const p=DB.sales.getProject(inv.project_id);
  const compName=localStorage.getItem('cfg__company_name')||'OcciCare Co., Ltd.';
  const LOGO_URL='https://occicare.com/wp-content/uploads/2025/08/occicare-logo.webp';
  const invDate=inv.issued_date||inv.issued_at?.substr(0,10)||new Date().toISOString().substr(0,10);
  const today=new Date().toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'});
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>Invoice ${inv.invoice_no}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&family=Prompt:wght@700&family=IBM+Plex+Mono&display=swap" rel="stylesheet">
  <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Sarabun',sans-serif;color:#0F1E2E;background:#fff;padding:20px;}
  .doc{max-width:760px;margin:0 auto;}
  .hd{background:linear-gradient(135deg,#0B2340,#1A3A64);color:#fff;padding:24px 28px;border-radius:12px 12px 0 0;}
  .hd-inner{display:flex;justify-content:space-between;align-items:flex-start;}
  .brand{display:flex;align-items:center;gap:12px;}.brand-logo{width:48px;height:48px;border-radius:10px;overflow:hidden;background:rgba(196,163,90,.2);}
  .brand-logo img{width:100%;height:100%;object-fit:cover;}.brand h1{font-family:'Prompt',sans-serif;font-size:16px;font-weight:700;margin-bottom:2px;}.brand p{font-size:10px;color:rgba(255,255,255,.55);}
  .meta{text-align:right;}.inv-no{font-family:'IBM Plex Mono',monospace;font-size:18px;font-weight:700;}.inv-date{font-size:10px;color:rgba(255,255,255,.5);margin-top:2px;}
  .badge-gold{display:inline-block;margin-top:5px;padding:2px 12px;border-radius:20px;background:linear-gradient(90deg,#C4A35A,#DEC07E);font-size:10px;font-weight:700;}
  .body{padding:20px 28px;border:1px solid #DDE3EC;border-top:none;border-radius:0 0 12px 12px;}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px;}
  .party h4{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#7A90A6;margin-bottom:6px;}
  .party-name{font-size:14px;font-weight:700;color:#0B2340;margin-bottom:3px;}.party p{font-size:11px;color:#3D5166;line-height:1.5;}
  .sr{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #DDE3EC;font-size:12px;}
  .sr:last-child{border-bottom:none;}.fw6{font-weight:600;}.mono{font-family:'IBM Plex Mono',monospace;}
  table{width:100%;border-collapse:collapse;margin:12px 0;}
  thead tr{background:#0B2340;}th{padding:8px 10px;font-size:9px;font-weight:700;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.06em;text-align:left;border:none;}
  td{padding:8px 10px;border-bottom:1px solid #DDE3EC;font-size:12px;}tr:last-child td{border-bottom:none;}tr:nth-child(even) td{background:#F8FAFC;}
  .summary{display:flex;justify-content:flex-end;margin-top:10px;}
  .sum-box{width:260px;background:#F8FAFC;border-radius:8px;border:1px solid #DDE3EC;padding:12px 14px;}
  .sum-row{display:flex;justify-content:space-between;padding:3px 0;font-size:12px;}
  .sum-total{display:flex;justify-content:space-between;padding:8px 0 0;margin-top:5px;border-top:2px solid #B8C4D4;font-weight:700;font-size:15px;color:#0B2340;}
  .note{margin-top:14px;padding:10px 14px;background:#F8FAFC;border-radius:8px;border:1px solid #DDE3EC;font-size:11px;color:#3D5166;}
  .signs{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px;padding-top:14px;border-top:1px solid #DDE3EC;}
  .sign{text-align:center;}.sline{height:55px;border-bottom:1px dashed #B8C4D4;margin-bottom:7px;}.slabel{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#7A90A6;}.sname{font-size:11px;font-weight:600;color:#0F1E2E;margin-top:2px;}
  .footer{display:flex;justify-content:space-between;margin-top:12px;padding-top:8px;border-top:1px solid #DDE3EC;font-size:9px;color:#B8C4D4;}
  .no-print{display:flex;gap:8px;padding:10px 0 16px;}
  .btn-p{padding:8px 20px;background:linear-gradient(135deg,#0B2340,#1A3A64);color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:'Sarabun',sans-serif;font-size:13px;font-weight:600;}
  @media print{@page{size:A4;margin:12mm;}.no-print{display:none!important;}}
  </style></head><body>
  <div class="doc">
  <div class="no-print"><button class="btn-p" onclick="window.print()">🖨 พิมพ์ A4</button></div>
  <div class="hd"><div class="hd-inner">
    <div class="brand"><div class="brand-logo"><img src="${LOGO_URL}" alt="Logo" onerror="this.parentElement.innerHTML='🏥'"/></div>
      <div><h1>${U.esc(compName)}</h1><p>Mobile Checkup Health Service</p></div></div>
    <div class="meta"><div class="inv-no">${inv.invoice_no}</div><div class="inv-date">วันที่: ${today}</div><div class="badge-gold">TAX INVOICE / ใบแจ้งหนี้</div></div>
  </div></div>
  <div class="body">
    <div class="parties">
      <div class="party"><h4>ผู้ออก Invoice (Seller)</h4><div class="party-name">${U.esc(compName)}</div><p>บริการตรวจสุขภาพเคลื่อนที่</p></div>
      <div class="party"><h4>ลูกค้า (Buyer)</h4><div class="party-name">${U.esc(inv.client_name||p?.company_name||'-')}</div><p>${U.esc(inv.client_address||p?.location||'-')}</p></div>
    </div>
    <div class="sr"><span>Project</span><span class="fw6 mono">${p?.project_code||'-'}</span></div>
    <div class="sr"><span>วันให้บริการ</span><span>${U.fmtD(p?.onsite_date)}</span></div>
    <div class="sr"><span>เงื่อนไขชำระ</span><span>${U.esc(inv.payment_terms||'-')}</span></div>
    <table>
      <thead><tr><th>รายการบริการ</th><th style="text-align:center">จำนวน (คน)</th><th style="text-align:right">ราคา/คน (บาท)</th><th style="text-align:right">ส่วนลด (บาท)</th><th style="text-align:right">รวม (บาท)</th></tr></thead>
      <tbody><tr>
        <td>${U.esc(inv.description||'บริการตรวจสุขภาพประจำปี')}</td>
        <td style="text-align:center">${inv.qty||p?.headcount||1}</td>
        <td style="text-align:right">${U.fmt(inv.unit_price||Math.round(inv.revenue/(inv.qty||1)))}</td>
        <td style="text-align:right">${inv.discount?U.fmt(inv.discount):'-'}</td>
        <td style="text-align:right;font-weight:600">${U.fmt(inv.revenue)}</td>
      </tr></tbody>
    </table>
    <div class="summary"><div class="sum-box">
      <div class="sum-row"><span>ราคาก่อน VAT</span><span>฿${U.fmt(inv.revenue)}</span></div>
      <div class="sum-row"><span>VAT 7%</span><span>฿${U.fmt(Math.round(inv.vat))}</span></div>
      <div class="sum-total"><span>รวมทั้งสิ้น</span><span>฿${U.fmt(Math.round(inv.total))}</span></div>
    </div></div>
    ${inv.note?`<div class="note"><strong>หมายเหตุ:</strong> ${U.esc(inv.note)}</div>`:''}
    <div class="signs">
      <div class="sign"><div class="sline"></div><div class="slabel">ผู้จัดทำ</div><div class="sname">${inv.created_by||''}</div></div>
      <div class="sign"><div class="sline"></div><div class="slabel">ผู้รับใบแจ้งหนี้</div><div class="sname"></div></div>
    </div>
    <div class="footer"><span>${U.esc(compName)} — Invoice</span><span>พิมพ์: ${today}</span></div>
  </div></div>
  </body></html>`);
  w.document.close();
},
async editInv(id){
  const inv=DB.billing.listInvoices().find(i=>i.id===id);
  Modal.open(`<div class="fr"><div class="fg"><label>สถานะ</label><select id="ei_st">${U.sel(['Pending','Partial','Paid'],inv.status)}</select></div>
    <div class="fg"><label>รายได้จริง</label><input id="ei_rv" type="number" value="${inv.revenue}"/></div></div>
  <div class="fg"><label>ต้นทุนจริง</label><input id="ei_ct" type="number" value="${inv.cost}"/></div>`,
  'แก้ไข Invoice', async () => {
    const rv=parseFloat(document.getElementById('ei_rv').value)||inv.revenue;const ct=parseFloat(document.getElementById('ei_ct').value)||inv.cost;
    const st=document.getElementById('ei_st').value;const vat=rv*.07;const tot=rv+vat;const prf=rv-ct;
    DB.billing.saveInvoice({...inv,revenue:rv,vat,total:tot,cost:ct,profit:prf,margin:rv>0?prf/rv*100:0,status:st,_override_recorded_by:U.recordedByValue('inv_rb')||undefined});
    if(st==='Paid'){const p=DB.sales.getProject(inv.project_id);if(p)DB.sales.saveProject({...p,status:'Completed'});}
    Modal.close();this.render();U.toast('✅ อัปเดตแล้ว');
  });
}};



/* ── CALENDAR PAGE ── */
Pages.calendar={
  _y:new Date().getFullYear(),
  _m:new Date().getMonth(),
  STATUS_COLORS:{
    Prospect:'#8B5CF6','Follow up':'#A78BFA',Negotiation:'#7C3AED',
    Closed:'#06B6D4',Onsite:'#3B82F6',Lab:'#F59E0B',
    Report:'#8B5CF6',Billing:'#10B981',Completed:'#6B7280'
  },
  // Color by job_type (from CRM/JO) — same list as JOB_TYPES_ALL in extensions
  JOB_TYPE_COLORS:{
    'ตรวจสุขภาพ':    '#3B82F6',  // blue
    'OS XRAY':       '#8B5CF6',  // purple
    'ตรวจซ้ำ':       '#F59E0B',  // amber
    'เก็บอาหาร ตย':  '#EF4444',  // red
    'เก็บอาหาร ตัวอย่าง':'#EF4444',
    'อบรม First Aid':'#10B981',  // green
    'Consult':       '#06B6D4',  // cyan
    'อื่นๆ':         '#6B7280',  // gray
  },
  _getEventColor(p){
    // Prefer job_type color if set, else status color
    if(p.job_type && this.JOB_TYPE_COLORS[p.job_type])
      return this.JOB_TYPE_COLORS[p.job_type];
    return this.STATUS_COLORS[p.status]||'#888';
  },
  MONTHS:['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'],
  DAYS:['อา','จ','อ','พ','พฤ','ศ','ส'],
  render(){
    document.getElementById('content').innerHTML=`
    <div class="ph">
      <div><h2>📅 ปฏิทินงาน</h2><p id="cal-sub" style="font-size:18px;font-weight:700;font-family:'Noto Serif Thai',serif;color:#fff;margin-top:4px"></p></div>
      <div class="btn-grp">
        <button class="btn btn-out btn-sm" onclick="Pages.calendar.prev()">◀</button>
        <button class="btn btn-out btn-sm" onclick="Pages.calendar.goToday()">วันนี้</button>
        <button class="btn btn-out btn-sm" onclick="Pages.calendar.next()">▶</button>
      </div>
    </div>
    <div id="cal-legend-bar" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px"></div>
    <div class="card" style="padding:0;overflow:hidden;background:#fff;">
      <div id="cal-header-row" style="display:grid;grid-template-columns:repeat(7,1fr);background:linear-gradient(90deg,#0B2340,#1A3C65)"></div>
      <div id="cal-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:0;background:#fff"></div>
    </div>`;
    this.draw();
  },
  async draw(){
    const projs=DB.sales.listProjects();
    const y=this._y,m=this._m;
    const sub=document.getElementById('cal-sub');
    if(sub){sub.textContent=this.MONTHS[m]+' '+(y+543);sub.style.cssText='font-size:18px;font-weight:700;color:#fff;font-family:"Noto Serif Thai",serif;margin-top:4px;text-shadow:0 1px 3px rgba(0,0,0,.2)';}
    // Header row
    const hdr=document.getElementById('cal-header-row');
    if(hdr){hdr.innerHTML=this.DAYS.map(d=>`<div style="text-align:center;font-size:11px;font-weight:700;color:rgba(255,255,255,.75);padding:10px 0;text-transform:uppercase">${d}</div>`).join('');}
    // Build event map
    const evMap={};
    projs.forEach(p=>{
      if(!p.onsite_date)return;
      const d=p.onsite_date.substr(0,10);
      (evMap[d]=evMap[d]||[]).push(p);
    });
    const firstDay=new Date(y,m,1).getDay();
    const dim=new Date(y,m+1,0).getDate();
    const now=new Date();
    const ts=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
    const grid=document.getElementById('cal-grid');
    if(!grid)return;
    let html='';
    for(let i=0;i<firstDay;i++)html+=`<div style="min-height:88px;border-right:1px solid #E5EAF0;border-bottom:1px solid #E5EAF0;background:#F8FAFC"></div>`;
    for(let day=1;day<=dim;day++){
      const ds=y+'-'+String(m+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
      const evs=evMap[ds]||[];
      const isToday=ds===ts;
      const du=Math.ceil((new Date(ds)-now)/86400000);
      const near=du>=0&&du<=3&&evs.length>0;
      let evHtml='';
      evs.forEach(p=>{
        const c=this._getEventColor(p);
        const jt=p.job_type||'-';
        const jtShort=jt.length>10?jt.substr(0,10)+'…':jt;
        const coShort=p.company_name.length>14?p.company_name.substr(0,14)+'…':p.company_name;
        evHtml+=`<div onclick="event.stopPropagation();Pages.calendar.openProj(${p.id})"
          style="font-size:11px;padding:3px 6px;border-radius:5px;margin-bottom:2px;cursor:pointer;
                 white-space:nowrap;overflow:hidden;font-weight:600;line-height:1.4;
                 background:${c}22;color:${c};border-left:3px solid ${c};"
          title="${U.esc(p.company_name)} — ${U.esc(jt)}">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;opacity:.85">${jtShort}</div>
          <div style="font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis">${coShort}</div>
        </div>`;
      });
      html+=`<div onclick="Pages.calendar.openDay('${ds}')"
        style="min-height:88px;padding:5px 7px;
               border-right:1px solid #E5EAF0;border-bottom:1px solid #E5EAF0;
               cursor:pointer;position:relative;transition:background .12s;
               background:${near&&!isToday?'#FFFBEB':'#fff'};
               ${isToday?'outline:2px solid #C9A84C;outline-offset:-2px;':''}">
        ${near&&!isToday?`<div style="position:absolute;top:4px;left:5px;width:6px;height:6px;border-radius:50%;background:#F59E0B;box-shadow:0 0 6px rgba(245,158,11,.5)"></div>`:''}
        <div style="font-size:13px;font-weight:700;
          color:${near&&!isToday?'#92400E':'#1A2940'};
          text-align:right;margin-bottom:3px;font-family:'IBM Plex Mono',monospace">
          ${isToday?`<span style="background:#C9A84C;color:#fff;border-radius:50%;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(201,168,76,.5)">${day}</span>`:day}
        </div>
        <div>${evHtml}</div>
      </div>`;
    }
    // Fill remaining cells
    const total=firstDay+dim;
    const remainder=(7-total%7)%7;
    for(let i=0;i<remainder;i++)html+=`<div style="min-height:88px;border-right:1px solid #E5EAF0;border-bottom:1px solid #E5EAF0;background:#F8FAFC"></div>`;
    grid.innerHTML=html;
    // Legend
    const leg=document.getElementById('cal-legend-bar');
    if(leg){
      // Show job_type legend from actual projects
      const jobTypes=[...new Set(projs.filter(p=>p.job_type).map(p=>p.job_type))];
      const statusList=[...new Set(projs.map(p=>p.status))];
      const allLegend=[
        ...jobTypes.map(jt=>({label:jt,color:this.JOB_TYPE_COLORS[jt]||'#888',prefix:'ประเภท'})),
        ...statusList.filter(s=>!projs.some(p=>p.job_type)).map(s=>({label:s,color:this.STATUS_COLORS[s]||'#888',prefix:'สถานะ'})),
      ];
      const legItems = jobTypes.length > 0 ? allLegend.filter(l=>l.prefix==='ประเภท') : allLegend;
      leg.innerHTML=legItems.map(l=>`<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:#3A5166;padding:3px 10px;background:#fff;border-radius:20px;border:1px solid #DCE5EF;box-shadow:0 1px 3px rgba(11,35,64,.06)"><div style="width:8px;height:8px;border-radius:50%;background:${l.color}"></div><span style="font-weight:600">${l.label}</span></div>`).join('');
    }
  },
  openDay(ds){
    const evs=DB.sales.listProjects().filter(p=>p.onsite_date===ds);
    if(!evs.length)return;
    if(evs.length===1){this.openProj(evs[0].id);return;}
    Modal.open(evs.map(p=>`<div onclick="Modal.close();Pages.calendar.openProj(${p.id})" style="padding:11px;border:1px solid var(--bdr);border-radius:10px;cursor:pointer;margin-bottom:8px;transition:background .15s" onmouseover="this.style.background='var(--surf2)'" onmouseout="this.style.background=''"><div class="fw6">${U.esc(p.project_code)}</div><div class="t-sm t-muted">${U.esc(p.company_name)}</div></div>`).join(''),`งานวันที่ ${ds}`);
  },
  async openProj(id){
    const p=DB.sales.getProject(id);if(!p)return;
    const jo=DB.operation.getJobOrder(p.id);
    const lp=DB.lab.getLabProject(p.id);
    const rp=DB.report.getPlan(p.id);
    const inv=DB.billing.getInvoice(p.id);
    const col=this._getEventColor(p);
    const dL=p.onsite_date?Math.ceil((new Date(p.onsite_date)-new Date())/86400000):null;
    const steps=[
      {l:'Handover',done:!!DB.sales.getHandover(p.id)&&!!p.handover_sent,icon:'💼'},
      {l:'ใบแจ้งงาน',done:!!jo&&jo.status!=='Draft',icon:'📋'},
      {l:'Onsite',done:['Lab','Report','Billing','Completed'].includes(p.status),icon:'🚑'},
      {l:'ส่ง Lab',done:!!lp,icon:'🔬'},{l:'TAT',done:lp?.status==='reported',icon:'⏱'},
      {l:'Set Plan',done:!!JSON.parse(localStorage.getItem('rp_meta_'+p.id)||'{}').set_plan,icon:'📄'},
      {l:'ส่งผล',done:rp?.status==='sent',icon:'📨'},
      {l:'Invoice',done:!!inv,icon:'💰'},{l:'ชำระ',done:inv?.status==='Paid',icon:'🏦'},
    ];
    Modal.open(`
    <div style="background:${col}18;border-radius:10px;padding:13px;margin-bottom:13px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-family:'Prompt',sans-serif;font-size:16px;font-weight:700;color:var(--navy)">${U.esc(p.project_code)}</div>
          <div style="font-size:12px;color:var(--txt-md);margin-top:2px">${U.esc(p.company_name)}</div>
        </div>
        <span class="badge" style="background:${col}22;color:${col};border:1px solid ${col}44">${p.status}</span>
      </div>
    </div>
    ${dL!==null&&dL>=0&&dL<=3?`<div class="ab warning mb4">⚠️ วันตรวจอีก ${dL} วัน!</div>`:''}
    <div class="sr"><span>วันตรวจ</span><span class="fw6">${U.fmtD(p.onsite_date)} ${p.onsite_time||''}</span></div>
    <div class="sr"><span>สถานที่</span><span>${U.esc(p.location||'-')}</span></div>
    <div class="sr"><span>จำนวน</span><span>${(p.headcount||0).toLocaleString()} คน</span></div>
    <div class="sr"><span>กำหนดส่งผล</span><span>${U.fmtD(p.due_date)||'-'}</span></div>
    <div class="sr"><span>ผู้ประสานงาน</span><span>${U.esc((p.coordinator_name||'-')+' '+(p.coordinator_phone||''))}</span></div>
    <div class="divider"></div>
    <div class="sec-title">Workflow — ${steps.filter(s=>s.done).length}/${steps.length} ขั้นตอน</div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:8px">
      ${steps.map(s=>`<div style="text-align:center;padding:8px 4px;border-radius:8px;background:${s.done?'#F0FDF4':'var(--surf2)'};border:1px solid ${s.done?'#86EFAC':'var(--bdr)'}">
        <div style="font-size:16px">${s.icon}</div>
        <div style="font-size:9px;font-weight:600;color:${s.done?'var(--suc)':'var(--txt-lt)'};margin-top:2px">${s.l}</div>
        <div style="font-size:13px">${s.done?'✅':'⬜'}</div>
      </div>`).join('')}
    </div>`,`Project — ${p.project_code}`);
  },
  prev(){this._m--;if(this._m<0){this._m=11;this._y--;}this.draw();},
  next(){this._m++;if(this._m>11){this._m=0;this._y++;}this.draw();},
  goToday(){this._y=new Date().getFullYear();this._m=new Date().getMonth();this.draw();}
};

/* ── CONFIG ── */

/* ══════════════════════════════════════════════════
   EXAM CONFIG — รายการตรวจ & ต้นทุนอัตรากำลัง
══════════════════════════════════════════════════ */
Pages.exam_config={
  _tab:'exam',
  render(){
    const canEdit=DB.auth.can('edit','config');
    document.getElementById('content').innerHTML=`
    <div class="ph">
      <div><h2>🧪 รายการตรวจ & ต้นทุน</h2><p>ตั้งค่ารายการตรวจ ต้นทุน ราคาตั้ง และอัตรากำลัง</p></div>
    </div>
    <div class="tabs">
      <div class="tab ${this._tab==='exam'?'active':''}" onclick="Pages.exam_config._tab='exam';Pages.exam_config.render()">🧪 รายการตรวจ</div>
      <div class="tab ${this._tab==='manpower'?'active':''}" onclick="Pages.exam_config._tab='manpower';Pages.exam_config.render()">👥 ต้นทุนอัตรากำลัง</div>
    </div>
    <div id="exam_cfg_content"></div>`;
    if(this._tab==='exam') this._renderExam(canEdit);
    else this._renderManpower(canEdit);
  },

  async _renderExam(canEdit){
    const items=DB.examItems.list();
    const cats=[...new Set(items.map(it=>it.category))].sort();
    const catOpts=cats.map(c=>`<option value="${c}">${c}</option>`).join('');
    const rows=items.map(it=>{
      const margin=it.price>0?Math.round(((it.price-it.cost)/it.price)*100):0;
      return`<tr>
        <td class="fw6">${U.esc(it.name)}</td>
        <td><span class="badge b-draft">${U.esc(it.category)}</span></td>
        <td class="t-center">฿${U.fmt(it.cost)}</td>
        <td class="t-center fw6">฿${U.fmt(it.price)}</td>
        <td class="t-center">
          <span style="color:${margin>=40?'var(--suc)':margin>=20?'var(--warn)':'var(--danger)'};font-weight:600">${margin}%</span>
        </td>
        <td>${it.unit||'ราย'}</td>
        <td>
          ${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.exam_config.editExam(${it.id})">แก้ไข</button>`:''}
          ${canEdit?`<button class="btn btn-danger btn-xs" onclick="Pages.exam_config.delExam(${it.id})">ลบ</button>`:''}
        </td>
      </tr>`;
    }).join('');
    document.getElementById('exam_cfg_content').innerHTML=`
    <div class="card">
      <div class="card-header">
        <span class="card-title">รายการตรวจทั้งหมด <span class="badge b-draft">${items.length} รายการ</span></span>
        ${canEdit?`<button class="btn btn-pri btn-sm" onclick="Pages.exam_config.addExam()">+ เพิ่มรายการตรวจ</button>`:''}
      </div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>รายการตรวจ</th><th>หมวด</th><th style="text-align:center">ต้นทุน/ราย</th><th style="text-align:center">ราคาตั้ง/ราย</th><th style="text-align:center">Margin</th><th>หน่วย</th><th></th></tr></thead>
        <tbody>${rows||'<tr><td colspan="7" class="empty"><div class="icon">🧪</div><p>ยังไม่มีรายการตรวจ</p></td></tr>'}</tbody>
      </table></div>
    </div>`;
  },

  async _renderManpower(canEdit){
    const items=DB.manpowerCost.list();
    const rows=items.map(it=>`<tr>
      <td class="fw6">${U.esc(it.role)}</td>
      <td><span class="badge b-${it.type==='Parttime'?'warn':it.type==='OutSource'?'report':'closed'}">${it.type}</span></td>
      <td class="t-center">${it.cost_per_day>0?`฿${U.fmt(it.cost_per_day)}`:'—'}</td>
      <td class="t-center">${it.cost_per_head>0?`฿${U.fmt(it.cost_per_head)}/ราย`:'—'}</td>
      <td>${U.esc(it.unit)}</td>
      <td>
        ${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.exam_config.editMP(${it.id})">แก้ไข</button>`:''}
        ${canEdit?`<button class="btn btn-danger btn-xs" onclick="Pages.exam_config.delMP(${it.id})">ลบ</button>`:''}
      </td>
    </tr>`).join('');
    document.getElementById('exam_cfg_content').innerHTML=`
    <div class="card">
      <div class="card-header">
        <span class="card-title">ต้นทุนอัตรากำลัง <span class="badge b-draft">${items.length} รายการ</span></span>
        ${canEdit?`<button class="btn btn-pri btn-sm" onclick="Pages.exam_config.addMP()">+ เพิ่มรายการ</button>`:''}
      </div>
      <div class="ab info mb4">ใช้สำหรับคำนวณต้นทุนจริงในใบเสนอราคา และเปรียบเทียบ Margin</div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>ตำแหน่ง/รายการ</th><th>ประเภท</th><th style="text-align:center">ต้นทุน/วัน</th><th style="text-align:center">ต้นทุน/ราย</th><th>หน่วย</th><th></th></tr></thead>
        <tbody>${rows||'<tr><td colspan="6" class="empty"><div class="icon">👥</div><p>ยังไม่มีข้อมูล</p></td></tr>'}</tbody>
      </table></div>
    </div>`;
  },

  addExam(){
    const cats=['Lab','Xray','EKG','US','Gyn','ตรวจ','แพทย์','อื่นๆ'];
    Modal.open(`
    <div class="fr">
      <div class="fg"><label class="req">ชื่อรายการตรวจ</label><input id="ex_name" placeholder="เช่น CBC (เลือดสมบูรณ์)"/></div>
      <div class="fg"><label>หมวดหมู่</label>
        <select id="ex_cat"><option value="">-- เลือกหมวด --</option>${cats.map(c=>`<option value="${c}">${c}</option>`).join('')}</select>
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="req">ต้นทุน/ราย (บาท)</label><input id="ex_cost" type="number" placeholder="0" oninput="Pages.exam_config._calcM()"/></div>
      <div class="fg"><label class="req">ราคาตั้ง/ราย (บาท)</label><input id="ex_price" type="number" placeholder="0" oninput="Pages.exam_config._calcM()"/></div>
    </div>
    <div class="fr">
      <div class="fg"><label>หน่วย</label><input id="ex_unit" value="ราย" placeholder="ราย/คน/ครั้ง"/></div>
      <div class="fg"><label>หมายเหตุ</label><input id="ex_note" placeholder="ข้อมูลเพิ่มเติม..."/></div>
    </div>
    <div id="ex_margin_preview" class="ab info mt2" style="display:none"></div>`,
    'เพิ่มรายการตรวจ', async () => {
      const name=document.getElementById('ex_name').value.trim();
      if(!name)return U.toast('กรุณาใส่ชื่อรายการตรวจ','danger');
      DB.examItems.save({name,category:document.getElementById('ex_cat').value||'อื่นๆ',cost:parseFloat(document.getElementById('ex_cost').value)||0,price:parseFloat(document.getElementById('ex_price').value)||0,unit:document.getElementById('ex_unit').value||'ราย',note:document.getElementById('ex_note').value});
      Modal.close();this.render();U.toast('✅ เพิ่มรายการตรวจแล้ว');
    });
  },

  editExam(id){
    const it=DB.examItems.get(id);if(!it)return;
    const cats=['Lab','Xray','EKG','US','Gyn','ตรวจ','แพทย์','อื่นๆ'];
    const catOpts=cats.map(c=>`<option value="${c}" ${it.category===c?'selected':''}>${c}</option>`).join('');
    Modal.open(`
    <div class="fr">
      <div class="fg"><label class="req">ชื่อรายการตรวจ</label><input id="ex_name" value="${U.esc(it.name)}"/></div>
      <div class="fg"><label>หมวดหมู่</label><select id="ex_cat">${catOpts}</select></div>
    </div>
    <div class="fr">
      <div class="fg"><label class="req">ต้นทุน/ราย (บาท)</label><input id="ex_cost" type="number" value="${it.cost}" oninput="Pages.exam_config._calcM()"/></div>
      <div class="fg"><label class="req">ราคาตั้ง/ราย (บาท)</label><input id="ex_price" type="number" value="${it.price}" oninput="Pages.exam_config._calcM()"/></div>
    </div>
    <div class="fr">
      <div class="fg"><label>หน่วย</label><input id="ex_unit" value="${U.esc(it.unit||'ราย')}"/></div>
    </div>
    <div id="ex_margin_preview" class="ab info mt2"></div>`,
    'แก้ไขรายการตรวจ', async () => {
      const name=document.getElementById('ex_name').value.trim();
      if(!name)return U.toast('กรุณาใส่ชื่อ','danger');
      DB.examItems.save({...it,name,category:document.getElementById('ex_cat').value,cost:parseFloat(document.getElementById('ex_cost').value)||0,price:parseFloat(document.getElementById('ex_price').value)||0,unit:document.getElementById('ex_unit').value||'ราย'});
      Modal.close();this.render();U.toast('✅ อัปเดตแล้ว');
    });
    setTimeout(()=>this._calcM(),50);
  },

  _calcM(){
    const cost=parseFloat(document.getElementById('ex_cost')?.value)||0;
    const price=parseFloat(document.getElementById('ex_price')?.value)||0;
    const el=document.getElementById('ex_margin_preview');
    if(!el)return;
    if(price>0){
      const margin=Math.round(((price-cost)/price)*100);
      const profit=price-cost;
      el.style.display='flex';
      el.textContent=`Margin: ${margin}% | กำไร/ราย: ฿${U.fmt(profit)} | ราคาตั้ง: ฿${U.fmt(price)} | ต้นทุน: ฿${U.fmt(cost)}`;
      el.className=`ab ${margin>=40?'success':margin>=20?'warning':'danger'} mt2`;
    } else {el.style.display='none';}
  },

  async delExam(id){
    if(!U.confirm('ลบรายการตรวจนี้?'))return;
    DB.examItems.delete(id);this.render();U.toast('✅ ลบแล้ว');
  },

  addMP(){
    const types=['Staff','Parttime','OutSource','Vehicle','อื่นๆ'];
    Modal.open(`
    <div class="fr">
      <div class="fg"><label class="req">ตำแหน่ง/รายการ</label><input id="mp_role" placeholder="เช่น แพทย์ (MD)"/></div>
      <div class="fg"><label>ประเภท</label>
        <select id="mp_type">${types.map(t=>`<option value="${t}">${t}</option>`).join('')}</select>
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label>ต้นทุน/วัน (บาท)</label><input id="mp_day" type="number" value="0"/></div>
      <div class="fg"><label>ต้นทุน/ราย (บาท)</label><input id="mp_head" type="number" value="0"/></div>
    </div>
    <div class="fg"><label>หน่วย</label><input id="mp_unit" value="คน/วัน" placeholder="คน/วัน, เที่ยว, ครั้ง"/></div>`,
    'เพิ่มต้นทุนอัตรากำลัง', async () => {
      const role=document.getElementById('mp_role').value.trim();
      if(!role)return U.toast('กรุณาใส่ชื่อ','danger');
      DB.manpowerCost.save({role,type:document.getElementById('mp_type').value,cost_per_day:parseFloat(document.getElementById('mp_day').value)||0,cost_per_head:parseFloat(document.getElementById('mp_head').value)||0,unit:document.getElementById('mp_unit').value||'คน/วัน'});
      Modal.close();this.render();U.toast('✅ เพิ่มแล้ว');
    });
  },

  editMP(id){
    const it=DB.manpowerCost.list().find(r=>r.id===id);if(!it)return;
    const types=['Staff','Parttime','OutSource','Vehicle','อื่นๆ'];
    Modal.open(`
    <div class="fr">
      <div class="fg"><label class="req">ตำแหน่ง/รายการ</label><input id="mp_role" value="${U.esc(it.role)}"/></div>
      <div class="fg"><label>ประเภท</label>
        <select id="mp_type">${types.map(t=>`<option value="${t}" ${it.type===t?'selected':''}>${t}</option>`).join('')}</select>
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label>ต้นทุน/วัน (บาท)</label><input id="mp_day" type="number" value="${it.cost_per_day||0}"/></div>
      <div class="fg"><label>ต้นทุน/ราย (บาท)</label><input id="mp_head" type="number" value="${it.cost_per_head||0}"/></div>
    </div>
    <div class="fg"><label>หน่วย</label><input id="mp_unit" value="${U.esc(it.unit||'คน/วัน')}"/></div>`,
    'แก้ไขต้นทุนอัตรากำลัง', async () => {
      const role=document.getElementById('mp_role').value.trim();
      if(!role)return U.toast('กรุณาใส่ชื่อ','danger');
      DB.manpowerCost.save({...it,role,type:document.getElementById('mp_type').value,cost_per_day:parseFloat(document.getElementById('mp_day').value)||0,cost_per_head:parseFloat(document.getElementById('mp_head').value)||0,unit:document.getElementById('mp_unit').value||'คน/วัน'});
      Modal.close();this.render();U.toast('✅ อัปเดตแล้ว');
    });
  },

  async delMP(id){
    if(!U.confirm('ลบรายการนี้?'))return;
    DB.manpowerCost.delete(id);this.render();U.toast('✅ ลบแล้ว');
  },
};

Pages.config={async render(){
  if(!DB.auth.can('view','config'))return;
  const tat=DB.config.getTAT(),sla=DB.config.getSLA(),ad=DB.config.getAlertDays();
  const users=DB.auth.listUsers();
  const canEditCfg=DB.auth.can('edit','config');
  const uRows=users.map(u=>`<tr><td>${u.username}</td><td>${u.name}</td><td>${U.badge(u.role)}</td><td>${u.active?'<span class="badge b-closed">ใช้งาน</span>':'<span class="badge b-danger">ระงับ</span>'}</td><td>
    ${canEditCfg?`<button class="btn btn-out btn-xs" onclick="Pages.config.editUser(${u.id})">แก้ไข</button>`:''}
    ${DB.auth.can('delete','config')&&u.id!==1?`<button class="btn btn-danger btn-xs" onclick="Pages.config.delUser(${u.id})">ลบ</button>`:''}
  </td></tr>`).join('');
  const roles=DB.auth.listRoles();
  const rp=roles.map(r=>{
    const mods=Object.entries(MODULES).map(([k,label])=>{
      const m=r.modules[k]||{};
      const active=m.view||m.add||m.edit||m.delete;
      const perms=Object.entries(m).filter(([_,v])=>v).map(([a])=>a);
      return`<span style="display:inline-flex;align-items:center;gap:4px;margin:2px;padding:2px 8px;
        border-radius:20px;font-size:10px;font-weight:600;
        background:${active?'rgba(14,159,110,.12)':'rgba(255,255,255,.04)'};
        color:${active?'#6EE7B7':'#4A5D74'};
        border:1px solid ${active?'rgba(14,159,110,.25)':'rgba(255,255,255,.06)'}"
        title="${perms.join(', ')||'ไม่มีสิทธิ์'}">
        ${active?'✅':'⬜'} ${label}
      </span>`;
    }).join('');
    const hasQtApprove=!!(r.modules['qt_approve']?.approve);
    return`<tr>
      <td class="fw6" style="color:var(--t-bright)">${r.role}</td>
      <td><div style="display:flex;flex-wrap:wrap;gap:2px">${mods}${hasQtApprove?'<span style="display:inline-flex;align-items:center;gap:4px;margin:2px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;background:rgba(201,168,76,.12);color:var(--c-gold-lt,#E2C46A);border:1px solid rgba(201,168,76,.25)">🔐 Approve QT</span>':''}</div></td>
      <td>${canEditCfg?`<button class="btn btn-out btn-xs" onclick="Pages.config.editRole('${r.role}')">แก้ไขสิทธิ์</button>`:''}</td>
    </tr>`;
  }).join('');
  document.getElementById('content').innerHTML=`<div class="ph"><h2>⚙ Config — ตั้งค่าระบบ</h2></div>
  <div id="cfg_t1" class="tp active">
  <div class="g2 mb4">
    <div class="card"><div class="card-header"><span class="card-title">⏱ TAT & SLA Config</span>${canEditCfg?`<button class="btn btn-pri btn-sm" onclick="Pages.config.editTAT()">แก้ไข</button>`:''}</div>
      <div class="sr"><span>TAT (≤ Threshold)</span><span class="fw6">${tat.small} วัน</span></div>
      <div class="sr"><span>TAT (> Threshold)</span><span class="fw6">${tat.large} วัน</span></div>
      <div class="sr"><span>Threshold จำนวนคน</span><span class="fw6">${(tat.threshold).toLocaleString()} คน</span></div>
      <div class="sr"><span>SLA หลัง TAT</span><span class="fw6">+${sla.days_after_tat} วัน</span></div>
      <div class="sr"><span>แจ้งเตือนก่อนครบ Lab/Report</span><span class="fw6">${ad} วัน</span></div>
      <div class="sr"><span>📡 แจ้งเตือน X-Ray (วันหลังออกตรวจ)</span><span class="fw6 t-gold">${DB.config.getXrayAlertDays()} วัน</span></div>
    </div>
    <div class="card"><div class="card-header"><span class="card-title">🔑 สิทธิ์ตาม Role</span></div>
      <div class="tbl-wrap"><table><thead><tr><th>Role</th><th>Module</th><th></th></tr></thead><tbody>${rp}</tbody></table></div>
    </div>
  </div>
  <div class="card"><div class="card-header"><span class="card-title">👤 จัดการผู้ใช้งาน</span>${canEditCfg?`<button class="btn btn-pri btn-sm" onclick="Pages.config.addUser()">+ เพิ่มผู้ใช้</button>`:''}</div>
    <div class="tbl-wrap"><table><thead><tr><th>Username</th><th>ชื่อ</th><th>Role</th><th>สถานะ</th><th></th></tr></thead><tbody>${uRows}</tbody></table></div>
  </div>
  </div><!-- end cfg_t1 -->
`;
},
editTAT(){
  const tat=DB.config.getTAT(),sla=DB.config.getSLA(),ad=DB.config.getAlertDays(),xa=DB.config.getXrayAlertDays();
  Modal.open(`
  <div class="sec-title">⏱ TAT & SLA</div>
  <div class="fr3">
    <div class="fg"><label>TAT (คนน้อย) วัน</label><input id="ct_s" type="number" value="${tat.small}"/></div>
    <div class="fg"><label>TAT (คนเยอะ) วัน</label><input id="ct_l" type="number" value="${tat.large}"/></div>
    <div class="fg"><label>Threshold คน</label><input id="ct_th" type="number" value="${tat.threshold}"/></div>
  </div>
  <div class="fr">
    <div class="fg"><label>SLA หลัง TAT (วัน)</label><input id="ct_sla" type="number" value="${sla.days_after_tat}"/></div>
    <div class="fg"><label>แจ้งเตือนก่อนครบ Lab/Report (วัน)</label><input id="ct_ad" type="number" value="${ad}"/></div>
  </div>
  <div class="divider"></div>
  <div class="sec-title">📡 X-Ray Alert</div>
  <div class="ab info" style="margin-bottom:10px">
    แจ้งเตือนทีม X-Ray หากยังไม่ดำเนินการครบ ภายใน X วัน หลังจากวันออกหน่วย
  </div>
  <div class="fg" style="max-width:200px">
    <label>แจ้งเตือนหลังออกตรวจ (วัน)</label>
    <input id="ct_xray" type="number" value="${xa}" min="1"/>
  </div>`,
  'แก้ไข TAT & SLA & Alert',()=>{
    DB.config.setTAT({small:parseInt(document.getElementById('ct_s').value)||15,large:parseInt(document.getElementById('ct_l').value)||20,threshold:parseInt(document.getElementById('ct_th').value)||2000});
    DB.config.setSLA({days_after_tat:parseInt(document.getElementById('ct_sla').value)||7});
    DB.config.setAlertDays(parseInt(document.getElementById('ct_ad').value)||3);
    DB.config.setXrayAlertDays(parseInt(document.getElementById('ct_xray').value)||7);
    Modal.close();this.render();U.toast('✅ บันทึก Config แล้ว');
  });
},
addUser(){this.editUser(null);},
editUser(id){
  const u=id?DB.auth.getUser(id):{};
  // ดึงรายชื่อ Role ทั้งหมดจาก DB (admin, sales, operation, lab, xray, report, opd, billing)
  const allRoles=DB.auth.listRoles().map(r=>r.role);
  const roleLabels={admin:'ผู้ดูแลระบบ (admin)',sales:'ทีมขาย (sales)',operation:'Operation (operation)',lab:'ห้องแล็บ (lab)',xray:'X-Ray (xray)',report:'ทีมทำผล (report)',opd:'OPD (opd)',billing:'การเงิน (billing)'};
  const rOpts=U.sel(allRoles.map(r=>({v:r,l:roleLabels[r]||r})),u.role||'sales');
  Modal.open(`<div class="fr"><div class="fg"><label class="req">Username</label><input id="eu_un" value="${U.esc(u.username||'')}"/></div>
    <div class="fg"><label class="${id?'':'req'}">Password${id?' (เว้นว่างถ้าไม่เปลี่ยน)':''}</label><input id="eu_pw" type="password"/></div></div>
  <div class="fr"><div class="fg"><label class="req">ชื่อ-นามสกุล</label><input id="eu_nm" value="${U.esc(u.name||'')}"/></div>
    <div class="fg"><label>Role</label><select id="eu_rl">${rOpts}</select></div></div>
  <div class="fg"><label>สถานะ</label><select id="eu_ac">${U.sel([{v:'true',l:'ใช้งาน'},{v:'false',l:'ระงับ'}],String(u.active!==false))}</select></div>`,
  id?'แก้ไขผู้ใช้':'เพิ่มผู้ใช้', async () => {
    const pw=document.getElementById('eu_pw').value;
    if(!id&&!pw)return U.toast('กรุณาใส่ Password','danger');
    const d={id:id||undefined,username:document.getElementById('eu_un').value.trim(),name:document.getElementById('eu_nm').value.trim(),role:document.getElementById('eu_rl').value,active:document.getElementById('eu_ac').value==='true'};
    if(pw)d.password=pw;else if(id)d.password=u.password;
    if(!d.username||!d.name)return U.toast('กรุณากรอกข้อมูลให้ครบ','danger');
    DB.auth.saveUser(d);Modal.close();this.render();U.toast(id?'✅ แก้ไขแล้ว':'✅ เพิ่มผู้ใช้แล้ว');
  });
},
delUser(id){if(U.confirm('ลบผู้ใช้นี้?')){DB.auth.deleteUser(id);this.render();U.toast('✅ ลบแล้ว');}},
async editRole(role){
  const rp=DB.auth.getRolePermission(role)||{role,modules:{}};
  const actions=['view','add','edit','delete'];
  const actionLabel={view:'ดู',add:'เพิ่ม',edit:'แก้ไข',delete:'ลบ'};
  // Check if role can approve quotations
  const qtPerms=rp.modules['qt_approve']||{};
  const canApproveQt=!!(qtPerms.approve);
  const ckStyle=(checked)=>checked
    ?'display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#059669;color:#fff;font-size:13px;cursor:pointer'
    :'display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:var(--s-3,#1D2B42);color:var(--t-dim,#4A5D74);font-size:11px;cursor:pointer;border:1.5px solid rgba(255,255,255,.1)';
  let html=`<div class="mb4" style="display:flex;align-items:center;gap:10px">
    <span class="badge b-lab" style="font-size:14px;padding:5px 16px">${role}</span>
    <span class="t-sm t-muted">กำหนดสิทธิ์การเข้าถึงแต่ละ Module</span>
  </div>
  <div class="ab info mb4" style="font-size:12px">🟢 = มีสิทธิ์ · ⭕ = ไม่มีสิทธิ์ · คลิกเพื่อเปลี่ยน</div>
  <div class="tbl-wrap"><table>
    <thead><tr>
      <th>Module</th>
      ${actions.map(a=>`<th style="text-align:center">${actionLabel[a]||a}</th>`).join('')}
    </tr></thead><tbody>`;
  Object.entries(MODULES).forEach(([k,label])=>{
    const m=rp.modules[k]||{};
    html+=`<tr><td class="fw6" style="color:var(--t-bright,#F0F4FA)">${label}</td>`;
    actions.forEach(a=>{
      const id=`rp_${k}_${a}`;
      const checked=!!(m[a]);
      html+=`<td style="text-align:center">
        <button type="button" id="${id}_btn" role="checkbox" aria-checked="${checked}"
          onclick="Pages.config._toggleRoleBtn('${id}')"
          style="${ckStyle(checked)}" title="${label} — ${actionLabel[a]||a}">
          ${checked?'✓':''}
        </button>
        <input type="checkbox" id="${id}" ${checked?'checked':''} style="display:none"/>
      </td>`;
    });
    html+='</tr>';
  });
  html+=`</tbody></table></div>
  <div class="divider"></div>
  <div class="sec-title">🔐 สิทธิ์พิเศษ</div>
  <div style="background:var(--s-2,#172236);border-radius:10px;padding:14px 16px;border:1px solid rgba(255,255,255,.06)">
    <label style="display:flex;align-items:center;gap:12px;cursor:pointer;color:var(--t-body,#C2CEDF);font-size:13px;text-transform:none;letter-spacing:0">
      <button type="button" id="rp_qt_approve_btn" role="checkbox" aria-checked="${canApproveQt}"
        onclick="Pages.config._toggleRoleBtn('rp_qt_approve')"
        style="${ckStyle(canApproveQt)}" title="Approve Quotation">
        ${canApproveQt?'✓':''}
      </button>
      <input type="checkbox" id="rp_qt_approve" ${canApproveQt?'checked':''} style="display:none"/>
      <div>
        <div class="fw6" style="color:var(--t-bright,#F0F4FA)">✅ Approve / อนุมัติใบเสนอราคา</div>
        <div style="font-size:11px;color:var(--t-dim,#4A5D74);margin-top:2px">Role นี้สามารถกดอนุมัติหรือไม่อนุมัติใบเสนอราคาได้</div>
      </div>
    </label>
  </div>`;
  Modal.open(html,`แก้ไขสิทธิ์ — ${role}`, async () => {
    const modules={};
    Object.keys(MODULES).forEach(k=>{modules[k]={};actions.forEach(a=>{modules[k][a]=document.getElementById(`rp_${k}_${a}`)?.checked||false;});});
    // Special: qt_approve
    const qtApprove=document.getElementById('rp_qt_approve')?.checked||false;
    modules['qt_approve']={approve:qtApprove};
    DB.auth.saveRolePermission({role,modules});
    Modal.close();Pages.config.render();U.toast('✅ บันทึกสิทธิ์แล้ว');
  },true);
},
_toggleRoleBtn(id){
  const cb=document.getElementById(id);
  const btn=document.getElementById(id+'_btn');
  if(!cb||!btn)return;
  cb.checked=!cb.checked;
  const checked=cb.checked;
  btn.setAttribute('aria-checked',checked);
  btn.style.cssText=checked
    ?'display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#059669;color:#fff;font-size:13px;cursor:pointer'
    :'display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:var(--s-3,#1D2B42);color:var(--t-dim,#4A5D74);font-size:11px;cursor:pointer;border:1.5px solid rgba(255,255,255,.1)';
  btn.textContent=checked?'✓':'';
}};

/* ===== TAB HELPER ===== */
function switchTab(el,targetId){
  const container=el.closest('.tabs').parentElement||el.parentElement;
  el.closest('.tabs').querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  container.querySelectorAll('.tp').forEach(p=>p.classList.remove('active'));
  const tp=document.getElementById(targetId);
  if(tp)tp.classList.add('active');
}

/* ===== INIT ===== */

/* ── Config: Exam Items ── */
Pages.config.renderExamItems=async function(){
  const wrap=document.getElementById('cfg_t2');if(!wrap)return;
  const items=DB.examItems.list();
  const canEdit=DB.auth.can('edit','config');
  const cats=[...new Set(['Lab - เลือด','Lab - ปัสสาวะ','Lab - อุจจาระ','Imaging','Cardio','ประสาทสัมผัส','อาชีวอนามัย','สตรี','ตรวจร่างกาย','โรคติดต่อ',...DB.examItems.getCategories()])];
  const grouped={};cats.forEach(c=>{grouped[c]=items.filter(it=>it.category===c);});
  let html=`<div class="ph" style="margin-bottom:16px"><div><h3 style="font-family:'Noto Serif Thai',serif;font-size:16px;font-weight:700;color:var(--t-bright,#F0F4FA)">🧪 รายการตรวจสุขภาพ (${items.length} รายการ)</h3><p class="t-sm t-muted">ต้นทุนและราคาตั้งของแต่ละรายการตรวจ</p></div>${canEdit?`<button class="btn btn-pri btn-sm" onclick="Pages.config.addExamItem()">+ เพิ่มรายการตรวจ</button>`:''}</div>
  <div style="padding:10px 0 16px">
    <div style="position:relative;max-width:400px">
      <span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:13px;pointer-events:none;opacity:.5">🔍</span>
      <input id="exam_search" placeholder="ค้นหารายการตรวจ, หมวดหมู่..." autocomplete="off"
        oninput="(function(q){q=q.toLowerCase();document.querySelectorAll('#cfg_t2 .card').forEach(card=>{card.querySelectorAll('tbody tr').forEach(tr=>{tr.style.display=(!q||tr.textContent.toLowerCase().includes(q))?'':'none';});});})(this.value)"
        onfocus="this.style.borderColor='var(--c-teal,#00B8AA)'" onblur="this.style.borderColor='rgba(255,255,255,.1)'"
        style="width:100%;padding:9px 12px 9px 34px;border:1.5px solid rgba(255,255,255,.1);border-radius:9px;font-size:13px;background:rgba(255,255,255,.06);color:#fff;font-family:'IBM Plex Sans Thai',sans-serif;outline:none;transition:border-color .2s"/>
    </div>
  </div>`;
  cats.forEach(cat=>{
    const its=grouped[cat]||[];if(!its.length)return;
    html+=`<div class="card mb4"><div class="card-header"><span class="card-title">${cat} <span class="badge b-draft">${its.length}</span></span></div>
      <div class="tbl-wrap"><table><thead><tr><th>รายการตรวจ</th><th>หน่วย</th><th style="text-align:right">ต้นทุน</th><th style="text-align:right">ราคาตั้ง</th><th style="text-align:right">Margin</th><th></th></tr></thead>
      <tbody>${its.map(it=>{const m=it.list_price>0?Math.round(((it.list_price-it.cost)/it.list_price)*100):0;const mc=m>=40?'var(--suc)':m>=20?'var(--warn)':'var(--danger)';
      return`<tr><td class="fw6">${U.esc(it.name)}</td><td class="t-sm t-muted">${U.esc(it.unit||'ครั้ง')}</td><td style="text-align:right;color:var(--danger)">฿${U.fmt(it.cost)}</td><td style="text-align:right;font-weight:600">฿${U.fmt(it.list_price)}</td><td style="text-align:right;font-weight:700;color:${mc}">${m}%</td><td>${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.config.addExamItem(${it.id})">แก้ไข</button><button class="btn btn-danger btn-xs" onclick="Pages.config.delExamItem(${it.id})">ลบ</button>`:''}</td></tr>`;
      }).join('')}</tbody></table></div></div>`;
  });
  wrap.innerHTML=html;
};
Pages.config.addExamItem=function(id){
  const it=id?DB.examItems.get(id):{};const f=(k,d='')=>U.esc(it[k]||d);
  const catOpts=['Lab - เลือด','Lab - ปัสสาวะ','Lab - อุจจาระ','Imaging','Cardio','ประสาทสัมผัส','อาชีวอนามัย','สตรี','ตรวจร่างกาย','โรคติดต่อ','อื่นๆ'].map(c=>`<option value="${c}" ${it.category===c?'selected':''}>${c}</option>`).join('');
  Modal.open(`<div class="fg"><label class="req">ชื่อรายการตรวจ</label><input id="ei_name" value="${f('name')}" placeholder="เช่น CBC, FBS, X-Ray ปอด"/></div>
  <div class="fr"><div class="fg"><label class="req">หมวดหมู่</label><select id="ei_cat"><option value="">-- เลือก --</option>${catOpts}</select></div>
    <div class="fg"><label>หน่วย</label><input id="ei_unit" value="${f('unit','ครั้ง')}" placeholder="ครั้ง / ราย"/></div></div>
  <div class="fr"><div class="fg"><label class="req">ต้นทุน (฿)</label><input id="ei_cost" type="number" value="${it.cost||0}" oninput="Pages.config._calcMargin()"/></div>
    <div class="fg"><label class="req">ราคาตั้ง / List Price (฿)</label><input id="ei_price" type="number" value="${it.list_price||0}" oninput="Pages.config._calcMargin()"/></div></div>
  <div id="ei_margin" class="ab info mt2" style="font-size:13px"></div>
  <div class="fg mt2"><label>หมายเหตุ</label><input id="ei_note" value="${f('note')}"/></div>`,
  id?'แก้ไขรายการตรวจ':'เพิ่มรายการตรวจ', async () => {
    const name=document.getElementById('ei_name').value.trim();const cat=document.getElementById('ei_cat').value;
    if(!name||!cat)return U.toast('กรุณากรอกข้อมูลให้ครบ','danger');
    DB.examItems.save({id:id||undefined,name,category:cat,unit:document.getElementById('ei_unit').value||'ครั้ง',cost:parseFloat(document.getElementById('ei_cost').value)||0,list_price:parseFloat(document.getElementById('ei_price').value)||0,note:document.getElementById('ei_note').value});
    Modal.close();Pages.config.renderExamItems();U.toast(id?'✅ อัปเดตแล้ว':'✅ เพิ่มรายการตรวจแล้ว');
  });setTimeout(()=>Pages.config._calcMargin(),50);
};
Pages.config.delExamItem=function(id){if(!U.confirm('ลบรายการตรวจนี้?'))return;DB.examItems.delete(id);Pages.config.renderExamItems();U.toast('✅ ลบแล้ว');};
Pages.config._calcMargin=function(){
  const c=parseFloat(document.getElementById('ei_cost')?.value)||0;const p=parseFloat(document.getElementById('ei_price')?.value)||0;
  const el=document.getElementById('ei_margin');if(!el)return;
  if(p>0){const m=((p-c)/p*100).toFixed(1);el.className=`ab ${parseFloat(m)>=30?'success':parseFloat(m)>=15?'warning':'danger'} mt2`;el.textContent=`Margin: ฿${U.fmt(Math.round(p-c))}/รายการ (${m}%) — ราคาขาย ฿${U.fmt(p)} ต้นทุน ฿${U.fmt(c)}`;}else{el.textContent='';}
};

/* ── Config: Manpower Cost ── */
Pages.config.renderManpower=async function(){
  const wrap=document.getElementById('cfg_t3');if(!wrap)return;
  const mps=DB.manpowerCost.list();const canEdit=DB.auth.can('edit','config');
  const totalDay=mps.reduce((s,m)=>s+(m.cost_per_day||0),0);
  const rows=mps.map(mp=>`<tr><td class="fw6">${U.esc(mp.role)}</td><td>${U.esc(mp.type||'Full-day')}</td><td style="text-align:right;font-weight:600">฿${U.fmt(mp.cost_per_day)}</td><td>${U.esc(mp.unit||'วัน')}</td><td>${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.config.addManpower(${mp.id})">แก้ไข</button><button class="btn btn-danger btn-xs" onclick="Pages.config.delManpower(${mp.id})">ลบ</button>`:''}</td></tr>`).join('');
  wrap.innerHTML=`<div class="ph" style="margin-bottom:16px"><div><h3 style="font-family:'Prompt',sans-serif;font-size:16px;font-weight:700;color:var(--navy)">👥 ต้นทุนอัตรากำลัง (${mps.length} วิชาชีพ)</h3><p class="t-sm t-muted">ต้นทุนค่าแรงต่อวัน ใช้คำนวณ Margin ใบเสนอราคา</p></div>${canEdit?`<button class="btn btn-pri btn-sm" onclick="Pages.config.addManpower()">+ เพิ่มวิชาชีพ</button>`:''}</div>
  <div class="card"><div class="ab info mb4">รวมต้นทุน/วัน/ทีม: <strong>฿${U.fmt(totalDay)}</strong></div>
    <div class="tbl-wrap"><table><thead><tr><th>วิชาชีพ</th><th>ประเภท</th><th style="text-align:right">ต้นทุน (฿)</th><th>หน่วย</th><th></th></tr></thead>
    <tbody>${rows||'<tr><td colspan="5" class="empty">ยังไม่มีข้อมูล</td></tr>'}</tbody></table></div></div>`;
};
Pages.config.addManpower=function(id){
  const mp=id?DB.manpowerCost.list().find(r=>r.id===id):{};
  const typeOpts=['Full-day','Half-day','Per-test','Per-case'].map(t=>`<option ${mp.type===t?'selected':''}>${t}</option>`).join('');
  Modal.open(`<div class="fr"><div class="fg"><label class="req">วิชาชีพ / ตำแหน่ง</label><input id="mp_role" value="${U.esc(mp.role||'')}" placeholder="แพทย์, พยาบาล, MT..."/></div>
    <div class="fg"><label>ประเภท</label><select id="mp_type">${typeOpts}</select></div></div>
  <div class="fr"><div class="fg"><label class="req">ต้นทุน (฿)</label><input id="mp_cost" type="number" value="${mp.cost_per_day||0}"/></div>
    <div class="fg"><label>หน่วย</label><input id="mp_unit" value="${U.esc(mp.unit||'วัน')}" placeholder="วัน/ราย/ครั้ง"/></div></div>`,
  id?'แก้ไขต้นทุนอัตรากำลัง':'เพิ่มวิชาชีพ', async () => {
    const role=document.getElementById('mp_role').value.trim();if(!role)return U.toast('กรุณาใส่ชื่อวิชาชีพ','danger');
    DB.manpowerCost.save({id:id||undefined,role,type:document.getElementById('mp_type').value,cost_per_day:parseFloat(document.getElementById('mp_cost').value)||0,unit:document.getElementById('mp_unit').value||'วัน'});
    Modal.close();Pages.config.renderManpower();U.toast(id?'✅ อัปเดตแล้ว':'✅ เพิ่มแล้ว');
  });
};
Pages.config.delManpower=function(id){if(!U.confirm('ลบรายการนี้?'))return;DB.manpowerCost.delete(id);Pages.config.renderManpower();U.toast('✅ ลบแล้ว');};

document.addEventListener('DOMContentLoaded',()=>{
  // Seed mock data (localStorage backend)
  DB.seedMockData();

  // Auto-migrate: ensure xray01 exists
  const _users=DB._get('auth_db','users');
  if(_users.length>0&&!_users.find(u=>u.username==='xray01')){
    DB.auth.forceReseed&&DB.auth.forceReseed();
  }

  // Check existing session
  const sess=DB.auth.session();
  if(sess){showApp();Router.navigate('dashboard');}
  else showLogin();

  // Login form
  document.getElementById('login-form').addEventListener('submit',e=>{
    e.preventDefault();
    const u=document.getElementById('l_user').value.trim();
    const p=document.getElementById('l_pass').value;
    const btn=document.querySelector('.btn-login');
    if(btn){btn.disabled=true;btn.textContent='กำลังเข้าสู่ระบบ...';}
    const s=DB.auth.login(u,p);
    if(s){
      showApp();
      Router.navigate('dashboard');
      // เด้ง popup งานใหม่หลัง login (delay เล็กน้อยให้ dashboard render เสร็จก่อน)
      setTimeout(()=>showLoginNotificationPopup(s),400);
    } else {
      const errEl=document.getElementById('l_err');
      errEl.style.display='block';
      errEl.textContent='Username หรือ Password ไม่ถูกต้อง';
    }
    if(btn){btn.disabled=false;btn.textContent='เข้าสู่ระบบ';}
  });

  // Periodic alert check
  setInterval(updateAlerts,30000);
});
/* ═══════════════════════════════════════════════════════════
   Pages.medical — เวชระเบียน
   ═══════════════════════════════════════════════════════════ */
Pages.medical = {
  _search: '',
  async render(){
    const canEdit = DB.auth.can('edit','medical');
    const canDel = DB.auth.can('delete','medical');
    const allProjs = DB.sales.listProjects()||[];
    // Filter: Closed status only (status changes from Closed → Lab → Report etc., so include all post-closing)
    const closedStatuses = ['Closed','Lab','Report','Billing','Completed','Onsite'];
    let projs = allProjs.filter(p=>closedStatuses.includes(p.status));
    if(this._search){
      const q=this._search.toLowerCase();
      projs = projs.filter(p=>(p.project_code||'').toLowerCase().includes(q) || (p.company_name||'').toLowerCase().includes(q));
    }
    projs.sort((a,b)=>new Date(b.onsite_date||0)-new Date(a.onsite_date||0));

    const rows = projs.map(p=>{
      const m = DB.medical.getMeta(p.id);
      const mkCk = (key,label)=>{
        const done=!!m[key];
        const date=m[key+'_date']||'';
        return `<td style="text-align:center;vertical-align:middle">
          ${done
            ? `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:1px">
                <span style="font-size:17px;cursor:${canEdit?'pointer':'default'}" ${canEdit?`onclick="Pages.medical._toggle(${p.id},'${key}',false)" title="คลิกเพื่อยกเลิก"`:''}>✅</span>
                ${date?`<span style="font-size:9.5px;color:#6EE7B7;font-weight:600">${U.fmtD(date)}</span>`:''}
              </div>`
            : canEdit
              ? `<input type="checkbox" style="width:16px;height:16px;accent-color:#0E9F6E;cursor:pointer"
                  onchange="Pages.medical._toggle(${p.id},'${key}',this.checked)" title="${label}"/>`
              : `<span style="color:var(--t-muted);font-size:16px">⬜</span>`}
        </td>`;
      };
      return `<tr>
        <td class="fw6 mono" style="color:var(--c-gold-lt,#E2C46A)">${U.esc(p.project_code||'-')}</td>
        <td class="fw6">${U.esc(p.company_name||'-')}</td>
        <td>${U.fmtD(p.onsite_date)}</td>
        <td style="text-align:right">${(p.headcount||0).toLocaleString()}</td>
        ${mkCk('download_upload','Download/Upload')}
        ${mkCk('document','เอกสาร')}
        ${mkCk('equipment','อุปกรณ์')}
        <td>${U.recordedByCell(m.recorded_by)}</td>
        <td style="white-space:nowrap">
          ${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.medical.editMeta(${p.id})">แก้ไข</button>`:''}
          ${canDel?`<button class="btn btn-danger btn-xs" onclick="Pages.medical.del(${p.id})">ลบ</button>`:''}
        </td>
      </tr>`;
    }).join('');

    document.getElementById('content').innerHTML=`
      <div class="ph"><div><h2>📋 เวชระเบียน</h2><p>จัดการเอกสาร, อุปกรณ์, Download/Upload สำหรับ Project ที่ Closed</p></div></div>
      <div class="card">
        <div style="padding:12px 16px 0;display:flex;gap:8px;align-items:center">
          <input id="med_search" placeholder="🔍 ค้นหา Project / บริษัท..." value="${U.esc(this._search)}"
            style="max-width:320px;padding:7px 12px;border:1.5px solid var(--bdr,rgba(255,255,255,.15));border-radius:8px;font-size:13px;font-family:'Sarabun',sans-serif;background:var(--s-3,#1D2B42);color:#FFFFFF;outline:none"
            oninput="Pages.medical._search=this.value;clearTimeout(Pages.medical._t);Pages.medical._t=setTimeout(()=>Pages.medical.render(),250)"/>
          <span style="font-size:11.5px;color:#FFFFFF;opacity:.7">พบ ${projs.length} Project</span>
        </div>
        <div class="tbl-wrap"><table>
          <thead><tr>
            <th>Project</th><th>บริษัท</th><th>วันที่ตรวจ</th><th style="text-align:right">จำนวน</th>
            <th style="text-align:center" title="Download/Upload">Download/Upload</th>
            <th style="text-align:center" title="เอกสาร">เอกสาร</th>
            <th style="text-align:center" title="อุปกรณ์">อุปกรณ์</th>
            <th>ผู้บันทึก</th>
            <th></th>
          </tr></thead>
          <tbody>${rows||`<tr><td colspan="9" class="empty"><div class="icon">📋</div><p style="color:#FFFFFF;opacity:.7">ไม่มี Project ที่อยู่ในสถานะ Closed</p></td></tr>`}</tbody>
        </table></div>
      </div>`;
  },
  _toggle(pid,key,val){
    DB.medical.setMeta(pid,{[key]:val});
    this.render();
    U.toast(val?'✅ บันทึกแล้ว':'↩ ยกเลิก');
  },
  editMeta(pid){
    const p = DB.sales.getProject(pid);
    if(!p){U.toast('ไม่พบ Project','danger');return;}
    const m = DB.medical.getMeta(pid);
    const mkRow = (key,label,icon) => {
      const done = !!m[key];
      return `<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${done?'#0E9F6E22':'var(--s-2,#172236)'};border:1.5px solid ${done?'#6EE7B7':'rgba(255,255,255,.1)'};border-radius:9px;cursor:pointer;margin-bottom:8px;transition:all .15s">
        <input type="checkbox" id="med_${key}" ${done?'checked':''} style="width:17px;height:17px;accent-color:#0E9F6E;flex-shrink:0"/>
        <span style="flex:1;font-weight:${done?'600':'500'};color:#FFFFFF;font-size:13px">${icon} ${label}${done?' ✅':''}</span>
      </label>`;
    };
    Modal.open(`
      <div style="margin-bottom:14px;padding:10px 14px;background:var(--s-2,#172236);border-radius:9px">
        <div class="fw6 mono" style="color:#F0CD7F">${U.esc(p.project_code)}</div>
        <div class="fw6" style="font-size:14px;color:#FFFFFF">${U.esc(p.company_name)}</div>
        <div style="font-size:12px;color:#FFFFFF;opacity:.7">${U.fmtD(p.onsite_date)} | ${(p.headcount||0).toLocaleString()} คน</div>
      </div>
      <div class="sec-title" style="font-size:12px;color:#F0CD7F;font-weight:600;margin-bottom:8px;font-family:'IBM Plex Mono',monospace;letter-spacing:.8px">การดำเนินการ</div>
      ${mkRow('download_upload','Download/Upload','📥')}
      ${mkRow('document','เอกสาร','📄')}
      ${mkRow('equipment','อุปกรณ์','📦')}
      <div class="fg" style="margin-top:14px">
        <label style="display:block;font-size:11.5px;color:#FFFFFF;margin-bottom:4px;font-weight:600">Note (บันทึก)</label>
        <textarea id="med_note" style="width:100%;min-height:60px;padding:8px 12px;background:var(--s-3,#1D2B42);border:1.5px solid rgba(255,255,255,.18);border-radius:7px;color:#FFFFFF;font-family:inherit;font-size:12.5px;resize:vertical">${U.esc(m.note||'')}</textarea>
      </div>
      <div style="margin-top:14px">${U.recordedByField(m.recorded_by, 'med_rb')}</div>`,
      'แก้ไข — เวชระเบียน',
      ()=>{
        const dl=document.getElementById('med_download_upload').checked;
        const dc=document.getElementById('med_document').checked;
        const eq=document.getElementById('med_equipment').checked;
        const nt=document.getElementById('med_note').value;
        const rb=U.recordedByValue('med_rb');
        DB.medical.setMeta(pid,{
          download_upload:dl, document:dc, equipment:eq, note:nt,
          _override_recorded_by: rb || undefined
        });
        Modal.close(); this.render(); U.toast('✅ บันทึกแล้ว');
      });
  },
  del(pid){
    if(!confirm('ลบข้อมูลเวชระเบียนของ Project นี้?')) return;
    DB.medical.remove(pid);
    this.render();
    U.toast('✅ ลบแล้ว');
  }
};

/* ═══════════════════════════════════════════════════════════
   Pages.op_station_checklist — Operation > Checklist Station
   ═══════════════════════════════════════════════════════════ */
Pages.op_station_checklist = {
  _search: '',
  _activeTab: 'vs',
  async render(){
    const canEdit = DB.auth.can('edit','op_checklist');
    const canDel = DB.auth.can('delete','op_checklist');
    const allProjs = DB.sales.listProjects()||[];
    const closedStatuses = ['Closed','Lab','Report','Billing','Completed','Onsite'];
    let projs = allProjs.filter(p=>closedStatuses.includes(p.status));
    if(this._search){
      const q=this._search.toLowerCase();
      projs = projs.filter(p=>(p.project_code||'').toLowerCase().includes(q) || (p.company_name||'').toLowerCase().includes(q));
    }
    projs.sort((a,b)=>new Date(b.onsite_date||0)-new Date(a.onsite_date||0));

    const rows = projs.map(p=>{
      const ck = DB.station_checklist.getForProject(p.id);
      const isComplete = !!(ck&&ck.is_complete);
      const statusBadge = isComplete
        ? '<span class="badge b-closed">✓ Complete</span>'
        : ck
          ? '<span class="badge" style="background:rgba(252,211,77,.15);color:#FCD34D">⏳ บันทึกร่างแล้ว</span>'
          : '<span class="badge b-pending">⏳ รอดำเนินการ</span>';
      return `<tr>
        <td class="fw6 mono" style="color:var(--c-gold-lt,#E2C46A)">${U.esc(p.project_code||'-')}</td>
        <td class="fw6">${U.esc(p.company_name||'-')}</td>
        <td>${U.fmtD(p.onsite_date)}</td>
        <td style="text-align:right">${(p.headcount||0).toLocaleString()}</td>
        <td>${statusBadge}</td>
        <td>${U.recordedByCell((ck||{}).recorded_by)}</td>
        <td style="white-space:nowrap">
          ${canEdit?`<button class="btn ${isComplete?'btn-out':'btn-pri'} btn-xs" onclick="Pages.op_station_checklist.openChecklist(${p.id})">📋 Checklist</button>`:''}
          ${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.op_station_checklist.openChecklist(${p.id})">✏️ แก้ไข</button>`:''}
          <button class="btn btn-out btn-xs" onclick="Pages.op_station_checklist.exportPDF(${p.id})">📄 PDF</button>
          ${canDel?`<button class="btn btn-danger btn-xs" onclick="Pages.op_station_checklist.del(${p.id})">ลบ</button>`:''}
        </td>
      </tr>`;
    }).join('');

    document.getElementById('content').innerHTML=`
      <div class="ph"><div><h2>✅ Operation Checklist Station</h2><p>ตรวจเช็คอุปกรณ์ก่อนออกหน่วย Mobile Check Up (13 จุดตรวจ)</p></div></div>
      <div class="card">
        <div style="padding:12px 16px 0;display:flex;gap:8px;align-items:center">
          <input id="opck_search" placeholder="🔍 ค้นหา Project / บริษัท..." value="${U.esc(this._search)}"
            style="max-width:320px;padding:7px 12px;border:1.5px solid rgba(255,255,255,.15);border-radius:8px;font-size:13px;font-family:'Sarabun',sans-serif;background:var(--s-3,#1D2B42);color:#FFFFFF;outline:none"
            oninput="Pages.op_station_checklist._search=this.value;clearTimeout(Pages.op_station_checklist._t);Pages.op_station_checklist._t=setTimeout(()=>Pages.op_station_checklist.render(),250)"/>
          <span style="font-size:11.5px;color:#FFFFFF;opacity:.7">พบ ${projs.length} Project</span>
        </div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>Project</th><th>บริษัท</th><th>วันที่ตรวจ</th><th style="text-align:right">จำนวน</th><th>สถานะ</th><th>ผู้บันทึก</th><th></th></tr></thead>
          <tbody>${rows||`<tr><td colspan="7" class="empty"><div class="icon">📋</div><p style="color:#FFFFFF;opacity:.7">ไม่มี Project ที่อยู่ในสถานะ Closed</p></td></tr>`}</tbody>
        </table></div>
      </div>`;
  },

  openChecklist(pid){
    const p = DB.sales.getProject(pid);
    if(!p){U.toast('ไม่พบ Project','danger');return;}
    const templates = DB.station_checklist.getTemplates();
    const saved = DB.station_checklist.getForProject(pid) || {};
    this._activeTab = Object.keys(templates)[0];
    this._pid = pid;
    this._draft = JSON.parse(JSON.stringify(saved.stations||{})); // working copy
    this._meta = {
      n_stations: saved.n_stations||'',
      n_people: saved.n_people||p.headcount||'',
      check_time: saved.check_time||'',
      prep_by: saved.prep_by||'', prep_date: saved.prep_date||'',
      verify_by: saved.verify_by||'', verify_date: saved.verify_date||'',
      director: saved.director||'', director_date: saved.director_date||'',
      return_by: saved.return_by||'', return_date: saved.return_date||'',
      receive_by: saved.receive_by||'', receive_date: saved.receive_date||''
    };
    this._renderModal(p, templates);
  },

  _renderModal(p, templates){
    const tabs = Object.entries(templates).map(([k,v])=>{
      const filled = this._draft[k] && Object.keys(this._draft[k]).length>0;
      const isActive = k===this._activeTab;
      return `<div class="opck-tab ${isActive?'opck-tab-act':''}" onclick="Pages.op_station_checklist._switchTab('${k}')" style="padding:6px 11px;font-size:11.5px;color:#FFFFFF;cursor:pointer;border-radius:5px;white-space:nowrap;flex-shrink:0;font-weight:${isActive?'600':'500'};background:${isActive?'rgba(240,205,127,.18)':'transparent'};color:${isActive?'#F0CD7F':'#FFFFFF'};${filled?'border:1px solid rgba(110,231,183,.3)':''}">${v.name}${filled?' ✓':''}</div>`;
    }).join('');
    const cur = templates[this._activeTab];
    const draft = this._draft[this._activeTab] || {};
    const itemRows = cur.items.map((it,idx)=>{
      const d = draft.items && draft.items[idx] || {};
      const qOut = d.qty_out !== undefined ? d.qty_out : (it.qty_default||'');
      return `<tr>
        <td style="color:#FFFFFF">${it.no}</td>
        <td style="color:#FFFFFF">${U.esc(it.name)}</td>
        <td style="text-align:center"><input type="number" data-it="${idx}" data-f="qty_out" value="${qOut}" style="width:60px;padding:4px 7px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:4px;color:#FFFFFF;font-size:11.5px;text-align:center;font-family:inherit"/></td>
        <td style="color:#FFFFFF">${U.esc(it.unit)}</td>
        <td style="text-align:center"><input type="number" data-it="${idx}" data-f="qty_back" value="${d.qty_back||''}" placeholder="-" style="width:60px;padding:4px 7px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:4px;color:#FFFFFF;font-size:11.5px;text-align:center;font-family:inherit"/></td>
        <td style="text-align:center"><input type="number" data-it="${idx}" data-f="qty_receive" value="${d.qty_receive||''}" placeholder="-" style="width:60px;padding:4px 7px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:4px;color:#FFFFFF;font-size:11.5px;text-align:center;font-family:inherit"/></td>
        <td><input type="text" data-it="${idx}" data-f="note" value="${U.esc(d.note||'')}" placeholder="-" style="width:100%;padding:4px 7px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:4px;color:#FFFFFF;font-size:11.5px;font-family:inherit"/></td>
      </tr>`;
    }).join('');

    const m = this._meta;
    Modal.open(`
      <div style="padding:10px 14px;background:var(--s-2,#172236);border-radius:0;border-bottom:1px solid rgba(255,255,255,.08)">
        <div style="font-family:'IBM Plex Mono',monospace;color:#F0CD7F;font-size:11.5px;font-weight:600">${U.esc(p.project_code)}</div>
        <div style="color:#FFFFFF;font-size:14px;font-weight:600">${U.esc(p.company_name)}</div>
        <div style="color:#FFFFFF;opacity:.75;font-size:11.5px">${U.fmtD(p.onsite_date)} | ${(p.headcount||0).toLocaleString()} ราย</div>
      </div>
      <div id="opck_tabs" style="display:flex;gap:3px;padding:9px 12px;background:var(--s-2,#172236);border-bottom:1px solid rgba(255,255,255,.08);overflow-x:auto;flex-wrap:wrap">${tabs}</div>
      <div style="padding:14px 18px">
        <div style="font-size:12px;color:#F0CD7F;margin-bottom:9px;font-weight:600">📋 แบบฟอร์ม ${cur.form_code} · ${cur.name} · ${cur.items.length} รายการ</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:11px;margin-bottom:12px">
          <div><label style="display:block;font-size:11.5px;color:#FFFFFF;margin-bottom:4px;font-weight:600">จำนวนจุด</label><input id="opck_n_stations" type="number" value="${m.n_stations}" style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:inherit"/></div>
          <div><label style="display:block;font-size:11.5px;color:#FFFFFF;margin-bottom:4px;font-weight:600">ผู้เข้ารับบริการ</label><input id="opck_n_people" type="number" value="${m.n_people}" style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:inherit"/></div>
          <div><label style="display:block;font-size:11.5px;color:#FFFFFF;margin-bottom:4px;font-weight:600">เวลาตรวจ</label><input id="opck_check_time" type="time" value="${m.check_time}" style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:inherit"/></div>
        </div>
        <table id="opck_items_tbl" style="width:100%;font-size:12px;border-collapse:collapse">
          <thead><tr style="background:var(--s-2,#172236)">
            <th style="padding:7px 8px;text-align:left;color:#FFFFFF;font-weight:600;border-bottom:1px solid rgba(255,255,255,.1);width:25px">#</th>
            <th style="padding:7px 8px;text-align:left;color:#FFFFFF;font-weight:600;border-bottom:1px solid rgba(255,255,255,.1)">รายการ</th>
            <th style="padding:7px 8px;text-align:center;color:#FFFFFF;font-weight:600;border-bottom:1px solid rgba(255,255,255,.1);width:65px">นำออก</th>
            <th style="padding:7px 8px;text-align:left;color:#FFFFFF;font-weight:600;border-bottom:1px solid rgba(255,255,255,.1);width:50px">หน่วย</th>
            <th style="padding:7px 8px;text-align:center;color:#FFFFFF;font-weight:600;border-bottom:1px solid rgba(255,255,255,.1);width:65px">นำกลับ</th>
            <th style="padding:7px 8px;text-align:center;color:#FFFFFF;font-weight:600;border-bottom:1px solid rgba(255,255,255,.1);width:65px">รับคืน</th>
            <th style="padding:7px 8px;text-align:left;color:#FFFFFF;font-weight:600;border-bottom:1px solid rgba(255,255,255,.1)">หมายเหตุ</th>
          </tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)">
          <div><label style="display:block;font-size:11.5px;color:#FFFFFF;margin-bottom:4px;font-weight:600">ผู้จัดเตรียม</label><input id="opck_prep_by" value="${U.esc(m.prep_by)}" placeholder="ชื่อ-นามสกุล" style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:inherit"/></div>
          <div><label style="display:block;font-size:11.5px;color:#FFFFFF;margin-bottom:4px;font-weight:600">วันที่</label><input id="opck_prep_date" type="date" value="${m.prep_date}" style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:inherit"/></div>
          <div><label style="display:block;font-size:11.5px;color:#FFFFFF;margin-bottom:4px;font-weight:600">ผู้ตรวจสอบ</label><input id="opck_verify_by" value="${U.esc(m.verify_by)}" style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:inherit"/></div>
          <div><label style="display:block;font-size:11.5px;color:#FFFFFF;margin-bottom:4px;font-weight:600">วันที่</label><input id="opck_verify_date" type="date" value="${m.verify_date}" style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:inherit"/></div>
          <div><label style="display:block;font-size:11.5px;color:#FFFFFF;margin-bottom:4px;font-weight:600">Director</label><input id="opck_director" value="${U.esc(m.director)}" style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:inherit"/></div>
          <div><label style="display:block;font-size:11.5px;color:#FFFFFF;margin-bottom:4px;font-weight:600">วันที่</label><input id="opck_director_date" type="date" value="${m.director_date}" style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:inherit"/></div>
          <div><label style="display:block;font-size:11.5px;color:#FFFFFF;margin-bottom:4px;font-weight:600">ผู้นำกลับ</label><input id="opck_return_by" value="${U.esc(m.return_by)}" style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:inherit"/></div>
          <div><label style="display:block;font-size:11.5px;color:#FFFFFF;margin-bottom:4px;font-weight:600">วันที่</label><input id="opck_return_date" type="date" value="${m.return_date}" style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:inherit"/></div>
          <div><label style="display:block;font-size:11.5px;color:#FFFFFF;margin-bottom:4px;font-weight:600">ผู้รับคืน</label><input id="opck_receive_by" value="${U.esc(m.receive_by)}" style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:inherit"/></div>
          <div><label style="display:block;font-size:11.5px;color:#FFFFFF;margin-bottom:4px;font-weight:600">วันที่</label><input id="opck_receive_date" type="date" value="${m.receive_date}" style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:inherit"/></div>
        </div>
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)">${U.recordedByField((DB.station_checklist.getForProject(this._pid)||{}).recorded_by, 'opck_rb')}</div>
      </div>
    `,'📋 Checklist Station 2026 — '+p.project_code,
    ()=>{this._save();},
    true);
  },

  _captureCurrentTab(){
    // Save current tab's inputs into draft
    const tbl = document.getElementById('opck_items_tbl');
    if(!tbl) return;
    const templates = DB.station_checklist.getTemplates();
    const cur = templates[this._activeTab];
    if(!cur) return;
    if(!this._draft[this._activeTab]) this._draft[this._activeTab]={items:[]};
    this._draft[this._activeTab].items = cur.items.map((it,idx)=>{
      const find = (f)=>{const el=tbl.querySelector(`[data-it="${idx}"][data-f="${f}"]`);return el?el.value:'';};
      return {qty_out:find('qty_out'),qty_back:find('qty_back'),qty_receive:find('qty_receive'),note:find('note')};
    });
    // capture meta
    const getV=(id)=>document.getElementById(id)?.value||'';
    this._meta = {
      n_stations: getV('opck_n_stations'),
      n_people: getV('opck_n_people'),
      check_time: getV('opck_check_time'),
      prep_by: getV('opck_prep_by'), prep_date: getV('opck_prep_date'),
      verify_by: getV('opck_verify_by'), verify_date: getV('opck_verify_date'),
      director: getV('opck_director'), director_date: getV('opck_director_date'),
      return_by: getV('opck_return_by'), return_date: getV('opck_return_date'),
      receive_by: getV('opck_receive_by'), receive_date: getV('opck_receive_date')
    };
  },

  _switchTab(key){
    this._captureCurrentTab();
    this._activeTab = key;
    const p = DB.sales.getProject(this._pid);
    const templates = DB.station_checklist.getTemplates();
    this._renderModal(p, templates);
  },

  _save(){
    this._captureCurrentTab();
    const rb = U.recordedByValue('opck_rb');
    DB.station_checklist.save(this._pid, {
      ...this._meta,
      stations: this._draft,
      _override_recorded_by: rb || undefined
    });
    DB.station_checklist.markComplete(this._pid);
    Modal.close();
    this.render();
    U.toast('✅ บันทึก Checklist Station สำเร็จ');
  },

  exportPDF(pid){
    const p = DB.sales.getProject(pid);
    if(!p){U.toast('ไม่พบ Project','danger');return;}
    const ck = DB.station_checklist.getForProject(pid);
    if(!ck||!ck.stations){U.toast('ยังไม่มีข้อมูล Checklist','warning');return;}
    const templates = DB.station_checklist.getTemplates();
    const w = window.open('','_blank');
    const stationSections = Object.entries(templates).map(([k,v])=>{
      const d = ck.stations[k]||{};
      const rows = v.items.map((it,idx)=>{
        const di = (d.items&&d.items[idx])||{};
        return `<tr>
          <td>${it.no}</td>
          <td>${it.name}</td>
          <td style="text-align:center">${di.qty_out||(it.qty_default||'-')}</td>
          <td>${it.unit}</td>
          <td style="text-align:center">${di.qty_back||'-'}</td>
          <td style="text-align:center">${di.qty_receive||'-'}</td>
          <td>${di.note||'-'}</td>
        </tr>`;
      }).join('');
      return `<div class="station-page">
        <h3>${v.form_code} · ${v.name}</h3>
        <table class="ck-tbl">
          <thead><tr><th>No.</th><th>รายการ</th><th>นำออก</th><th>หน่วย</th><th>นำกลับ</th><th>รับคืน</th><th>หมายเหตุ</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    }).join('');
    w.document.write(`<!DOCTYPE html><html><head><title>Checklist Station — ${p.project_code}</title>
    <style>
      @page{size:A4;margin:10mm}
      body{font-family:'Sarabun',sans-serif;font-size:11px;padding:0;margin:0}
      h1{font-size:14px;text-align:center;margin:8px 0}
      h3{font-size:12px;margin:10px 0 6px;border-bottom:1.5px solid #333;padding-bottom:3px}
      .info{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:6px 0;font-size:10.5px}
      .ck-tbl{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:8px}
      .ck-tbl th,.ck-tbl td{border:1px solid #333;padding:3px 5px}
      .ck-tbl th{background:#eee;font-weight:600}
      .station-page{page-break-inside:avoid;margin-bottom:12px}
      .sigs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:14px;font-size:10px}
      .sigs div{padding:4px 0;border-bottom:1px solid #333}
      @media print { .no-print{display:none} }
    </style></head><body>
      <h1>📋 Checklist Station 2026 — ${p.project_code}</h1>
      <div class="info">
        <div><strong>บริษัท:</strong> ${p.company_name}</div>
        <div><strong>วันที่ตรวจ:</strong> ${U.fmtD(p.onsite_date)}</div>
        <div><strong>จำนวนจุด:</strong> ${ck.n_stations||'-'}</div>
        <div><strong>ผู้รับบริการ:</strong> ${ck.n_people||p.headcount||'-'} ราย</div>
      </div>
      ${stationSections}
      <div class="sigs">
        <div><strong>ผู้จัดเตรียม:</strong> ${ck.prep_by||'_________________'} (${ck.prep_date||'__/__/__'})</div>
        <div><strong>ผู้ตรวจสอบ:</strong> ${ck.verify_by||'_________________'} (${ck.verify_date||'__/__/__'})</div>
        <div><strong>Director:</strong> ${ck.director||'_________________'} (${ck.director_date||'__/__/__'})</div>
        <div><strong>ผู้นำกลับ:</strong> ${ck.return_by||'_________________'} (${ck.return_date||'__/__/__'})</div>
        <div><strong>ผู้รับคืน:</strong> ${ck.receive_by||'_________________'} (${ck.receive_date||'__/__/__'})</div>
      </div>
      <button class="no-print" onclick="window.print()" style="position:fixed;top:10px;right:10px;padding:8px 14px;background:#0E9F6E;color:white;border:none;border-radius:6px;font-size:13px;cursor:pointer">🖨 พิมพ์</button>
    </body></html>`);
    w.document.close();
  },

  del(pid){
    if(!confirm('ลบข้อมูล Checklist ของ Project นี้?')) return;
    DB.station_checklist.remove(pid);
    this.render();
    U.toast('✅ ลบแล้ว');
  }
};



/* ═══════════════════════════════════════════════════════════
   Pages.config_station_checklist — ตั้งค่า Checklist Station
   Admin can add/edit/delete stations + items
   ═══════════════════════════════════════════════════════════ */
Pages.config_station_checklist = {
  _activeKey: null,
  _draft: null,   // working copy of all templates

  async render(){
    const canEdit = DB.auth.can('edit','config');
    // โหลด templates ปัจจุบัน (override หรือ default)
    if(!this._draft) this._draft = JSON.parse(JSON.stringify(DB.station_checklist.getTemplates()));
    if(!this._activeKey || !this._draft[this._activeKey]) this._activeKey = Object.keys(this._draft)[0];

    const stationsHtml = Object.entries(this._draft).map(([k,v])=>{
      const active = k === this._activeKey;
      return `<div onclick="Pages.config_station_checklist._select('${k}')"
        style="padding:10px 14px;font-size:12.5px;cursor:pointer;display:flex;align-items:center;gap:9px;
        border-left:3px solid ${active?'#F0CD7F':'transparent'};
        background:${active?'rgba(240,205,127,.12)':'transparent'};
        color:${active?'#F0CD7F':'#FFFFFF'};
        font-weight:${active?'600':'500'}">
        <span>📋</span>
        <span style="flex:1">${U.esc(v.name)}</span>
        <span style="margin-left:auto;font-size:10.5px;background:${active?'rgba(240,205,127,.2)':'rgba(255,255,255,.08)'};color:${active?'#F0CD7F':'#FFFFFF'};padding:1px 7px;border-radius:9px">${v.items.length}</span>
      </div>`;
    }).join('');

    const cur = this._draft[this._activeKey];
    const itemsHtml = cur.items.map((it,idx)=>`<tr>
      <td style="color:#FFFFFF;width:30px">${idx+1}</td>
      <td><input data-idx="${idx}" data-f="name" value="${U.esc(it.name||'')}" ${!canEdit?'readonly':''}
        style="width:100%;padding:5px 8px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.15);border-radius:4px;color:#FFFFFF;font-size:11.5px;font-family:inherit"/></td>
      <td style="width:90px"><input data-idx="${idx}" data-f="qty_default" value="${U.esc(it.qty_default||'')}" placeholder="-" ${!canEdit?'readonly':''}
        style="width:100%;padding:5px 8px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.15);border-radius:4px;color:#FFFFFF;font-size:11.5px;text-align:center;font-family:inherit"/></td>
      <td style="width:90px"><input data-idx="${idx}" data-f="unit" value="${U.esc(it.unit||'')}" placeholder="-" ${!canEdit?'readonly':''}
        style="width:100%;padding:5px 8px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.15);border-radius:4px;color:#FFFFFF;font-size:11.5px;font-family:inherit"/></td>
      <td style="width:50px">${canEdit?`<button class="btn btn-danger btn-xs" onclick="Pages.config_station_checklist._delItem(${idx})" style="padding:3px 8px;font-size:10.5px">×</button>`:''}</td>
    </tr>`).join('');

    document.getElementById('content').innerHTML=`
      <div class="ph">
        <div><h2>🩺 ตั้งค่า Checklist Station</h2><p>เพิ่ม/แก้ไข/ลบ จุดตรวจและรายการอุปกรณ์ — ข้อมูลเชื่อมกับ Operation Checklist Station</p></div>
        ${canEdit?`<div class="btn-grp">
          <button class="btn btn-out btn-sm" onclick="Pages.config_station_checklist._reset()">↻ รีเซ็ตค่า Default</button>
          <button class="btn btn-pri btn-sm" onclick="Pages.config_station_checklist._saveAll()">💾 บันทึกทั้งหมด</button>
        </div>`:''}
      </div>
      <div class="card">
        <div style="display:grid;grid-template-columns:260px 1fr;min-height:480px">
          <div style="background:var(--s-1,#0F1A2E);border-right:1px solid rgba(255,255,255,.08);padding:8px 0;overflow-y:auto;max-height:600px">
            ${stationsHtml}
            ${canEdit?`<div style="padding:10px 14px;margin-top:8px;border-top:1px solid rgba(255,255,255,.06)">
              <button onclick="Pages.config_station_checklist._addStation()" style="width:100%;padding:8px;background:rgba(110,231,183,.1);color:#6EE7B7;border:1px dashed rgba(110,231,183,.4);border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">+ เพิ่มจุดตรวจใหม่</button>
            </div>`:''}
          </div>
          <div style="padding:16px 18px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
              <div>
                <div style="font-size:14px;font-weight:600;color:#FFFFFF">${U.esc(cur.name)}</div>
                <div style="font-size:11px;color:#FFFFFF;opacity:.75;margin-top:2px">รหัสฟอร์ม: ${U.esc(cur.form_code||'-')} · ${cur.items.length} รายการ</div>
              </div>
              ${canEdit?`<div>
                <button class="btn btn-out btn-xs" onclick="Pages.config_station_checklist._editName()">✏️ แก้ไขชื่อ</button>
                ${Object.keys(this._draft).length>1?`<button class="btn btn-danger btn-xs" onclick="Pages.config_station_checklist._delStation()">🗑 ลบจุดตรวจ</button>`:''}
              </div>`:''}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.06)">
              <div><label style="display:block;font-size:11px;color:#FFFFFF;opacity:.85;margin-bottom:4px;font-weight:600">Key (ระบบ)</label>
                <input value="${U.esc(this._activeKey)}" readonly style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:'IBM Plex Mono',monospace;opacity:.7"/></div>
              <div><label style="display:block;font-size:11px;color:#FFFFFF;opacity:.85;margin-bottom:4px;font-weight:600">รหัสฟอร์ม</label>
                <input id="cfg_form_code" value="${U.esc(cur.form_code||'')}" ${!canEdit?'readonly':''} style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:inherit;font-weight:500"
                  onchange="Pages.config_station_checklist._captureFormCode()"/></div>
            </div>
            <div style="font-size:12px;color:#F0CD7F;font-weight:600;margin:12px 0 8px">📋 รายการอุปกรณ์</div>
            <table id="cfg_items_tbl" style="width:100%;font-size:11.5px;border-collapse:collapse">
              <thead><tr style="background:var(--s-2,#172236)">
                <th style="padding:7px 8px;text-align:left;color:#FFFFFF;font-weight:600;border-bottom:1px solid rgba(255,255,255,.1)">#</th>
                <th style="padding:7px 8px;text-align:left;color:#FFFFFF;font-weight:600;border-bottom:1px solid rgba(255,255,255,.1)">ชื่อรายการ</th>
                <th style="padding:7px 8px;text-align:center;color:#FFFFFF;font-weight:600;border-bottom:1px solid rgba(255,255,255,.1)">จำนวน Default</th>
                <th style="padding:7px 8px;text-align:left;color:#FFFFFF;font-weight:600;border-bottom:1px solid rgba(255,255,255,.1)">หน่วย</th>
                <th style="padding:7px 8px;border-bottom:1px solid rgba(255,255,255,.1)"></th>
              </tr></thead>
              <tbody>${itemsHtml||`<tr><td colspan="5" style="text-align:center;padding:20px;color:#FFFFFF;opacity:.6">ยังไม่มีรายการ — กดปุ่ม + เพิ่มรายการ ด้านล่าง</td></tr>`}</tbody>
            </table>
            ${canEdit?`<div onclick="Pages.config_station_checklist._addItem()" style="margin-top:8px;padding:8px;background:rgba(110,231,183,.08);color:#6EE7B7;border:1px dashed rgba(110,231,183,.35);border-radius:6px;text-align:center;cursor:pointer;font-size:11.5px;font-weight:500">+ เพิ่มรายการอุปกรณ์</div>`:''}
            <div class="ab" style="background:rgba(252,211,77,.08);border:1px solid rgba(252,211,77,.25);padding:10px 14px;border-radius:7px;font-size:12px;color:#FCD34D;margin-top:14px;line-height:1.5">
              <strong>⚠ หมายเหตุ:</strong> ข้อมูลที่แก้ไขจะมีผลกับ Project ใหม่ที่กรอก Checklist หลังจากนี้ — Project เก่าที่บันทึกแล้วยังคงข้อมูลเดิม
            </div>
          </div>
        </div>
      </div>`;
  },

  _captureCurrentTab(){
    // เก็บ input values ปัจจุบันลง draft
    const tbl = document.getElementById('cfg_items_tbl');
    if(!tbl || !this._draft[this._activeKey]) return;
    const cur = this._draft[this._activeKey];
    cur.items.forEach((it,idx)=>{
      const getVal = (f) => {
        const el = tbl.querySelector(`[data-idx="${idx}"][data-f="${f}"]`);
        return el ? el.value : it[f];
      };
      it.name = getVal('name');
      it.qty_default = getVal('qty_default');
      it.unit = getVal('unit');
    });
    const fc = document.getElementById('cfg_form_code');
    if(fc) cur.form_code = fc.value;
  },

  _captureFormCode(){
    const fc = document.getElementById('cfg_form_code');
    if(fc && this._draft[this._activeKey]) this._draft[this._activeKey].form_code = fc.value;
  },

  _select(key){
    this._captureCurrentTab();
    this._activeKey = key;
    this.render();
  },

  _addItem(){
    this._captureCurrentTab();
    if(!this._draft[this._activeKey]) return;
    this._draft[this._activeKey].items.push({no:'', name:'', qty_default:'', unit:''});
    this.render();
  },

  _delItem(idx){
    this._captureCurrentTab();
    if(!confirm('ลบรายการนี้?')) return;
    this._draft[this._activeKey].items.splice(idx,1);
    this.render();
  },

  _addStation(){
    this._captureCurrentTab();
    const name = prompt('ชื่อจุดตรวจใหม่ (ไทย):');
    if(!name || !name.trim()) return;
    let key = prompt('Key สำหรับระบบ (ภาษาอังกฤษ, ไม่มีช่องว่าง, เช่น "blood_test"):');
    if(!key || !key.trim()) return;
    key = key.trim().toLowerCase().replace(/[^a-z0-9_]/g,'_');
    if(this._draft[key]){ U.toast('Key นี้มีอยู่แล้ว','danger'); return; }
    const formCode = prompt('รหัสฟอร์ม (เช่น FM-MC-099):') || 'FM-MC-NEW';
    this._draft[key] = {name:name.trim(), form_code:formCode.trim(), items:[]};
    this._activeKey = key;
    this.render();
    U.toast('✅ เพิ่มจุดตรวจแล้ว — อย่าลืมบันทึก');
  },

  _delStation(){
    this._captureCurrentTab();
    const cur = this._draft[this._activeKey];
    if(!confirm(`ลบจุดตรวจ "${cur.name}" และรายการทั้งหมด ${cur.items.length} รายการ?`)) return;
    delete this._draft[this._activeKey];
    this._activeKey = Object.keys(this._draft)[0];
    this.render();
    U.toast('✅ ลบแล้ว — อย่าลืมบันทึก');
  },

  _editName(){
    this._captureCurrentTab();
    const cur = this._draft[this._activeKey];
    const newName = prompt('ชื่อจุดตรวจ:', cur.name);
    if(!newName || !newName.trim()) return;
    cur.name = newName.trim();
    this.render();
  },

  _saveAll(){
    this._captureCurrentTab();
    // ทำความสะอาด: ลบ items ที่ชื่อว่าง
    Object.values(this._draft).forEach(stn=>{
      stn.items = stn.items.filter(it=>(it.name||'').trim()!=='');
    });
    DB.station_checklist.saveTemplates(this._draft);
    U.toast('✅ บันทึก Checklist Station ทั้งหมดสำเร็จ');
  },

  _reset(){
    if(!confirm('รีเซ็ตเป็นค่า Default ทั้งหมด? ข้อมูลที่แก้ไขจะหายไป')) return;
    DB.station_checklist.resetTemplates();
    this._draft = JSON.parse(JSON.stringify(DB.STATION_CHECKLIST_DATA));
    this._activeKey = Object.keys(this._draft)[0];
    this.render();
    U.toast('↻ รีเซ็ตเป็น Default แล้ว');
  }
};


/* ═══════════════════════════════════════════════════════════
   Pages.staff — ตั้งค่ารายชื่อพนักงาน (Staff Directory)
   ═══════════════════════════════════════════════════════════ */
Pages.staff = {
  _search: '',
  async render(){
    const canEdit = DB.auth.can('edit','staff');
    const canDel = DB.auth.can('delete','staff');
    const canAdd = DB.auth.can('add','staff');
    let list = DB.staff.list();
    if(this._search){
      list = DB.staff.search(this._search);
    }
    list.sort((a,b)=>(a.employee_id||'').localeCompare(b.employee_id||''));

    const deptColor = (d)=>{
      const c = {'Medical':'rgba(56,189,248,.15)','Operation':'rgba(168,85,247,.15)','Sales':'rgba(110,231,183,.15)','Lab':'rgba(244,114,182,.15)','Medical Records':'rgba(252,211,77,.15)'}[d]||'rgba(255,255,255,.08)';
      const tc = {'Medical':'#7DD3FC','Operation':'#C4B5FD','Sales':'#6EE7B7','Lab':'#F9A8D4','Medical Records':'#FCD34D'}[d]||'#FFFFFF';
      return `<span style="background:${c};color:${tc};padding:2px 8px;border-radius:4px;font-size:10.5px;font-weight:600">${U.esc(d||'-')}</span>`;
    };

    const rows = list.map(s=>`<tr>
      <td><span style="font-family:'IBM Plex Mono',monospace;color:#F0CD7F;font-weight:600;font-size:11.5px">${U.esc(s.employee_id||'-')}</span></td>
      <td class="fw6">${U.esc(s.full_name||'-')}</td>
      <td>${U.esc(s.nickname||'-')}</td>
      <td>${deptColor(s.department)}</td>
      <td>${U.esc(s.position||'-')}</td>
      <td style="font-family:'IBM Plex Mono',monospace;font-size:11.5px">${U.esc(s.phone||'-')}</td>
      <td>${U.recordedByCell(s.recorded_by)}</td>
      <td style="white-space:nowrap">
        ${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.staff.edit(${s.id})">แก้ไข</button>`:''}
        ${canDel?`<button class="btn btn-danger btn-xs" onclick="Pages.staff.del(${s.id})">ลบ</button>`:''}
      </td>
    </tr>`).join('');

    document.getElementById('content').innerHTML=`
      <div class="ph">
        <div><h2>👤 ตั้งค่ารายชื่อพนักงาน</h2><p>จัดการรายชื่อพนักงานสำหรับใช้ในใบแจ้งงาน, ลายเซ็น และ Auto-search</p></div>
        ${canAdd?`<button class="btn btn-pri" onclick="Pages.staff.edit(null)">+ เพิ่มพนักงาน</button>`:''}
      </div>
      <div class="card">
        <div style="padding:12px 16px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <input id="stf_search" placeholder="🔍 ค้นหา รหัส, ชื่อ, ชื่อเล่น, แผนก, ตำแหน่ง..." value="${U.esc(this._search)}"
            style="max-width:380px;padding:7px 12px;border:1.5px solid rgba(255,255,255,.15);border-radius:8px;font-size:13px;font-family:'Sarabun',sans-serif;background:var(--s-3,#1D2B42);color:#FFFFFF;outline:none;flex:1"
            oninput="Pages.staff._search=this.value;clearTimeout(Pages.staff._t);Pages.staff._t=setTimeout(()=>Pages.staff.render(),200)"/>
          <span style="font-size:11.5px;color:#FFFFFF;opacity:.7">พบ ${list.length} คน</span>
        </div>
        <div class="tbl-wrap"><table>
          <thead><tr>
            <th>รหัสพนักงาน</th>
            <th>ชื่อ-สกุล</th>
            <th>ชื่อเล่น</th>
            <th>แผนก</th>
            <th>ตำแหน่ง</th>
            <th>เบอร์โทร</th>
            <th>ผู้บันทึก</th>
            <th></th>
          </tr></thead>
          <tbody>${rows||`<tr><td colspan="8" class="empty"><div class="icon">👤</div><p style="color:#FFFFFF;opacity:.7">ไม่พบรายชื่อ — เพิ่มพนักงานคนแรกได้เลย</p></td></tr>`}</tbody>
        </table></div>
      </div>`;
  },
  edit(id){
    const s = id ? (DB.staff.get(id)||{}) : {};
    const depts = ['Sales','Operation','Medical','Lab','Medical Records','Admin/HR','X-Ray','Billing','อื่นๆ'];
    Modal.open(`
      <div class="fr">
        <div class="fg"><label style="display:block;font-size:11px;color:#FFFFFF;opacity:.85;margin-bottom:4px;font-weight:600">รหัสพนักงาน *</label>
          <input id="stf_emp" value="${U.esc(s.employee_id||'')}" placeholder="EMP-001" style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:'IBM Plex Mono',monospace;font-weight:600"/></div>
        <div class="fg"><label style="display:block;font-size:11px;color:#FFFFFF;opacity:.85;margin-bottom:4px;font-weight:600">ชื่อเล่น</label>
          <input id="stf_nn" value="${U.esc(s.nickname||'')}" placeholder="ชื่อเล่น" style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:inherit;font-weight:500"/></div>
      </div>
      <div class="fg"><label style="display:block;font-size:11px;color:#FFFFFF;opacity:.85;margin-bottom:4px;font-weight:600">ชื่อ-สกุล *</label>
        <input id="stf_fn" value="${U.esc(s.full_name||'')}" placeholder="คำนำหน้า ชื่อ นามสกุล" style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:13px;font-family:inherit;font-weight:500"/></div>
      <div class="fr">
        <div class="fg"><label style="display:block;font-size:11px;color:#FFFFFF;opacity:.85;margin-bottom:4px;font-weight:600">แผนก</label>
          <select id="stf_dept" style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:inherit;font-weight:500">
            <option value="">-- เลือก --</option>
            ${depts.map(d=>`<option value="${d}" ${s.department===d?'selected':''}>${d}</option>`).join('')}
          </select></div>
        <div class="fg"><label style="display:block;font-size:11px;color:#FFFFFF;opacity:.85;margin-bottom:4px;font-weight:600">ตำแหน่ง</label>
          <input id="stf_pos" value="${U.esc(s.position||'')}" placeholder="เช่น พยาบาล, Director" style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:inherit;font-weight:500"/></div>
      </div>
      <div class="fg"><label style="display:block;font-size:11px;color:#FFFFFF;opacity:.85;margin-bottom:4px;font-weight:600">เบอร์โทร</label>
        <input id="stf_phone" value="${U.esc(s.phone||'')}" placeholder="08x-xxx-xxxx" style="width:100%;padding:7px 10px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:12px;font-family:'IBM Plex Mono',monospace;font-weight:500"/></div>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)">${U.recordedByField(s.recorded_by||'','stf_rb')}</div>
    `, id?`✏️ แก้ไขพนักงาน — ${U.esc(s.employee_id||'')}`:'+ เพิ่มพนักงานใหม่', ()=>{
      const emp = document.getElementById('stf_emp').value.trim();
      const fn = document.getElementById('stf_fn').value.trim();
      if(!emp) return U.toast('กรุณาใส่รหัสพนักงาน','danger');
      if(!fn) return U.toast('กรุณาใส่ชื่อ-สกุล','danger');
      // Check duplicate emp_id
      const dup = DB.staff.list().find(x=>x.employee_id===emp && x.id !== (id||0));
      if(dup) return U.toast(`รหัสพนักงาน ${emp} ซ้ำกับ ${dup.full_name}`,'danger');
      DB.staff.save({
        id: id||undefined,
        employee_id: emp,
        full_name: fn,
        nickname: document.getElementById('stf_nn').value.trim(),
        department: document.getElementById('stf_dept').value,
        position: document.getElementById('stf_pos').value.trim(),
        phone: document.getElementById('stf_phone').value.trim(),
        _override_recorded_by: U.recordedByValue('stf_rb')||undefined
      });
      Modal.close();
      this.render();
      U.toast(id?'✅ อัปเดตแล้ว':'✅ เพิ่มพนักงานแล้ว');
    });
  },
  del(id){
    const s = DB.staff.get(id);
    if(!s) return;
    if(!confirm(`ลบพนักงาน "${s.full_name}" (${s.employee_id})?`)) return;
    DB.staff.remove(id);
    this.render();
    U.toast('✅ ลบแล้ว');
  }
};


/* ═══════════════════════════════════════════════════════════
   Pages.parttime — Part-Time Registrations (จาก RegisterPT.html)
   New schema matching Google Forms (9 fields + 3 file uploads)
   ═══════════════════════════════════════════════════════════ */
Pages.parttime = {
  _search: '',
  _filter: 'all',
  async render(){
    const canEdit = DB.auth.can('edit','parttime');
    const canDel = DB.auth.can('delete','parttime');
    let list = DB.parttime.list();
    if(this._search) list = DB.parttime.search(this._search);
    if(this._filter !== 'all') list = list.filter(r=>r.status===this._filter);
    list.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));

    const statusBadge = (s)=>{
      const cfg = {
        pending: {bg:'rgba(252,211,77,.15)', c:'#FCD34D', lbl:'⏳ รอพิจารณา'},
        approved: {bg:'rgba(110,231,183,.18)', c:'#6EE7B7', lbl:'✓ อนุมัติแล้ว'},
        rejected: {bg:'rgba(252,165,165,.18)', c:'#FCA5A5', lbl:'✗ ปฏิเสธ'},
        contacted: {bg:'rgba(56,189,248,.15)', c:'#7DD3FC', lbl:'📞 ติดต่อแล้ว'}
      }[s||'pending']||{bg:'rgba(255,255,255,.06)',c:'#FFFFFF',lbl:s||'-'};
      return `<span style="background:${cfg.bg};color:${cfg.c};padding:2px 8px;border-radius:4px;font-size:10.5px;font-weight:700;white-space:nowrap">${cfg.lbl}</span>`;
    };
    // สถานะงาน (work_status): Active/Give a chance/Blacklist — แสดงเฉพาะรายที่ approved
    // ★ Inline editable <select> styled as badge (กดคลิกเลือกได้ทันที)
    const workStatusBadge = (r)=>{
      if(r.status !== 'approved') return '<span style="color:#FFFFFF;opacity:.35">—</span>';
      if(!canEdit){
        // ดู-อย่างเดียว: span badge เหมือนเดิม
        const ws = r.work_status || 'Active';
        const cfg = {
          Active:           {bg:'rgba(110,231,183,.18)', c:'#6EE7B7', lbl:'● Active'},
          'Give a chance':  {bg:'rgba(252,211,77,.15)',  c:'#FCD34D', lbl:'⚠ Give a chance'},
          Blacklist:        {bg:'rgba(252,165,165,.18)', c:'#FCA5A5', lbl:'⛔ Blacklist'}
        }[ws] || {bg:'rgba(255,255,255,.06)', c:'#FFFFFF', lbl:ws};
        return `<span style="background:${cfg.bg};color:${cfg.c};padding:2px 8px;border-radius:4px;font-size:10.5px;font-weight:700;white-space:nowrap">${cfg.lbl}</span>`;
      }
      // canEdit: <select> styled as badge
      const ws = r.work_status || 'Active';
      const cfg = {
        Active:           {bg:'rgba(110,231,183,.18)', c:'#6EE7B7'},
        'Give a chance':  {bg:'rgba(252,211,77,.15)',  c:'#FCD34D'},
        Blacklist:        {bg:'rgba(252,165,165,.18)', c:'#FCA5A5'}
      }[ws] || {bg:'rgba(255,255,255,.06)', c:'#FFFFFF'};
      return `<select onchange="Pages.parttime.updateWorkStatus(${r.id}, this.value)" title="คลิกเปลี่ยนสถานะงาน"
        style="background:${cfg.bg};color:${cfg.c};padding:3px 22px 3px 8px;border-radius:4px;font-size:10.5px;font-weight:700;font-family:inherit;border:1px solid ${cfg.c}55;cursor:pointer;outline:none;appearance:none;-webkit-appearance:none;background-image:url('data:image/svg+xml;utf8,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;8&quot; height=&quot;5&quot; viewBox=&quot;0 0 8 5&quot;><path fill=&quot;${encodeURIComponent(cfg.c)}&quot; d=&quot;M4 5L0 0h8z&quot;/></svg>');background-repeat:no-repeat;background-position:right 6px center;background-size:8px 5px">
        <option value="Active"           ${ws==='Active'?'selected':''}           style="background:#162338;color:#6EE7B7">● Active</option>
        <option value="Give a chance"    ${ws==='Give a chance'?'selected':''}    style="background:#162338;color:#FCD34D">⚠ Give a chance</option>
        <option value="Blacklist"        ${ws==='Blacklist'?'selected':''}        style="background:#162338;color:#FCA5A5">⛔ Blacklist</option>
      </select>`;
    };
    const docBadge = (d) => d ? `<span title="${U.esc(d.name)}" style="font-size:11px;color:#6EE7B7">✅</span>` : '<span style="font-size:11px;color:#FCA5A5">—</span>';

    const rows = list.map(r=>`<tr>
      <td><span style="font-family:'IBM Plex Mono',monospace;color:#F0CD7F;font-weight:600;font-size:11.5px">PT-${String(r.id).padStart(3,'0')}</span></td>
      <td class="fw6">${U.esc(r.full_name||'-')}</td>
      <td><span style="font-size:11.5px">${U.esc(r.position||'-')}</span></td>
      <td style="font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:#7DD3FC">${U.esc(r.phone||'-')}</td>
      <td style="font-family:'IBM Plex Mono',monospace;font-size:11.5px">${U.esc(r.car_plate||'-')}</td>
      <td style="text-align:center" title="ใบประกอบวิชาชีพ">${docBadge(r.doc_license)}</td>
      <td style="text-align:center" title="บัตรประชาชน">${docBadge(r.doc_id_card)}</td>
      <td style="text-align:center" title="หน้าบัญชีธนาคาร">${docBadge(r.doc_bank_account)}</td>
      <td>${statusBadge(r.status)}</td>
      <td>${workStatusBadge(r)}</td>
      <td style="font-size:11px;color:#FFFFFF;opacity:.7">${U.fmtD(r.created_at)}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-out btn-xs" onclick="Pages.parttime.view(${r.id})">ดู</button>
        ${canEdit && r.status==='pending' ? `<button class="btn btn-pri btn-xs" onclick="Pages.parttime.approve(${r.id})" title="อนุมัติ → เพิ่มเข้า Staff Directory">✓ อนุมัติ</button>` : ''}
        ${canDel?`<button class="btn btn-danger btn-xs" onclick="Pages.parttime.del(${r.id})">ลบ</button>`:''}
      </td>
    </tr>`).join('');

    const all = DB.parttime.list();
    const counts = {
      all: all.length,
      pending: all.filter(r=>r.status==='pending').length,
      approved: all.filter(r=>r.status==='approved').length,
      rejected: all.filter(r=>r.status==='rejected').length
    };
    const filterBtn = (key, label)=>{
      const active = this._filter===key;
      return `<button onclick="Pages.parttime._filter='${key}';Pages.parttime.render()" class="btn ${active?'btn-pri':'btn-out'} btn-sm" style="margin-right:5px">${label} <span style="background:${active?'rgba(0,0,0,.2)':'rgba(255,255,255,.1)'};padding:1px 6px;border-radius:9px;font-size:10.5px;margin-left:3px">${counts[key]||0}</span></button>`;
    };

    document.getElementById('content').innerHTML=`
      <div class="ph">
        <div><h2>⏰ Part-Time — ใบสมัคร</h2><p>ใบสมัครจาก <code style="background:rgba(240,205,127,.12);color:#F0CD7F;padding:1px 6px;border-radius:3px;font-family:'IBM Plex Mono',monospace;font-size:11px">RegisterPT.html</code> · เชื่อมข้อมูลกับ Database โดยตรง</p></div>
        <div style="display:flex;gap:8px;align-items:center">
          <a href="RegisterPT.html" target="_blank" class="btn btn-out btn-sm" title="เปิดฟอร์มลงทะเบียน">📋 เปิดฟอร์ม</a>
          <span style="font-size:11px;color:#FFFFFF;opacity:.65">→ ส่งลิงก์ให้ผู้สมัคร</span>
        </div>
      </div>
      <div class="card">
        <div style="padding:12px 16px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <input id="pt_search" placeholder="🔍 ค้นหา ชื่อ/เบอร์/ทะเบียนรถ/ตำแหน่ง/อีเมล..." value="${U.esc(this._search)}"
            style="max-width:380px;padding:7px 12px;border:1.5px solid rgba(255,255,255,.15);border-radius:8px;font-size:13px;font-family:'Sarabun',sans-serif;background:var(--s-3,#1D2B42);color:#FFFFFF;outline:none;flex:1;min-width:200px"
            oninput="Pages.parttime._search=this.value;clearTimeout(Pages.parttime._t);Pages.parttime._t=setTimeout(()=>Pages.parttime.render(),200)"/>
        </div>
        <div style="padding:9px 16px 12px;border-bottom:1px solid rgba(255,255,255,.06)">
          ${filterBtn('all','ทั้งหมด')}
          ${filterBtn('pending','รอพิจารณา')}
          ${filterBtn('approved','อนุมัติแล้ว')}
          ${filterBtn('rejected','ปฏิเสธ')}
        </div>
        <div class="tbl-wrap"><table>
          <thead><tr>
            <th>รหัส</th>
            <th>ชื่อ-นามสกุล</th>
            <th>ตำแหน่ง</th>
            <th>เบอร์โทร</th>
            <th>ทะเบียนรถ</th>
            <th style="text-align:center;font-size:10.5px;min-width:75px" title="เอกสารใบประกอบวิชาชีพ">ใบประกอบ</th>
            <th style="text-align:center;font-size:10.5px;min-width:75px" title="เอกสารบัตรประชาชน">บัตร ปชช.</th>
            <th style="text-align:center;font-size:10.5px;min-width:80px" title="เอกสารหน้าบัญชีธนาคาร">หน้าบัญชี ธ.</th>
            <th>สถานะ</th>
            <th style="background:rgba(110,231,183,.06);color:#6EE7B7">สถานะงาน</th>
            <th>วันที่สมัคร</th>
            <th></th>
          </tr></thead>
          <tbody>${rows||`<tr><td colspan="12" class="empty"><div class="icon">⏰</div><p style="color:#FFFFFF;opacity:.7">ยังไม่มีใบสมัคร — ส่งลิงก์ <code>RegisterPT.html</code> ให้ผู้สมัคร</p></td></tr>`}</tbody>
        </table></div>
      </div>`;
  },

  view(id){
    const r = DB.parttime.get(id);
    if(!r){U.toast('ไม่พบใบสมัคร','danger');return;}
    const fmt = (lbl, val) => `<div style="display:flex;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04)"><span style="min-width:200px;color:#FFFFFF;opacity:.75;font-size:11.5px;font-weight:500">${lbl}</span><span style="flex:1;font-size:13px;font-weight:500">${val||'-'}</span></div>`;
    const sec = (title, body) => `<div style="margin-bottom:14px"><div style="font-size:11px;color:#F0CD7F;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px;font-family:'IBM Plex Mono',monospace">${title}</div>${body}</div>`;

    // Document display with download + preview
    const docDisplay = (d, lbl) => {
      if(!d) return `<div style="background:rgba(252,165,165,.08);border:1px solid rgba(252,165,165,.25);padding:8px 12px;border-radius:6px;color:#FCA5A5;font-size:11.5px;margin-bottom:7px">⚠ ไม่ได้แนบเอกสาร: ${lbl}</div>`;
      const isImg = (d.type||'').startsWith('image/');
      return `<div style="background:var(--s-2,#162338);padding:10px 13px;border-radius:7px;margin-bottom:7px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${isImg?'7px':'0'}">
          <div style="font-size:12px;font-weight:600;color:#FFFFFF">📎 ${U.esc(d.name)}</div>
          <div style="display:flex;gap:6px">
            <span style="font-size:10.5px;color:#FFFFFF;opacity:.65">${(d.size/1024/1024).toFixed(2)} MB</span>
            <a href="${d.data}" download="${U.esc(d.name)}" class="btn btn-out btn-xs">💾 ดาวน์โหลด</a>
          </div>
        </div>
        ${isImg?`<img src="${d.data}" style="max-width:100%;max-height:280px;border-radius:5px;border:1px solid rgba(255,255,255,.1);display:block;margin:0 auto"/>`:''}
        ${!isImg && (d.type||'').includes('pdf')?`<a href="${d.data}" target="_blank" class="btn btn-out btn-xs" style="margin-top:4px">📄 เปิด PDF</a>`:''}
      </div>`;
    };

    Modal.open(`
      ${sec('ข้อมูลผู้สมัคร',
        fmt('อีเมล', `<span style="font-family:'IBM Plex Mono',monospace;color:#7DD3FC">${U.esc(r.email)}</span>`) +
        fmt('1. ชื่อ - นามสกุล', `<strong>${U.esc(r.full_name)}</strong>`) +
        fmt('2. เบอร์โทรศัพท์', `<span style="font-family:'IBM Plex Mono',monospace;color:#7DD3FC">${U.esc(r.phone)}</span>`) +
        fmt('3. ป้ายทะเบียนรถ', `<span style="font-family:'IBM Plex Mono',monospace">${U.esc(r.car_plate)}</span>`) +
        fmt('6. ตำแหน่ง', `<span style="color:#F0CD7F;font-weight:600">${U.esc(r.position)}</span>`))}

      ${sec('หนังสือรับรองหักภาษี ณ ที่จ่าย',
        fmt('4. Email สำหรับจัดส่ง', `<span style="font-family:'IBM Plex Mono',monospace;color:#7DD3FC">${U.esc(r.tax_email)}</span>`) +
        fmt('5. ที่อยู่จัดส่ง', `<span style="white-space:pre-wrap">${U.esc(r.tax_address)}</span>`))}

      ${sec('เอกสารแนบ',
        '<div style="font-size:11.5px;color:#FFFFFF;opacity:.85;margin-bottom:9px;font-weight:600">7. ใบประกอบวิชาชีพ</div>' + docDisplay(r.doc_license, 'ใบประกอบวิชาชีพ') +
        '<div style="font-size:11.5px;color:#FFFFFF;opacity:.85;margin:11px 0 9px;font-weight:600">8. บัตรประชาชน</div>' + docDisplay(r.doc_id_card, 'บัตรประชาชน') +
        '<div style="font-size:11.5px;color:#FFFFFF;opacity:.85;margin:11px 0 9px;font-weight:600">9. หน้าบัญชีธนาคาร</div>' + docDisplay(r.doc_bank_account, 'หน้าบัญชีธนาคาร'))}

      <div style="background:var(--s-2,#162338);padding:10px 13px;border-radius:7px;margin-top:12px;font-size:11.5px;color:#FFFFFF;opacity:.75">
        วันที่สมัคร: ${U.fmtD(r.created_at)} · บันทึกโดย: ${U.esc(r.recorded_by||'-')}
      </div>
    `, `📋 ใบสมัคร PT-${String(r.id).padStart(3,'0')} — ${U.esc(r.full_name)}`, ()=>{
      Modal.close();
      this._changeStatus(id);
    }, true);
  },

  _changeStatus(id){
    const r = DB.parttime.get(id);
    if(!r) return;
    const opts = [
      {v:'pending', l:'⏳ รอพิจารณา'},
      {v:'contacted', l:'📞 ติดต่อแล้ว'},
      {v:'approved', l:'✓ อนุมัติ (สร้าง Staff)'},
      {v:'rejected', l:'✗ ปฏิเสธ'}
    ];
    Modal.open(`
      <div style="margin-bottom:11px;font-size:13px">เปลี่ยนสถานะของ <strong>${U.esc(r.full_name)}</strong></div>
      <div class="fg"><label style="font-size:11px;color:#FFFFFF;margin-bottom:5px;font-weight:600;display:block">สถานะใบสมัคร</label>
      <select id="pt_status" style="width:100%;padding:8px 11px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-size:13px;font-family:inherit">
        ${opts.map(o=>`<option value="${o.v}" ${r.status===o.v?'selected':''}>${o.l}</option>`).join('')}
      </select></div>
      ${(r.status==='approved' || r.status === undefined) ? `<div class="fg"><label style="font-size:11px;color:#6EE7B7;margin-bottom:5px;font-weight:600;display:block">สถานะงาน</label>
      <select id="pt_work_status" style="width:100%;padding:8px 11px;background:var(--s-3,#1D2B42);border:1px solid rgba(110,231,183,.3);border-radius:5px;color:#FFFFFF;font-size:13px;font-family:inherit">
        <option value="Active" ${(r.work_status||'Active')==='Active'?'selected':''}>● Active — ใช้งานได้ปกติ</option>
        <option value="Give a chance" ${r.work_status==='Give a chance'?'selected':''}>⚠ Give a chance — ให้โอกาส (เฝ้าระวัง)</option>
        <option value="Blacklist" ${r.work_status==='Blacklist'?'selected':''}>⛔ Blacklist — ห้ามจ้างต่อ</option>
      </select>
      <div style="font-size:10.5px;color:#FFFFFF;opacity:.6;margin-top:3px;font-weight:400">เลือก Give a chance ถ้ามีข้อสังเกตแต่ยังให้โอกาส · Blacklist หากต้องการห้ามจ้างต่อ</div></div>` : ''}
      <div class="fg"><label style="font-size:11px;color:#FFFFFF;margin-bottom:5px;font-weight:600;display:block">เหตุผล / หมายเหตุ</label>
      <textarea id="pt_reason" style="width:100%;min-height:60px;padding:8px 11px;background:var(--s-3,#1D2B42);border:1px solid rgba(255,255,255,.18);border-radius:5px;color:#FFFFFF;font-family:inherit;font-size:12.5px;resize:vertical">${U.esc(r.status_note||'')}</textarea></div>
    `, 'เปลี่ยนสถานะ', ()=>{
      const newStatus = document.getElementById('pt_status').value;
      const reason = document.getElementById('pt_reason').value.trim();
      const wsEl = document.getElementById('pt_work_status');
      const workStatus = wsEl ? wsEl.value : (r.work_status||'Active');
      if(newStatus==='approved' && r.status !== 'approved'){
        // First-time approve → create Staff entry
        const newStaff = DB.parttime.approveAsStaff(id);
        DB.parttime.save({...r, status:'approved', status_note:reason, work_status: workStatus});
        Modal.close();
        this.render();
        if(typeof updateNavBadges==='function') updateNavBadges();
        U.toast(`✅ อนุมัติแล้ว — เพิ่มเข้า Staff Directory (${newStaff.employee_id})`);
      } else {
        DB.parttime.save({...r, status:newStatus, status_note:reason, work_status: workStatus});
        Modal.close();
        this.render();
        if(typeof updateNavBadges==='function') updateNavBadges();
        U.toast(
          workStatus==='Blacklist' ? '⛔ ตั้งเป็น Blacklist แล้ว' :
          workStatus==='Give a chance' ? '⚠ ตั้งเป็น Give a chance แล้ว' :
          '✅ อัปเดตสถานะแล้ว'
        );
      }
    });
  },

  approve(id){
    if(!confirm('อนุมัติใบสมัครนี้และเพิ่มเข้า Staff Directory?')) return;
    const newStaff = DB.parttime.approveAsStaff(id);
    if(newStaff){
      this.render();
      if(typeof updateNavBadges==='function') updateNavBadges();
      U.toast(`✅ อนุมัติแล้ว — Employee ID: ${newStaff.employee_id}`);
    } else {
      U.toast('❌ อนุมัติไม่สำเร็จ','danger');
    }
  },

  del(id){
    const r = DB.parttime.get(id);
    if(!r) return;
    if(!confirm(`ลบใบสมัครของ "${r.full_name}"?`)) return;
    DB.parttime.remove(id);
    this.render();
    if(typeof updateNavBadges==='function') updateNavBadges();
    U.toast('✅ ลบแล้ว');
  },

  // ★ Inline update work_status (Active/Give a chance/Blacklist) จาก dropdown ในตาราง
  updateWorkStatus(id, newValue){
    const r = DB.parttime.get(id);
    if(!r) return;
    if(r.status !== 'approved'){
      U.toast('แก้สถานะงานได้เฉพาะรายที่ "อนุมัติ" แล้ว','warning');
      this.render();
      return;
    }
    if(['Active','Give a chance','Blacklist'].indexOf(newValue) < 0){
      U.toast('ค่าไม่ถูกต้อง','danger');
      return;
    }
    DB.parttime.save({...r, work_status: newValue});
    this.render();
    const toastMsg = newValue==='Blacklist' ? '⛔ ตั้งเป็น Blacklist แล้ว'
                   : newValue==='Give a chance' ? '⚠ ตั้งเป็น Give a chance แล้ว'
                   : '✅ ตั้งเป็น Active แล้ว';
    U.toast(toastMsg);
  },

  // ═══ รายงานประวัติ Part-Time — งานที่เคยร่วม ═══
  openHistoryReport(){
    const allPT = DB.parttime.list();
    if(allPT.length === 0){
      U.toast('ยังไม่มีรายชื่อ Part-Time','warning');
      return;
    }
    // Build PT → JO mapping by matching staff_name in stations
    const ptHistory = allPT.map(pt => {
      const found = []; // [{joid, jo, station, day_no, ...}]
      DB.operation.listJobOrders().forEach(jo => {
        const stations = DB.operation.listStations(jo.id);
        stations.forEach(st => {
          const staffList = st.staff_list || [];
          let matched = false;
          staffList.forEach(p => {
            // Match by full_name (case-insensitive) + staff_type='Part-time' as supporting hint
            if(p.staff_name && p.staff_name.trim() === pt.full_name.trim()){
              matched = true;
            }
          });
          // Also check legacy single-staff field
          if(!matched && st.staff_name && st.staff_name.trim() === pt.full_name.trim()){
            matched = true;
          }
          if(matched){
            found.push({
              joid: jo.id,
              project_id: jo.project_id,
              onsite_date: jo.onsite_date,
              day_no: jo.day_no || 0,
              station_code: st.station_code,
              station_name: st.station_name,
              company_name: jo.company_name,
              project_code: (DB.sales.getProject(jo.project_id)?.project_code) || ''
            });
          }
        });
      });
      return {pt, jobs: found};
    });
    // Sort: PTs with jobs first, by count desc; then by name
    ptHistory.sort((a,b)=>{
      if(b.jobs.length !== a.jobs.length) return b.jobs.length - a.jobs.length;
      return (a.pt.full_name||'').localeCompare(b.pt.full_name||'', 'th');
    });

    const workStatusBadge = (r)=>{
      if(r.status !== 'approved') return '';
      const ws = r.work_status || 'Active';
      if(ws === 'Blacklist'){
        return '<span style="background:rgba(252,165,165,.18);color:#FCA5A5;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">⛔ Blacklist</span>';
      }
      if(ws === 'Give a chance'){
        return '<span style="background:rgba(252,211,77,.15);color:#FCD34D;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">⚠ Give a chance</span>';
      }
      return '<span style="background:rgba(110,231,183,.18);color:#6EE7B7;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">● Active</span>';
    };

    // Render PT rows
    const rows = ptHistory.map(({pt, jobs}) => {
      const jobsHtml = jobs.length === 0
        ? '<div style="font-size:11px;color:#FFFFFF;opacity:.45;font-style:italic;margin-top:5px">— ยังไม่เคยร่วมงาน —</div>'
        : `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:7px">${jobs.map(j=>`
            <span title="${U.esc(j.station_code)} ${U.esc(j.station_name||'')}" style="font-size:10.5px;background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.3);color:#7DD3FC;padding:3px 9px;border-radius:5px;font-family:'IBM Plex Mono',monospace;display:inline-flex;align-items:center;gap:5px">
              <strong>${U.esc(j.project_code||'JO-'+j.joid)}</strong>
              ${j.day_no>0?`<span style="background:rgba(240,205,127,.2);color:#F0CD7F;padding:0 5px;border-radius:3px;font-size:9px">วันที่ ${j.day_no}</span>`:''}
              <span style="opacity:.75;font-size:9.5px">${U.fmtD(j.onsite_date)}</span>
            </span>`).join('')}</div>`;
      const jobCount = jobs.length > 0
        ? `<span style="background:linear-gradient(180deg,#F0CD7F,#D4A845);color:#1A1A1A;font-size:10px;font-weight:700;padding:2px 8px;border-radius:9px;font-family:'IBM Plex Mono',monospace;margin-left:8px">${jobs.length} ใบ</span>`
        : '';
      const wsBadge = workStatusBadge(pt);
      const wsBadgeHtml = wsBadge ? `<span style="margin-left:8px">${wsBadge}</span>` : '';
      const statusBadge = pt.status==='pending'
        ? '<span style="background:rgba(252,211,77,.15);color:#FCD34D;padding:1px 7px;border-radius:4px;font-size:9.5px;font-weight:700;margin-left:8px">⏳ รอพิจารณา</span>'
        : pt.status==='rejected'
        ? '<span style="background:rgba(252,165,165,.18);color:#FCA5A5;padding:1px 7px;border-radius:4px;font-size:9.5px;font-weight:700;margin-left:8px">✗ ปฏิเสธ</span>'
        : '';
      return `<div style="padding:11px 0;border-bottom:1px solid rgba(255,255,255,.06)">
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:3px">
          <span style="font-family:'IBM Plex Mono',monospace;color:#F0CD7F;background:rgba(240,205,127,.12);padding:2px 8px;border-radius:4px;font-size:10.5px;font-weight:700">PT-${String(pt.id).padStart(3,'0')}</span>
          <span style="font-size:13px;font-weight:700;margin-left:8px">${U.esc(pt.full_name)}</span>
          <span style="font-size:11px;color:#FFFFFF;opacity:.65;margin-left:6px">${U.esc(pt.position||'')}</span>
          ${jobCount}
          ${wsBadgeHtml}
          ${statusBadge}
        </div>
        ${jobsHtml}
      </div>`;
    }).join('');

    // Summary stats
    const totalPT = allPT.length;
    const approvedPT = allPT.filter(p=>p.status==='approved').length;
    const blacklistPT = allPT.filter(p=>p.work_status==='Blacklist').length;
    const ptWithJobs = ptHistory.filter(x=>x.jobs.length>0).length;

    Modal.open(`
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:14px">
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);padding:9px;border-radius:7px;text-align:center">
          <div style="font-size:18px;font-weight:700;color:#FFFFFF">${totalPT}</div>
          <div style="font-size:10px;color:#FFFFFF;opacity:.7;font-weight:600;text-transform:uppercase;letter-spacing:.5px;font-family:'IBM Plex Mono',monospace">รวม PT</div>
        </div>
        <div style="background:rgba(110,231,183,.06);border:1px solid rgba(110,231,183,.3);padding:9px;border-radius:7px;text-align:center">
          <div style="font-size:18px;font-weight:700;color:#6EE7B7">${approvedPT}</div>
          <div style="font-size:10px;color:#6EE7B7;opacity:.85;font-weight:600;text-transform:uppercase;letter-spacing:.5px;font-family:'IBM Plex Mono',monospace">อนุมัติแล้ว</div>
        </div>
        <div style="background:rgba(56,189,248,.06);border:1px solid rgba(56,189,248,.3);padding:9px;border-radius:7px;text-align:center">
          <div style="font-size:18px;font-weight:700;color:#7DD3FC">${ptWithJobs}</div>
          <div style="font-size:10px;color:#7DD3FC;opacity:.85;font-weight:600;text-transform:uppercase;letter-spacing:.5px;font-family:'IBM Plex Mono',monospace">เคยร่วมงาน</div>
        </div>
        <div style="background:rgba(252,165,165,.06);border:1px solid rgba(252,165,165,.3);padding:9px;border-radius:7px;text-align:center">
          <div style="font-size:18px;font-weight:700;color:#FCA5A5">${blacklistPT}</div>
          <div style="font-size:10px;color:#FCA5A5;opacity:.85;font-weight:600;text-transform:uppercase;letter-spacing:.5px;font-family:'IBM Plex Mono',monospace">Blacklist</div>
        </div>
      </div>
      <div style="background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:0 14px;max-height:55vh;overflow-y:auto">
        ${rows || '<div style="padding:30px;text-align:center;color:#FFFFFF;opacity:.6">ไม่มีข้อมูล</div>'}
      </div>
      <div style="font-size:10.5px;color:#FFFFFF;opacity:.55;margin-top:10px;text-align:center;font-style:italic">
        ค้นจากชื่อ-สกุล ใน Stations ของทุกใบแจ้งงาน (matching exact name)
      </div>
    `, '📊 รายงานประวัติ Part-Time — งานที่เคยร่วม', null, false);
  }
};


/* ═══════════════════════════════════════════════════════════
   Pages.parttime_history — รายงานประวัติ PT (separate nav page)
   ═══════════════════════════════════════════════════════════ */
Pages.parttime_history = {
  _search: '',
  _filter: 'all',
  async render(){
    const allPT = DB.parttime.list();
    const mp = DB.manpowerCost.list();
    const ptHistory = allPT.map(pt => {
      const found = [];
      DB.operation.listJobOrders().forEach(jo => {
        const stations = DB.operation.listStations(jo.id);
        stations.forEach(st => {
          const staffList = st.staff_list || [];
          // หา person ที่ตรงชื่อ PT — เพื่อดึง wage จริง
          let matchedPersons = staffList.filter(p => p.staff_name && p.staff_name.trim() === pt.full_name.trim());
          // Legacy fallback
          if(matchedPersons.length === 0 && st.staff_name && st.staff_name.trim() === pt.full_name.trim()){
            matchedPersons = [{
              profession: st.profession,
              staff_name: st.staff_name,
              staff_type: st.staff_type,
              wage_per_day: st.wage_per_day,
              phone: st.phone
            }];
          }
          matchedPersons.forEach(p => {
            // หา wage — ใช้ wage_per_day จาก person ก่อน · fallback manpower config
            let wage = p.wage_per_day;
            if(wage===undefined||wage===null||wage===''){
              const r = mp.find(m=>m.role===p.profession);
              wage = r?r.cost_per_day:0;
            }
            wage = parseFloat(wage)||0;
            found.push({
              joid: jo.id,
              project_id: jo.project_id,
              onsite_date: jo.onsite_date,
              day_no: jo.day_no || 0,
              station_code: st.station_code,
              station_name: st.station_name,
              company_name: jo.company_name,
              project_code: (DB.sales.getProject(jo.project_id)?.project_code) || '',
              profession: p.profession||'-',
              staff_type: p.staff_type||'-',
              wage: wage
            });
          });
        });
      });
      // คำนวณยอดรวมที่จ้าง PT คนนี้
      const totalWage = found.reduce((s,j)=>s+(j.wage||0), 0);
      return {pt, jobs: found, totalWage};
    });

    let filtered = ptHistory;
    if(this._search){
      const q = this._search.toLowerCase().trim();
      filtered = filtered.filter(({pt, jobs})=>{
        if((pt.full_name||'').toLowerCase().includes(q)) return true;
        if((pt.phone||'').toLowerCase().includes(q)) return true;
        if((pt.position||'').toLowerCase().includes(q)) return true;
        if(jobs.some(j=>(j.project_code||'').toLowerCase().includes(q) || (j.company_name||'').toLowerCase().includes(q))) return true;
        return false;
      });
    }

    if(this._filter === 'active') filtered = filtered.filter(x=>x.pt.status==='approved' && (x.pt.work_status||'Active')==='Active');
    else if(this._filter === 'give') filtered = filtered.filter(x=>x.pt.status==='approved' && x.pt.work_status==='Give a chance');
    else if(this._filter === 'blacklist') filtered = filtered.filter(x=>x.pt.status==='approved' && x.pt.work_status==='Blacklist');
    else if(this._filter === 'with_jobs') filtered = filtered.filter(x=>x.jobs.length>0);
    else if(this._filter === 'no_jobs') filtered = filtered.filter(x=>x.jobs.length===0);

    filtered.sort((a,b)=>{
      if(b.jobs.length !== a.jobs.length) return b.jobs.length - a.jobs.length;
      return (a.pt.full_name||'').localeCompare(b.pt.full_name||'', 'th');
    });

    const workStatusBadge = (r)=>{
      if(r.status !== 'approved') {
        if(r.status === 'pending') return '<span style="background:rgba(252,211,77,.15);color:#FCD34D;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">⏳ รอพิจารณา</span>';
        if(r.status === 'rejected') return '<span style="background:rgba(252,165,165,.18);color:#FCA5A5;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">✗ ปฏิเสธ</span>';
        return '<span style="opacity:.5">—</span>';
      }
      const ws = r.work_status || 'Active';
      if(ws === 'Blacklist') return '<span style="background:rgba(252,165,165,.18);color:#FCA5A5;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">⛔ Blacklist</span>';
      if(ws === 'Give a chance') return '<span style="background:rgba(252,211,77,.15);color:#FCD34D;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">⚠ Give a chance</span>';
      return '<span style="background:rgba(110,231,183,.18);color:#6EE7B7;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">● Active</span>';
    };

    const cards = filtered.map(({pt, jobs, totalWage}) => {
      const jobsHtml = jobs.length === 0
        ? '<div style="font-size:11.5px;color:#FFFFFF;opacity:.45;font-style:italic;margin-top:7px;padding:6px 12px;background:rgba(255,255,255,.02);border-radius:6px">— ยังไม่เคยร่วมงาน —</div>'
        : `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:9px">${jobs.map((j,idx)=>`
            <span onclick="Pages.parttime_history.openJobDetail(${pt.id},${idx})" title="${U.esc(j.station_code)} ${U.esc(j.station_name||'')} — คลิกดูรายละเอียด" style="font-size:11px;background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.3);color:#7DD3FC;padding:4px 10px;border-radius:5px;font-family:'IBM Plex Mono',monospace;display:inline-flex;align-items:center;gap:6px;cursor:pointer;transition:all .15s" onmouseover="this.style.background='rgba(56,189,248,.18)';this.style.borderColor='rgba(56,189,248,.6)'" onmouseout="this.style.background='rgba(56,189,248,.08)';this.style.borderColor='rgba(56,189,248,.3)'">
              <strong>${U.esc(j.project_code||'JO-'+j.joid)}</strong>
              ${j.day_no>0?`<span style="background:rgba(240,205,127,.2);color:#F0CD7F;padding:0 6px;border-radius:3px;font-size:9.5px">วันที่ ${j.day_no}</span>`:''}
              <span style="opacity:.75;font-size:10px">${U.fmtD(j.onsite_date)}</span>
              <span style="opacity:.55;font-size:9.5px;font-family:'IBM Plex Sans Thai',sans-serif">${U.esc(j.company_name||'')}</span>
              ${j.wage>0?`<span style="opacity:.85;font-size:9.5px;color:#6EE7B7;font-weight:700">฿${U.fmt(j.wage)}</span>`:''}
            </span>`).join('')}</div>`;
      const jobCount = jobs.length > 0
        ? `<span style="background:linear-gradient(180deg,#F0CD7F,#D4A845);color:#1A1A1A;font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:9px;font-family:'IBM Plex Mono',monospace;margin-left:8px">${jobs.length} ใบ</span>`
        : '';
      const totalWageBadge = totalWage > 0
        ? `<span style="background:rgba(110,231,183,.12);color:#6EE7B7;font-size:11px;font-weight:700;padding:2px 10px;border-radius:5px;font-family:'IBM Plex Mono',monospace;margin-left:8px;border:1px solid rgba(110,231,183,.3)" title="ยอดรวมค่าจ้าง PT คนนี้">💰 ฿${U.fmt(totalWage)}</span>`
        : '';
      return `<div style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.01)">
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:5px">
          <span style="font-family:'IBM Plex Mono',monospace;color:#F0CD7F;background:rgba(240,205,127,.12);padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700">PT-${String(pt.id).padStart(3,'0')}</span>
          <span style="font-size:14px;font-weight:700;margin-left:9px">${U.esc(pt.full_name)}</span>
          <span style="font-size:11.5px;color:#FFFFFF;opacity:.65;margin-left:7px">${U.esc(pt.position||'')}</span>
          ${pt.phone?`<span style="font-size:11px;color:#7DD3FC;opacity:.85;margin-left:7px;font-family:'IBM Plex Mono',monospace">📞 ${U.esc(pt.phone)}</span>`:''}
          ${jobCount}
          <span style="margin-left:8px">${workStatusBadge(pt)}</span>
          ${totalWageBadge}
        </div>
        ${jobsHtml}
      </div>`;
    }).join('');
    // เก็บข้อมูลไว้ใช้ใน openJobDetail
    this._ptHistoryCache = ptHistory;

    const totalPT = allPT.length;
    const activePT = allPT.filter(p=>p.status==='approved' && (p.work_status||'Active')==='Active').length;
    const givePT = allPT.filter(p=>p.status==='approved' && p.work_status==='Give a chance').length;
    const blacklistPT = allPT.filter(p=>p.status==='approved' && p.work_status==='Blacklist').length;
    const ptWithJobs = ptHistory.filter(x=>x.jobs.length>0).length;

    const filterBtn = (key, label, count)=>{
      const active = this._filter===key;
      const colorStyle = active ? 'background:linear-gradient(180deg,#F0CD7F,#D4A845);color:#1A1A1A;border-color:#F0CD7F' : 'background:transparent;color:#FFFFFF;border-color:rgba(255,255,255,.18)';
      return `<button onclick="Pages.parttime_history._filter='${key}';Pages.parttime_history.render()" style="padding:6px 12px;border:1.5px solid;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;${colorStyle};display:inline-flex;align-items:center;gap:6px">${label} <span style="background:${active?'rgba(0,0,0,.2)':'rgba(255,255,255,.1)'};padding:1px 7px;border-radius:9px;font-size:10.5px">${count}</span></button>`;
    };

    document.getElementById('content').innerHTML=`
      <div class="ph">
        <div><h2>📊 รายงานประวัติ Part-Time</h2><p>ข้อมูล PT ทั้งหมด + ประวัติงานที่เคยร่วม</p></div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-out btn-sm" onclick="Router.go('parttime')">⏰ กลับไปหน้า Part-Time</button>
          <a href="RegisterPT.html" target="_blank" class="btn btn-out btn-sm">📋 เปิดฟอร์ม</a>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:14px">
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);padding:11px 13px;border-radius:8px">
          <div style="font-size:21px;font-weight:700;color:#FFFFFF;line-height:1">${totalPT}</div>
          <div style="font-size:10px;color:#FFFFFF;opacity:.7;font-weight:600;text-transform:uppercase;letter-spacing:.5px;font-family:'IBM Plex Mono',monospace;margin-top:5px">รวม PT</div>
        </div>
        <div style="background:rgba(110,231,183,.06);border:1px solid rgba(110,231,183,.3);padding:11px 13px;border-radius:8px">
          <div style="font-size:21px;font-weight:700;color:#6EE7B7;line-height:1">${activePT}</div>
          <div style="font-size:10px;color:#6EE7B7;opacity:.85;font-weight:600;text-transform:uppercase;letter-spacing:.5px;font-family:'IBM Plex Mono',monospace;margin-top:5px">● Active</div>
        </div>
        <div style="background:rgba(252,211,77,.06);border:1px solid rgba(252,211,77,.3);padding:11px 13px;border-radius:8px">
          <div style="font-size:21px;font-weight:700;color:#FCD34D;line-height:1">${givePT}</div>
          <div style="font-size:10px;color:#FCD34D;opacity:.85;font-weight:600;text-transform:uppercase;letter-spacing:.5px;font-family:'IBM Plex Mono',monospace;margin-top:5px">⚠ Give a chance</div>
        </div>
        <div style="background:rgba(252,165,165,.06);border:1px solid rgba(252,165,165,.3);padding:11px 13px;border-radius:8px">
          <div style="font-size:21px;font-weight:700;color:#FCA5A5;line-height:1">${blacklistPT}</div>
          <div style="font-size:10px;color:#FCA5A5;opacity:.85;font-weight:600;text-transform:uppercase;letter-spacing:.5px;font-family:'IBM Plex Mono',monospace;margin-top:5px">⛔ Blacklist</div>
        </div>
        <div style="background:rgba(56,189,248,.06);border:1px solid rgba(56,189,248,.3);padding:11px 13px;border-radius:8px">
          <div style="font-size:21px;font-weight:700;color:#7DD3FC;line-height:1">${ptWithJobs}</div>
          <div style="font-size:10px;color:#7DD3FC;opacity:.85;font-weight:600;text-transform:uppercase;letter-spacing:.5px;font-family:'IBM Plex Mono',monospace;margin-top:5px">เคยร่วมงาน</div>
        </div>
      </div>
      <div class="card">
        <div style="padding:13px 16px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;gap:9px;align-items:center;flex-wrap:wrap">
          <input id="pth_search" placeholder="🔍 ค้นหา ชื่อ/เบอร์/ตำแหน่ง/Project..." value="${U.esc(this._search)}"
            style="flex:1;min-width:220px;max-width:400px;padding:7px 12px;border:1.5px solid rgba(255,255,255,.15);border-radius:8px;font-size:13px;font-family:'Sarabun',sans-serif;background:var(--s-3,#1D2B42);color:#FFFFFF;outline:none"
            oninput="Pages.parttime_history._search=this.value;clearTimeout(Pages.parttime_history._t);Pages.parttime_history._t=setTimeout(()=>Pages.parttime_history.render(),200)"/>
        </div>
        <div style="padding:11px 16px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;gap:6px;flex-wrap:wrap">
          ${filterBtn('all','ทั้งหมด',totalPT)}
          ${filterBtn('active','● Active',activePT)}
          ${filterBtn('give','⚠ Give a chance',givePT)}
          ${filterBtn('blacklist','⛔ Blacklist',blacklistPT)}
          ${filterBtn('with_jobs','เคยร่วมงาน',ptWithJobs)}
          ${filterBtn('no_jobs','ไม่เคยร่วม',totalPT-ptWithJobs)}
        </div>
        <div style="max-height:calc(100vh - 380px);overflow-y:auto">
          ${cards || '<div style="padding:40px;text-align:center;color:#FFFFFF;opacity:.55"><div style="font-size:30px;margin-bottom:8px">📊</div><p>ไม่พบข้อมูลตามตัวกรอง</p></div>'}
        </div>
        <div style="padding:9px 16px;background:rgba(255,255,255,.02);border-top:1px solid rgba(255,255,255,.06);font-size:10.5px;color:#FFFFFF;opacity:.6;font-style:italic;text-align:center">
          ค้นจากชื่อ-สกุล ใน Stations ของทุกใบแจ้งงาน · แสดง ${filtered.length} จากทั้งหมด ${totalPT} คน
        </div>
      </div>`;
  },

  // ★ Popup รายละเอียด: PT คนนี้ทำงานใน Project นี้ ที่ Station ไหน + ราคาจ้าง
  openJobDetail(ptId, jobIdx){
    const cache = this._ptHistoryCache || [];
    const ptEntry = cache.find(e => e.pt.id === ptId);
    if(!ptEntry){ U.toast('ไม่พบข้อมูล','danger'); return; }
    const { pt, jobs } = ptEntry;
    const job = jobs[jobIdx];
    if(!job){ U.toast('ไม่พบงานนี้','danger'); return; }
    // หางาน JO อื่นๆ ของ PT คนนี้ใน project เดียวกัน (รวมหลายวัน)
    const sameProjJobs = jobs.filter(j => j.project_id === job.project_id);
    const sameProjTotal = sameProjJobs.reduce((s,j)=>s+(j.wage||0), 0);
    const proj = DB.sales.getProject(job.project_id) || {};

    // รายละเอียดในแต่ละวัน
    const dayRows = sameProjJobs.sort((a,b)=>{
      if(a.day_no !== b.day_no) return (a.day_no||0)-(b.day_no||0);
      return new Date(a.onsite_date||0)-new Date(b.onsite_date||0);
    }).map(j=>`<tr>
      <td style="padding:8px 11px;border-bottom:1px solid rgba(255,255,255,.06);text-align:center">${j.day_no>0?`<span style="background:linear-gradient(180deg,#F0CD7F,#D4A845);color:#1A1A1A;font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:4px;font-family:'IBM Plex Mono',monospace">วันที่ ${j.day_no}</span>`:'—'}</td>
      <td style="padding:8px 11px;border-bottom:1px solid rgba(255,255,255,.06);font-size:12px">${U.fmtD(j.onsite_date)}</td>
      <td style="padding:8px 11px;border-bottom:1px solid rgba(255,255,255,.06);font-family:'IBM Plex Mono',monospace;color:#F0CD7F;font-size:11.5px;font-weight:700">${U.esc(j.station_code||'-')}</td>
      <td style="padding:8px 11px;border-bottom:1px solid rgba(255,255,255,.06);font-size:12px">${U.esc(j.station_name||'-')}</td>
      <td style="padding:8px 11px;border-bottom:1px solid rgba(255,255,255,.06);font-size:11.5px">${U.esc(j.profession||'-')}</td>
      <td style="padding:8px 11px;border-bottom:1px solid rgba(255,255,255,.06);font-size:11px"><span style="background:rgba(240,205,127,.15);color:#F0CD7F;padding:1px 7px;border-radius:4px;font-weight:600">${U.esc(j.staff_type||'-')}</span></td>
      <td style="padding:8px 11px;border-bottom:1px solid rgba(255,255,255,.06);text-align:right;font-family:'IBM Plex Mono',monospace;color:#6EE7B7;font-weight:700;font-size:12.5px">฿${U.fmt(j.wage||0)}</td>
    </tr>`).join('');

    Modal.open(`
      <!-- Project info card -->
      <div style="background:linear-gradient(135deg,rgba(240,205,127,.08),rgba(56,189,248,.06));border:1px solid rgba(240,205,127,.25);padding:13px 16px;border-radius:9px;margin-bottom:13px">
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px">
          <span style="font-family:'IBM Plex Mono',monospace;color:#F0CD7F;background:rgba(240,205,127,.15);padding:3px 11px;border-radius:5px;font-size:13px;font-weight:700">${U.esc(job.project_code||'JO-'+job.joid)}</span>
          <span style="font-size:15px;font-weight:700">${U.esc(job.company_name||proj.company_name||'-')}</span>
          ${sameProjJobs.length>1?`<span style="background:rgba(56,189,248,.15);color:#7DD3FC;font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:4px">📅 ${sameProjJobs.length} วัน</span>`:''}
        </div>
        <div style="font-size:11.5px;color:#FFFFFF;opacity:.75;font-weight:500">
          📆 ${U.fmtD(proj.onsite_date)} · 🧑‍💼 ${(proj.headcount||0).toLocaleString()} คน · 📍 ${U.esc(proj.location||'-')}
        </div>
      </div>

      <!-- PT info -->
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);padding:11px 14px;border-radius:8px;margin-bottom:12px;display:flex;align-items:center;flex-wrap:wrap;gap:8px">
        <span style="font-family:'IBM Plex Mono',monospace;color:#F0CD7F;background:rgba(240,205,127,.12);padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700">PT-${String(pt.id).padStart(3,'0')}</span>
        <span style="font-size:13px;font-weight:700">${U.esc(pt.full_name)}</span>
        <span style="font-size:11.5px;color:#FFFFFF;opacity:.65">${U.esc(pt.position||'')}</span>
        ${pt.phone?`<span style="font-size:11px;color:#7DD3FC;opacity:.85;font-family:'IBM Plex Mono',monospace">📞 ${U.esc(pt.phone)}</span>`:''}
      </div>

      <!-- Detail table -->
      <div style="font-size:11px;color:#F0CD7F;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:7px;font-family:'IBM Plex Mono',monospace">รายละเอียดการทำงานใน Project นี้</div>
      <div style="background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.08);border-radius:8px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#162338">
              <th style="padding:8px 11px;text-align:center;font-size:10.5px;font-weight:700;color:#FFFFFF">วัน</th>
              <th style="padding:8px 11px;text-align:left;font-size:10.5px;font-weight:700;color:#FFFFFF">วันที่</th>
              <th style="padding:8px 11px;text-align:left;font-size:10.5px;font-weight:700;color:#FFFFFF">Code</th>
              <th style="padding:8px 11px;text-align:left;font-size:10.5px;font-weight:700;color:#FFFFFF">Station</th>
              <th style="padding:8px 11px;text-align:left;font-size:10.5px;font-weight:700;color:#FFFFFF">วิชาชีพ</th>
              <th style="padding:8px 11px;text-align:left;font-size:10.5px;font-weight:700;color:#FFFFFF">ประเภท</th>
              <th style="padding:8px 11px;text-align:right;font-size:10.5px;font-weight:700;color:#FFFFFF">ค่าจ้าง</th>
            </tr>
          </thead>
          <tbody>${dayRows}</tbody>
          <tfoot>
            <tr style="background:rgba(110,231,183,.06)">
              <td colspan="6" style="padding:10px 11px;text-align:right;font-weight:700;font-size:12.5px">รวมที่จ้างใน Project นี้</td>
              <td style="padding:10px 11px;text-align:right;font-family:'IBM Plex Mono',monospace;font-weight:800;font-size:15px;color:#6EE7B7">฿${U.fmt(sameProjTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `, `💼 ${U.esc(pt.full_name)} · ${U.esc(job.project_code||'JO')}`, null, false);
  }
};

/* ═══════════════════════════════════════════════════════════
   Pages.assessment — Gen QR + PDF A4 (per Project)
   ═══════════════════════════════════════════════════════════ */
Pages.assessment = {
  _search: '',
  async render(){
    const projs = DB.sales.listProjects().filter(p=>['Closed','Onsite','Lab','Report','Billing','Completed'].includes(p.status));
    let list = projs;
    if(this._search){
      const q = this._search.toLowerCase().trim();
      list = list.filter(p=>(p.project_code||'').toLowerCase().includes(q)||(p.company_name||'').toLowerCase().includes(q));
    }
    list = list.slice().sort((a,b)=>new Date(b.onsite_date||0)-new Date(a.onsite_date||0));

    const canEdit = DB.auth.can('add','assessment') || DB.auth.can('edit','assessment');
    const rows = list.map(p=>{
      const responses = DB.assessment.listByProject(p.project_code);
      const n = responses.length;
      const pct = p.headcount>0 ? Math.round(n*100/p.headcount) : 0;
      const qrCfg = DB.assessment.getQRConfig(p.id);
      const isGenerated = !!qrCfg;
      // Generate button states
      const genBtn = canEdit
        ? (isGenerated
            ? `<button class="btn btn-out btn-xs" style="background:rgba(110,231,183,.1);border-color:rgba(110,231,183,.4);color:#6EE7B7" onclick="Pages.assessment.viewQR(${p.id})">👁 ดู QR</button> <button class="btn btn-xs" style="background:rgba(252,165,165,.06);border:1px solid rgba(252,165,165,.3);color:#FCA5A5" onclick="Pages.assessment.regenerateQR(${p.id},'${U.esc(p.project_code||'')}')" title="สร้างใหม่ (token เก่าจะใช้ไม่ได้)">🔄</button>`
            : `<button class="btn btn-pri btn-xs" onclick="Pages.assessment.generateQR(${p.id},'${U.esc(p.project_code||'')}')">⭐ สร้าง QR</button>`)
        : '';
      const pdfBtn = isGenerated
        ? `<button class="btn btn-out btn-xs" style="background:rgba(252,165,165,.08);border-color:rgba(252,165,165,.35);color:#FCA5A5" onclick="Pages.assessment.exportPDF(${p.id})">📄 PDF A4</button>`
        : `<button class="btn btn-xs" disabled style="background:rgba(255,255,255,.04);border:1px dashed rgba(255,255,255,.15);color:rgba(255,255,255,.35);cursor:not-allowed" title="กรุณาสร้าง QR ก่อน">📄 PDF A4</button>`;

      // Generated info badge
      const genInfo = isGenerated
        ? `<div style="font-size:9.5px;color:#6EE7B7;font-weight:600" title="Token: ${qrCfg.token}">✅ สร้างแล้ว · ${new Date(qrCfg.generated_at).toLocaleDateString('th-TH',{day:'numeric',month:'short'})}</div>`
        : `<div style="font-size:9.5px;color:#FCD34D;font-weight:600">⏳ ยังไม่สร้าง</div>`;

      return `<tr>
        <td><span class="fw6 mono" style="color:var(--c-gold-lt,#E2C46A)">${U.esc(p.project_code||'-')}</span></td>
        <td class="fw6">${U.esc(p.company_name||'-')}</td>
        <td>${U.fmtD(p.onsite_date)}</td>
        <td style="text-align:right">${(p.headcount||0).toLocaleString()}</td>
        <td>${U.badge(p.status||'Draft')}</td>
        <td>${genInfo}</td>
        <td style="text-align:center">
          <span style="color:${n>0?'#6EE7B7':'rgba(255,255,255,.4)'};font-weight:700;font-family:'IBM Plex Mono',monospace">${n}</span>
          <span style="font-size:10px;color:rgba(255,255,255,.5)"> / ${(p.headcount||0).toLocaleString()}</span>
          ${n>0?`<div style="font-size:9.5px;color:#6EE7B7;font-weight:600">${pct}%</div>`:''}
        </td>
        <td style="white-space:nowrap">${genBtn} ${pdfBtn}</td>
      </tr>`;
    }).join('');

    document.getElementById('content').innerHTML=`
      <div class="ph">
        <div><h2>⭐ Gen Assessment — แบบประเมินความพึงพอใจ</h2><p>กดปุ่ม "สร้าง QR" → ระบบ generate token เฉพาะแต่ละ Project → Export PDF A4 ติดที่หน้างาน</p></div>
      </div>
      <div class="card">
        <div style="padding:13px 16px;border-bottom:1px solid rgba(255,255,255,.06)">
          <input id="as_search" placeholder="🔍 ค้นหา Project / บริษัท..." value="${U.esc(this._search)}"
            style="width:100%;max-width:400px;padding:7px 12px;border:1.5px solid rgba(255,255,255,.15);border-radius:8px;font-size:13px;background:var(--s-3,#1D2B42);color:#FFFFFF;outline:none"
            oninput="Pages.assessment._search=this.value;clearTimeout(Pages.assessment._t);Pages.assessment._t=setTimeout(()=>Pages.assessment.render(),200)"/>
        </div>
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Project Code</th><th>บริษัท</th><th>วันออกตรวจ</th><th style="text-align:right">จำนวนคน</th><th>สถานะ</th><th>QR Status</th><th style="text-align:center">ผู้ตอบ</th><th></th></tr></thead>
            <tbody>${rows||'<tr><td colspan="8" class="empty"><div class="icon">⭐</div><p>ยังไม่มี Project พร้อมสร้างแบบประเมิน (ต้อง Status ≥ Closed)</p></td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  },

  // URL จาก token (unique ต่อ Project)
  _tokenUrl(token){
    const base = window.location.origin + window.location.pathname.replace(/[^\/]*$/,'');
    return `${base}assessment.html?t=${encodeURIComponent(token)}`;
  },

  _genQRSVG(text, size){
    if(typeof qrcode !== 'function'){
      return `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:#FEE;color:#B00;font-size:11px;text-align:center;padding:10px">QRCode library not loaded.<br>กรุณา refresh หน้านี้</div>`;
    }
    try {
      const qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      return qr.createSvgTag({cellSize: Math.floor(size/qr.getModuleCount()), margin: 1, scalable: true});
    } catch(e){
      return `<div style="color:red;font-size:11px">Error: ${e.message}</div>`;
    }
  },

  // ★ Generate QR (first time)
  generateQR(projectId, projectCode){
    const p = DB.sales.getProject(projectId);
    if(!p){U.toast('ไม่พบ Project','danger');return;}
    if(!U.confirm(`สร้าง QR Code สำหรับ Project ${projectCode}?\n\nลิงก์ที่ลูกค้าใช้สแกนจะถูก generate ใหม่ (unique token)`)) return;
    const cfg = DB.assessment.generateQRConfig(projectId, projectCode);
    U.toast(`✅ สร้าง QR แล้ว — Token: ${cfg.token}`);
    this.render();
    setTimeout(()=>this.viewQR(projectId), 200);
  },

  // ★ Regenerate QR (สร้างใหม่ — token เก่าจะใช้ไม่ได้)
  regenerateQR(projectId, projectCode){
    if(!U.confirm(`⚠️ สร้าง QR ใหม่สำหรับ ${projectCode}?\n\nToken เก่าจะใช้งานไม่ได้ทันที — QR ที่พิมพ์ติดไว้แล้วต้องเปลี่ยน`)) return;
    const cfg = DB.assessment.generateQRConfig(projectId, projectCode);
    U.toast(`🔄 สร้าง QR ใหม่แล้ว — Token: ${cfg.token}`);
    this.render();
    setTimeout(()=>this.viewQR(projectId), 200);
  },

  // ★ View existing QR
  viewQR(projectId){
    const p = DB.sales.getProject(projectId);
    if(!p){U.toast('ไม่พบ Project','danger');return;}
    const cfg = DB.assessment.getQRConfig(projectId);
    if(!cfg){
      U.toast('ยังไม่ได้สร้าง QR — กรุณากด "⭐ สร้าง QR" ก่อน','warning');
      return;
    }
    const url = this._tokenUrl(cfg.token);
    const responses = DB.assessment.listByProject(p.project_code);

    Modal.open(`
      <div style="text-align:center">
        <div style="background:linear-gradient(135deg,rgba(240,205,127,.08),rgba(56,189,248,.06));border:1px solid rgba(240,205,127,.25);padding:10px 14px;border-radius:8px;margin-bottom:13px">
          <div style="font-size:14px;font-weight:700;color:#F0CD7F;font-family:'IBM Plex Mono',monospace">${U.esc(p.project_code)}</div>
          <div style="font-size:13px;font-weight:600;margin-top:3px">${U.esc(p.company_name)}</div>
          <div style="font-size:11.5px;color:rgba(255,255,255,.7);margin-top:3px">📆 ${U.fmtD(p.onsite_date)} · 🧑‍💼 ${(p.headcount||0).toLocaleString()} คน</div>
        </div>
        <div style="background:#FFFFFF;padding:14px;border-radius:9px;display:inline-block;margin-bottom:13px">
          <div style="width:250px;height:250px;display:flex;align-items:center;justify-content:center">${this._genQRSVG(url, 250)}</div>
        </div>
        <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);padding:8px 12px;border-radius:6px;font-size:10.5px;color:rgba(255,255,255,.7);font-family:'IBM Plex Mono',monospace;margin-bottom:13px">
          🔑 Token: <span style="color:#F0CD7F;font-weight:700">${cfg.token}</span> · สร้างเมื่อ ${new Date(cfg.generated_at).toLocaleString('th-TH',{day:'numeric',month:'short',year:'2-digit',hour:'2-digit',minute:'2-digit'})}
        </div>
        <div style="display:flex;gap:7px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-out" onclick="navigator.clipboard.writeText('${url}').then(()=>U.toast('✅ คัดลอก link แล้ว'))" style="background:rgba(56,189,248,.1);border-color:rgba(56,189,248,.4);color:#7DD3FC">📋 Copy Link</button>
          <button class="btn btn-gold" onclick="Pages.assessment.exportPDF(${projectId})">📄 Export PDF A4</button>
        </div>
        <div style="margin-top:13px;font-size:11.5px;color:rgba(255,255,255,.7);font-weight:500">📊 มีผู้ทำแบบประเมินแล้ว: <span style="color:#6EE7B7;font-weight:700">${responses.length}</span> / ${(p.headcount||0).toLocaleString()} คน</div>
      </div>
    `, `⭐ QR Code — แบบประเมิน`, null, false);
  },

  // ★ Export PDF A4 (compact, 1 page, no link below QR)
  exportPDF(projectId){
    const p = DB.sales.getProject(projectId);
    if(!p){U.toast('ไม่พบ Project','danger');return;}
    const cfg = DB.assessment.getQRConfig(projectId);
    if(!cfg){
      U.toast('ยังไม่ได้สร้าง QR — กรุณากด "⭐ สร้าง QR" ก่อน','warning');
      return;
    }
    const url = this._tokenUrl(cfg.token);
    const qrSVG = this._genQRSVG(url, 340);
    const today = new Date().toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'});
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>แบบประเมินความพึงพอใจ — ${U.esc(p.project_code)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0;font-family:'Sarabun',sans-serif}
      @media print { @page { size:A4; margin:8mm 10mm; } button{display:none!important} }
      body{padding:8mm 10mm;background:#FFFFFF;color:#1A1A1A;width:210mm;min-height:auto}
      .container{max-width:190mm;margin:0 auto}
      .header{background:linear-gradient(135deg,#0B2340,#1A3C65);color:#FFF;padding:11px 16px;border-radius:7px;margin-bottom:10px;text-align:center}
      .header h1{font-size:19px;font-weight:700;color:#FFF;letter-spacing:.3px}
      .header p{font-size:11.5px;opacity:.92;color:#FFF;margin-top:1px}
      .proj-info{text-align:center;margin-bottom:11px;padding:9px 13px;background:#F0FDF4;border:2px solid #86EFAC;border-radius:7px}
      .proj-code{display:inline-block;background:linear-gradient(180deg,#F0CD7F,#D4A845);color:#1A1A1A;padding:3px 12px;border-radius:5px;font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:15px;margin-bottom:3px}
      .proj-name{font-size:16px;font-weight:700;color:#0B2340;margin-bottom:1px}
      .proj-meta{font-size:11.5px;color:#374151;font-weight:500}
      .qr-wrap{text-align:center;margin:8px 0 11px}
      .qr-frame{display:inline-block;background:#FFFFFF;border:3px solid #0B2340;padding:9px;border-radius:11px}
      .qr-frame svg{width:340px;height:340px;display:block}
      .qr-label{font-size:15px;font-weight:700;color:#0B2340;margin-top:9px}
      .instructions{background:#F0FDF4;border-left:4px solid #10B981;padding:9px 14px;border-radius:5px;margin-top:9px;text-align:left}
      .instructions h3{font-size:12.5px;font-weight:700;color:#065F46;margin-bottom:4px}
      .instructions .item{font-size:11.5px;color:#1A2332;line-height:1.55;margin-bottom:2px}
      .instructions .note{margin-top:5px;color:#065F46;font-weight:600;font-size:11px}
      .footer{text-align:center;font-size:9.5px;color:#9CA3AF;margin-top:9px;font-weight:500}
      .print-btn{position:fixed;top:10px;right:10px;background:#0B2340;color:#FFF;border:0;padding:9px 15px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(0,0,0,.2);z-index:1000}
    </style>
    </head><body>
      <button class="print-btn" onclick="window.print()">🖨️ Print / Export PDF</button>
      <div class="container">
        <div class="header">
          <h1>⭐ แบบประเมินความพึงพอใจ</h1>
          <p>การเข้ารับการตรวจสุขภาพ 2569 · OcciCare Mobile Checkup</p>
        </div>
        <div class="proj-info">
          <div class="proj-code">${U.esc(p.project_code)}</div>
          <div class="proj-name">${U.esc(p.company_name||'-')}</div>
          <div class="proj-meta">📆 ${U.fmtD(p.onsite_date)} · 🧑‍💼 ${(p.headcount||0).toLocaleString()} คน · 📍 ${U.esc(p.location||'-')}</div>
        </div>
        <div class="qr-wrap">
          <div class="qr-frame">${qrSVG}</div>
          <div class="qr-label">📱 สแกน QR Code เพื่อทำแบบประเมิน</div>
        </div>
        <div class="instructions">
          <h3>📋 หลักเกณฑ์การให้คะแนน</h3>
          <div class="item"><strong style="color:#10B981">5</strong>=พึงพอใจมากที่สุด · <strong style="color:#10B981">4</strong>=พึงพอใจมาก · <strong style="color:#F59E0B">3</strong>=ปานกลาง · <strong style="color:#F59E0B">2</strong>=น้อย · <strong style="color:#DC2626">1</strong>=น้อยที่สุด · <strong style="color:#6B7280">0</strong>=ไม่มีตรวจ</div>
          <div class="note">📊 ข้อมูลของท่านจะถูกใช้เพื่อพัฒนาและปรับปรุงคุณภาพการให้บริการเท่านั้น</div>
        </div>
        <div class="footer">© OcciCare Mobile Checkup System · พิมพ์เมื่อ ${today}</div>
      </div>
    </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(()=>{ try{ w.print(); }catch(e){} }, 600);
  }
};


/* ═══════════════════════════════════════════════════════════
   Pages.assessment_report — ผลประเมินความพึงพอใจ
   ═══════════════════════════════════════════════════════════ */
Pages.assessment_report = {
  _selectedProjectCode: '',
  async render(){
    const projs = DB.sales.listProjects();
    const allResponses = DB.assessment.list();
    // Auto-select first project with responses if not selected
    if(!this._selectedProjectCode){
      const projsWithResp = projs.filter(p=>allResponses.some(r=>r.project_code===p.project_code));
      if(projsWithResp.length>0) this._selectedProjectCode = projsWithResp[0].project_code;
      else if(projs.length>0) this._selectedProjectCode = projs[0].project_code;
    }
    // Project options
    const projOpts = projs.map(p=>{
      const n = allResponses.filter(r=>r.project_code===p.project_code).length;
      return `<option value="${U.esc(p.project_code||'')}" ${this._selectedProjectCode===p.project_code?'selected':''}>${U.esc(p.project_code)} — ${U.esc(p.company_name)} (${n} ผู้ตอบ)</option>`;
    }).join('');
    // Get summary
    const summary = this._selectedProjectCode ? DB.assessment.summary(this._selectedProjectCode) : null;
    const proj = projs.find(p=>p.project_code===this._selectedProjectCode);

    const renderBar = (label, avg, count, color='#6EE7B7')=>{
      if(avg === null) return `<div style="display:flex;justify-content:space-between;padding:7px 11px;border-bottom:1px solid rgba(255,255,255,.05);font-size:12px"><span>${U.esc(label)}</span><span style="color:rgba(255,255,255,.4);font-style:italic;font-size:11px">— ไม่มีข้อมูล —</span></div>`;
      const pct = (avg/5)*100;
      const barColor = avg>=4 ? '#10B981' : avg>=3 ? '#F59E0B' : '#DC2626';
      const txtColor = avg>=4 ? '#6EE7B7' : avg>=3 ? '#FCD34D' : '#FCA5A5';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 11px;border-bottom:1px solid rgba(255,255,255,.05);font-size:12px;gap:11px">
        <span style="flex:1;min-width:0">${U.esc(label)} <span style="font-size:10px;color:rgba(255,255,255,.5)">(${count} คน)</span></span>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <div style="width:140px;height:7px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,${barColor}cc,${barColor});border-radius:4px"></div>
          </div>
          <span style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:${txtColor};min-width:32px;text-align:right;font-size:12.5px">${avg.toFixed(1)}</span>
        </div>
      </div>`;
    };

    // ── Render Radar Chart (overall view) ──
    const renderRadar = (s) => {
      if(!s || s.staff.length === 0) return '';
      const allItems = [...s.staff, ...s.stations].filter(x=>x.avg !== null);
      if(allItems.length < 3) return ''; // ไม่พอเลย 3 จุดไม่ดี
      const sz = 260, cx = sz/2, cy = sz/2, rMax = sz/2 - 35;
      const n = allItems.length;
      const points = allItems.map((it, i)=>{
        const angle = (i/n) * 2 * Math.PI - Math.PI/2;
        const r = (it.avg/5) * rMax;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        return {x, y, item:it, angle};
      });
      // Grid lines (concentric pentagons)
      const grids = [0.2, 0.4, 0.6, 0.8, 1].map(scale=>{
        const pts = allItems.map((_, i)=>{
          const angle = (i/n) * 2 * Math.PI - Math.PI/2;
          const r = scale * rMax;
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(' ');
        return `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,${0.05 + scale*0.05})" stroke-width="1"/>`;
      }).join('');
      // Data polygon
      const dataPts = points.map(p=>`${p.x},${p.y}`).join(' ');
      // Axis lines + labels
      const axes = points.map(p=>{
        const lx = cx + (rMax+18) * Math.cos(p.angle);
        const ly = cy + (rMax+18) * Math.sin(p.angle);
        const anchor = Math.abs(p.angle - (-Math.PI/2)) < 0.5 || Math.abs(p.angle - (Math.PI/2)) < 0.5 ? 'middle' : (p.angle < Math.PI/2 && p.angle > -Math.PI/2 ? 'start' : 'end');
        const shortLabel = p.item.label.length > 14 ? p.item.label.substr(0,12)+'..' : p.item.label;
        return `<line x1="${cx}" y1="${cy}" x2="${cx + rMax*Math.cos(p.angle)}" y2="${cy + rMax*Math.sin(p.angle)}" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
                <circle cx="${p.x}" cy="${p.y}" r="3" fill="#6EE7B7"/>
                <text x="${lx}" y="${ly}" text-anchor="${anchor}" fill="#F0CD7F" font-size="8" font-family="'IBM Plex Mono',monospace">${shortLabel} ${p.item.avg.toFixed(1)}</text>`;
      }).join('');
      return `<svg viewBox="0 0 ${sz} ${sz}" style="width:100%;max-width:300px;height:auto;display:block;margin:0 auto">
        ${grids}
        ${axes}
        <polygon points="${dataPts}" fill="rgba(110,231,183,.25)" stroke="#10B981" stroke-width="2"/>
      </svg>`;
    };

    // ── Render Distribution bars ──
    const renderDist = (item) => {
      if(item.avg === null) return '<span style="color:rgba(255,255,255,.4);font-size:10.5px;font-style:italic">— ไม่มีข้อมูล —</span>';
      const total = (item.dist[1]||0)+(item.dist[2]||0)+(item.dist[3]||0)+(item.dist[4]||0)+(item.dist[5]||0);
      if(total === 0) return '<span style="color:rgba(255,255,255,.4);font-size:10.5px">—</span>';
      const colors = {5:'#10B981', 4:'#34D399', 3:'#F59E0B', 2:'#F87171', 1:'#DC2626'};
      const segments = [5,4,3,2,1].map(v=>{
        const c = item.dist[v]||0;
        if(c === 0) return '';
        const pct = (c/total)*100;
        return `<div style="flex:${pct};background:${colors[v]};display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:700" title="${v} ดาว: ${c} คน">${pct>=10?c:''}</div>`;
      }).filter(s=>s).join('');
      return `<div style="display:flex;height:16px;border-radius:4px;overflow:hidden;background:rgba(255,255,255,.04)">${segments}</div>`;
    };

    const renderDistRow = (item) => {
      const txtColor = item.avg >= 4 ? '#6EE7B7' : item.avg >= 3 ? '#FCD34D' : '#FCA5A5';
      return `<div style="display:grid;grid-template-columns:1.6fr 1fr 50px;gap:11px;align-items:center;padding:6px 0;font-size:11.5px">
        <span style="color:rgba(255,255,255,.85);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${U.esc(item.label)}">${U.esc(item.label)}</span>
        <div>${renderDist(item)}</div>
        <span style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:${item.avg!==null?txtColor:'rgba(255,255,255,.3)'};text-align:right;font-size:12.5px">${item.avg!==null?item.avg.toFixed(1):'—'}</span>
      </div>`;
    };

    const content = !summary
      ? `<div style="padding:50px;text-align:center;color:rgba(255,255,255,.55)">
          <div style="font-size:42px;margin-bottom:11px">⭐</div>
          <p style="font-size:14px;font-weight:600">ยังไม่มีผลประเมินสำหรับ Project นี้</p>
          <p style="font-size:11.5px;margin-top:7px">ไปที่ <strong style="color:#7DD3FC">Gen Assessment</strong> เพื่อสร้าง QR ให้ลูกค้าทำแบบประเมิน</p>
        </div>`
      : `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:14px">
          <div class="metric-card" style="background:rgba(110,231,183,.06);border:1px solid rgba(110,231,183,.3);position:relative;overflow:hidden">
            <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#6EE7B7,#10B981)"></div>
            <div class="metric-label" style="color:#6EE7B7">คะแนนเฉลี่ย</div>
            <div class="metric-value" style="font-size:32px">${summary.totalAvg.toFixed(2)}</div>
            <div class="metric-sub">จาก 5.00</div>
          </div>
          <div class="metric-card" style="background:rgba(56,189,248,.06);border:1px solid rgba(56,189,248,.3);position:relative;overflow:hidden">
            <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#7DD3FC,#0EA5E9)"></div>
            <div class="metric-label" style="color:#7DD3FC">ผู้ตอบ</div>
            <div class="metric-value">${summary.count}</div>
            <div class="metric-sub">/ ${(proj?.headcount||0).toLocaleString()} คน (${proj?.headcount>0?Math.round(summary.count*100/proj.headcount):0}%)</div>
          </div>
          <div class="metric-card" style="background:rgba(240,205,127,.06);border:1px solid rgba(240,205,127,.3);position:relative;overflow:hidden">
            <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#F0CD7F,#D4A845)"></div>
            <div class="metric-label" style="color:#F0CD7F">พึงพอใจ (4-5)</div>
            <div class="metric-value">${summary.satisfiedPct}%</div>
            <div class="metric-sub">ของคะแนนทั้งหมด</div>
          </div>
          <div class="metric-card" style="background:rgba(252,211,77,.06);border:1px solid rgba(252,211,77,.3);position:relative;overflow:hidden">
            <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#FCD34D,#F59E0B)"></div>
            <div class="metric-label" style="color:#FCD34D">ข้อเสนอแนะ</div>
            <div class="metric-value">${summary.suggestions.length}</div>
            <div class="metric-sub">รายการ</div>
          </div>
        </div>
        <!-- Radar + Insight (side by side) -->
        <div class="g2 mb4">
          <div class="card">
            <div class="card-header"><span class="card-title">📡 Radar Chart — ภาพรวมทุกหมวด</span></div>
            <div style="padding:13px">${renderRadar(summary)}</div>
          </div>
          <div class="card">
            <div class="card-header"><span class="card-title" style="color:#FCA5A5">🎯 ประเด็นที่ควรปรับปรุง (Top 3)</span></div>
            <div style="padding:13px">
              ${summary.weakest.length === 0
                ? '<div style="text-align:center;color:rgba(255,255,255,.5);padding:23px;font-size:13px">🎉 คะแนนทุกข้อสูงเกิน 4.0 ทั้งหมด</div>'
                : summary.weakest.map((w,i)=>{
                  const colors = ['#DC2626','#F59E0B','#FCD34D'];
                  const c = colors[i] || '#94A3B8';
                  return `<div style="display:flex;align-items:center;gap:11px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05)">
                    <span style="background:${c};color:${i===2?'#000':'#fff'};width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${i+1}</span>
                    <div style="flex:1;min-width:0">
                      <div style="font-weight:600;font-size:12.5px">${U.esc(w.label)}</div>
                      <div style="font-size:10.5px;color:rgba(255,255,255,.6);margin-top:3px">${w.totalRated} คน · ${w.lowCount} คนให้ ≤3 (${w.lowPct}%)</div>
                    </div>
                    <span style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:${c};font-size:16px">${w.avg.toFixed(1)}</span>
                  </div>`;
                }).join('')}
              <div style="font-size:10.5px;color:rgba(255,255,255,.6);margin-top:8px;font-style:italic;font-weight:500;border-top:1px solid rgba(255,255,255,.08);padding-top:7px">💡 แนะนำ: ปรับปรุงพื้นที่/ขั้นตอนของจุดเหล่านี้ เพื่อยกระดับ Service Quality</div>
            </div>
          </div>
        </div>
        <!-- Staff Distribution -->
        <div class="card mb4">
          <div class="card-header"><span class="card-title">👥 การให้บริการของเจ้าหน้าที่ — Distribution</span></div>
          <div style="padding:13px">
            <div style="display:grid;grid-template-columns:1.6fr 1fr 50px;gap:11px;font-size:9.5px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;font-family:'IBM Plex Mono',monospace">
              <span>คำถาม</span><span>กระจายคะแนน (5→1)</span><span style="text-align:right">เฉลี่ย</span>
            </div>
            ${summary.staff.map(renderDistRow).join('')}
          </div>
        </div>
        <!-- Stations Distribution -->
        <div class="card mb4">
          <div class="card-header"><span class="card-title">🏥 จุดตรวจสุขภาพ — Distribution</span></div>
          <div style="padding:13px">
            <div style="display:grid;grid-template-columns:1.6fr 1fr 50px;gap:11px;font-size:9.5px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;font-family:'IBM Plex Mono',monospace">
              <span>จุดตรวจ</span><span>กระจายคะแนน (5→1)</span><span style="text-align:right">เฉลี่ย</span>
            </div>
            ${summary.stations.map(renderDistRow).join('')}
          </div>
        </div>
        ${summary.suggestions.length>0 ? `<div class="card mb4">
          <div class="card-header"><span class="card-title">💬 ข้อเสนอแนะ (${summary.suggestions.length} รายการ)</span></div>
          <div style="padding:11px 14px;max-height:300px;overflow-y:auto">
            ${summary.suggestions.map((s,i)=>`<div style="background:rgba(255,255,255,.03);border-left:3px solid #7DD3FC;padding:9px 13px;border-radius:5px;margin-bottom:7px;font-size:12px;line-height:1.6">
              <div style="color:#FFFFFF">${U.esc(s.text)}</div>
              <div style="font-size:10px;color:rgba(255,255,255,.5);margin-top:4px;font-family:'IBM Plex Mono',monospace">${new Date(s.date).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
            </div>`).join('')}
          </div>
        </div>`:''}
      `;

    document.getElementById('content').innerHTML=`
      <div class="ph">
        <div><h2>🌟 ผลประเมินความพึงพอใจ</h2><p>สรุปคะแนนจาก QR แบบประเมินที่ลูกค้าตอบหน้างาน</p></div>
      </div>
      <div class="card mb4">
        <div style="padding:13px 16px;display:flex;gap:11px;align-items:center;flex-wrap:wrap">
          <label style="font-size:12.5px;font-weight:600;color:#F0CD7F">เลือก Project:</label>
          <select onchange="Pages.assessment_report._selectedProjectCode=this.value;Pages.assessment_report.render()"
            style="padding:7px 12px;border:1.5px solid rgba(240,205,127,.3);border-radius:7px;font-size:12.5px;background:var(--s-3,#1D2B42);color:#FFFFFF;font-family:inherit;min-width:340px;outline:none">
            <option value="">-- เลือก Project --</option>
            ${projOpts}
          </select>
        </div>
      </div>
      ${content}
    `;
  }
};

/* ═══════════════════════════════════════════════════════════
   Pages.config_assessment — CRUD แบบประเมิน
   ═══════════════════════════════════════════════════════════ */
Pages.config_assessment = {
  _editing: null,  // {section:'staff'|'stations', idx:N}
  async render(){
    const canEdit = DB.auth.can('add','config_assessment') || DB.auth.can('edit','config_assessment');
    const Q = DB.assessment.getQuestions();
    const renderItems = (items, section) => {
      return items.map((q, i)=>`
        <div style="display:flex;align-items:center;gap:8px;padding:9px 11px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:7px;margin-bottom:6px">
          <span style="font-family:'IBM Plex Mono',monospace;color:#F0CD7F;font-weight:700;font-size:11.5px;min-width:24px">${i+1}.</span>
          <input type="text" id="q_${section}_${i}" value="${U.esc(q.label)}" ${canEdit?'':'readonly'}
            style="flex:1;padding:7px 10px;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.12);border-radius:5px;color:#FFFFFF;font-size:12.5px;font-family:inherit;outline:none"
            placeholder="ข้อความคำถาม..."/>
          <span style="font-family:'IBM Plex Mono',monospace;color:rgba(255,255,255,.4);font-size:10px;background:rgba(255,255,255,.05);padding:2px 7px;border-radius:4px" title="Key">${q.key}</span>
          ${canEdit?`
            <button onclick="Pages.config_assessment.moveUp('${section}',${i})" ${i===0?'disabled':''} style="padding:5px 8px;border:1px solid rgba(255,255,255,.15);background:transparent;color:${i===0?'rgba(255,255,255,.3)':'#FFFFFF'};border-radius:4px;font-size:11px;cursor:${i===0?'not-allowed':'pointer'};font-family:inherit" title="ขึ้น">↑</button>
            <button onclick="Pages.config_assessment.moveDown('${section}',${i})" ${i===items.length-1?'disabled':''} style="padding:5px 8px;border:1px solid rgba(255,255,255,.15);background:transparent;color:${i===items.length-1?'rgba(255,255,255,.3)':'#FFFFFF'};border-radius:4px;font-size:11px;cursor:${i===items.length-1?'not-allowed':'pointer'};font-family:inherit" title="ลง">↓</button>
            <button onclick="Pages.config_assessment.remove('${section}',${i})" style="padding:5px 9px;border:1px solid rgba(252,165,165,.35);background:rgba(252,165,165,.08);color:#FCA5A5;border-radius:4px;font-size:11px;cursor:pointer;font-family:inherit;font-weight:600" title="ลบ">×</button>
          `:''}
        </div>`).join('');
    };
    document.getElementById('content').innerHTML=`
      <div class="ph">
        <div><h2>🎯 ตั้งค่าแบบประเมินความพึงพอใจ</h2><p>เพิ่ม / แก้ไข / ลบ คำถาม · มีผลกับแบบประเมินทุก Project</p></div>
        ${canEdit?`<button class="btn btn-out" onclick="Pages.config_assessment.resetDefault()" style="background:rgba(252,211,77,.06);border-color:rgba(252,211,77,.3);color:#FCD34D">🔄 คืนค่า Default</button>`:''}
      </div>

      <div style="background:rgba(56,189,248,.06);border:1px solid rgba(56,189,248,.25);padding:11px 14px;border-radius:8px;margin-bottom:14px;font-size:11.5px;line-height:1.55;color:#7DD3FC;font-weight:500">
        💡 <strong style="color:#7DD3FC;font-weight:700">หมายเหตุ:</strong> การแก้ไขมีผลกับแบบประเมินทันที (assessment.html) และรายงานผลประเมิน · คะแนน Section 1 = 1-5 / Section 2 = 0-5 (0 = ไม่มีตรวจ)
      </div>

      <div class="g2 mb4">
        <div class="card">
          <div class="card-header"><span class="card-title">👥 Section 1 — เจ้าหน้าที่ (1-5)</span><span style="font-size:11px;color:rgba(255,255,255,.6);font-weight:500">${Q.staff.length} ข้อ</span></div>
          <div style="padding:12px">
            ${renderItems(Q.staff, 'staff')}
            ${canEdit?`<button onclick="Pages.config_assessment.add('staff')" style="width:100%;padding:9px;border:1.5px dashed rgba(110,231,183,.4);background:rgba(110,231,183,.05);color:#6EE7B7;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;margin-top:5px">➕ เพิ่มคำถามเจ้าหน้าที่</button>`:''}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">🏥 Section 2 — จุดตรวจ (0-5)</span><span style="font-size:11px;color:rgba(255,255,255,.6);font-weight:500">${Q.stations.length} จุด</span></div>
          <div style="padding:12px">
            ${renderItems(Q.stations, 'stations')}
            ${canEdit?`<button onclick="Pages.config_assessment.add('stations')" style="width:100%;padding:9px;border:1.5px dashed rgba(110,231,183,.4);background:rgba(110,231,183,.05);color:#6EE7B7;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;margin-top:5px">➕ เพิ่มจุดตรวจ</button>`:''}
          </div>
        </div>
      </div>

      ${canEdit?`<div style="position:sticky;bottom:0;background:linear-gradient(0deg,#0B1322 70%,transparent);padding:13px 0;margin-top:11px;text-align:center">
        <button class="btn btn-gold" onclick="Pages.config_assessment.saveAll()" style="font-size:14px;padding:10px 26px">💾 บันทึกทั้งหมด</button>
      </div>`:''}
    `;
  },
  _genKey(section){
    const Q = DB.assessment.getQuestions();
    const prefix = section === 'staff' ? 's_' : 't_';
    const existing = new Set([...Q.staff, ...Q.stations].map(q=>q.key));
    let i = 1;
    while(existing.has(prefix+'custom'+i)) i++;
    return prefix + 'custom' + i;
  },
  add(section){
    const Q = DB.assessment.getQuestions();
    const list = section === 'staff' ? Q.staff : Q.stations;
    list.push({key: this._genKey(section), label: 'คำถามใหม่ (กรุณาแก้ไข)'});
    DB.assessment.saveQuestions(Q.staff, Q.stations);
    this.render();
    setTimeout(()=>{
      const el = document.getElementById(`q_${section}_${list.length-1}`);
      if(el){el.focus(); el.select();}
    }, 100);
  },
  remove(section, idx){
    const Q = DB.assessment.getQuestions();
    const list = section === 'staff' ? Q.staff : Q.stations;
    if(list.length <= 1){U.toast('ต้องมีอย่างน้อย 1 คำถาม','warning');return;}
    if(!U.confirm(`ลบคำถาม "${list[idx].label}" ?`)) return;
    list.splice(idx, 1);
    DB.assessment.saveQuestions(Q.staff, Q.stations);
    this.render();
    U.toast('✅ ลบแล้ว');
  },
  moveUp(section, idx){
    if(idx === 0) return;
    const Q = DB.assessment.getQuestions();
    const list = section === 'staff' ? Q.staff : Q.stations;
    [list[idx-1], list[idx]] = [list[idx], list[idx-1]];
    DB.assessment.saveQuestions(Q.staff, Q.stations);
    this.render();
  },
  moveDown(section, idx){
    const Q = DB.assessment.getQuestions();
    const list = section === 'staff' ? Q.staff : Q.stations;
    if(idx >= list.length-1) return;
    [list[idx+1], list[idx]] = [list[idx], list[idx+1]];
    DB.assessment.saveQuestions(Q.staff, Q.stations);
    this.render();
  },
  saveAll(){
    // Read all input values and update labels
    const Q = DB.assessment.getQuestions();
    Q.staff.forEach((q,i)=>{
      const el = document.getElementById(`q_staff_${i}`);
      if(el) q.label = el.value.trim();
    });
    Q.stations.forEach((q,i)=>{
      const el = document.getElementById(`q_stations_${i}`);
      if(el) q.label = el.value.trim();
    });
    // Validate all labels non-empty
    const empty = [...Q.staff, ...Q.stations].filter(q=>!q.label);
    if(empty.length > 0){U.toast('กรุณากรอกคำถามให้ครบทุกข้อ','warning');return;}
    DB.assessment.saveQuestions(Q.staff, Q.stations);
    U.toast('✅ บันทึกแบบประเมินแล้ว — มีผลกับ Project ทั้งหมด');
  },
  resetDefault(){
    if(!U.confirm('คืนค่าแบบประเมินกลับเป็น Default?\n\n(คำถามที่เพิ่ม/แก้ไขจะหายทั้งหมด · response เดิมยังอยู่)')) return;
    DB.assessment.resetQuestions();
    this.render();
    U.toast('🔄 คืนค่า Default แล้ว');
  }
};
