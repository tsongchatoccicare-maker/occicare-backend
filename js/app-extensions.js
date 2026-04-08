/**
 * app-extensions.js v5 — All fixes
 * 1. Calendar (fixed render sequence)
 * 2. Mobile hamburger
 * 3. Nav Role Badges
 * 4. CRM + Job Type dropdown
 * 5. Sales handover tick (DOM fix)
 * 6. Op_prep checklist status (correct key ckl__)
 * 7. Op_prep JO summary (วิชาชีพ/ประเภท)
 * 8. Onsite บันทึกงานออกหน่วย form
 * 9. Line Notify config
 * 10. buildNav + Router patches
 */

'use strict';

/* ── JOB TYPES constant (shared with ใบแจ้งงาน) ── */
const JOB_TYPES_ALL = [
  'ตรวจสุขภาพ','OS XRAY','ตรวจซ้ำ',
  'เก็บอาหาร ตัวอย่าง','อบรม First Aid','Consult','อื่นๆ'
];

/* ══════════════════════════════════════════════════
   1. MOBILE CSS
══════════════════════════════════════════════════ */
(function injectMobileCSS(){
  const s = document.createElement('style');
  s.id = 'ext-mobile-css';
  s.textContent = `
/* ── Sidebar Mobile ── */
@media(max-width:900px){
  #sidebar{transform:translateX(-100%);transition:transform .3s cubic-bezier(.4,0,.2,1),box-shadow .3s;}
  #sidebar.sb-open{transform:translateX(0);box-shadow:0 8px 40px rgba(11,35,64,.4);}
  #sb-ov.sb-open{display:block!important;}
  #main{margin-left:0!important;}
  #hbg-btn{display:inline-flex!important;align-items:center;}
  #content{padding:14px!important;}
  .ph{flex-direction:column;gap:10px;}
  .g2,.g3,.g2-3{grid-template-columns:1fr!important;}
  .metrics-grid{grid-template-columns:repeat(2,1fr)!important;}
  .fr3{grid-template-columns:1fr 1fr!important;}
  .login-brand{display:none!important;}
  .login-wrap{grid-template-columns:1fr!important;border-radius:20px!important;max-width:460px!important;}
  .mo-box{border-radius:14px 14px 0 0!important;position:fixed!important;bottom:0!important;left:0!important;right:0!important;max-height:93vh!important;max-width:100%!important;}
  .mo{align-items:flex-end!important;padding:0!important;}
  .header-user-name,.header-user-role{display:none;}
  table{min-width:480px;}.tbl-wrap{-webkit-overflow-scrolling:touch;}
}
@media(max-width:480px){
  .metrics-grid{grid-template-columns:1fr 1fr!important;}
  .ph h2{font-size:17px!important;}
  .fr{grid-template-columns:1fr!important;}
  .fr3{grid-template-columns:1fr!important;}
  #content{padding:10px!important;}
}
/* ── Nav badge ── */
.nav-role-badge{background:var(--danger);color:#fff;border-radius:10px;
  padding:1px 6px;font-size:10px;font-weight:700;margin-left:auto;}
/* ── File zone ── */
.file-zone{border:2px dashed var(--bdr-dk);border-radius:var(--r);padding:13px;
  text-align:center;cursor:pointer;color:var(--txt-lt);background:var(--surf2);transition:all .2s;}
.file-zone:hover{border-color:var(--teal);background:#F0FDFB;color:var(--navy);}
.file-item-ext{display:flex;align-items:center;gap:8px;padding:7px 11px;
  background:var(--surf2);border:1px solid var(--bdr);border-radius:8px;margin-bottom:5px;font-size:12px;}
/* ── Calendar ── */
.cal-day{min-height:62px;padding:3px 5px;border-radius:8px;cursor:pointer;
  transition:all .15s;position:relative;border:1.5px solid var(--bdr);background:var(--surf2);}
.cal-day:hover{border-color:var(--teal);background:#F0FDFB;}
.cal-day.today{background:var(--navy);border-color:var(--navy);}
.cal-day.has-event.near{background:#FFFBEB;border-color:#FDE68A;}
.cal-evt{font-size:9px;padding:2px 4px;border-radius:3px;margin-bottom:2px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600;line-height:1.4;}
`;
  document.head.appendChild(s);
})();

/* ══════════════════════════════════════════════════
   2. HAMBURGER
══════════════════════════════════════════════════ */
function _closeSB(){
  document.getElementById('sidebar')?.classList.remove('sb-open');
  const ov = document.getElementById('sb-ov');
  if(ov) ov.style.display = 'none';
  document.body.style.overflow = '';
}
window._closeSB = _closeSB;

