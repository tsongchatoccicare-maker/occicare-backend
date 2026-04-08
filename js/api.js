/**
 * api.js — OcciCare Frontend API Client v1.0
 * Replaces localStorage-based database.js
 * Connects to Express backend → MySQL/SQL Server
 *
 * Config: set API_BASE in config.js or auto-detect
 */

/* global API_BASE */
const _API = (() => {
  // Auto-detect: same origin if not configured
  const base = (typeof API_BASE !== 'undefined' && API_BASE)
    ? API_BASE
    : (window.location.origin + '');

  let _token = localStorage.getItem('occ_token') || null;
  let _session = null;

  try {
    _session = JSON.parse(localStorage.getItem('occ_session') || 'null');
  } catch(e) { _session = null; }

  async function req(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (_token) opts.headers['Authorization'] = 'Bearer ' + _token;
    if (body !== undefined) opts.body = JSON.stringify(body);

    try {
      const res = await fetch(base + '/api' + path, opts);
      if (res.status === 401) {
        // Token expired
        _token = null; _session = null;
        localStorage.removeItem('occ_token');
        localStorage.removeItem('occ_session');
        window.location.reload();
        return null;
      }
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'API Error');
      return data.data;
    } catch (e) {
      console.error('[API]', method, path, e.message);
      throw e;
    }
  }

  return {
    get:    (path)         => req('GET',    path),
    post:   (path, body)   => req('POST',   path, body),
    put:    (path, body)   => req('PUT',    path, body),
    delete: (path)         => req('DELETE', path),

    setToken(token, session) {
      _token = token;
      _session = session;
      localStorage.setItem('occ_token', token);
      localStorage.setItem('occ_session', JSON.stringify(session));
    },
    clearToken() {
      _token = null; _session = null;
      localStorage.removeItem('occ_token');
      localStorage.removeItem('occ_session');
    },
    session() { return _session; },
    token()   { return _token; },
  };
})();

/**
 * DB — Unified interface matching old localStorage-based DB
 * All methods return Promises. UI code uses async/await.
 */
