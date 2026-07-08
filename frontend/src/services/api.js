import * as db from './supabaseDB';

function wrap(data) {
  return { data: { data } };
}

function wrapPaginated(result) {
  return { data: { data: result.data, pagination: result.pagination } };
}

export const authAPI = {
  login: (data) => db.loginUser(data.mobileOrEmail, data.password).then(wrap),
  register: (data) => db.registerWorker(data).then(wrap),
  getProfile: () => db.getProfileByEmail(supabaseEmail()).then(wrap),
  changePassword: (data) => db.changePassword(data.id, data.oldPassword, data.newPassword),
  resetPassword: (id) => db.resetPassword(id),
};

export const workerAPI = {
  getAll: (params) => db.getWorkers(params).then(wrapPaginated),
  getById: (id) => db.getWorkerById(id).then(wrap),
  getActive: () => db.getActiveWorkers().then(wrap),
  update: (id, data) => db.updateWorker(id, data).then(wrap),
  toggleStatus: (id) => db.toggleWorkerStatus(id).then(wrap),
  getStats: (id) => db.getWorkerStats(id).then(wrap),
  search: (q) => db.searchWorkers(q).then(wrap),
};

export const patientAPI = {
  getAll: (params) => db.getPatients(params).then(wrapPaginated),
  getById: (id) => db.getPatientById(id).then(wrap),
  create: (data) => db.createPatient(data, currentUserId()).then(wrap),
  update: (id, data) => db.updatePatient(id, data).then(wrap),
  delete: (id) => db.deletePatient(id),
  search: (q) => db.searchPatients(q).then(wrap),
  findByMobile: (mobile) => db.findPatientByMobile(mobile).then(wrap),
  getVisitHistory: (id) => db.getPatientVisitHistory(id).then(wrap),
  getRecent: (limit) => db.getRecentPatients(limit).then(wrap),
};

export const visitAPI = {
  getAll: (params) => db.getVisits(params).then(wrapPaginated),
  getById: (id) => db.getVisitById(id).then(wrap),
  create: (data) => db.createVisit(data, currentUserId()).then(wrap),
  update: (id, data) => db.updateVisit(id, data).then(wrap),
  delete: (id) => db.deleteVisit(id),
  getToday: () => db.getTodayVisits().then(wrap),
  getByDateRange: (params) => db.getVisitsByDateRange(params.startDate, params.endDate, params.page, params.limit).then(wrapPaginated),
  getByWorker: (workerId, params) => db.getVisitsByWorker(workerId, params?.page, params?.limit).then(wrapPaginated),
  getByPatient: (patientId, params) => db.getVisitsByPatient(patientId, params?.page, params?.limit).then(wrapPaginated),
  search: (q) => db.searchVisits(q).then(wrap),
};

export const dashboardAPI = {
  getAdmin: () => db.getAdminDashboard().then(wrap),
  getWorker: () => db.getWorkerDashboard(currentUserId()).then(wrap),
};

export const reportAPI = {
  daily: (params) => db.getDailyReport(params?.date).then(wrap),
  weekly: (params) => db.getWeeklyReport(params?.endDate).then(wrap),
  monthly: (params) => db.getMonthlyReport(params?.year, params?.month).then(wrap),
  worker: (params) => db.getWorkerReport(params.workerId, params.startDate, params.endDate).then(wrap),
  patientHistory: (id) => db.getPatientHistoryReport(id).then(wrap),
  fees: (params) => db.getFeeReport(params?.startDate, params?.endDate, params?.workerId).then(wrap),
};

function currentUserId() {
  try {
    const stored = localStorage.getItem('user');
    if (stored) return JSON.parse(stored).WorkerID;
  } catch {}
  return null;
}

function supabaseEmail() {
  try {
    const stored = localStorage.getItem('user');
    if (stored) return JSON.parse(stored).Email;
  } catch {}
  return null;
}

export default db;