function _initHamburger(){
  if(document.getElementById('hbg-btn')) return;
  const hdr = document.getElementById('header');
  if(!hdr) return;

  // Create overlay
  if(!document.getElementById('sb-ov')){
    const ov = document.createElement('div');
    ov.id = 'sb-ov';
    ov.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(11,35,64,.55);z-index:199;backdrop-filter:blur(3px);';
    ov.onclick = _closeSB;
    document.body.appendChild(ov);
  }

  const btn = document.createElement('button');
  btn.id = 'hbg-btn';
  btn.style.cssText = 'display:none;background:none;border:none;cursor:pointer;padding:6px;border-radius:8px;color:var(--txt-md);margin-right:4px;flex-shrink:0;-webkit-tap-highlight-color:transparent;';
  btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  btn.onclick = function(){
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sb-ov');
    const open = sb.classList.toggle('sb-open');
    if(ov) ov.style.display = open ? 'block' : 'none';
    document.body.style.overflow = open ? 'hidden' : '';
  };
  hdr.insertBefore(btn, hdr.firstChild);
}

function _checkLayout(){
  const btn = document.getElementById('hbg-btn');
  const main = document.getElementById('main');
  if(!btn) return;
  const mobile = window.innerWidth <= 900;
  btn.style.display = mobile ? 'inline-flex' : 'none';
  if(main) main.style.marginLeft = mobile ? '0' : 'var(--sw,264px)';
  if(!mobile) _closeSB();
}

/* ══════════════════════════════════════════════════
   3. NAV ROLE BADGES
══════════════════════════════════════════════════ */
const NavBadges = {
  update(){
    const sess = DB.auth.session();
    if(!sess) return;
    const role = sess.role;
    const counts = {};
    try {
      const projs  = DB.sales.listProjects();
      const jos    = DB.operation.listJobOrders();
      const labPs  = DB.lab.listProjects();
      const alts   = DB.lab.listAlerts();
      const rps    = DB.report.listPlans();
      const invs   = DB.billing.listInvoices();

      if(role==='report'||role==='admin'){
        const n = rps.filter(r=>r.status==='pending').length;
        if(n) counts['report'] = n;
      }
      if(role==='operation'||role==='admin'){
        const existJO = jos.map(j=>j.project_id);
        const n = projs.filter(p=>p.status==='Closed'&&!existJO.includes(p.id)).length;
        if(n) counts['op_prep'] = n;
        const cklPend = projs.filter(p=>['Closed','Onsite'].includes(p.status)).filter(p=>{
          const ckl = _loadCkl(p.id);
          return Object.keys(ckl).filter(k=>!k.endsWith('_note')&&ckl[k]).length < 10;
        }).length;
        if(cklPend) counts['op_checklist'] = cklPend;
      }
      if(role==='lab'||role==='admin'){
        const existLab = labPs.map(l=>l.project_id);
        const n = projs.filter(p=>p.status==='Lab'&&!existLab.includes(p.id)).length;
        const crit = alts.filter(a=>!a.acknowledged).length;
        if(n+crit) counts['lab'] = n+crit;
      }
      if(role==='billing'||role==='admin'){
        const existInv = invs.map(i=>i.project_id);
        const n = projs.filter(p=>p.status==='Billing'&&!existInv.includes(p.id)).length;
        if(n) counts['billing'] = n;
      }
    } catch(e){ console.warn('NavBadges:', e); }

    document.querySelectorAll('.nav-item[data-page]').forEach(el=>{
      const pg = el.dataset.page;
      let b = el.querySelector('.nav-role-badge');
      const c = counts[pg]||0;
      if(c>0){
        if(!b){ b=document.createElement('span'); b.className='nav-role-badge'; el.appendChild(b); }
        b.textContent=c; b.style.display='inline-block';
      } else if(b){ b.style.display='none'; }
    });

    const total = Object.values(counts).reduce((s,v)=>s+v,0);
    const bell = document.getElementById('alert-count');
    if(bell){ bell.textContent=total; bell.style.display=total>0?'inline-block':'none'; }
  }
};
window.NavBadges = NavBadges;

/* helper: load checklist with correct key */
function _loadCkl(pid){ try{ return JSON.parse(localStorage.getItem('ckl__'+pid)||'{}'); }catch{ return {}; } }

/* 5. Calendar nav is now in buildNav via app.js */

// Patch Router - close sidebar + update badges
(function patchRouter(){
  const _orig = Router.navigate.bind(Router);
  Router.navigate = function(page){
    _orig(page);
    _closeSB();
    setTimeout(()=>NavBadges.update(), 300);
  };
})();

// Patch buildNav
(function patchBuildNav(){
  const _orig = window.buildNav;
  window.buildNav = function(){
    _orig && _orig();
    setTimeout(()=>{
      NavBadges.update();
      _initHamburger();
      _checkLayout();
      // Update header avatar
      const sess = DB.auth.session();
      if(sess){
        const av = document.getElementById('user-avatar');
        const hn = document.getElementById('header-user-name');
        const hr = document.getElementById('header-user-role');
        if(av) av.textContent = (sess.name||'U')[0].toUpperCase();
        if(hn) hn.textContent = sess.name;
        if(hr) hr.textContent = sess.role;
      }
    }, 80);
  };
})();