const DB = {
  _now() { return new Date().toISOString(); },

  /* ── AUTH ──────────────────────────────────── */
  auth: {
    async login(username, password) {
      try {
        const data = await _API.post('/auth/login', { username, password });
        if (data?.token) {
          _API.setToken(data.token, data.user);
          return data.user;
        }
        return null;
      } catch (e) { return null; }
    },
    logout() {
      _API.clearToken();
    },
    session() { return _API.session(); },
    token()   { return _API.token(); },
    async listUsers()    { return _API.get('/users'); },
    async saveUser(d)    { return d.id ? _API.put('/users/'+d.id, d) : _API.post('/users', d); },
    async deleteUser(id) { return _API.delete('/users/'+id); },
    async listRoles()    { return _API.get('/roles'); },
    async getRolePermission(role) {
      const rows = await _API.get('/roles');
      return rows?.find(r => r.role === role) || null;
    },
    async saveRolePermission(d) { return _API.put('/roles/'+d.role, d); },
    can(action, module) {
      const sess = _API.session();
      if (!sess) return false;
      if (sess.role === 'admin') return true;
      const stored = localStorage.getItem('occ_perms_' + sess.role);
      if (!stored) return false;
      try {
        const p = JSON.parse(stored);
        const modMap = {
          'customers':'crm','sales':'sales','quotation':'qt','xray':'xray',
          'op_prep':'op_prep','op_onsite':'op_onsite','lab':'lab',
          'report':'report','billing':'billing','config':'config',
        };
        const col = (modMap[module]||module) + '_' + action;
        return !!p[col];
      } catch(e) { return false; }
    },
    async loadPermissions() {
      // Cache permissions for can() checks
      const sess = _API.session();
      if (!sess) return;
      try {
        const rows = await _API.get('/roles');
        if (rows) rows.forEach(r => {
          localStorage.setItem('occ_perms_' + r.role, JSON.stringify(r));
        });
      } catch(e) {}
    },
  },

  /* ── CUSTOMERS / CRM ───────────────────────── */
  customer: {
    async listCustomers()  { return _API.get('/customers'); },
    async getCustomer(id)  { return _API.get('/customers/'+id); },
    async saveCustomer(d)  { return d.id ? _API.put('/customers/'+d.id, d) : _API.post('/customers', d); },
    async deleteCustomer(id){ return _API.delete('/customers/'+id); },
    async listLogs(cid)    { return _API.get('/customers/'+cid+'/logs'); },
    async addLog(cid, note, type) { return _API.post('/customers/'+cid+'/logs', { note, log_type: type||'other' }); },
  },

  /* ── SALES / PROJECTS ──────────────────────── */
  sales: {
    async listProjects()   { return _API.get('/projects'); },
    async getProject(id)   { return _API.get('/projects/'+id); },
    async saveProject(d)   { return d.id ? _API.put('/projects/'+d.id, d) : _API.post('/projects', d); },
    async deleteProject(id){ return _API.delete('/projects/'+id); },
    async getHandover(pid) { return _API.get('/projects/'+pid+'/handover'); },
    async saveHandover(d)  { return _API.post('/projects/'+d.project_id+'/handover', d); },
  },

  /* ── QUOTATIONS ────────────────────────────── */
  quotation: {
    async listQuotations()   { return _API.get('/quotations'); },
    async getQuotation(id)   { return _API.get('/quotations/'+id); },
    async getByCustomer(cid) {
      const all = await _API.get('/quotations');
      return (all||[]).filter(q => q.customer_id === cid);
    },
    async saveQuotation(d) {
      const result = d.id ? await _API.put('/quotations/'+d.id, d) : await _API.post('/quotations', d);
      if (!d.id && result?.id) d.id = result.id;
      return d;
    },
    async deleteQuotation(id) { return _API.delete('/quotations/'+id); },
    async listItems(qtId)     { return _API.get('/quotations/'+qtId+'/items'); },
    async saveItems(qtId, items) {
      const qt = await _API.get('/quotations/'+qtId);
      if (qt) await _API.put('/quotations/'+qtId, { ...qt, items });
    },
    async listApprovals(qtId) { return _API.get('/quotations/'+qtId+'/approvals'); },
    async saveApproval(d)     { return _API.post('/quotations/'+d.quotation_id+'/approve', d); },
  },

  /* ── OPERATION ─────────────────────────────── */
  operation: {
    // Job Orders
    async listJobOrders()      { return _API.get('/job-orders'); },
    async getJobOrderById(id)  { return _API.get('/job-orders/'+id); },
    async getJobOrder(pid)     { return _API.get('/projects/'+pid+'/job-order'); },
    async saveJobOrder(d) {
      if (d.id) return _API.put('/job-orders/'+d.id, d);
      const r = await _API.post('/job-orders', d);
      if (r?.id) d.id = r.id;
      return d;
    },
    // Stations
    async listStations(joId)   { return _API.get('/job-orders/'+joId+'/stations'); },
    async saveStation(d) {
      if (d.id) return _API.put('/stations/'+d.id, d);
      return _API.post('/job-orders/'+d.job_order_id+'/stations', d);
    },
    async deleteStation(id)    { return _API.delete('/stations/'+id); },
    // Vehicles
    async listVehicles(joId)   { return _API.get('/job-orders/'+joId+'/vehicles'); },
    async saveVehicle(d) {
      if (d.id) return _API.put('/vehicles/'+d.id, d);
      return _API.post('/job-orders/'+d.job_order_id+'/vehicles', d);
    },
    async deleteVehicle(id)    { return _API.delete('/vehicles/'+id); },
    // Onsite Logs
    async listOnsiteLogs(pid)  { return _API.get('/projects/'+pid+'/onsite-logs'); },
    async saveOnsiteLog(d) {
      return _API.post('/projects/'+d.project_id+'/onsite-logs', d);
    },
    async deleteOnsiteLog(id)  { return _API.delete('/onsite-logs/'+id); },
    async getOnsiteReport(pid) { return _API.get('/projects/'+pid+'/onsite-report'); },
    async saveOnsiteReport(d)  { return _API.post('/projects/'+d.project_id+'/onsite-report', d); },
  },

  /* ── CHECKLIST ─────────────────────────────── */
  checklist: {
    async getByProject(pid) {
      const rows = await _API.get('/projects/'+pid+'/checklist');
      // Convert to key→value map for compatibility
      const map = {};
      if (rows) rows.forEach(r => {
        map[r.item_key] = !!r.is_done;
        if (r.note) map[r.item_key+'_note'] = r.note;
      });
      return map;
    },
    async save(pid, itemKey, itemLabel, itemGroup, isDone, note) {
      return _API.post('/projects/'+pid+'/checklist', {
        item_key: itemKey, item_label: itemLabel,
        item_group: itemGroup, is_done: isDone, note: note||null
      });
    },
  },

  /* ── LAB ───────────────────────────────────── */
  lab: {
    async listProjects()     { return _API.get('/lab'); },
    async getLabProject(pid) { return _API.get('/projects/'+pid+'/lab'); },
    async saveLabProject(d)  {
      return d.id ? _API.put('/lab/'+d.id, d) : _API.post('/lab', d);
    },
    async listAlerts()       { return _API.get('/critical-alerts'); },
    async saveAlert(d)       { return _API.post('/critical-alerts', d); },
    async ackAlert(id)       { return _API.put('/critical-alerts/'+id+'/ack', {}); },
    async editAlert(d)       { return _API.post('/critical-alerts', d); },
    async deleteAlert(id)    { return _API.delete('/critical-alerts/'+id); },
  },

  /* ── REPORT ────────────────────────────────── */
  report: {
    async listPlans()     { return _API.get('/report-plans'); },
    async getPlan(pid)    { return _API.get('/projects/'+pid+'/report-plan'); },
    async savePlan(d) {
      return d.id ? _API.put('/report-plans/'+d.id, d) : _API.post('/report-plans', d);
    },
    async listPatients(pid) { return _API.get('/projects/'+pid+'/patients'); },
    async savePatient(d)    { return _API.post('/projects/'+d.project_id+'/patients', d); },
  },

  /* ── BILLING ───────────────────────────────── */
  billing: {
    async listInvoices()     { return _API.get('/invoices'); },
    async getInvoice(pid)    { return _API.get('/projects/'+pid+'/invoice'); },
    async saveInvoice(d) {
      return d.id ? _API.put('/invoices/'+d.id, d) : _API.post('/invoices', d);
    },
    async listCostTracking(pid) { return _API.get('/projects/'+pid+'/costs'); },
    async saveCostItem(d)       { return _API.post('/projects/'+d.project_id+'/costs', d); },
    async deleteCostItem(id)    { return _API.delete('/costs/'+id); },
  },

  /* ── CONFIG ────────────────────────────────── */
  config: {
    async get()    { return _API.get('/config'); },
    async set(d)   { return _API.put('/config', d); },
    async getTAT() {
      const cfg = await _API.get('/config');
      return { small: parseInt(cfg?.tat_small||15), large: parseInt(cfg?.tat_large||20), threshold: parseInt(cfg?.tat_threshold||2000) };
    },
    async getSLA() {
      const cfg = await _API.get('/config');
      return { days_after_tat: parseInt(cfg?.sla_days||5) };
    },
    async getAlertDays() {
      const cfg = await _API.get('/config');
      return parseInt(cfg?.alert_days||3);
    },
  },

  /* ── EXAM ITEMS ────────────────────────────── */
  examItems: {
    async list()        { return _API.get('/exam-items'); },
    async get(id)       { const all = await _API.get('/exam-items'); return (all||[]).find(e=>e.id===id)||null; },
    async save(d)       { return d.id ? _API.put('/exam-items/'+d.id, d) : _API.post('/exam-items', d); },
    async delete(id)    { return _API.delete('/exam-items/'+id); },
    async getCategories() {
      const all = await _API.get('/exam-items');
      return [...new Set((all||[]).map(e=>e.category).filter(Boolean))];
    },
  },

  /* ── MANPOWER COST ─────────────────────────── */
  manpowerCost: {
    async list()     { return _API.get('/manpower-costs'); },
    async save(d)    { return d.id ? _API.put('/manpower-costs/'+d.id, d) : _API.post('/manpower-costs', d); },
    async delete(id) { return _API.delete('/manpower-costs/'+id); },
  },

  /* ── XRAY ─────────────────────────────────── */
  xray: {
    async getMeta(pid)  { return _API.get('/projects/'+pid+'/xray'); },
    async saveMeta(d)   { return _API.post('/projects/'+d.project_id+'/xray', d); },
    async listAll()     { return _API.get('/xray'); },
  },

  /* ── FILES ─────────────────────────────────── */
  files: {
    async listByContext(ctx) { return _API.get('/files/'+ctx); },
    async deleteFile(id)     { return _API.delete('/files/'+id); },
    async uploadFile(ctx, file, category, label) {
      const form = new FormData();
      form.append('file', file);
      form.append('category', category||'other');
      form.append('category_label', label||'');
      const res = await fetch(
        (typeof API_BASE !== 'undefined' ? API_BASE : '') + '/api/files/' + ctx,
        { method: 'POST', headers: { 'Authorization': 'Bearer ' + _API.token() }, body: form }
      );
      const data = await res.json();
      return data.data;
    },
  },

  /* ── ALERTS ────────────────────────────────── */
  async checkAlerts() {
    try { return await _API.get('/alerts') || []; }
    catch(e) { return []; }
  },

  /* ── CHECKLIST CONFIG ──────────────────────── */
  checklistConfig: {
    _KEY: 'occ_ckl_cfg',
    async list() {
      try { return await _API.get('/checklist-config'); }
      catch(e) { return []; }
    },
    async save(d)    { return d.id ? _API.put('/checklist-config/'+d.id, d) : _API.post('/checklist-config', d); },
    async delete(id) { return _API.delete('/checklist-config/'+id); },
  },

  /* ── SEED (not needed for SQL, but keep for compat) ── */
  async seedMockData() { /* No-op for SQL backend */ },
};

// Make DB globally available (same as before)
window.DB = DB;
window._API = _API;
