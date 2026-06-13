/** Mobile Checkup DB v2 — auth_db + config_db + 6 logical DBs */
const DB={
  _get(db,t){return JSON.parse(localStorage.getItem(`${db}__${t}`)||'[]');},
  _set(db,t,d){localStorage.setItem(`${db}__${t}`,JSON.stringify(d));},
  _nextId(db,t){const r=this._get(db,t);return r.length>0?Math.max(...r.map(x=>x.id))+1:1;},
  _now(){return new Date().toISOString();},
  // ═══ Auto-stamp ผู้บันทึก/ผู้แก้ไข ═══
  _currentUser(){
    try {
      const s = JSON.parse(localStorage.getItem('mck_session')||'null');
      if(!s) return null;
      return {id:s.userId, name:s.name, role:s.role};
    } catch { return null; }
  },
  // ใส่ recorded_by/updated_by ลงใน data object ก่อน save
  // ใช้ทุกที่ที่เป็น "การบันทึก" — ทับเฉพาะถ้า admin ส่ง _override_recorded_by เข้ามา
  _stampUser(data, isCreate=false){
    if(!data || typeof data !== 'object') return data;
    const u = this._currentUser();
    if(!u) return data;
    const stamp = u.name + ' ('+u.username+')'.replace('(undefined)','').replace(' ()','');
    const niceStamp = u.name; // เก็บแค่ชื่อให้สั้นกระชับ
    // recorded_by: ลงครั้งแรก ไม่ทับ (เว้นแต่ admin override)
    if(isCreate || !data.recorded_by){
      // admin override: ถ้า data._override_recorded_by มาเอง (admin แก้ใน form) ใช้ตามนั้น
      if(data._override_recorded_by){ data.recorded_by = data._override_recorded_by; delete data._override_recorded_by; }
      else data.recorded_by = niceStamp;
    } else {
      // ถ้ามี recorded_by อยู่แล้ว และ admin ส่ง override → ทับ
      if(data._override_recorded_by){ data.recorded_by = data._override_recorded_by; delete data._override_recorded_by; }
    }
    // updated_by: ลงทุกครั้ง
    data.updated_by = niceStamp;
    return data;
  },
  _fmtD(d){
    if(!d) return '-';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'});
    } catch { return '-'; }
  },

  auth:{
    listUsers(){return DB._get('auth_db','users');},
    getUser(id){return DB._get('auth_db','users').find(r=>r.id===id)||null;},
    saveUser(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('auth_db','users');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('auth_db','users');data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('auth_db','users',rows);return data;
    },
    deleteUser(id){DB._set('auth_db','users',DB._get('auth_db','users').filter(r=>r.id!==id));},
    login(username,password){
      const users=DB._get('auth_db','users');
      const u=users.find(r=>r.username===username&&r.password===password&&r.active);
      if(u){
        // เก็บ last_login_at เดิมไว้ใน previous_login_at เพื่อใช้เทียบหา "งานใหม่"
        const prev=u.last_login_at||null;
        const now=DB._now();
        u.previous_login_at=prev;
        u.last_login_at=now;
        // บันทึก user กลับ
        const idx=users.findIndex(r=>r.id===u.id);
        if(idx>=0){users[idx]=u;DB._set('auth_db','users',users);}
        // เก็บใน session ด้วย เพื่อให้ frontend อ่านได้สะดวก
        localStorage.setItem('mck_session',JSON.stringify({
          userId:u.id,role:u.role,name:u.name,ts:Date.now(),
          previous_login_at:prev
        }));
      }
      return u||null;
    },
    logout(){localStorage.removeItem('mck_session');},
    forceReseed(){
      // Clears all DB and reseeds — use if missing users/roles
      ['auth_db','customer_db','sales_db','operation_db','lab_db','report_db',
       'billing_db','config_db','quotation_db','files_db'].forEach(db=>{
        Object.keys(localStorage).filter(k=>k.startsWith(db+'__')).forEach(k=>localStorage.removeItem(k));
      });
      DB.seedMockData();
      console.log('✅ Reseed complete');
    },
    session(){
      const s=localStorage.getItem('mck_session');
      if(!s)return null;
      const d=JSON.parse(s);
      if(Date.now()-d.ts>8*3600*1000){localStorage.removeItem('mck_session');return null;}
      return d;
    },
    listRoles(){return DB._get('auth_db','role_permissions');},
    getRolePermission(role){return DB._get('auth_db','role_permissions').find(r=>r.role===role)||null;},
    saveRolePermission(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('auth_db','role_permissions');
      const i=rows.findIndex(r=>r.role===data.role);
      if(i>=0)rows[i]={...rows[i],...data,updated_at:DB._now()};
      else{data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('auth_db','role_permissions',rows);return data;
    },
    can(action,module){
      const s=this.session();if(!s)return false;
      if(s.role==='admin')return true;
      const rp=this.getRolePermission(s.role);
      if(!rp||!rp.modules)return false;
      const m=rp.modules[module];
      return !!(m&&m[action]);
    }
  },

  config:{
    get(key,def=null){const v=localStorage.getItem(`config__${key}`);return v!==null?JSON.parse(v):def;},
    set(key,val){localStorage.setItem(`config__${key}`,JSON.stringify(val));},
    getTAT(){return this.get('tat',{small:15,large:20,threshold:2000});},
    setTAT(v){this.set('tat',v);},
    getSLA(){return this.get('sla',{days_after_tat:7});},
    setSLA(v){this.set('sla',v);},
    getAlertDays(){return this.get('alert_days',3);},
    setAlertDays(v){this.set('alert_days',v);},
    getXrayAlertDays(){return this.get('xray_alert_days',7);},
    setXrayAlertDays(v){this.set('xray_alert_days',v);}
  },

  customer:{
    listCustomers(){return DB._get('customer_db','customers');},
    getCustomer(id){return DB._get('customer_db','customers').find(r=>r.id===id)||null;},
    saveCustomer(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('customer_db','customers');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('customer_db','customers');data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('customer_db','customers',rows);return data;
    },
    deleteCustomer(id){DB._set('customer_db','customers',DB._get('customer_db','customers').filter(r=>r.id!==id));},
    listSalesLogs(cid){return DB._get('customer_db','sales_logs').filter(r=>r.customer_id===cid);},
    addSalesLog(data){data=DB._stampUser(data, !data.id);const rows=DB._get('customer_db','sales_logs');data.id=DB._nextId('customer_db','sales_logs');data.created_at=DB._now();rows.push(data);DB._set('customer_db','sales_logs',rows);return data;}
  },

  sales:{
    listProjects(){return DB._get('sales_db','projects');},
    // ─── อัตรากำลัง (Staffing) ที่ Sales ลงไว้ใน Project ───
    getStaffing(projectId){
      const rows = DB._get('sales_db','staffing')||[];
      return rows.find(r=>r.project_id===projectId)||null;
    },
    saveStaffing(data){
      data = DB._stampUser(data, !data.id);
      const rows = DB._get('sales_db','staffing')||[];
      const idx = rows.findIndex(r=>r.project_id===data.project_id);
      if(idx >= 0){
        rows[idx] = {...rows[idx], ...data, updated_at:DB._now()};
      } else {
        data.id = DB._nextId('sales_db','staffing');
        data.created_at = DB._now();
        data.updated_at = DB._now();
        rows.push(data);
      }
      DB._set('sales_db','staffing',rows);
      return rows.find(r=>r.project_id===data.project_id);
    },
    removeStaffing(projectId){
      DB._set('sales_db','staffing', (DB._get('sales_db','staffing')||[]).filter(r=>r.project_id!==projectId));
    },
    getProject(id){return DB._get('sales_db','projects').find(r=>r.id===id)||null;},
    saveProject(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('sales_db','projects');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('sales_db','projects');if(!data.project_code){const d=new Date();data.project_code=`MCK-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(data.id).padStart(3,'0')}`;}data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('sales_db','projects',rows);return data;
    },
    deleteProject(id){DB._set('sales_db','projects',DB._get('sales_db','projects').filter(r=>r.id!==id));},
    listHandovers(){return DB._get('sales_db','internal_handover');},
    getHandover(pid){return DB._get('sales_db','internal_handover').find(r=>r.project_id===pid)||null;},
    saveHandover(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('sales_db','internal_handover');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('sales_db','internal_handover');data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('sales_db','internal_handover',rows);return data;
    }
  },

  operation:{
    listJobOrders(){return DB._get('operation_db','job_orders');},
    getJobOrder(pid){return DB._get('operation_db','job_orders').find(r=>r.project_id===pid)||null;},
    getJobOrderById(id){return DB._get('operation_db','job_orders').find(r=>r.id===id)||null;},
    saveJobOrder(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('operation_db','job_orders');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('operation_db','job_orders');data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('operation_db','job_orders',rows);return data;
    },
    listStations(joid){return DB._get('operation_db','job_stations').filter(r=>r.job_order_id===joid);},
    saveStation(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('operation_db','job_stations');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('operation_db','job_stations');data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('operation_db','job_stations',rows);return data;
    },
    deleteStation(id){DB._set('operation_db','job_stations',DB._get('operation_db','job_stations').filter(r=>r.id!==id));},
    listVehicles(joid){return DB._get('operation_db','job_vehicles').filter(r=>r.job_order_id===joid);},
    saveVehicle(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('operation_db','job_vehicles');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('operation_db','job_vehicles');data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('operation_db','job_vehicles',rows);return data;
    },
    deleteVehicle(id){DB._set('operation_db','job_vehicles',DB._get('operation_db','job_vehicles').filter(r=>r.id!==id));},
    listEquipments(joid){return DB._get('operation_db','job_equipments').filter(r=>r.job_order_id===joid);},
    saveEquipment(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('operation_db','job_equipments');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('operation_db','job_equipments');data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('operation_db','job_equipments',rows);return data;
    },
    deleteEquipment(id){DB._set('operation_db','job_equipments',DB._get('operation_db','job_equipments').filter(r=>r.id!==id));},
    listOnsiteLogs(pid){return DB._get('operation_db','onsite_logs').filter(r=>r.project_id===pid);},
    saveOnsiteLog(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('operation_db','onsite_logs');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('operation_db','onsite_logs');data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('operation_db','onsite_logs',rows);return data;
    },
    deleteOnsiteLog(id){DB._set('operation_db','onsite_logs',DB._get('operation_db','onsite_logs').filter(r=>r.id!==id));},
    listSpecimens(pid){return DB._get('operation_db','specimen_tracking').filter(r=>r.project_id===pid);},
    saveSpecimen(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('operation_db','specimen_tracking');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('operation_db','specimen_tracking');data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('operation_db','specimen_tracking',rows);return data;
    }
  },

  lab:{
    listProjects(){return DB._get('lab_db','lab_projects');},
    getLabProject(pid){return DB._get('lab_db','lab_projects').find(r=>r.project_id===pid)||null;},
    saveLabProject(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('lab_db','lab_projects');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('lab_db','lab_projects');data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('lab_db','lab_projects',rows);return data;
    },
    listAlerts(){return DB._get('lab_db','critical_alerts');},
    listAlertsByProject(pid){return DB._get('lab_db','critical_alerts').filter(r=>r.project_id===pid);},
    saveAlert(data){data=DB._stampUser(data, !data.id);const rows=DB._get('lab_db','critical_alerts');data.id=DB._nextId('lab_db','critical_alerts');data.created_at=DB._now();rows.push(data);DB._set('lab_db','critical_alerts',rows);return data;},
    ackAlert(id){const rows=DB._get('lab_db','critical_alerts');const a=rows.find(r=>r.id===id);if(a)a.acknowledged=true;DB._set('lab_db','critical_alerts',rows);},
    listQCLogs(pid){return DB._get('lab_db','qc_logs').filter(r=>r.project_id===pid);},
    saveQCLog(data){data=DB._stampUser(data, !data.id);const rows=DB._get('lab_db','qc_logs');data.id=DB._nextId('lab_db','qc_logs');data.created_at=DB._now();rows.push(data);DB._set('lab_db','qc_logs',rows);return data;}
  },

  report:{
    listPlans(){return DB._get('report_db','project_plan');},
    getPlan(pid){return DB._get('report_db','project_plan').find(r=>r.project_id===pid)||null;},
    savePlan(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('report_db','project_plan');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('report_db','project_plan');data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('report_db','project_plan',rows);return data;
    },
    listPatients(pid){return DB._get('report_db','patient_list').filter(r=>r.project_id===pid);},
    savePatient(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('report_db','patient_list');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('report_db','patient_list');data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('report_db','patient_list',rows);return data;
    },
    listRawData(pid){return DB._get('report_db','raw_data').filter(r=>r.project_id===pid);},
    saveRawData(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('report_db','raw_data');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('report_db','raw_data');data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('report_db','raw_data',rows);return data;
    }
  },

  quotation:{
    _nextQtNo(){
      const all=DB._get('quotation_db','quotations');
      const y=new Date().getFullYear().toString().substr(-2);
      const seq=all.filter(q=>q.qt_no&&q.qt_no.includes('QT-'+y)).length+1;
      return`QT-${y}-${String(seq).padStart(4,'0')}`;
    },
    listQuotations(){return DB._get('quotation_db','quotations');},
    getQuotation(id){return DB._get('quotation_db','quotations').find(r=>r.id===id)||null;},
    getByCustomer(cid){return DB._get('quotation_db','quotations').filter(r=>r.customer_id===cid);},
    saveQuotation(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('quotation_db','quotations');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('quotation_db','quotations');data.qt_no=this._nextQtNo();data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('quotation_db','quotations',rows);return data;
    },
    deleteQuotation(id){DB._set('quotation_db','quotations',DB._get('quotation_db','quotations').filter(r=>r.id!==id));},
    listItems(qtId){return DB._get('quotation_db','items').filter(r=>r.quotation_id===qtId);},
    saveItem(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('quotation_db','items');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('quotation_db','items');data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('quotation_db','items',rows);return data;
    },
    saveItems(qtId,items){
      // Replace all items for this quotation
      const existing=DB._get('quotation_db','items').filter(r=>r.quotation_id!==qtId);
      const newItems=items.map((it,i)=>({...it,id:Date.now()+i,quotation_id:qtId,created_at:DB._now(),updated_at:DB._now()}));
      DB._set('quotation_db','items',[...existing,...newItems]);
    },
    deleteItem(id){DB._set('quotation_db','items',DB._get('quotation_db','items').filter(r=>r.id!==id));},
    listApprovals(qtId){return DB._get('quotation_db','approvals').filter(r=>r.quotation_id===qtId);},
    saveApproval(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('quotation_db','approvals');
      data.id=DB._nextId('quotation_db','approvals');data.created_at=DB._now();data.updated_at=DB._now();
      rows.push(data);DB._set('quotation_db','approvals',rows);return data;
    },
    // Custom packages per project/company
    listCustomPkgs(qtId){return DB._get('quotation_db','custom_pkgs').filter(r=>r.quotation_id===qtId);},
    saveCustomPkg(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('quotation_db','custom_pkgs');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('quotation_db','custom_pkgs');data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('quotation_db','custom_pkgs',rows);return data;
    },
    deleteCustomPkg(id){DB._set('quotation_db','custom_pkgs',DB._get('quotation_db','custom_pkgs').filter(r=>r.id!==id));},
  },

  /* ── CONFIG: Exam Items (รายการตรวจ) ── */
  examItems:{
    list(){return DB._get('config_db','exam_items');},
    get(id){return DB._get('config_db','exam_items').find(r=>r.id===id)||null;},
    save(data){
      const rows=DB._get('config_db','exam_items');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('config_db','exam_items');data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('config_db','exam_items',rows);return data;
    },
    delete(id){DB._set('config_db','exam_items',DB._get('config_db','exam_items').filter(r=>r.id!==id));},
    seedDefault(){
      if(DB._get('config_db','exam_items').length>0)return;
      const items=[
        {name:'CBC (เลือดสมบูรณ์)',        category:'Lab',cost:80,  price:150, unit:'ราย'},
        {name:'Urinalysis (ปัสสาวะ)',        category:'Lab',cost:40,  price:80,  unit:'ราย'},
        {name:'FBS (น้ำตาลเลือด)',           category:'Lab',cost:60,  price:120, unit:'ราย'},
        {name:'Cholesterol Total',            category:'Lab',cost:70,  price:140, unit:'ราย'},
        {name:'HDL / LDL',                   category:'Lab',cost:90,  price:180, unit:'ราย'},
        {name:'Triglyceride',                 category:'Lab',cost:70,  price:140, unit:'ราย'},
        {name:'Creatinine',                   category:'Lab',cost:80,  price:160, unit:'ราย'},
        {name:'SGOT / SGPT',                  category:'Lab',cost:90,  price:180, unit:'ราย'},
        {name:'Uric Acid',                    category:'Lab',cost:70,  price:140, unit:'ราย'},
        {name:'HbA1c',                        category:'Lab',cost:120, price:250, unit:'ราย'},
        {name:'Thyroid (TSH)',                category:'Lab',cost:150, price:300, unit:'ราย'},
        {name:'PSA (ชาย)',                    category:'Lab',cost:180, price:350, unit:'ราย'},
        {name:'X-Ray ปอด',                   category:'Xray',cost:200,price:350, unit:'ราย'},
        {name:'EKG (คลื่นหัวใจ)',             category:'EKG', cost:300,price:450, unit:'ราย'},
        {name:'Ultrasound ช่องท้อง',          category:'US',  cost:400,price:650, unit:'ราย'},
        {name:'Pap Smear',                    category:'Gyn', cost:350,price:550, unit:'ราย'},
        {name:'Mammogram',                    category:'Gyn', cost:600,price:950, unit:'ราย'},
        {name:'ตรวจสายตา/สีตา',              category:'ตรวจ',cost:50, price:200, unit:'ราย'},
        {name:'Audiogram (การได้ยิน)',        category:'ตรวจ',cost:80, price:250, unit:'ราย'},
        {name:'PE แพทย์',                    category:'แพทย์',cost:200,price:400, unit:'ราย'},
        {name:'PE แพทย์อาชีวเวช',            category:'แพทย์',cost:300,price:600, unit:'ราย'},
        {name:'น้ำหนัก/ส่วนสูง/BMI',         category:'ตรวจ',cost:20, price:50,  unit:'ราย'},
        {name:'ความดันโลหิต',                 category:'ตรวจ',cost:20, price:50,  unit:'ราย'},
        {name:'Lead in Blood',                category:'Lab', cost:300,price:600, unit:'ราย'},
        {name:'ATK / PCR Test',              category:'Lab', cost:80, price:150, unit:'ราย'},
      ];
      items.forEach(it=>{it.id=DB._nextId('config_db','exam_items');it.created_at=DB._now();it.updated_at=DB._now();});
      DB._set('config_db','exam_items',items);
    },
  },

  /* ── CONFIG: Manpower Cost (ต้นทุนอัตรากำลัง) ── */
  manpowerCost:{
    list(){return DB._get('config_db','manpower_cost');},
    save(data){
      const rows=DB._get('config_db','manpower_cost');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('config_db','manpower_cost');data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('config_db','manpower_cost',rows);return data;
    },
    delete(id){DB._set('config_db','manpower_cost',DB._get('config_db','manpower_cost').filter(r=>r.id!==id));},
    seedDefault(){
      if(DB._get('config_db','manpower_cost').length>0)return;
      const items=[
        {role:'แพทย์ (MD)',          type:'Staff',   cost_per_day:3000, cost_per_head:0, unit:'คน/วัน'},
        {role:'พยาบาล (RN)',          type:'Staff',   cost_per_day:1500, cost_per_head:0, unit:'คน/วัน'},
        {role:'นักเทคนิคการแพทย์ (MT)',type:'Staff',  cost_per_day:1200, cost_per_head:0, unit:'คน/วัน'},
        {role:'เจ้าหน้าที่ Part-time', type:'Parttime',cost_per_day:600, cost_per_head:0, unit:'คน/วัน'},
        {role:'Out Source Lab',        type:'OutSource',cost_per_day:0,  cost_per_head:50, unit:'บาท/ราย'},
        {role:'ค่าเดินทาง/รถ',        type:'Vehicle', cost_per_day:2000, cost_per_head:0, unit:'เที่ยว'},
        {role:'ค่าขนส่ง Specimen',    type:'Vehicle', cost_per_day:500,  cost_per_head:0, unit:'ครั้ง'},
      ];
      items.forEach(it=>{it.id=DB._nextId('config_db','manpower_cost');it.created_at=DB._now();it.updated_at=DB._now();});
      DB._set('config_db','manpower_cost',items);
    },
  },

  checklist:{
    getByProject(pid){
      const rows=DB._get('operation_db','checklists').filter(r=>r.project_id===pid);
      const result={};
      rows.forEach(r=>{
        result[r.item_key]=!!r.is_done;
        if(r.note)result[r.item_key+'_note']=r.note;
      });
      return result;
    },
    save(pid,itemKey,itemLabel,itemGroup,isDone,note){
      const rows=DB._get('operation_db','checklists');
      const existing=rows.find(r=>r.project_id===pid&&r.item_key===itemKey);
      if(existing){
        existing.is_done=isDone?1:0;
        existing.item_label=itemLabel;
        existing.item_group=itemGroup;
        existing.note=note||'';
        existing.done_at=isDone?DB._now():null;
        existing.updated_at=DB._now();
      } else {
        rows.push({
          id:DB._nextId('operation_db','checklists'),
          project_id:pid, item_key:itemKey, item_label:itemLabel,
          item_group:itemGroup, is_done:isDone?1:0,
          note:note||'', done_at:isDone?DB._now():null,
          created_at:DB._now(), updated_at:DB._now()
        });
      }
      DB._set('operation_db','checklists',rows);
    }
  },

  billing:{
    listInvoices(){return DB._get('billing_db','invoices');},
    getInvoice(pid){return DB._get('billing_db','invoices').find(r=>r.project_id===pid)||null;},
    saveInvoice(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('billing_db','invoices');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('billing_db','invoices');if(!data.invoice_no){const d=new Date();data.invoice_no=`INV-${d.getFullYear()}-${String(data.id).padStart(4,'0')}`;}data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('billing_db','invoices',rows);return data;
    },
    listCostTracking(pid){return DB._get('billing_db','cost_tracking').filter(r=>r.project_id===pid);},
    saveCostItem(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('billing_db','cost_tracking');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('billing_db','cost_tracking');data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('billing_db','cost_tracking',rows);return data;
    },
    deleteCostItem(id){DB._set('billing_db','cost_tracking',DB._get('billing_db','cost_tracking').filter(r=>r.id!==id));}
  },

  /* ── FILES (base64 storage in DB) ── */
  files:{
    /* key = "proj_PROJID" | "cust_CUSTID" | "onsite_PID" */
    listByContext(ctx){return DB._get('files_db','attachments').filter(r=>r.context===ctx);},
    getFile(id){return DB._get('files_db','attachments').find(r=>r.id===id)||null;},
    saveFile(data){
      data=DB._stampUser(data, !data.id);
      const rows=DB._get('files_db','attachments');
      if(data.id){const i=rows.findIndex(r=>r.id===data.id);rows[i]={...rows[i],...data,updated_at:DB._now()};}
      else{data.id=DB._nextId('files_db','attachments');data.created_at=DB._now();data.updated_at=DB._now();rows.push(data);}
      DB._set('files_db','attachments',rows);return data;
    },
    deleteFile(id){DB._set('files_db','attachments',DB._get('files_db','attachments').filter(r=>r.id!==id));},
    deleteByContext(ctx,catKey){
      const rows=DB._get('files_db','attachments').filter(r=>!(r.context===ctx&&(!catKey||r.category===catKey)));
      DB._set('files_db','attachments',rows);
    },
    /* Read file as base64 */
    readAsBase64(file){
      return new Promise((res,rej)=>{
        const reader=new FileReader();
        reader.onload=e=>res(e.target.result); // data:mime;base64,...
        reader.onerror=rej;
        reader.readAsDataURL(file);
      });
    },
    async addFiles(ctx,catKey,catLabel,fileList){
      const results=[];
      for(const f of Array.from(fileList)){
        // Store base64 for small files (< 5MB), metadata only for larger
        let data64='';
        if(f.size<=5*1024*1024){
          try{data64=await this.readAsBase64(f);}catch{}
        }
        const rec=this.saveFile({
          context:ctx, category:catKey, category_label:catLabel,
          name:f.name, mime_type:f.type,
          size_bytes:f.size,
          size_label:f.size>1048576?`${(f.size/1048576).toFixed(1)}MB`:`${Math.round(f.size/1024)}KB`,
          data:data64, // base64 string or empty if too large
          uploaded_by:DB.auth.session()?.name||'',
          note:'',
        });
        results.push(rec);
      }
      return results;
    },
  },


  /* ── XRAY ── */
  xray:{
    _k(pid){return 'xray_meta_'+pid;},
    getMeta(pid){try{return JSON.parse(localStorage.getItem(this._k(pid))||'null');}catch{return null;}},
    saveMeta(d){localStorage.setItem(this._k(d.project_id),JSON.stringify(d));return d;},
    listAll(){
      const projs=DB.sales.listProjects();
      return projs.map(p=>{const m=this.getMeta(p.id);return{...p,xray_meta:m};}).filter(p=>p.xray_meta||['Lab','Report','Billing','Completed'].includes(p.status));
    },
  },

  checkAlerts(){
    const alerts=[];const today=new Date();
    const ad=DB.config.getAlertDays();
    const xrayAlertDays=DB.config.getXrayAlertDays();
    const fmtD=(d)=>{
      if(!d)return'-';
      const dt=new Date(d);
      return dt.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'});
    };
    // ── TAT Deadline Lab ── (auto-hide ถ้า reported หรือ completed)
    DB.lab.listProjects().forEach(lp=>{
      if(!lp.tat_deadline)return;
      if(['reported','completed','approved'].includes(lp.status))return;
      const d=Math.ceil((new Date(lp.tat_deadline)-today)/86400000);
      const p=DB.sales.getProject(lp.project_id);
      const nm=p?p.company_name:`#${lp.project_id}`;
      const code=p?p.project_code:'';
      if(d<0){
        alerts.push({
          type:'danger',
          category:'TAT-Lab',
          title:`⚠ TAT Lab เกินกำหนด ${Math.abs(d)} วัน`,
          msg:`${code} — ${nm}`,
          detail:`Deadline: ${fmtD(lp.tat_deadline)} | สถานะ Lab: ${lp.status} | ${(lp.headcount||0).toLocaleString()} คน`,
          action:'ตรวจสอบ Lab Project',
          project_id:lp.project_id
        });
      } else if(d<=ad){
        alerts.push({
          type:'warning',
          category:'TAT-Lab',
          title:`🕐 TAT Lab ใกล้ครบ ${d} วัน`,
          msg:`${code} — ${nm}`,
          detail:`Deadline: ${fmtD(lp.tat_deadline)} | สถานะ Lab: ${lp.status} | ${(lp.headcount||0).toLocaleString()} คน`,
          action:'เร่งดำเนินการ Lab',
          project_id:lp.project_id
        });
      }
    });
    // ── SLA Deadline Report — ใช้ project.due_date + ตรวจครบทุกขั้นตอน ──
    DB.report.listPlans().forEach(rp=>{
      if(['sent','completed','approved'].includes(rp.status))return;
      const p=DB.sales.getProject(rp.project_id);
      if(!p)return;
      // ดึง deadline: ใช้ project.due_date ก่อน fallback sla_deadline
      const deadline=p.due_date||rp.sla_deadline;
      if(!deadline)return;
      // ตรวจว่าครบทุกขั้นตอนแล้วหรือยัง (7 ขั้น) — ถ้าครบแล้วไม่ alert
      const meta=(()=>{try{return JSON.parse(localStorage.getItem('rp_meta_'+rp.project_id)||'{}');}catch{return {};}})();
      const allDone=!!(rp.set_plan||meta.set_plan)&&!!(rp.send_doc||meta.send_doc)&&!!(rp.receive_raw||meta.receive_raw)&&!!(rp.key_raw||meta.key_raw)&&!!(rp.interpret||meta.interpret)&&!!(rp.booklet||meta.booklet)&&!!(rp.ready_to_send||meta.ready_to_send);
      if(allDone)return;
      const d=Math.ceil((new Date(deadline)-today)/86400000);
      const nm=p.company_name;
      const code=p.project_code;
      if(d<0){
        alerts.push({
          type:'danger',
          category:'SLA-Report',
          title:`⚠ Report เลยกำหนดส่งผล ${Math.abs(d)} วัน`,
          msg:`${code} — ${nm}`,
          detail:`กำหนดส่ง: ${fmtD(deadline)} | สถานะ Report: ${rp.status} | ${(rp.headcount||0).toLocaleString()} คน`,
          action:'เร่งทำผล + ส่งให้ลูกค้า',
          project_id:rp.project_id
        });
      } else if(d<=ad){
        alerts.push({
          type:'warning',
          category:'SLA-Report',
          title:`📋 Report ใกล้ครบกำหนด ${d} วัน`,
          msg:`${code} — ${nm}`,
          detail:`กำหนดส่ง: ${fmtD(deadline)} | สถานะ Report: ${rp.status} | ${(rp.headcount||0).toLocaleString()} คน`,
          action:'เร่งทำผล',
          project_id:rp.project_id
        });
      }
    });
    // ── Critical Lab Values ──
    DB.lab.listAlerts().filter(a=>!a.acknowledged).forEach(a=>{
      const p=DB.sales.getProject(a.project_id);
      const nm=p?p.company_name:`#${a.project_id}`;
      const code=p?p.project_code:'';
      alerts.push({
        type:'critical',
        category:'ค่าวิกฤต',
        title:`🚨 ค่าวิกฤต Lab — ${a.test_name}`,
        msg:`${nm} | HN${a.hn||'-'} ${a.patient_name}`,
        detail:`รายการ: ${a.test_name} | ค่าที่พบ: ${a.value} | ค่าปกติ: ${a.normal_range||'-'}${a.note?' | หมายเหตุ: '+a.note:''}`,
        action:'แจ้งทีมแพทย์ + ติดต่อผู้ป่วยด่วน',
        project_id:a.project_id,
        alert_id:a.id
      });
    });
    // ── Onsite ใกล้วันออก (3 วัน) ──
    DB.sales.listProjects().filter(p=>p.onsite_date&&['Closed','Onsite'].includes(p.status)).forEach(p=>{
      const d=Math.ceil((new Date(p.onsite_date)-today)/86400000);
      if(d>=0&&d<=ad){
        alerts.push({
          type:'info',
          category:'Onsite',
          title:`📅 Onsite ใกล้ถึง ${d===0?'วันนี้':'อีก '+d+' วัน'}`,
          msg:`${p.project_code} — ${p.company_name}`,
          detail:`วันออกหน่วย: ${fmtD(p.onsite_date)} | สถานที่: ${p.location||'-'} | ${(p.headcount||0).toLocaleString()} คน`,
          action:'ตรวจสอบ Checklist + ใบแจ้งงาน',
          project_id:p.id
        });
      }
    });
    // ── Invoice ค้างชำระ ──
    DB.billing.listInvoices().filter(i=>i.status==='Pending'||i.status==='Overdue').forEach(inv=>{
      const p=DB.sales.getProject(inv.project_id);
      const nm=p?p.company_name:`#${inv.project_id}`;
      const issuedDays=inv.issued_at?Math.floor((today-new Date(inv.issued_at))/86400000):0;
      if(issuedDays>30){
        alerts.push({
          type:'warning',
          category:'Billing',
          title:`💰 Invoice ค้างชำระ ${issuedDays} วัน`,
          msg:`${inv.invoice_no} — ${nm}`,
          detail:`ยอด: ฿${(inv.total||0).toLocaleString()} | ออกใบ: ${fmtD(inv.issued_at)} | สถานะ: ${inv.status}`,
          action:'ติดตามทวงถาม',
          project_id:inv.project_id
        });
      }
    });
    // ── X-Ray Alert (จากวันออกตรวจ + xrayAlertDays) ──
    DB.sales.listProjects().forEach(p=>{
      if(!p.onsite_date)return;
      // เฉพาะ project ที่ Onsite จบแล้ว (status=Lab/Report/Billing/Completed)
      if(!['Lab','Report','Billing','Completed'].includes(p.status))return;
      // ตรวจ X-Ray Meta
      const xm=DB.xray?DB.xray.getMeta(p.id):null;
      // ครบทุก step? skip
      const STEPS=['film_sent','interpreting','report_done','approved','write_cd','send_excel','send_media'];
      const allDone=xm && STEPS.every(s=>xm[s]);
      if(allDone)return;
      // คำนวณวันที่ผ่านมาจากวันออกตรวจ
      const daysSince=Math.floor((today-new Date(p.onsite_date))/86400000);
      if(daysSince<xrayAlertDays)return; // ยังไม่ถึงเวลาเตือน
      // หา step ล่าสุดที่ทำ
      const doneCount=xm?STEPS.filter(s=>xm[s]).length:0;
      const nextStep=STEPS.find(s=>!xm||!xm[s])||'film_sent';
      const stepLabels={
        film_sent:'ส่งฟิล์มอ่านผล',interpreting:'รอแปลผล',report_done:'จัดทำผล',
        approved:'Approve ผล',write_cd:'Write CD',send_excel:'ส่ง File Excel',send_media:'ส่ง CD/DVD/Flash Drive'
      };
      const overDays=daysSince-xrayAlertDays;
      alerts.push({
        type: overDays>3?'danger':'warning',
        category:'X-Ray',
        title:`📡 X-Ray ${overDays>0?'เกินกำหนด '+overDays+' วัน':'ใกล้ครบกำหนด'}`,
        msg:`${p.project_code} — ${p.company_name}`,
        detail:`วันออกหน่วย: ${fmtD(p.onsite_date)} | ผ่านมา ${daysSince} วัน | ทำแล้ว ${doneCount}/${STEPS.length} ขั้น | ติดที่: ${stepLabels[nextStep]}`,
        action:'เร่งทีม X-Ray ดำเนินการ',
        project_id:p.id
      });
    });
    return alerts;
  },

  // ═══ PART-TIME REGISTRATIONS (ใบสมัคร PT จาก RegisterPT.html) ═══
  // Schema (matches Google Forms 9 fields + 3 file uploads):
  //   email, full_name, phone, car_plate,
  //   tax_email, tax_address, position,
  //   files: { license, id_card, bank_book },  // each = {name, type, size, data(base64)}
  //   status, created_at, updated_at, recorded_by, status_note?, approved_staff_id?
  parttime: {
    list(){return DB._get('hr_db','parttime')||[];},
    get(id){return this.list().find(r=>r.id===id)||null;},
    save(data){
      data=DB._stampUser(data,!data.id);
      const rows=DB._get('hr_db','parttime')||[];
      if(data.id){
        const i=rows.findIndex(r=>r.id===data.id);
        if(i>=0) rows[i]={...rows[i],...data,updated_at:DB._now()};
        else { data.created_at=DB._now(); data.updated_at=DB._now(); rows.push(data); }
      } else {
        data.id=DB._nextId('hr_db','parttime');
        data.created_at=DB._now();
        data.updated_at=DB._now();
        if(!data.status) data.status='pending';
        rows.push(data);
      }
      DB._set('hr_db','parttime',rows);
      return data;
    },
    remove(id){DB._set('hr_db','parttime',(DB._get('hr_db','parttime')||[]).filter(r=>r.id!==id));},
    search(query){
      if(!query||!query.trim()) return this.list();
      const q=query.trim().toLowerCase();
      return this.list().filter(r=>{
        const fields=[r.full_name,r.phone,r.email,r.tax_email,r.car_plate,r.position,r.tax_address];
        return fields.some(f=>(f||'').toString().toLowerCase().includes(q));
      });
    },
    // Approve PT → push to staff directory
    approveAsStaff(id){
      const pt = this.get(id);
      if(!pt) return null;
      // Generate emp_id from phone last 4 (no national_id in new schema)
      const phoneClean = (pt.phone||'').replace(/[^0-9]/g,'');
      const empId = phoneClean.length>=4 ? 'PT-'+phoneClean.substr(-4) : 'PT-'+String(id).padStart(4,'0');
      const newStaff = DB.staff.save({
        employee_id: empId,
        full_name: pt.full_name,
        nickname: '',
        department: pt.position,
        position: pt.position,
        phone: pt.phone
      });
      pt.status='approved';
      pt.approved_staff_id=newStaff.id;
      // Default work_status เป็น Active หลัง approve (ถ้ายังไม่ได้ตั้ง)
      if(!pt.work_status) pt.work_status = 'Active';
      this.save(pt);
      return newStaff;
    }
  },

  // ═══ STAFF DIRECTORY (รายชื่อพนักงาน) ═══
  staff: {
    list(){return DB._get('hr_db','staff')||[];},
    get(id){return this.list().find(r=>r.id===id)||null;},
    save(data){
      data=DB._stampUser(data,!data.id);
      const rows=DB._get('hr_db','staff')||[];
      if(data.id){
        const i=rows.findIndex(r=>r.id===data.id);
        if(i>=0) rows[i]={...rows[i],...data,updated_at:DB._now()};
        else { data.created_at=DB._now(); data.updated_at=DB._now(); rows.push(data); }
      } else {
        data.id=DB._nextId('hr_db','staff');
        data.created_at=DB._now();
        data.updated_at=DB._now();
        rows.push(data);
      }
      DB._set('hr_db','staff',rows);
      return data;
    },
    remove(id){DB._set('hr_db','staff',(DB._get('hr_db','staff')||[]).filter(r=>r.id!==id));},
    // Search across all fields: employee_id, full_name, nickname, department, position
    search(query){
      if(!query||!query.trim()) return this.list();
      const q=query.trim().toLowerCase();
      return this.list().filter(s=>{
        const fields=[s.employee_id,s.full_name,s.nickname,s.department,s.position,s.phone];
        return fields.some(f=>(f||'').toString().toLowerCase().includes(q));
      });
    }
  },

  // ═══ LOGIN NOTIFICATIONS (งานใหม่หลัง Login) ═══
  notifications: {
    // คำนวณงานใหม่สำหรับ role นี้ตั้งแต่ since (ISO date string)
    // คืนค่า array of groups: [{label, items:[{project_code, company, meta, action, urgent}]}]
    getNewItemsForRole(role, sinceISO){
      const since = sinceISO ? new Date(sinceISO).getTime() : (Date.now() - 7*86400000);
      const isNewer = (dateStr)=>{
        if(!dateStr) return false;
        return new Date(dateStr).getTime() > since;
      };
      const projects = DB.sales.listProjects()||[];
      const customers = DB.customer.listCustomers()||[];
      const groups = [];

      // Helper: build project item
      const mkProj = (p, action, urgent=false) => {
        const daysToOnsite = p.onsite_date ? Math.ceil((new Date(p.onsite_date)-Date.now())/86400000) : null;
        const daysUntilLabel = daysToOnsite!==null && daysToOnsite>=0 && daysToOnsite<=7 ? ` · อีก ${daysToOnsite} วัน` : '';
        const isUrgent = urgent || (daysToOnsite!==null && daysToOnsite>=0 && daysToOnsite<=3);
        return {
          project_id: p.id,
          project_code: p.project_code,
          company: p.company_name,
          meta: `📅 ออกตรวจ ${DB._fmtD(p.onsite_date)} · ${(p.headcount||0).toLocaleString()} คน${daysUntilLabel}`,
          action: action,
          urgent: isUrgent
        };
      };

      // SALES: ลูกค้าใหม่ + Quotation ใหม่
      if(role==='sales'||role==='admin'){
        const newCusts = customers.filter(c=>isNewer(c.created_at)&&['Prospect','Follow up','Negotiation'].includes(c.sales_status));
        if(newCusts.length){
          groups.push({
            label:'👥 ลูกค้าใหม่ใน CRM',
            icon:'💼',
            items: newCusts.slice(0,5).map(c=>({
              project_code: c.sales_status,
              company: c.company_name,
              meta: `${c.contact_name||'-'} · ${c.phone||'-'} · ${(c.employee_count||0).toLocaleString()} คน`,
              action: c.sales_status, urgent: false, page: 'customers'
            })),
            count: newCusts.length
          });
        }
      }

      // OPERATION: Project Closed รอจัดทำ JO
      if(role==='operation'||role==='admin'){
        const closedProjs = projects.filter(p=>p.status==='Closed'&&isNewer(p.updated_at||p.created_at));
        if(closedProjs.length){
          groups.push({
            label:'📋 Project Closed รอจัดทำใบแจ้งงาน',
            icon:'🚑',
            items: closedProjs.slice(0,5).map(p=>mkProj(p,'รอจัดทำ JO')),
            count: closedProjs.length,
            page: 'op_prep'
          });
        }
        // รอกรอก Checklist Station
        const needsChecklist = projects.filter(p=>{
          if(!['Closed','Onsite','Lab','Report'].includes(p.status)) return false;
          if(!isNewer(p.updated_at||p.created_at)) return false;
          const ck = DB.station_checklist.getForProject(p.id);
          return !ck || !ck.is_complete;
        });
        if(needsChecklist.length){
          groups.push({
            label:'✅ รอกรอก Checklist Station',
            icon:'📋',
            items: needsChecklist.slice(0,5).map(p=>mkProj(p,'เริ่ม Checklist')),
            count: needsChecklist.length,
            page: 'op_station_checklist'
          });
        }
      }

      // LAB: Onsite จบ รอรับ specimen + ค่าวิกฤต
      if(role==='lab'||role==='admin'){
        const onsiteDone = projects.filter(p=>['Onsite','Lab'].includes(p.status)&&isNewer(p.updated_at||p.created_at));
        if(onsiteDone.length){
          groups.push({
            label:'🔬 รอรับ Specimen จาก Onsite',
            icon:'🔬',
            items: onsiteDone.slice(0,5).map(p=>mkProj(p,'รับ Specimen')),
            count: onsiteDone.length,
            page: 'lab'
          });
        }
      }

      // XRAY: Project ใหม่ที่มี X-Ray package + รออ่าน
      if(role==='xray'||role==='admin'){
        const xrayNew = projects.filter(p=>{
          if(!isNewer(p.updated_at||p.created_at)) return false;
          if(!['Closed','Onsite','Lab','Report'].includes(p.status)) return false;
          // check if has xray meta
          const xrowsAll = DB._get('operation_db','xray_meta')||[];
          const xm = xrowsAll.find(x=>x.project_id===p.id);
          return !xm || !xm.film_read;
        });
        if(xrayNew.length){
          groups.push({
            label:'📡 รออ่านฟิล์ม X-Ray',
            icon:'📡',
            items: xrayNew.slice(0,5).map(p=>mkProj(p,'อ่านฟิล์ม')),
            count: xrayNew.length,
            page: 'xray'
          });
        }
      }

      // REPORT: Plan ใหม่ที่ auto-create + ใกล้ครบ TAT
      if(role==='report'||role==='admin'){
        const plans = DB.report.listPlans()||[];
        const newPlans = plans.filter(rp=>isNewer(rp.created_at)&&rp.status!=='sent');
        if(newPlans.length){
          groups.push({
            label:'📄 Project Plan ใหม่',
            icon:'📄',
            items: newPlans.slice(0,5).map(rp=>{
              const p = DB.sales.getProject(rp.project_id)||{};
              return {
                project_id: rp.project_id,
                project_code: p.project_code||rp.project_code||'-',
                company: p.company_name||rp.company_name||'-',
                meta: `📅 ออกตรวจ ${DB._fmtD(p.onsite_date||rp.onsite_date)} · ${(rp.headcount||0).toLocaleString()} คน · TAT: ${DB._fmtD(rp.sla_deadline)}`,
                action: rp.created_by==='Auto-create'?'Auto-created':'ดูแล Plan',
                urgent: false, page: 'report'
              };
            }),
            count: newPlans.length,
            page: 'report'
          });
        }
        // เกินกำหนดส่งผล
        const today = Date.now();
        const overdue = plans.filter(rp=>{
          if(['sent','completed','approved'].includes(rp.status)) return false;
          const p = DB.sales.getProject(rp.project_id);
          const deadline = (p&&p.due_date)||rp.sla_deadline;
          if(!deadline) return false;
          return new Date(deadline).getTime() < today;
        });
        if(overdue.length){
          groups.push({
            label:'⚠ Report เลยกำหนดส่งผล',
            icon:'⚠',
            items: overdue.slice(0,5).map(rp=>{
              const p = DB.sales.getProject(rp.project_id)||{};
              const deadline = p.due_date||rp.sla_deadline;
              const daysOver = Math.floor((today - new Date(deadline).getTime())/86400000);
              return {
                project_id: rp.project_id,
                project_code: p.project_code||rp.project_code||'-',
                company: p.company_name||rp.company_name||'-',
                meta: `กำหนดส่ง ${DB._fmtD(deadline)} · เกินมา ${daysOver} วัน · ${(rp.headcount||0).toLocaleString()} คน`,
                action: `เกิน ${daysOver} วัน`, urgent: true, page: 'report'
              };
            }),
            count: overdue.length,
            page: 'report'
          });
        }
      }

      // OPD: Project Walkin/มีเก็บตก
      if(role==='opd'||role==='admin'){
        const opdProjs = projects.filter(p=>{
          if(!isNewer(p.updated_at||p.created_at)) return false;
          const cust = customers.find(c=>c.id===p.customer_id);
          const isWalkin = cust&&(cust.job_type2==='Walkin'||cust.exam_location==='Walk in');
          const logs = DB.operation.listOnsiteLogs(p.id)||[];
          const hasMissing = logs.some(l=>(l.missing||0)>0);
          return isWalkin || hasMissing;
        });
        if(opdProjs.length){
          groups.push({
            label:'🏥 OPD รอตรวจครบ/Walkin',
            icon:'🏥',
            items: opdProjs.slice(0,5).map(p=>mkProj(p,'OPD')),
            count: opdProjs.length,
            page: 'opd'
          });
        }
      }

      // MEDICAL (เวชระเบียน): Project Closed รอ Download/Upload
      if(role==='medical'||role==='admin'){
        const closedForMed = projects.filter(p=>{
          if(!['Closed','Lab','Report','Billing','Completed','Onsite'].includes(p.status)) return false;
          if(!isNewer(p.updated_at||p.created_at)) return false;
          const m = DB.medical.getMeta(p.id);
          return !m.download_upload || !m.document || !m.equipment;
        });
        if(closedForMed.length){
          groups.push({
            label:'📋 รอจัดการเอกสาร/อุปกรณ์',
            icon:'📋',
            items: closedForMed.slice(0,5).map(p=>{
              const m = DB.medical.getMeta(p.id);
              const remain = [];
              if(!m.download_upload) remain.push('Download');
              if(!m.document) remain.push('เอกสาร');
              if(!m.equipment) remain.push('อุปกรณ์');
              return {...mkProj(p,remain.join(',')), meta: mkProj(p).meta+` · รอ: ${remain.join(', ')}`};
            }),
            count: closedForMed.length,
            page: 'medical'
          });
        }
      }

      // BILLING: Project Completed รอ Invoice
      if(role==='billing'||role==='admin'){
        const billProjs = projects.filter(p=>['Completed','Billing'].includes(p.status)&&isNewer(p.updated_at||p.created_at));
        if(billProjs.length){
          groups.push({
            label:'💰 Project Completed รอ Invoice',
            icon:'💰',
            items: billProjs.slice(0,5).map(p=>mkProj(p,'ออก Invoice')),
            count: billProjs.length,
            page: 'billing'
          });
        }
      }

      return groups;
    },

    // เก็บ flag "snooze 1 ชม"
    snooze(userId){
      sessionStorage.setItem('mck_notif_snooze_'+userId, Date.now()+3600*1000);
    },
    isSnoozed(userId){
      const v = sessionStorage.getItem('mck_notif_snooze_'+userId);
      return v && parseInt(v) > Date.now();
    }
  },

  // ═══ STATION CHECKLIST DATA (13 จุดตรวจ from Excel) ═══
  STATION_CHECKLIST_DATA: {"vs":{"name":"ซักประวัติ V/S","form_code":"FM-MC-014","items":[{"no":"1","name":"เครื่องวัดความดัน+Adapter","qty_default":"4","unit":"ชุด"},{"no":"2","name":"ถ่านสำรอง","qty_default":"","unit":"ก้อน"},{"no":"3","name":"ปลั๊กสามตา","qty_default":"2","unit":"อัน"},{"no":"4","name":"Roll up เครื่องวัดความดัน","qty_default":"1","unit":"อัน"},{"no":"5","name":"ผ้าปูโต๊ะ","qty_default":"1","unit":"ผืน"},{"no":"6","name":"ปากกาน้ำเงิน","qty_default":"","unit":"ด้าม"},{"no":"7","name":"Alcohol  70 %","qty_default":"1","unit":"ขวด"}]},"wh":{"name":"น้ำหนัก/ส่วนสูง","form_code":"FM-MC-015","items":[{"no":"1","name":"เครื่องชั่ง นน.สส.+Adapter","qty_default":"1","unit":"ชุด"},{"no":"2","name":"ปลั๊กสามตา","qty_default":"1","unit":"อัน"},{"no":"3","name":"Roll up เครื่องชั่ง นน.สส.","qty_default":"1","unit":"อััน"},{"no":"4","name":"ปากกาน้ำเงิน","qty_default":"","unit":"ด้าม"},{"no":"5","name":"คลิปบอร์ด","qty_default":"","unit":"อัน"}]},"urine":{"name":"ปัสสาวะ","form_code":"FM-MC-016","items":[{"no":"1","name":"Rack UA","qty_default":"4","unit":"อัน"},{"no":"2","name":"ผ้าปูโต๊ะ","qty_default":"1","unit":"ผืน"},{"no":"3","name":"โน๊ตบุ๊ค","qty_default":"","unit":"เครื่อง"},{"no":"4","name":"เครื่องยิงบาร์โค้ด","qty_default":"","unit":"เครื่อง"}]},"eye_cbd":{"name":"ตาคอม/ตาบอดสี","form_code":"FM-MC-017","items":[{"no":"1","name":"ผ้าปูโต๊ะ","qty_default":"","unit":"ผืน"},{"no":"2","name":"แบบฟอร์มการตรวจตาบอดสี","qty_default":"","unit":"ใบ"},{"no":"3","name":"ปากกาน้ำเงิน","qty_default":"","unit":"ด้าม"},{"no":"4","name":"Alcohol 70%","qty_default":"","unit":"ขวด"},{"no":"5","name":"ISHIHARA (เล่มตรวจตาบอดสี)","qty_default":"","unit":"เล่ม"},{"no":"6","name":"Led Eyes chart (ชาร์ตตัวเลขตรวจสายตาคอม)","qty_default":"","unit":"เครื่อง"}]},"eye_occ":{"name":"ตาอาชีวอนามัย","form_code":"FM-MC-018","items":[{"no":"1","name":"เครื่องตรวจสายตา","qty_default":"2","unit":"ชุด"},{"no":"2","name":"ปลั๊กสามตา","qty_default":"1","unit":"อัน"},{"no":"3","name":"ผ้าปูโต๊ะ","qty_default":"1","unit":"ผืน"},{"no":"4","name":"แบบฟอร์มการตรวจตาอาชีวะ","qty_default":"200","unit":"ใบ"},{"no":"5","name":"แบบฟอร์มการตรวจตาบอดสี","qty_default":"100","unit":"ใบ"},{"no":"6","name":"กระปุกสำลีแอลกอฮอล์","qty_default":"","unit":"กระปุก"},{"no":"7","name":"ป้ายอธิบายการตรวจตาอาชีวะ","qty_default":"1","unit":"แผ่น"},{"no":"8","name":"Roll up","qty_default":"1","unit":"อัน"},{"no":"9","name":"ถุงดำ","qty_default":"","unit":"ใบ"},{"no":"10","name":"ถุงแดง","qty_default":"2","unit":"ใบ"},{"no":"11","name":"ถังขยะ","qty_default":"1","unit":"ใบ"},{"no":"12","name":"ปากกาน้ำเงิน","qty_default":"","unit":"ด้าม"},{"no":"13","name":"สำลีก้อน","qty_default":"","unit":"ถุง"},{"no":"14","name":"Alcohol  70%","qty_default":"","unit":"ขวด"},{"no":"15","name":"Alcohol Pad","qty_default":"","unit":"กล่อง"},{"no":"16","name":"ISHIHARA (เล่มตรวจตาบอดสี)","qty_default":"1","unit":"เล่ม"},{"no":"17","name":"ถุงมือไซต์.............","qty_default":"","unit":"กล่อง"}]},"hear":{"name":"การได้ยิน","form_code":"FM-MC-019","items":[{"no":"1","name":"เครื่องตรวจหู+หูฟัง+ปุ่มให้สัญญาณ","qty_default":"4","unit":"ชุด"},{"no":"2","name":"ปลั๊กสามตา","qty_default":"1","unit":"อัน"},{"no":"3","name":"Roll up","qty_default":"1","unit":"อัน"},{"no":"4","name":"แบบฟอร์มการตรวจ","qty_default":"200","unit":"แผ่น"},{"no":"5","name":"ตู้ตรวจหูแบบประกอบ","qty_default":"2","unit":"ตู้"},{"no":"6","name":"เก้าอี้","qty_default":"4","unit":"ตัว"},{"no":"7","name":"ปากกาน้ำเงิน","qty_default":"3","unit":"ด้าม"},{"no":"8","name":"ปากกาแดง","qty_default":"3","unit":"ด้าม"},{"no":"10","name":"โต๊ะน้ำตาล","qty_default":"-(s)","unit":"ตัว"},{"no":"11","name":"foggy ดับกลิ่น","qty_default":"1","unit":"ขวด"}]},"lung":{"name":"สมรรถภาพปอด","form_code":"FM-MC-020","items":[{"no":"1","name":"เครื่องเป่าปอด+Adapter","qty_default":"","unit":"เครื่อง"},{"no":"2","name":"โน๊ตบุ๊ค+Adapter","qty_default":"","unit":"เครื่อง"},{"no":"3","name":"ปลั๊กสามตา","qty_default":"","unit":"อัน"},{"no":"4","name":"แกนกระดาษ","qty_default":"","unit":"อัน"},{"no":"5","name":"แผ่นปี ค.ศ.","qty_default":"","unit":"ใบ"},{"no":"6","name":"แบบฟอร์มการตรวจ","qty_default":"","unit":"ใบ"},{"no":"7","name":"Roll up","qty_default":"","unit":"อัน"},{"no":"8","name":"ถังขยะ","qty_default":"","unit":"ใบ"},{"no":"9","name":"ถุงแดง","qty_default":"","unit":"ใบ"},{"no":"10","name":"ผ้าปูโต๊ะ","qty_default":"","unit":"ผืน"},{"no":"11","name":"N95","qty_default":"","unit":"อัน"},{"no":"12","name":"กระปุกสำลีแอลกอฮอล์","qty_default":"","unit":"กระปุก"},{"no":"13","name":"ปากกาน้ำเงิน","qty_default":"","unit":"ด้าม"},{"no":"14","name":"สำลีก้อน","qty_default":"","unit":"ถุง"},{"no":"15","name":"กระดาษปริ้นกราฟเป่าปอด","qty_default":"","unit":"ม้วน"},{"no":"16","name":"Alcohol 70%","qty_default":"","unit":"ขวด"},{"no":"17","name":"ลูกแม็ก","qty_default":"","unit":"กล่อง"},{"no":"18","name":"แม็ก","qty_default":"","unit":"อัน"},{"no":"19","name":"ตะกร้า","qty_default":"","unit":"ใบ"},{"no":"20","name":"ถุงมือ","qty_default":"","unit":"กล่อง"},{"no":"21","name":"สก๊อตเทปใส","qty_default":"","unit":"อัน"},{"no":"22","name":"Alcohol Pad","qty_default":"","unit":"กล่อง"},{"no":"23","name":"เครื่องยิงบาร์โค้ด","qty_default":"","unit":"เครื่อง"}]},"muscle":{"name":"กล้ามเนื้อ","form_code":"FM-MC-021","items":[{"no":"1","name":"เครื่องตรวจกล้ามเนื้อมือ","qty_default":"","unit":"เครื่อง"},{"no":"2","name":"เครื่องตรวจกล้ามเนื้อขา/หลัง","qty_default":"","unit":"เครื่อง"},{"no":"3","name":"แบบฟอร์มการตรวจ","qty_default":"","unit":"ใบ"},{"no":"4","name":"Roll up","qty_default":"","unit":"อัน"},{"no":"5","name":"ผ้าปูโต๊ะ","qty_default":"","unit":"ผืน"},{"no":"6","name":"ถ่าน AAA","qty_default":"","unit":"ก้อน"},{"no":"7","name":"Alcohol 70%","qty_default":"","unit":"ขวด"},{"no":"9","name":"ปากกา","qty_default":"","unit":"ด้าม"}]},"ekg":{"name":"EKG","form_code":"FM-MC-022","items":[{"no":"1","name":"Roll up","qty_default":"1","unit":"อัน"},{"no":"2","name":"โน๊ตบุ๊ค","qty_default":"3","unit":"เครื่อง"},{"no":"3","name":"ปลั๊กสามตา","qty_default":"3","unit":"อัน"},{"no":"4","name":"กระปุกสำลีแอลกอฮอล์","qty_default":"3","unit":"อัน"},{"no":"5","name":"ฉาก","qty_default":"","unit":"อัน"},{"no":"6","name":"ฉากไม้","qty_default":"6","unit":"อัน"},{"no":"7","name":"ผ้าคลุมฉาก (สีเทา)","qty_default":"8","unit":"ผืน"},{"no":"8","name":"ผ้าห่ม","qty_default":"1","unit":"ผืน"},{"no":"9","name":"ถุงแดง","qty_default":"3","unit":"ใบ"},{"no":"10","name":"ถังขยะ","qty_default":"3","unit":"ใบ"},{"no":"11","name":"สำลีก้อน","qty_default":"1","unit":"ถุง"},{"no":"12","name":"Alcohol 70%","qty_default":"3","unit":"ขวด"},{"no":"13","name":"เตียงตรวจ","qty_default":"3","unit":"อัน"},{"no":"14","name":"ตารางติดสติ๊กเกอร์","qty_default":"3","unit":"แผ่น"},{"no":"15","name":"เคเบิ้ลไทร์","qty_default":"","unit":"อัน"},{"no":"16","name":"เทปยูโนกั้นเขต","qty_default":"1","unit":"ม้วน"},{"no":"17","name":"ผ้ายางปูเตียง","qty_default":"6","unit":"ผื้น"},{"no":"18","name":"ถุงมือ","qty_default":"1","unit":"กล่อง"},{"no":"19","name":"โต๊ะน้ำตาล","qty_default":"3","unit":"ตัว"},{"no":"20","name":"หมอน","qty_default":"3","unit":"ใบ"},{"no":"21","name":"ตะกร้า","qty_default":"4","unit":"ใบ"},{"no":"22","name":"เครื่องยิงบาร์โค้ด","qty_default":"","unit":"เครื่อง"},{"no":"23","name":"หลีดEKG","qty_default":"3","unit":"ชุด"}]},"doctor":{"name":"พบแพทย์","form_code":"FM-MC-023","items":[{"no":"1","name":"ถังขยะแพทย์","qty_default":"2","unit":"ใบ"},{"no":"2","name":"ถุงแดง","qty_default":"","unit":"ใบ"},{"no":"3","name":"ถุงดำ","qty_default":"4","unit":"ใบ"},{"no":"7","name":"ถุงมือแพทย์","qty_default":"2","unit":"กล่อง"},{"no":"8","name":"Stethoscope","qty_default":"2","unit":"อัน"},{"no":"9","name":"ผ้าปูโต๊ะ","qty_default":"2","unit":"ผืน"},{"no":"10","name":"ไฟฉาย","qty_default":"4","unit":"อัน"},{"no":"11","name":"ถ่านไฟฉายสำรอง","qty_default":"4","unit":"ก้อน"},{"no":"12","name":"กระดาษทิชชู","qty_default":"2","unit":"อัน"},{"no":"13","name":"Roll up","qty_default":"1","unit":"อัน"},{"no":"15","name":"Alcohol 70%","qty_default":"2","unit":"ขวด"},{"no":"17","name":"ตะกร้า","qty_default":"2","unit":"ใบ"},{"no":"19","name":"ฉาก","qty_default":"","unit":"อัน"}]},"vaccine":{"name":"วัคซีน","form_code":"FM-MC-024","items":[{"no":"1","name":"เข็มเบอร์ 27","qty_default":"","unit":"กล่อง"},{"no":"2","name":"ถุงแดง","qty_default":"","unit":"ใบ"},{"no":"3","name":"ถุงดำ","qty_default":"","unit":"ใบ"},{"no":"7","name":"ถุงมือ","qty_default":"","unit":"กล่อง"},{"no":"8","name":"ถังขยะ","qty_default":"","unit":"อัน"},{"no":"9","name":"ผ้าปูโต๊ะ","qty_default":"","unit":"ผืน"},{"no":"10","name":"Roll up","qty_default":"","unit":"อัน"},{"no":"11","name":"กระปุกสำลี","qty_default":"","unit":"อัน"},{"no":"12","name":"สำลี","qty_default":"","unit":"ถุง"},{"no":"13","name":"พลาสเตอร์","qty_default":"","unit":"กล่อง"},{"no":"15","name":"Alcohol 70%","qty_default":"","unit":"ขวด"},{"no":"17","name":"แบบฟอร์มยินยอมฉีดวัคซีน","qty_default":"","unit":"ใบ"},{"no":"19","name":"ฉาก","qty_default":"","unit":"อัน"},{"no":"20","name":"ถังขยะทิ้งเข็ม","qty_default":"","unit":"อัน"}]},"equip":{"name":"ครุภัณฑ์","form_code":"FM-CUP-002","items":[{"no":"1","name":"โต๊ะขาวไซส์ M","qty_default":"","unit":"ตัว"},{"no":"2","name":"โต๊ะขาวไซส์ S","qty_default":"","unit":"ตัว"},{"no":"3","name":"โต๊ะขาวไซส์ L","qty_default":"","unit":"ตัว"},{"no":"4","name":"เก้าอี้","qty_default":"","unit":"ตัว"}]},"sweat":{"name":"ซับเหงื่อ","form_code":"FM-CUP-002B","items":[{"no":"1","name":"กระดาษซับเหงื่อ","qty_default":"","unit":"ชุด"},{"no":"2","name":"ถุงมือไซต์.........","qty_default":"","unit":"คู่"},{"no":"3","name":"ผ้าปูโต๊ะ","qty_default":"","unit":"ผืน"},{"no":"4","name":"Alcohol 70%","qty_default":"","unit":"ขวด"},{"no":"5","name":"ปากกา","qty_default":"","unit":"ด้าม"},{"no":"6","name":"ถุุงเเดง","qty_default":"","unit":"ใบ"}]}},
  // CRUD for station checklist forms (per project)
  station_checklist: {
    // Get all station templates — merge defaults with admin overrides from localStorage
    getTemplates(){
      const override = DB._get('operation_db','station_templates_override');
      if(override && typeof override === 'object' && Object.keys(override).length>0){
        return override;
      }
      return DB.STATION_CHECKLIST_DATA;
    },
    // Save admin-edited templates (replaces defaults until reset)
    saveTemplates(templates){
      DB._set('operation_db','station_templates_override',templates);
    },
    // Reset to factory defaults
    resetTemplates(){
      DB._set('operation_db','station_templates_override',null);
    },
    // Get saved data for a project
    getForProject(pid){
      const rows=DB._get('operation_db','station_checklists')||[];
      return rows.find(r=>r.project_id===pid)||null;
    },
    // Save (full upsert)
    save(pid,data){
      const rows=DB._get('operation_db','station_checklists')||[];
      const idx=rows.findIndex(r=>r.project_id===pid);
      if(idx>=0){
        const merged={...rows[idx],...data,project_id:pid};
        DB._stampUser(merged, false);
        merged.updated_at=DB._now();
        rows[idx]=merged;
      } else {
        DB._stampUser(data, true);
        data.id=DB._nextId('operation_db','station_checklists');
        data.project_id=pid;
        data.created_at=DB._now();
        data.updated_at=DB._now();
        data.is_complete=false;
        rows.push(data);
      }
      DB._set('operation_db','station_checklists',rows);
      return rows.find(r=>r.project_id===pid);
    },
    // Mark complete
    markComplete(pid){
      const rows=DB._get('operation_db','station_checklists')||[];
      const idx=rows.findIndex(r=>r.project_id===pid);
      if(idx>=0){
        rows[idx].is_complete=true;
        rows[idx].completed_at=DB._now();
        rows[idx].updated_at=DB._now();
        DB._set('operation_db','station_checklists',rows);
      }
    },
    // Delete
    remove(pid){
      const rows=DB._get('operation_db','station_checklists')||[];
      DB._set('operation_db','station_checklists',rows.filter(r=>r.project_id!==pid));
    }
  },

  // ═══ MEDICAL RECORDS (เวชระเบียน) ═══
  medical: {
    getMeta(pid){
      const rows=DB._get('operation_db','medical_meta')||[];
      return rows.find(r=>r.project_id===pid)||{project_id:pid,download_upload:false,document:false,equipment:false};
    },
    setMeta(pid,data){
      const rows=DB._get('operation_db','medical_meta')||[];
      const idx=rows.findIndex(r=>r.project_id===pid);
      const today=new Date().toISOString().substr(0,10);
      // เริ่มจาก row เดิม (ถ้ามี) เพื่อไม่ทับ field อื่นที่ไม่ได้ส่งมา
      const existing = idx>=0 ? rows[idx] : {project_id:pid};
      const merged = {...existing, ...data, project_id:pid};
      // Auto-date logic — apply EFP ฉพาะ field ที่อยู่ใน input data เท่านั้น
      // (FIX: เดิม loop ทุก field → ทำให้ date ของ field ที่ไม่ได้ส่งถูก reset เป็น null)
      ['download_upload','document','equipment'].forEach(k=>{
        if(!(k in data)) return; // field นี้ไม่ได้ส่งมา → ข้าม (คงค่าเดิมไว้)
        if(data[k]){
          // ติ๊กแล้ว — ถ้ายังไม่มีวันที่ ใส่วันนี้
          if(!merged[k+'_date']) merged[k+'_date']=today;
        } else {
          // ยกเลิกติ๊ก — ลบวันที่
          merged[k+'_date']=null;
        }
      });
      // Stamp ผู้บันทึก: เห็น recorded_by เดิมจาก merged แล้ว — preserve หรือใส่ใหม่
      DB._stampUser(merged, idx < 0);
      merged.updated_at=DB._now();
      if(idx>=0) rows[idx]=merged;
      else { merged.id=DB._nextId('operation_db','medical_meta'); merged.created_at=DB._now(); rows.push(merged); }
      DB._set('operation_db','medical_meta',rows);
      return merged;
    },
    remove(pid){
      const rows=DB._get('operation_db','medical_meta')||[];
      DB._set('operation_db','medical_meta',rows.filter(r=>r.project_id!==pid));
    }
  },

  seedMockData(){
    // Always run defaults regardless of existing data
    DB.examItems.seedDefault();
    DB.manpowerCost.seedDefault();
    // Seed users: add missing users (merge, don't overwrite existing)
    const existingUsers=DB._get('auth_db','users');
    const defaultUsers=[
      {id:1,username:'admin',password:'admin1234',name:'ผู้ดูแลระบบ',role:'admin',active:true,created_at:DB._now(),updated_at:DB._now()},
      {id:2,username:'sales01',password:'sales1234',name:'นางสาวพิมพ์ใจ ดีงาม',role:'sales',active:true,created_at:DB._now(),updated_at:DB._now()},
      {id:3,username:'op01',password:'op1234',name:'นายวิชัย สุขใจ',role:'operation',active:true,created_at:DB._now(),updated_at:DB._now()},
      {id:4,username:'lab01',password:'lab1234',name:'นางสาวรัตนา ใจดี',role:'lab',active:true,created_at:DB._now(),updated_at:DB._now()},
      {id:5,username:'report01',password:'rpt1234',name:'นายสมชาย วงศ์ดี',role:'report',active:true,created_at:DB._now(),updated_at:DB._now()},
      {id:6,username:'billing01',password:'bill1234',name:'นางมาลี รักไทย',role:'billing',active:true,created_at:DB._now(),updated_at:DB._now()},
      {id:7,username:'xray01',password:'xray1234',name:'นายอาทิตย์ ฟิล์มทอง',role:'xray',active:true,created_at:DB._now(),updated_at:DB._now()},
      {id:8,username:'opd01',password:'opd1234',name:'นางสาววราภรณ์ OPD',role:'opd',active:true,created_at:DB._now(),updated_at:DB._now()},
      {id:9,username:'medical01',password:'med1234',name:'นางสาวสุภาพร เวชระเบียน',role:'medical',active:true,created_at:DB._now(),updated_at:DB._now()}
    ];
    // Seed staff directory
    if((DB._get('hr_db','staff')||[]).length===0){
      const staffSeed=[
        {id:1,employee_id:'EMP-001',full_name:'นายวิชัย สุขใจ',nickname:'วิ',department:'Operation',position:'Director',phone:'081-234-5678',created_at:DB._now(),updated_at:DB._now()},
        {id:2,employee_id:'EMP-002',full_name:'น.ส.มาลี รักงาน',nickname:'มา',department:'Medical',position:'พยาบาล',phone:'082-345-6789',created_at:DB._now(),updated_at:DB._now()},
        {id:3,employee_id:'EMP-003',full_name:'นายอาทิตย์ ฟิล์มทอง',nickname:'ทิตย์',department:'Medical',position:'เทคนิคการแพทย์',phone:'083-456-7890',created_at:DB._now(),updated_at:DB._now()},
        {id:4,employee_id:'EMP-004',full_name:'นพ.สมชาย ใจดี',nickname:'หมอสมชาย',department:'Medical',position:'แพทย์',phone:'084-567-8901',created_at:DB._now(),updated_at:DB._now()},
        {id:5,employee_id:'EMP-005',full_name:'นางสาวมณี สวยงาม',nickname:'มณี',department:'Sales',position:'Sales Manager',phone:'085-678-9012',created_at:DB._now(),updated_at:DB._now()},
        {id:6,employee_id:'EMP-006',full_name:'นางสาวสุภาพร เวชระเบียน',nickname:'สุภา',department:'Medical Records',position:'เวชระเบียน',phone:'086-789-0123',created_at:DB._now(),updated_at:DB._now()},
        {id:7,employee_id:'EMP-007',full_name:'นายชนะ ใจเย็น',nickname:'นะ',department:'Operation',position:'Part-time Director',phone:'087-890-1234',created_at:DB._now(),updated_at:DB._now()},
        {id:8,employee_id:'EMP-008',full_name:'น.ส.สุดา หัวใจดี',nickname:'สุ',department:'Medical',position:'พยาบาล',phone:'088-901-2345',created_at:DB._now(),updated_at:DB._now()}
      ];
      DB._set('hr_db','staff',staffSeed);
    }
    // Merge: add users that don't exist yet (by username)
    defaultUsers.forEach(u=>{
      if(!existingUsers.find(e=>e.username===u.username)){
        // ใช้ id ที่ระบุใน defaultUsers ถ้ายังไม่มีคนใช้ มิเช่นนั้นให้ max+1
        const idTaken = existingUsers.some(e=>e.id===u.id);
        if(idTaken){
          u.id = existingUsers.length > 0 ? Math.max(...existingUsers.map(e=>e.id))+1 : 1;
        }
        existingUsers.push(u);
      }
    });
    DB._set('auth_db','users',existingUsers);
    const viewOnly={view:true,add:false,edit:false,delete:false};
    const full={view:true,add:true,edit:true,delete:true};
    const fullNoDel={view:true,add:true,edit:true,delete:false};
    const none={view:false,add:false,edit:false,delete:false};
    const defaultRoles=[
      // admin — เข้าถึงได้ทุก navbar ทุก module
      {role:'admin',modules:{
        dashboard:full, customers:full, sales:full, quotation:full,
        op_prep:full, op_onsite:full, op_report:full, op_checklist:full,
        lab:full, xray:full, report:full, opd:full, billing:full, medical:full,
        config:full, staff:full, parttime:full, parttime_history:full
      },created_at:DB._now(),updated_at:DB._now()},

      // sales — ทีมขาย: CRM, ใบเสนอราคา, Project & Handover
      //   เห็น Dashboard, ปฏิทิน
      //   ไม่เห็น: Operation, Lab, X-Ray, Report, Billing, Config
      {role:'sales',modules:{
        dashboard:viewOnly, customers:fullNoDel, sales:fullNoDel, quotation:full,
        op_prep:none, op_onsite:none, op_report:none,
        lab:none, xray:none, report:none, opd:none, billing:none, medical:none, op_checklist:none, staff:viewOnly, parttime:viewOnly, parttime_history:viewOnly,
       
       
       
        config:none
      },created_at:DB._now(),updated_at:DB._now()},

      // operation — ทีมออกหน่วย: Checklist, ใบแจ้งงาน, Onsite, รายงานสรุป
      //   เห็น Dashboard, ปฏิทิน, Project (view), ลูกค้า (view)
      //   ไม่เห็น: Sales-create, Quotation, Lab, X-Ray, Report, Billing, Config
      {role:'operation',modules:{
        dashboard:viewOnly, customers:viewOnly, sales:viewOnly, quotation:none,
        op_prep:full, op_onsite:full, op_report:full, op_checklist:fullNoDel,
        lab:none, xray:none, report:none, opd:none, billing:none, medical:none, staff:viewOnly, parttime:viewOnly, parttime_history:viewOnly,
       
       
        config:none
      },created_at:DB._now(),updated_at:DB._now()},

      // lab — ห้องปฏิบัติการ: Lab & TAT, X-Ray (view)
      //   เห็น Dashboard, Project (view), Onsite (view)
      //   ไม่เห็น: Sales-edit, Quotation, Op-edit, Report, Billing, Config
      {role:'lab',modules:{
        dashboard:viewOnly, customers:none, sales:viewOnly, quotation:none,
        op_prep:viewOnly, op_onsite:viewOnly, op_report:none,
        lab:fullNoDel, xray:viewOnly, report:none, opd:none, billing:none, medical:none, op_checklist:none, staff:viewOnly, parttime:viewOnly, parttime_history:viewOnly,
       
       
       
        config:none
      },created_at:DB._now(),updated_at:DB._now()},

      // xray — เอกซเรย์: X-Ray อ่านฟิล์ม
      //   เห็น Dashboard, Project (view), Onsite (view)
      //   ไม่เห็น: Sales-edit, Quotation, Op-edit, Lab, Report, Billing, Config
      {role:'xray',modules:{
        dashboard:viewOnly, customers:none, sales:viewOnly, quotation:none,
        op_prep:none, op_onsite:viewOnly, op_report:none,
        lab:none, xray:fullNoDel, report:none, opd:none, billing:none, medical:none, op_checklist:none, staff:viewOnly, parttime:viewOnly, parttime_history:viewOnly,
       
       
       
        config:none
      },created_at:DB._now(),updated_at:DB._now()},

      // report — ทีมทำผล: Report & Plan
      //   เห็น Dashboard, ลูกค้า (view), Project, Onsite (view), Lab (view)
      //   ไม่เห็น: Quotation, Op-edit, X-Ray, Billing, Config
      {role:'report',modules:{
        dashboard:viewOnly, customers:viewOnly, sales:viewOnly, quotation:none,
        op_prep:viewOnly, op_onsite:viewOnly, op_report:none,
        lab:viewOnly, xray:none, report:fullNoDel, opd:none, billing:none, medical:none, op_checklist:none, staff:viewOnly, parttime:viewOnly, parttime_history:viewOnly,
       
       
       
        config:none
      },created_at:DB._now(),updated_at:DB._now()},

      // billing — การเงิน: Billing & Invoice
      //   เห็น Dashboard, Project (view), Report (view)
      //   ไม่เห็น: Sales-edit, Quotation, Operation, Lab, X-Ray, Config
      {role:'billing',modules:{
        dashboard:viewOnly, customers:viewOnly, sales:viewOnly, quotation:none,
        op_prep:none, op_onsite:none, op_report:none,
        lab:none, xray:none, report:viewOnly, opd:none, billing:fullNoDel, medical:none, op_checklist:none, staff:viewOnly, parttime:viewOnly, parttime_history:viewOnly,
       
       
       
        config:none
      },created_at:DB._now(),updated_at:DB._now()},

      // opd — ทีม OPD: เห็น Project ที่มี เก็บตก หรือ Walkin
      {role:'opd',modules:{
        dashboard:viewOnly, customers:viewOnly, sales:viewOnly, quotation:none,
        op_prep:none, op_onsite:viewOnly, op_report:none,
        lab:none, xray:none, report:none, opd:fullNoDel, billing:none, medical:none, op_checklist:none, staff:viewOnly, parttime:viewOnly, parttime_history:viewOnly,
       
       
        config:none
      },created_at:DB._now(),updated_at:DB._now()},

      // medical — เวชระเบียน: จัดการเอกสาร, อุปกรณ์, Download/Upload
      {role:'medical',modules:{
        dashboard:viewOnly, customers:viewOnly, sales:viewOnly, quotation:none,
        op_prep:none, op_onsite:none, op_report:none,
        lab:none, xray:none, report:none, opd:none, billing:none, medical:fullNoDel, op_checklist:none, staff:viewOnly, parttime:viewOnly, parttime_history:viewOnly,
       
       
        config:none
      },created_at:DB._now(),updated_at:DB._now()}
    ];
    const existingRoles=DB._get('auth_db','role_permissions');
    defaultRoles.forEach(r=>{if(!existingRoles.find(e=>e.role===r.role))existingRoles.push(r);});
    DB._set('auth_db','role_permissions',existingRoles);
    DB._set('customer_db','customers',[
      {id:1,company_name:'บริษัท ABC Manufacturing จำกัด',address:'123 ถนนอุตสาหกรรม นิคมอมตะ ชลบุรี 20000',phone:'038-123456',email:'hr@abc-mfg.co.th',contact_name:'คุณสมใจ วงศ์ดี',contact_role:'HR Manager',employee_count:480,last_contact:'2025-11-01',note:'ลูกค้าประจำ ตรวจทุกปี',sales_status:'Closed',closed_at:'2025-11-05',created_at:DB._now(),updated_at:DB._now()},
      {id:2,company_name:'บริษัท XYZ Logistics จำกัด',address:'456 ถนนสุขุมวิท บางนา กรุงเทพ 10260',phone:'02-456789',email:'safety@xyz-log.co.th',contact_name:'คุณวิรัตน์ ใจดี',contact_role:'Safety Officer',employee_count:320,last_contact:'2025-11-10',note:'ราคาต่อรอง',sales_status:'Negotiation',closed_at:null,created_at:DB._now(),updated_at:DB._now()},
      {id:3,company_name:'โรงงาน TechParts Co., Ltd.',address:'789 เขตอุตสาหกรรม อ.พานทอง ชลบุรี 20160',phone:'038-789012',email:'admin@techparts.th',contact_name:'คุณมาลี รักไทย',contact_role:'Owner',employee_count:150,last_contact:'2025-10-28',note:'PKG-C ผู้บริหาร + PKG-B พนักงาน',sales_status:'Closed',closed_at:'2025-10-30',created_at:DB._now(),updated_at:DB._now()},
      {id:4,company_name:'บริษัท Green Energy จำกัด',address:'321 ถนนพระราม 9 ห้วยขวาง กรุงเทพ 10320',phone:'02-321654',email:'hr@greenenergy.co.th',contact_name:'คุณอนันต์ สุขสม',contact_role:'HR Director',employee_count:200,last_contact:'2025-11-15',note:'Prospect ใหม่',sales_status:'Follow up',closed_at:null,created_at:DB._now(),updated_at:DB._now()}
    ]);
    DB._set('customer_db','sales_logs',[
      {id:1,customer_id:1,note:'คุยโทรศัพท์ครั้งแรก สนใจ PKG-B',created_at:'2025-10-25T09:00:00.000Z'},
      {id:2,customer_id:1,note:'ส่งใบเสนอราคา PKG-B 480 คน',created_at:'2025-10-28T14:00:00.000Z'},
      {id:3,customer_id:1,note:'ปิดการขาย ยืนยันวันออกตรวจ 15 ธ.ค.',created_at:'2025-11-05T10:30:00.000Z'}
    ]);
    DB._set('sales_db','projects',[
      {id:1,project_code:'MCK-20251115-001',customer_id:1,company_name:'บริษัท ABC Manufacturing จำกัด',package_code:'PKG-B',package_name:'อาชีวอนามัย + Lab',headcount:480,onsite_date:'2025-12-15',onsite_time:'07:00',onsite_time_end:'16:00',location:'โรงงาน ABC นิคมอมตะ ชลบุรี',coordinator_name:'คุณสมใจ วงศ์ดี',coordinator_phone:'038-123456',status:'Report',created_by:'นางสาวพิมพ์ใจ',created_at:'2025-11-15T08:00:00.000Z',updated_at:DB._now()},
      {id:2,project_code:'MCK-20251030-002',customer_id:3,company_name:'โรงงาน TechParts Co., Ltd.',package_code:'PKG-B/C',package_name:'PKG-C+PKG-B',headcount:150,onsite_date:'2025-11-20',onsite_time:'08:00',onsite_time_end:'15:00',location:'โรงงาน TechParts พานทอง ชลบุรี',coordinator_name:'คุณมาลี รักไทย',coordinator_phone:'038-789012',status:'Lab',created_by:'นายสมชาย',created_at:'2025-10-30T09:00:00.000Z',updated_at:DB._now()}
    ]);
    DB._set('sales_db','internal_handover',[
      {id:1,project_id:1,layout_file:'Layout_ABC_20251215.pdf',name_list_file:'รายชื่อ_ABC_480คน.xlsx',quotation_file:'QT-2025-0123.pdf',conditions:'แยกผลตรวจแพทย์',sent_at:'2025-11-15T08:30:00.000Z',created_at:'2025-11-15T08:30:00.000Z',updated_at:DB._now()},
      {id:2,project_id:2,layout_file:'Layout_TechParts_20251120.pdf',name_list_file:'รายชื่อ_TechParts_150คน.xlsx',quotation_file:'QT-2025-0098.pdf',conditions:'PKG-C เสร็จก่อนบ่าย',sent_at:'2025-10-30T10:00:00.000Z',created_at:'2025-10-30T10:00:00.000Z',updated_at:DB._now()}
    ]);
    DB._set('operation_db','job_orders',[
      {id:1,project_id:1,company_name:'บริษัท ABC Manufacturing จำกัด',location:'โรงงาน ABC นิคมอมตะ ชลบุรี',onsite_date:'2025-12-15',headcount:480,depart_time:'05:30',start_time:'07:00',end_time:'16:00',director:'ผอ.วิชัย สุขสม',job_type:'ตรวจสุขภาพ',shift:'เช้า',remark:'จอดรถหน้าโรงงาน A',signer_creator:'นายวิชัย สุขใจ',signer_head:'หน.สมศักดิ์ ใจดี',signer_hr:'HR สมใจ วงศ์ดี',status:'Confirmed',created_at:'2025-11-17T09:00:00.000Z',updated_at:DB._now()},
      {id:2,project_id:2,company_name:'โรงงาน TechParts Co., Ltd.',location:'โรงงาน TechParts พานทอง',onsite_date:'2025-11-20',headcount:150,depart_time:'06:00',start_time:'08:00',end_time:'15:00',director:'ผอ.วิชัย สุขสม',job_type:'ตรวจสุขภาพ',shift:'เช้า',remark:'',signer_creator:'นายวิชัย สุขใจ',signer_head:'หน.สมศักดิ์ ใจดี',signer_hr:'HR มาลี รักไทย',status:'Completed',created_at:'2025-11-01T08:00:00.000Z',updated_at:DB._now()}
    ]);
    DB._set('operation_db','job_stations',[
      {id:1,job_order_id:1,order_no:1,station_code:'ST-01',station_name:'ลงทะเบียน',staff_count:2,profession:'เจ้าหน้าที่',staff_name:'นางสาวมณี แสงทอง',staff_type:'ในองค์กร',remark:'',created_at:DB._now(),updated_at:DB._now()},
      {id:2,job_order_id:1,order_no:2,station_code:'ST-03',station_name:'ชั่งน้ำหนัก & วัดส่วนสูง',staff_count:1,profession:'เจ้าหน้าที่',staff_name:'นายสมชาย ทองดี',staff_type:'ในองค์กร',remark:'',created_at:DB._now(),updated_at:DB._now()},
      {id:3,job_order_id:1,order_no:3,station_code:'ST-04',station_name:'ซักประวัติ & วัดความดัน',staff_count:2,profession:'RN',staff_name:'นางสาวรัตนา ใจดี',staff_type:'ในองค์กร',remark:'',created_at:DB._now(),updated_at:DB._now()},
      {id:4,job_order_id:1,order_no:4,station_code:'ST-05',station_name:'เจาะเลือด',staff_count:3,profession:'MT',staff_name:'นายสุรชัย วงศ์ดี',staff_type:'ในองค์กร',remark:'',created_at:DB._now(),updated_at:DB._now()},
      {id:5,job_order_id:1,order_no:5,station_code:'ST-14',station_name:'เอกซเรย์ Digital',staff_count:2,profession:'เจ้าหน้าที่ ใบ Cer',staff_name:'นายอนันต์ สุขสม',staff_type:'ในองค์กร',remark:'',created_at:DB._now(),updated_at:DB._now()},
      {id:6,job_order_id:1,order_no:6,station_code:'ST-16',station_name:'แพทย์ผู้ตรวจ',staff_count:1,profession:'แพทย์',staff_name:'นพ.วิชัย สุขใจ',staff_type:'ในองค์กร',remark:'',created_at:DB._now(),updated_at:DB._now()},
      {id:7,job_order_id:1,order_no:7,station_code:'ST-17',station_name:'คืนเอกสาร',staff_count:1,profession:'เจ้าหน้าที่',staff_name:'นางสาวพิมพ์ใจ ดีงาม',staff_type:'Part-time',remark:'',created_at:DB._now(),updated_at:DB._now()},
      {id:8,job_order_id:2,order_no:1,station_code:'ST-01',station_name:'ลงทะเบียน',staff_count:1,profession:'เจ้าหน้าที่',staff_name:'นางสาวมณี',staff_type:'ในองค์กร',remark:'',created_at:DB._now(),updated_at:DB._now()},
      {id:9,job_order_id:2,order_no:2,station_code:'ST-05',station_name:'เจาะเลือด',staff_count:2,profession:'MT',staff_name:'นายสุรชัย',staff_type:'ในองค์กร',remark:'',created_at:DB._now(),updated_at:DB._now()}
    ]);
    DB._set('operation_db','job_vehicles',[
      {id:1,job_order_id:1,order_no:1,vehicle_name:'รถยนต์กะบะขาว',staff_type:'ในองค์กร',responsible_name:'นายสมชาย ทองดี',phone:'081-234-5678',remark:'',created_at:DB._now(),updated_at:DB._now()},
      {id:2,job_order_id:1,order_no:2,vehicle_name:'รถ Xray ขาว',staff_type:'ในองค์กร',responsible_name:'นายอนันต์ สุขสม',phone:'089-876-5432',remark:'',created_at:DB._now(),updated_at:DB._now()}
    ]);
    DB._set('operation_db','onsite_logs',[
      {id:1,project_id:1,station_code:'ST-01',station_name:'ลงทะเบียน',total_expected:480,total_done:472,missing:5,refused:3,note:'มีพนักงานลา 5 คน',created_at:'2025-12-15T16:30:00.000Z',updated_at:DB._now()},
      {id:2,project_id:2,station_code:'รวม',station_name:'รวมทุก Station',total_expected:150,total_done:148,missing:1,refused:1,note:'ครบเกือบทั้งหมด',created_at:'2025-11-20T15:00:00.000Z',updated_at:DB._now()}
    ]);
    DB._set('operation_db','specimen_tracking',[
      {id:1,project_id:1,barcode:'SPC-2025-00001',type:'เลือด',collected_at:'2025-12-15T08:00:00.000Z',sent_to_lab_at:'2025-12-15T17:00:00.000Z',qc_status:'ผ่าน',temperature:'4°C',created_at:DB._now(),updated_at:DB._now()}
    ]);
    const today=new Date();
    const t1=new Date(today);t1.setDate(t1.getDate()+2);
    const t2=new Date(today);t2.setDate(t2.getDate()+8);
    DB._set('lab_db','lab_projects',[
      {id:1,project_id:1,received_at:'2025-12-15T18:00:00.000Z',approved_at:null,reported_at:null,headcount:472,tat_days:15,tat_deadline:t1.toISOString(),status:'analyzing',created_at:DB._now(),updated_at:DB._now()},
      {id:2,project_id:2,received_at:'2025-11-20T17:00:00.000Z',approved_at:'2025-11-28T10:00:00.000Z',reported_at:'2025-11-29T09:00:00.000Z',headcount:148,tat_days:9,tat_deadline:t2.toISOString(),status:'reported',created_at:DB._now(),updated_at:DB._now()}
    ]);
    DB._set('lab_db','critical_alerts',[{id:1,project_id:1,hn:'HN001234',patient_name:'นายกิตติ สมบูรณ์',test_name:'FBS',value:'420 mg/dL',normal_range:'70-100 mg/dL',note:'ค่าสูงวิกฤต',acknowledged:false,alerted_at:DB._now(),created_at:DB._now()}]);
    DB._set('lab_db','qc_logs',[{id:1,project_id:1,qc_type:'รับตัวอย่าง',result:'ผ่าน',note:'472 ราย 4°C',created_at:'2025-12-15T18:30:00.000Z'}]);
    const s1=new Date(today);s1.setDate(s1.getDate()+4);
    DB._set('report_db','project_plan',[
      {id:1,project_id:1,program_code:'PKG-B',headcount:472,onsite_date:'2025-12-15',created_by:'นางสาวพิมพ์ใจ',verified_by:'นายสมชาย',tat_deadline:t1.toISOString(),sla_deadline:s1.toISOString(),status:'interpreting',sent_at:null,created_at:'2025-12-16T09:00:00.000Z',updated_at:DB._now()},
      {id:2,project_id:2,program_code:'PKG-B/C',headcount:148,onsite_date:'2025-11-20',created_by:'นายสมชาย',verified_by:'นางสาวพิมพ์ใจ',tat_deadline:t2.toISOString(),sla_deadline:t2.toISOString(),status:'sent',sent_at:'2025-12-01T10:00:00.000Z',created_at:'2025-11-21T09:00:00.000Z',updated_at:DB._now()}
    ]);
    const pts=[];const fn=['สมชาย','สมหญิง','วิชัย','มาลี','อนันต์','รัตนา','สุรชัย','มณี','กิตติ','วิรัตน์'];const ln=['สุขใจ','วงศ์ดี','ใจดี','รักไทย','สมบูรณ์','แสงทอง','ทองดี','ศรีสุข','พรมมา','บุญมา'];
    for(let i=1;i<=20;i++)pts.push({id:i,project_id:1,hn:`HN${String(i).padStart(6,'0')}`,name:`นาย${fn[i%10]} ${ln[(i+3)%10]}`,dob:`${1970+(i%20)}-${String((i%12)+1).padStart(2,'0')}-15`,gender:i%3===0?'หญิง':'ชาย',department:`แผนก ${String.fromCharCode(64+(i%8)+1)}`,package:'PKG-B',status:i<=15?'complete':'pending',created_at:DB._now(),updated_at:DB._now()});
    DB._set('report_db','patient_list',pts);
    DB._set('report_db','raw_data',[{id:1,project_id:1,hn:'HN000001',weight:72,height:170,bmi:24.9,bp_sys:125,bp_dia:82,pulse:78,fbs:95,cholesterol:210,created_at:DB._now(),updated_at:DB._now()}]);
    DB._set('billing_db','invoices',[
      {id:1,project_id:1,invoice_no:'INV-2025-0001',revenue:566400,vat:39648,total:606048,cost:320000,profit:246400,margin:43.5,payment_terms:'ชำระภายใน 30 วัน',status:'Pending',issued_at:'2025-12-20T09:00:00.000Z',created_at:DB._now(),updated_at:DB._now()},
      {id:2,project_id:2,invoice_no:'INV-2025-0002',revenue:247500,vat:17325,total:264825,cost:140000,profit:107500,margin:43.4,payment_terms:'ชำระภายใน 30 วัน',status:'Paid',issued_at:'2025-12-05T09:00:00.000Z',created_at:DB._now(),updated_at:DB._now()}
    ]);
    DB._set('billing_db','cost_tracking',[
      {id:1,project_id:1,category:'Lab',description:'ค่าวิเคราะห์ Lab 472 ราย',amount:189000,created_at:DB._now(),updated_at:DB._now()},
      {id:2,project_id:1,category:'บุคลากร',description:'ค่าแพทย์+พยาบาล+MT',amount:35000,created_at:DB._now(),updated_at:DB._now()},
      {id:3,project_id:1,category:'อุปกรณ์',description:'อุปกรณ์เจาะเลือด',amount:28000,created_at:DB._now(),updated_at:DB._now()},
      {id:4,project_id:1,category:'X-Ray',description:'ค่า X-Ray 472 ราย',amount:56000,created_at:DB._now(),updated_at:DB._now()},
      {id:5,project_id:1,category:'ขนส่ง',description:'ค่าเดินทาง+Specimen',amount:12000,created_at:DB._now(),updated_at:DB._now()}
    ]);
    // Seed exam items
    if(!DB._get('config_db','exam_items').length){
      const examList=[
        {id:1,name:'CBC (Complete Blood Count)',category:'Lab - เลือด',cost:80,list_price:150,unit:'ครั้ง'},
        {id:2,name:'FBS (Fasting Blood Sugar)',category:'Lab - เลือด',cost:40,list_price:80,unit:'ครั้ง'},
        {id:3,name:'Cholesterol Total',category:'Lab - เลือด',cost:50,list_price:100,unit:'ครั้ง'},
        {id:4,name:'Triglyceride',category:'Lab - เลือด',cost:50,list_price:100,unit:'ครั้ง'},
        {id:5,name:'HDL Cholesterol',category:'Lab - เลือด',cost:60,list_price:120,unit:'ครั้ง'},
        {id:6,name:'LDL Cholesterol',category:'Lab - เลือด',cost:60,list_price:120,unit:'ครั้ง'},
        {id:7,name:'Uric Acid',category:'Lab - เลือด',cost:40,list_price:80,unit:'ครั้ง'},
        {id:8,name:'Creatinine',category:'Lab - เลือด',cost:45,list_price:90,unit:'ครั้ง'},
        {id:9,name:'BUN (Blood Urea Nitrogen)',category:'Lab - เลือด',cost:40,list_price:80,unit:'ครั้ง'},
        {id:10,name:'SGOT (AST)',category:'Lab - เลือด',cost:45,list_price:90,unit:'ครั้ง'},
        {id:11,name:'SGPT (ALT)',category:'Lab - เลือด',cost:45,list_price:90,unit:'ครั้ง'},
        {id:12,name:'Alkaline Phosphatase',category:'Lab - เลือด',cost:45,list_price:90,unit:'ครั้ง'},
        {id:13,name:'HbA1c',category:'Lab - เลือด',cost:120,list_price:250,unit:'ครั้ง'},
        {id:14,name:'TSH (Thyroid)',category:'Lab - เลือด',cost:150,list_price:300,unit:'ครั้ง'},
        {id:15,name:'PSA (ชาย)',category:'Lab - เลือด',cost:180,list_price:350,unit:'ครั้ง'},
        {id:16,name:'Urinalysis (ปัสสาวะ)',category:'Lab - ปัสสาวะ',cost:30,list_price:60,unit:'ครั้ง'},
        {id:17,name:'Stool Exam (อุจจาระ)',category:'Lab - อุจจาระ',cost:50,list_price:100,unit:'ครั้ง'},
        {id:18,name:'X-Ray ปอด (PA)',category:'Imaging',cost:150,list_price:300,unit:'ครั้ง'},
        {id:19,name:'Ultrasound ช่องท้อง',category:'Imaging',cost:350,list_price:600,unit:'ครั้ง'},
        {id:20,name:'Mammogram',category:'Imaging',cost:500,list_price:900,unit:'ครั้ง'},
        {id:21,name:'EKG (คลื่นหัวใจ 12 Lead)',category:'Cardio',cost:200,list_price:400,unit:'ครั้ง'},
        {id:22,name:'Exercise Stress Test',category:'Cardio',cost:900,list_price:1800,unit:'ครั้ง'},
        {id:23,name:'ตรวจสายตา (Snellen)',category:'ประสาทสัมผัส',cost:30,list_price:60,unit:'ครั้ง'},
        {id:24,name:'ตรวจสีตา (Ishihara)',category:'ประสาทสัมผัส',cost:30,list_price:60,unit:'ครั้ง'},
        {id:25,name:'Audiogram (การได้ยิน)',category:'ประสาทสัมผัส',cost:120,list_price:250,unit:'ครั้ง'},
        {id:26,name:'Spirometry (สมรรถภาพปอด)',category:'อาชีวอนามัย',cost:150,list_price:280,unit:'ครั้ง'},
        {id:27,name:'Lead in Blood',category:'อาชีวอนามัย',cost:400,list_price:750,unit:'ครั้ง'},
        {id:28,name:'Pap Smear (หญิง)',category:'สตรี',cost:250,list_price:500,unit:'ครั้ง'},
        {id:29,name:'PE — แพทย์ตรวจร่างกาย',category:'ตรวจร่างกาย',cost:100,list_price:200,unit:'ครั้ง'},
        {id:30,name:'น้ำหนัก / ส่วนสูง / BMI',category:'ตรวจร่างกาย',cost:10,list_price:20,unit:'ครั้ง'},
        {id:31,name:'ความดันโลหิต',category:'ตรวจร่างกาย',cost:10,list_price:20,unit:'ครั้ง'},
        {id:32,name:'ATK / Rapid COVID',category:'โรคติดต่อ',cost:70,list_price:150,unit:'ครั้ง'},
      ];
      examList.forEach(e=>{e.created_at=DB._now();e.updated_at=DB._now();});
      DB._set('config_db','exam_items',examList);
    }
    // Seed manpower costs
    if(!DB._get('config_db','manpower_cost').length){
      const mp=[
        {id:1,role:'แพทย์ (MD)',type:'Full-day',cost_per_day:5000,unit:'วัน',created_at:DB._now(),updated_at:DB._now()},
        {id:2,role:'พยาบาล (RN)',type:'Full-day',cost_per_day:1800,unit:'วัน',created_at:DB._now(),updated_at:DB._now()},
        {id:3,role:'นักเทคนิคการแพทย์ (MT)',type:'Full-day',cost_per_day:2000,unit:'วัน',created_at:DB._now(),updated_at:DB._now()},
        {id:4,role:'Radiographer (X-Ray)',type:'Full-day',cost_per_day:2200,unit:'วัน',created_at:DB._now(),updated_at:DB._now()},
        {id:5,role:'เจ้าหน้าที่ Part-time',type:'Full-day',cost_per_day:800,unit:'วัน',created_at:DB._now(),updated_at:DB._now()},
        {id:6,role:'พนักงานขับรถ',type:'Full-day',cost_per_day:700,unit:'วัน',created_at:DB._now(),updated_at:DB._now()},
        {id:7,role:'Out Source Lab',type:'Per-test',cost_per_day:0,unit:'ราย',created_at:DB._now(),updated_at:DB._now()},
      ];
      DB._set('config_db','manpower_cost',mp);
    }
    console.log('✅ Seed done');
  }
};
window.DB=DB;