/* ══════════════════════════════════════════════════
   6. CRM — Add Job Type field + GPS pin
══════════════════════════════════════════════════ */
(function patchCRM(){
  if(!Pages.customers) return;
  // Mark that extension edit is active
  if(typeof EXT!=='undefined') EXT._crmEditOverridden = true;
  const _editImpl = function(id){
    const c = id ? DB.customer.getCustomer(id) : {};
    const f = (k,d='') => U.esc(c[k]||d);
    const sOpts = ['Prospect','Follow up','Negotiation','Closed']
      .map(s=>`<option value="${s}"${c.sales_status===s?' selected':''}>${s}</option>`).join('');
    const jtOpts = [''].concat(JOB_TYPES_ALL)
      .map(t=>`<option value="${t}"${c.job_type===t?' selected':''}>${t||'-- เลือกประเภทงาน --'}</option>`).join('');
    const lat = c.lat||'', lng = c.lng||'';

    Modal.open(`
    <div class="fr">
      <div class="fg"><label class="req">ชื่อบริษัท/องค์กร</label><input id="fc_co" value="${f('company_name')}"/></div>
      <div class="fg"><label>จำนวนพนักงานทั้งหมด</label><input id="fc_emp" type="number" value="${c.employee_count||0}"/></div>
    </div>
    <div class="fg"><label>ที่อยู่</label><textarea id="fc_addr">${f('address')}</textarea></div>
    <div class="fr">
      <div class="fg"><label>เบอร์ติดต่อ</label><input id="fc_ph" value="${f('phone')}"/></div>
      <div class="fg"><label>อีเมล</label><input id="fc_em" value="${f('email')}"/></div>
    </div>
    <div class="fr">
      <div class="fg"><label class="req">ผู้ติดต่อหลัก (HR/Safety/Owner)</label><input id="fc_cn" value="${f('contact_name')}"/></div>
      <div class="fg"><label>ตำแหน่ง/แผนก</label><input id="fc_cr" value="${f('contact_role')}"/></div>
    </div>
    <div class="divider"></div>
    <div class="fr">
      <div class="fg">
        <label class="req" style="display:flex;align-items:center;gap:6px">
          <span style="background:var(--teal);color:#fff;font-size:10px;padding:1px 7px;border-radius:10px;font-weight:700">ใหม่</span>
          ประเภทงาน
        </label>
        <select id="fc_jt" style="border-color:${c.job_type?'var(--teal)':'var(--bdr)'}">
          ${jtOpts}
        </select>
      </div>
      <div class="fg"><label>สถานะการขาย</label>
        <select id="fc_st"><option value="">-- เลือก --</option>${sOpts}</select>
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label>วันที่ติดต่อล่าสุด</label><input id="fc_lc" type="date" value="${f('last_contact')}"/></div>
    </div>
    <div class="fg"><label>Note (บันทึกการคุย เช่น ลูกค้ากังวลอะไร)</label><textarea id="fc_nt">${f('note')}</textarea></div>
    <div class="divider"></div>
    <div class="sec-title">📍 ปักหมุด Location</div>
    <div class="fr">
      <div class="fg"><label>Latitude</label><input id="fc_lat" value="${lat}" placeholder="เช่น 13.7563"/></div>
      <div class="fg"><label>Longitude</label><input id="fc_lng" value="${lng}" placeholder="เช่น 100.5018"/></div>
    </div>
    <div class="btn-grp mb4">
      <button type="button" class="btn btn-out btn-sm" onclick="EXT.crm.gps()">📍 ตำแหน่งปัจจุบัน</button>
      <button type="button" class="btn btn-out btn-sm" onclick="EXT.crm.maps()">🗺 Google Maps</button>
    </div>
    ${lat&&lng?`<div style="border-radius:10px;overflow:hidden;height:160px;border:1px solid var(--bdr)">
      <iframe src="https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed" style="width:100%;height:100%;border:none" loading="lazy"></iframe>
    </div>`:'<p class="t-sm t-muted">ใส่ Lat/Lng หรือกด "ตำแหน่งปัจจุบัน" เพื่อปักหมุดบนแผนที่</p>'}`,
    id?'แก้ไขข้อมูลลูกค้า':'เพิ่มลูกค้าใหม่', ()=>{
      const co = document.getElementById('fc_co').value.trim();
      if(!co) return U.toast('กรุณาใส่ชื่อบริษัท','danger');
      DB.customer.saveCustomer({
        id:id||undefined,
        company_name: co,
        address:      document.getElementById('fc_addr').value.trim(),
        phone:        document.getElementById('fc_ph').value.trim(),
        email:        document.getElementById('fc_em').value.trim(),
        contact_name: document.getElementById('fc_cn').value.trim(),
        contact_role: document.getElementById('fc_cr').value.trim(),
        employee_count: parseInt(document.getElementById('fc_emp').value)||0,
        job_type:     document.getElementById('fc_jt').value,
        sales_status: document.getElementById('fc_st').value,
        last_contact: document.getElementById('fc_lc').value,
        note:         document.getElementById('fc_nt').value.trim(),
        lat:          document.getElementById('fc_lat').value.trim(),
        lng:          document.getElementById('fc_lng').value.trim(),
      });
      Modal.close(); Pages.customers.render();
      U.toast(id?'✅ อัปเดตแล้ว':'✅ เพิ่มลูกค้าแล้ว');
    }, true);
  };
  Pages.customers.edit = _editImpl;
  // Also expose via EXT.crm for delegate call
  if(typeof EXT !== 'undefined') EXT.crm._editFull = _editImpl;
})();

/* ══════════════════════════════════════════════════
   7. SALES — fix tickHandover (DOM update)
══════════════════════════════════════════════════ */
(function patchSalesTick(){
  if(!Pages.sales) return;
  Pages.sales.tickHandover = function(id, val){
    const p = DB.sales.getProject(id); if(!p) return;
    DB.sales.saveProject({...p, handover_sent:val});
    // Immediate DOM feedback
    const cb = document.querySelector(`input[onchange*="tickHandover(${id}"]`);
    if(cb){
      cb.checked = val;
      const icon = cb.closest('td')?.querySelector('span');
    }
    U.toast(val?'✅ เอกสารเวียนส่งแล้ว':'↩ ยกเลิก');
    NavBadges.update();
  };
})();

/* ══════════════════════════════════════════════════
   8. OP PREP — fix สถานะเตรียมงาน (use ckl__ key)
     + Add JO summary section
══════════════════════════════════════════════════ */
(function patchOpPrep(){
  if(!Pages.op_prep) return;
  // Override the render to use correct ckl__ key
  const _orig = Pages.op_prep.render;
  Pages.op_prep.render = function(){
    const jos = DB.operation.listJobOrders();
    const canAdd = DB.auth.can('add','op_prep');
    const canEdit = DB.auth.can('edit','op_prep');
    const canDel  = DB.auth.can('delete','op_prep');

    const rows = jos.slice().reverse().map(jo=>{
      const p = DB.sales.getProject(jo.project_id);
      // Use correct ckl__ key
      const ckl = _loadCkl(jo.project_id);
      const cklDone = Object.keys(ckl).filter(k=>!k.endsWith('_note')&&ckl[k]).length;
      const isReady = cklDone>=10 && (jo.status==='Confirmed'||jo.status==='Completed');
      const readyBadge = isReady
        ? '<span class="badge b-completed" style="font-size:10px">✅ พร้อมออกหน่วย</span>'
        : `<span class="badge b-draft" style="font-size:10px">Checklist ${cklDone}/10${cklDone>=10?' (รอ Confirm)':''}</span>`;
      return `<tr>
        <td class="fw6">${p?.project_code||'-'}</td>
        <td>${U.esc(jo.company_name)}</td>
        <td>${U.fmtD(jo.onsite_date)}</td>
        <td>${(jo.headcount||0).toLocaleString()}</td>
        <td>${U.badge(jo.status||'Draft')}</td>
        <td>${readyBadge}</td>
        <td>
          ${canEdit?`<button class="btn btn-out btn-xs" onclick="Pages.op_prep.editJO(${jo.id})">แก้ไข</button>`:''}
          <button class="btn btn-pri btn-xs" onclick="Pages.op_prep.viewJO(${jo.id})">ดู/พิมพ์</button>
          ${canDel?`<button class="btn btn-danger btn-xs" onclick="Pages.op_prep.delJO(${jo.id})">ลบ</button>`:''}
        </td>
      </tr>`;
    }).join('');

    document.getElementById('content').innerHTML = `
    <div class="ph">
      <div><h2>📋 Operation — ใบแจ้งงาน</h2><p>สร้างและจัดการใบแจ้งงาน พร้อมพิมพ์ A4</p></div>
      ${canAdd?`<button class="btn btn-pri" onclick="Pages.op_prep.createJO()">+ สร้างใบแจ้งงาน</button>`:''}
    </div>
    <div class="card">
      <div style="padding:14px 18px 14px;border-bottom:1px solid rgba(255,255,255,.06)">
        <div style="position:relative">
          <span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:13px;pointer-events:none;opacity:.5">🔍</span>
          <input placeholder="ค้นหา Project, บริษัท, วันตรวจ..." autocomplete="off"
            oninput="(function(q){const tb=document.querySelector('#content .card .tbl-wrap tbody');if(!tb)return;q=q.toLowerCase();Array.from(tb.querySelectorAll('tr')).forEach(tr=>{tr.style.display=(!q||tr.textContent.toLowerCase().includes(q))?'':'none';});})(this.value)"
            onfocus="this.style.borderColor='var(--c-teal,#00B8AA)'" onblur="this.style.borderColor='rgba(255,255,255,.1)'"
            style="width:100%;padding:9px 12px 9px 34px;border:1.5px solid rgba(255,255,255,.1);border-radius:9px;font-size:13px;background:rgba(255,255,255,.06);color:#fff;font-family:'IBM Plex Sans Thai',sans-serif;outline:none;transition:border-color .2s"/>
        </div>
      </div>
      <div style="height:10px"></div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Project</th><th>บริษัท</th><th>วันตรวจ</th><th>จำนวน</th><th>ใบแจ้งงาน</th><th>สถานะเตรียมงาน</th><th></th></tr></thead>
        <tbody>${rows||'<tr><td colspan="7" class="empty"><div class="icon">📋</div><p>ยังไม่มีใบแจ้งงาน</p></td></tr>'}</tbody>
      </table></div>
    </div>`;
  };
})();

/* ══════════════════════════════════════════════════
   9. OP PREP — viewJO: Add summary section (fixed)
══════════════════════════════════════════════════ */
(function patchViewJO(){
  if(!Pages.op_prep) return;
  const _origView = Pages.op_prep.viewJO;
  Pages.op_prep.viewJO = function(id){
    _origView.call(this, id);
    // Wait for modal DOM then inject summary
    setTimeout(()=>EXT.opPrep.injectSummary(id), 200);
  };
})();

/* ══════════════════════════════════════════════════
   10. ONSITE — button already injected directly in app.js
══════════════════════════════════════════════════ */
// Button บันทึกงานออกหน่วย injected directly into loadProject in app.js

/* ══════════════════════════════════════════════════
   11. LINE NOTIFY CONFIG (injected into Config page)
══════════════════════════════════════════════════ */
(function patchConfigLine(){
  if(!Pages.config) return;
  const _orig = Pages.config.render;
  Pages.config.render = function(){
    _orig.call(this);
    setTimeout(()=>{
      const c = document.getElementById('content');
      if(!c || c.querySelector('#ext-line-card')) return;
      const tok = (typeof LineNotify!=='undefined' && LineNotify.getToken()) || '';
      const prx = localStorage.getItem('line_proxy_url')||'';
      const card = document.createElement('div');
      card.id = 'ext-line-card'; card.className = 'card mt4';
      const tok2 = typeof LineNotify!=='undefined' ? (LineNotify.getToken()||'') : '';
      const toId = typeof LineNotify!=='undefined' ? (LineNotify.getTo()||'') : '';
      const prx2 = typeof LineNotify!=='undefined' ? (LineNotify.getProxy()||'') : '';
      card.innerHTML = `
      <div class="card-header">
        <span class="card-title">💬 LINE Messaging API — แจ้งเตือนอัตโนมัติ</span>
        <button class="btn btn-suc btn-sm" onclick="EXT.line.test()">🧪 ทดสอบส่ง</button>
      </div>
      <div class="ab info mb4">
        <div>
          <div class="fw6">เชื่อมต่อผ่าน LINE Messaging API</div>
          <div style="font-size:11px;margin-top:2px">แจ้งเตือน TAT/SLA ใกล้ครบกำหนด, วันตรวจใกล้ถึง (3 วัน), Critical Value</div>
        </div>
      </div>
      <div class="fr">
        <div class="fg">
          <label>Channel Access Token (Long-lived)</label>
          <input id="cfg_lt" type="password" placeholder="xxxxxxxxxxxxxxxxx" value="${tok2?'••••••':''}"/>
          <div class="t-xs t-muted mt2">จาก LINE Developers Console → Messaging API → Channel Access Token</div>
        </div>
        <div class="fg">
          <label>User ID / Group ID (ปลายทาง)</label>
          <input id="cfg_to" placeholder="Uxxxx / Cxxxx / Rxxxx" value="${U.esc(toId)}"/>
          <div class="t-xs t-muted mt2">userId, groupId หรือ roomId ที่จะรับแจ้งเตือน</div>
        </div>
      </div>
      <div class="fg">
        <label>Proxy URL (Netlify/Supabase Function)</label>
        <input id="cfg_px" value="${U.esc(prx2)}" placeholder="https://xxx.netlify.app/.netlify/functions/line-proxy"/>
        <div class="t-xs t-muted mt2">Proxy จำเป็นเพราะ Browser ไม่สามารถเรียก LINE API โดยตรงได้ (CORS) — ดู DEPLOY.md สำหรับวิธีตั้งค่า</div>
      </div>
      <button class="btn btn-pri btn-sm" onclick="EXT.line.save()">💾 บันทึก</button>`;
      c.appendChild(card);
    }, 120);
  };
})();

/* ══════════════════════════════════════════════════
   12. EXT NAMESPACE
══════════════════════════════════════════════════ */
window.EXT = {
  crm: {
    gps(){
      if(!navigator.geolocation){ U.toast('Browser ไม่รองรับ GPS','warning'); return; }
      navigator.geolocation.getCurrentPosition(pos=>{
        const lat = document.getElementById('fc_lat');
        const lng = document.getElementById('fc_lng');
        if(lat) lat.value = pos.coords.latitude.toFixed(6);
        if(lng) lng.value = pos.coords.longitude.toFixed(6);
        U.toast('✅ ได้ตำแหน่งปัจจุบันแล้ว');
      }, ()=>U.toast('ไม่สามารถดึงตำแหน่งได้','warning'));
    },
    maps(){
      const lat = document.getElementById('fc_lat')?.value;
      const lng = document.getElementById('fc_lng')?.value;
      const addr = document.getElementById('fc_addr')?.value;
      const q = (lat&&lng) ? `${lat},${lng}` : encodeURIComponent(addr||'');
      window.open(`https://maps.google.com/maps?q=${q}`, '_blank');
    },
  },

  opPrep: {
    injectSummary(joid){
      const sts = DB.operation.listStations(joid);
      if(!sts.length) return;
      // Try jo-preview-wrap (the actual container used in viewJO)
      const preview = document.getElementById('jo-preview-wrap') || document.getElementById('jo-preview');
      if(!preview || preview.querySelector('#jo-summary')) return;

      // Count by profession
      const profCount = {};
      const typeCount = {};
      sts.forEach(s=>{
        profCount[s.profession||'ไม่ระบุ'] = (profCount[s.profession||'ไม่ระบุ']||0) + (s.staff_count||1);
        typeCount[s.staff_type||'ไม่ระบุ']  = (typeCount[s.staff_type||'ไม่ระบุ']||0)  + (s.staff_count||1);
      });
      const totalStaff = sts.reduce((s,x)=>s+(x.staff_count||1),0);

      const summaryHtml = `<div id="jo-summary" style="margin-top:16px;padding:14px;background:var(--surf2);border-radius:10px;border:1px solid var(--bdr)">
        <div class="sec-title">สรุปอัตรากำลังทั้งหมด</div>
        <div class="g2 mt2">
          <div>
            <div class="t-xs t-muted fw6" style="margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">แยกตามวิชาชีพ</div>
            ${Object.entries(profCount).map(([k,v])=>
              `<div class="sr"><span>${k}</span><span class="fw6">${v} คน</span></div>`
            ).join('')}
          </div>
          <div>
            <div class="t-xs t-muted fw6" style="margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">แยกตามประเภท</div>
            ${Object.entries(typeCount).map(([k,v])=>
              `<div class="sr"><span>${k}</span><span class="fw6">${v} คน</span></div>`
            ).join('')}
            <div class="sr" style="border-top:2px solid var(--bdr-dk);margin-top:4px"><span class="fw6">รวมทั้งหมด</span><span class="fw6" style="color:var(--teal)">${totalStaff} คน</span></div>
          </div>
        </div>
      </div>`;

      preview.insertAdjacentHTML('beforeend', summaryHtml);
    },
  },

  onsite: {
    recordForm(pid){
      if(!pid){ U.toast('กรุณาเลือก Project ก่อน','warning'); return; }
      const p = DB.sales.getProject(pid); if(!p){ U.toast('ไม่พบข้อมูล Project','warning'); return; }
      const jo = DB.operation.getJobOrder(pid);
      const sess = DB.auth.session();
      // conditional detail rows
      const yesNo=(id,label,yesLbl,noLbl,detailLabel)=>`
      <div style="margin-bottom:14px;padding:12px 14px;background:var(--s-2,#172236);border-radius:10px;border:1px solid rgba(255,255,255,.06)">
        <div style="font-size:13px;font-weight:600;color:var(--t-bright,#F0F4FA);margin-bottom:10px">${label}</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:13px;color:var(--t-body,#C2CEDF)">
            <input type="radio" name="${id}" value="yes" onclick="document.getElementById('${id}_detail_wrap').style.display='none'" style="accent-color:var(--c-suc,#0E9F6E)"/> ${yesLbl}
          </label>
          <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:13px;color:var(--t-body,#C2CEDF)">
            <input type="radio" name="${id}" value="no" onclick="document.getElementById('${id}_detail_wrap').style.display='block'" style="accent-color:var(--c-danger,#F03E58)"/> ${noLbl}
          </label>
        </div>
        <div id="${id}_detail_wrap" style="display:none;margin-top:10px">
          <textarea id="${id}_detail" placeholder="${detailLabel}" style="width:100%;padding:8px 10px;border:1.5px solid rgba(255,255,255,.1);border-radius:8px;font-size:12px;font-family:'IBM Plex Sans Thai',sans-serif;background:var(--s-3,#1D2B42);color:var(--t-bright,#F0F4FA);min-height:60px;resize:vertical"></textarea>
        </div>
      </div>`;
      Modal.open(`
      <div style="background:linear-gradient(90deg,var(--c-navy,#0B1D35),var(--c-navy-3,#172E55));border-radius:10px;padding:12px 16px;margin-bottom:16px">
        <div style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:2px">Project</div>
        <div style="font-size:15px;font-weight:700;color:#fff">${p.project_code} | ${U.esc(p.company_name)}</div>
        <div style="font-size:11px;color:rgba(255,255,255,.5);margin-top:2px">${U.fmtD(p.onsite_date)} | ${(p.headcount||0).toLocaleString()} คน</div>
      </div>

      <div class="fg">
        <label>ชื่อบริษัท</label>
        <input value="${U.esc(p.company_name)}" readonly style="background:var(--s-3,#1D2B42);opacity:.7;cursor:not-allowed"/>
      </div>
      <div class="fg">
        <label class="req">ชื่อ Director</label>
        <input id="ons_dir" value="${U.esc(jo?.director||'')}"/>
      </div>

      <div class="sec-title" style="margin-top:8px">แบบฟอร์มบันทึกงานออกหน่วย</div>

      ${yesNo('ons_q1','1. ปัญหาด้านการเตรียมพร้อมของอุปกรณ์สำหรับออกหน่วยตรวจสุขภาพในแต่ละจุด','1.1 ไม่มี','1.2 มี — ระบุรายละเอียด','ระบุรายละเอียดปัญหา...')}
      ${yesNo('ons_q2','2. การเดินทางออกจากศูนย์ OcciCare ตรงกับเวลาที่ระบุไว้ในใบแจ้งงาน','2.1 ตรงเวลา','2.2 ไม่ตรงเวลา — ระบุเหตุผล','เหตุผลที่ไม่ตรงเวลา...')}
      ${yesNo('ons_q3','3. เดินทางมาถึงสถานที่ตรวจสุขภาพตรงกับเวลาเข้าพื้นที่ที่ระบุไว้ในใบแจ้งงาน','3.1 ตรงเวลา / ก่อนเวลา','3.2 ไม่ตรงเวลา — ระบุเหตุผล','เหตุผลที่ไม่ตรงเวลา...')}
      ${yesNo('ons_q4','4. จัดสถานที่ รวมถึงจุดตรวจแต่ละจุดจนพร้อมสำหรับตรวจสุขภาพ ก่อนเวลาเริ่มที่ระบุไว้ในใบแจ้งงาน','4.1 พร้อม','4.2 ไม่พร้อม — ระบุรายละเอียด','รายละเอียด...')}
      ${yesNo('ons_q5','5. Director มีการ Morning Brief ก่อนเริ่มตรวจสุขภาพ','5.1 มี','5.2 ไม่มี — ระบุเหตุผล','เหตุผล...')}
      ${yesNo('ons_q6','6. การให้ความร่วมมือของเจ้าหน้าที่ที่ออกหน่วยตรวจสุขภาพ (ช่วยยกของ ซัพพอร์ต เรียง และนับผลดิบ)','6.1 มี','6.2 ไม่มี — ระบุรายละเอียด','รายละเอียด...')}
      ${yesNo('ons_q7','7. ปัญหาหน้างานระหว่างการปฏิบัติงานออกหน่วยตรวจสุขภาพเคลื่อนที่','7.1 ไม่มี','7.2 มี — ระบุรายละเอียด','รายละเอียดปัญหา...')}

      <div class="fg">
        <label>8. หมายเหตุ / อื่นๆ / เพิ่มเติม</label>
        <textarea id="ons_q8" placeholder="บันทึกเพิ่มเติม..."></textarea>
      </div>
      <div class="fg">
        <label>บันทึกโดย</label>
        <input value="${U.esc(sess?.name||sess?.username||'-')}" readonly
          style="background:var(--s-3,#1D2B42);opacity:.7;cursor:not-allowed;font-family:'IBM Plex Mono',monospace"/>
      </div>`,
      'บันทึกงานออกหน่วย', ()=>{
        const getQ=(id)=>({
          ans:document.querySelector(`input[name="${id}"]:checked`)?.value||'',
          detail:document.getElementById(id+'_detail')?.value||''
        });
        const dir=document.getElementById('ons_dir').value.trim();
        if(!dir)return U.toast('กรุณาใส่ชื่อ Director','danger');
        const answers={};
        for(let i=1;i<=7;i++) answers['q'+i]=getQ('ons_q'+i);
        // Save as onsite summary log
        DB.operation.saveOnsiteLog({
          project_id: pid,
          station_code: 'REPORT',
          station_name: 'สรุปบันทึกงานออกหน่วย',
          onsite_date: p.onsite_date,
          director: dir,
          company_name: p.company_name,
          q1: answers.q1.ans, q1_detail: answers.q1.detail,
          q2: answers.q2.ans, q2_detail: answers.q2.detail,
          q3: answers.q3.ans, q3_detail: answers.q3.detail,
          q4: answers.q4.ans, q4_detail: answers.q4.detail,
          q5: answers.q5.ans, q5_detail: answers.q5.detail,
          q6: answers.q6.ans, q6_detail: answers.q6.detail,
          q7: answers.q7.ans, q7_detail: answers.q7.detail,
          note: document.getElementById('ons_q8').value,
          recorded_by: sess?.name||sess?.username||'-',
        });
        Modal.close();
        if(Pages.op_onsite?.loadProject) Pages.op_onsite.loadProject(pid);
        U.toast('✅ บันทึกงานออกหน่วยสำเร็จ');
        if(typeof NavBadges!=='undefined') NavBadges.update();
      });
    },},

  line: {
    save(){
      const t = document.getElementById('cfg_lt')?.value;
      const to = document.getElementById('cfg_to')?.value.trim();
      const p = document.getElementById('cfg_px')?.value.trim();
      if(typeof LineNotify!=='undefined'){
        if(t && !t.includes('•')) LineNotify.setToken(t);
        if(to) LineNotify.setTo(to);
        if(p) LineNotify.setProxy(p);
      }
      U.toast('✅ บันทึก LINE Messaging API Config แล้ว');
    },
    async test(){
      if(typeof LineNotify==='undefined'){ U.toast('Line Notify ไม่พร้อม','warning'); return; }
      const r = await LineNotify.send('🧪 [MCK] ทดสอบแจ้งเตือน OcciCare Mobile Checkup ✅');
      U.toast(r.ok?'✅ ส่ง Line สำเร็จ':'❌ '+r.msg, r.ok?'success':'danger');
    },
  },
};

/* ══════════════════════════════════════════════════
   13. LINE ALERT RUNNER
══════════════════════════════════════════════════ */
function _runLineAlerts(){
  if(typeof LineNotify==='undefined' || !LineNotify.getToken()) return;
  const ad = DB.config.getAlertDays();
  const sk = 'line_sent_v2';
  let sent = {};
  try{ sent = JSON.parse(localStorage.getItem(sk)||'{}'); }catch{}
  const today = new Date().toDateString();
  if(sent.date!==today) sent = {date:today, keys:{}};
  const go = async(key,fn)=>{
    if(sent.keys[key]) return;
    try{const r=await fn();if(r?.ok){sent.keys[key]=true;localStorage.setItem(sk,JSON.stringify(sent));}}catch{}
  };
  DB.lab.listProjects().forEach(lp=>{
    if(!lp.tat_deadline||lp.status==='reported') return;
    const d = Math.ceil((new Date(lp.tat_deadline)-new Date())/86400000);
    const p = DB.sales.getProject(lp.project_id); if(!p) return;
    if(d<0)     go('to_'+p.id, ()=>LineNotify.notifyTAT(p.project_code,p.company_name,d));
    else if(d<=ad) go('tw_'+p.id+'_'+d, ()=>LineNotify.notifyTAT(p.project_code,p.company_name,d));
  });
  DB.report.listPlans().forEach(rp=>{
    if(!rp.sla_deadline||rp.status==='sent') return;
    const d = Math.ceil((new Date(rp.sla_deadline)-new Date())/86400000);
    const p = DB.sales.getProject(rp.project_id); if(!p) return;
    if(d<0)     go('so_'+p.id, ()=>LineNotify.notifySLA(p.project_code,p.company_name,d));
    else if(d<=ad) go('sw_'+p.id+'_'+d, ()=>LineNotify.notifySLA(p.project_code,p.company_name,d));
  });
  DB.sales.listProjects().forEach(p=>{
    if(!p.onsite_date) return;
    const d = Math.ceil((new Date(p.onsite_date)-new Date())/86400000);
    if(d>=0&&d<=3) go('ons_'+p.id+'_'+d, ()=>LineNotify.notifyOnsiteApproaching(p.project_code,p.company_name,p.onsite_date,d));
  });
}

/* ══════════════════════════════════════════════════
   14. INIT on window load
══════════════════════════════════════════════════ */
/* ══ GLOBAL CHECKBOX VISUAL FEEDBACK ══ */
function _enhanceCheckboxes(){
  // Use event delegation on document for all dynamic checkboxes
  document.addEventListener('change', function(e){
    const cb = e.target;
    if(cb.type !== 'checkbox') return;
    const row = cb.closest('tr');
    if(row){
      // Highlight entire table row
      if(cb.checked){
        row.style.background = '#F0FDF4';
        row.classList.add('tbl-ck-done');
      } else {
        row.style.background = '';
        row.classList.remove('tbl-ck-done');
      }
    }
    // ck-wrap parent
    const wrap = cb.closest('.ck-wrap');
    if(wrap){
      wrap.style.background = cb.checked ? '#F0FDF4' : '';
      wrap.style.borderColor = cb.checked ? '#86EFAC' : '';
      const lbl = wrap.querySelector('.ck-label');
      if(lbl) lbl.style.color = cb.checked ? 'var(--suc)' : '';
      const icon = wrap.querySelector('.ck-icon');
      if(icon){ icon.textContent = cb.checked ? '✅' : ''; icon.style.opacity = cb.checked ? '1' : '0'; }
    }
    // label parent (editPlan checkboxes)
    const labelEl = cb.closest('label[style*="border-radius"]');
    if(labelEl && !wrap){
      labelEl.style.background = cb.checked ? '#F0FDF4' : 'var(--surf2)';
      labelEl.style.borderColor = cb.checked ? '#86EFAC' : 'var(--bdr)';
    }
  }, true);
}

window.addEventListener('load', ()=>{
  _initHamburger();
  _checkLayout();
  window.addEventListener('resize', _checkLayout);
  _enhanceCheckboxes();
  NavBadges.update();
  setInterval(()=>NavBadges.update(), 30000);
  if(typeof LineNotify!=='undefined'){
    LineNotify.init();
    setTimeout(_runLineAlerts, 4000);
    setInterval(_runLineAlerts, 3600000);
  }
  console.log('✅ Extensions v5 loaded');
});
