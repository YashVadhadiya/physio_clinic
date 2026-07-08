import { supabase, getAdminClient } from '../lib/supabase';

function generateId(prefix = '') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

function now() {
  return new Date().toISOString();
}

function todayStr() {
  return now().split('T')[0];
}

function timeStr() {
  return new Date().toTimeString().split(' ')[0].substring(0, 5);
}

function table(name) {
  return supabase.from(name);
}

/* ─────────── Auth ─────────── */

export async function loginUser(mobileOrEmail, password) {
  let email = mobileOrEmail;
  if (!email.includes('@')) {
    const { data: workers, error: searchErr } = await table('workers')
      .select('Email')
      .eq('Mobile', mobileOrEmail)
      .limit(1);
    if (searchErr) throw searchErr;
    if (!workers || workers.length === 0) throw new Error('Invalid credentials');
    email = workers[0].Email;
  }
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const { data: profile } = await table('workers')
    .select('*')
    .eq('Email', email)
    .maybeSingle();
  if (!profile) throw new Error('Worker profile not found');
  if (profile.Status === 'inactive') throw new Error('Account is disabled. Contact admin.');
  const { PasswordHash, ...worker } = profile;
  return { worker, token: authData.session.access_token };
}

export async function registerWorker(data) {
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: data.Email,
    password: data.Password,
    options: {
      data: {
        name: data.Name,
        mobile: data.Mobile,
        role: 'worker',
      },
    },
  });
  if (authErr) throw authErr;

  const workerId = 'USR' + (authData.user?.id?.substring(0, 8).toUpperCase() || generateId(''));
  const workerData = {
    WorkerID: workerId,
    Name: data.Name,
    Mobile: data.Mobile,
    Email: data.Email,
    Address: data.Address || '',
    PasswordHash: '',
    Role: 'worker',
    Status: 'active',
    JoiningDate: todayStr(),
    EmergencyContact: data.EmergencyContact || '',
    ProfilePhoto: data.ProfilePhoto || '',
    CreatedAt: now(),
    UpdatedAt: now(),
  };

  const { error: upsertErr } = await table('workers')
    .upsert(workerData, { onConflict: 'Email' });
  if (upsertErr) throw upsertErr;

  await logActivity(workerId, 'REGISTER', 'Worker registered');
  const { PasswordHash, ...workerWithoutPassword } = workerData;
  return workerWithoutPassword;
}

export async function getProfileByEmail(email) {
  const { data, error } = await table('workers')
    .select('*')
    .eq('Email', email)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { PasswordHash, ...worker } = data;
  return worker;
}

export async function changePassword(workerId, oldPassword, newPassword) {
  const worker = await getWorkerById(workerId);
  if (!worker) throw new Error('Worker not found');
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: worker.Email,
    password: oldPassword,
  });
  if (signInErr) throw new Error('Current password is incorrect');
  const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
  if (updateErr) throw updateErr;
  await logActivity(workerId, 'PASSWORD_CHANGE', 'Password changed');
  return { message: 'Password changed successfully' };
}

export async function resetPassword(workerId) {
  const defaultPassword = 'physio123';
  const worker = await getWorkerById(workerId);
  if (!worker) throw new Error('Worker not found');

  let errors = [];

  // Strategy 1: RPC (works if pgcrypto extension is enabled)
  const { data: rpcData, error: rpcErr } = await supabase.rpc('reset_worker_password', {
    p_email: worker.Email,
    p_password: defaultPassword,
  });
  if (!rpcErr && rpcData) {
    await logActivity(workerId, 'PASSWORD_RESET', 'Password reset by admin');
    return { message: 'Password reset successfully', defaultPassword: rpcData || defaultPassword };
  }
  errors.push(`RPC: ${rpcErr?.message}`);

  // Strategy 2: Admin API (requires VITE_SUPABASE_SERVICE_KEY in .env)
  const admin = getAdminClient();
  if (admin) {
    try {
      const { data: userList, error: listErr } = await admin.auth.admin.listUsers();
      if (!listErr) {
        const target = userList.users.find(u => u.email === worker.Email);
        if (target) {
          const { error: updateErr } = await admin.auth.admin.updateUserById(target.id, { password: defaultPassword });
          if (!updateErr) {
            await logActivity(workerId, 'PASSWORD_RESET', 'Password reset by admin');
            return { message: 'Password reset successfully', defaultPassword };
          }
          errors.push(`AdminAPI: ${updateErr.message}`);
        } else {
          errors.push('Auth user not found for this email');
        }
      } else {
        errors.push(`ListUsers: ${listErr.message}`);
      }
    } catch (e) { errors.push(`AdminAPI: ${e.message}`); }
  } else {
    errors.push('VITE_SUPABASE_SERVICE_KEY not set in .env');
  }

  throw new Error(
    `Password reset failed.\n${errors.join('\n')}\n\n` +
    `To fix: add VITE_SUPABASE_SERVICE_KEY (your Supabase service_role key) to frontend/.env`
  );
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

/* ─────────── Workers ─────────── */

export async function getWorkers(params = {}) {
  let query = table('workers').select('*', { count: 'exact' });
  if (params.Status) query = query.eq('Status', params.Status);
  if (params.Role) query = query.eq('Role', params.Role);
  if (params.limit) {
    const p = params.page || 1;
    const limit = Math.min(parseInt(params.limit) || 20, 100);
    const from = (p - 1) * limit;
    query = query.range(from, from + limit - 1);
  }
  query = query.order('CreatedAt', { ascending: false });
  const { data, count, error } = await query;
  if (error) throw error;
  return {
    data: data || [],
    pagination: {
      total: count || 0,
      page: parseInt(params.page) || 1,
      limit: parseInt(params.limit) || 20,
      totalPages: Math.ceil((count || 0) / (parseInt(params.limit) || 20)) || 1,
    },
  };
}

export async function getWorkerById(id) {
  const { data, error } = await table('workers')
    .select('*')
    .eq('WorkerID', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getActiveWorkers() {
  const { data, error } = await table('workers')
    .select('*')
    .eq('Status', 'active')
    .eq('Role', 'worker');
  if (error) throw error;
  return data || [];
}

export async function updateWorker(id, updateData) {
  const payload = { ...updateData, UpdatedAt: now() };
  const { data, error } = await table('workers')
    .update(payload)
    .eq('WorkerID', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function toggleWorkerStatus(id) {
  const worker = await getWorkerById(id);
  if (!worker) throw new Error('Worker not found');
  const newStatus = worker.Status === 'active' ? 'inactive' : 'active';
  return updateWorker(id, { Status: newStatus });
}

export async function searchWorkers(q) {
  const term = `%${q}%`;
  const { data, error } = await table('workers')
    .select('*')
    .or(`Name.ilike.${term},Mobile.ilike.${term},Email.ilike.${term}`)
    .limit(20);
  if (error) throw error;
  return data || [];
}

export async function getWorkerStats(id) {
  const { data: visits, error } = await table('visits')
    .select('*')
    .eq('WorkerID', id);
  if (error) throw error;
  const totalVisits = visits?.length || 0;
  const totalFees = (visits || []).reduce((s, v) => s + (parseFloat(v.Amount) || 0), 0);
  const collectedFees = (visits || [])
    .filter(v => v.FeesCollected === 'Yes')
    .reduce((s, v) => s + (parseFloat(v.Amount) || 0), 0);
  return { totalVisits, totalFees, collectedFees, pendingFees: totalFees - collectedFees };
}

/* ─────────── Patients ─────────── */

export async function getPatients(params = {}) {
  let query = table('patients').select('*', { count: 'exact' });
  if (params.Status) query = query.eq('Status', params.Status);
  if (params.q) {
    const term = `%${params.q}%`;
    query = query.or(`Name.ilike.${term},Mobile.ilike.${term}`);
  }
  const p = parseInt(params.page) || 1;
  const limit = Math.min(parseInt(params.limit) || 20, 100);
  const from = (p - 1) * limit;
  query = query.range(from, from + limit - 1).order('CreatedAt', { ascending: false });
  const { data, count, error } = await query;
  if (error) throw error;
  return {
    data: data || [],
    pagination: {
      total: count || 0,
      page: p,
      limit,
      totalPages: Math.ceil((count || 0) / limit) || 1,
    },
  };
}

export async function getPatientById(id) {
  const { data, error } = await table('patients')
    .select('*')
    .eq('PatientID', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createPatient(data, userId) {
  const patientId = generateId('PAT');
  const patientData = {
    PatientID: patientId,
    Name: data.Name,
    Mobile: data.Mobile,
    Address: data.Address || '',
    Gender: data.Gender || '',
    Age: data.Age || '',
    Notes: data.Notes || '',
    Status: 'active',
    CreatedBy: userId,
    CreatedAt: now(),
    UpdatedAt: now(),
  };
  const { data: inserted, error } = await table('patients')
    .insert(patientData)
    .select()
    .maybeSingle();
  if (error) throw error;
  await logActivity(userId, 'PATIENT_CREATED', `Patient created: ${data.Name}`);
  return inserted || patientData;
}

export async function updatePatient(id, data) {
  const payload = {
    Name: data.Name,
    Mobile: data.Mobile,
    Address: data.Address,
    Gender: data.Gender,
    Age: data.Age,
    Notes: data.Notes,
    UpdatedAt: now(),
  };
  Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k]; });
  const { data: updated, error } = await table('patients')
    .update(payload)
    .eq('PatientID', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return updated;
}

export async function deletePatient(id) {
  const { error: visitErr } = await table('visits')
    .delete()
    .eq('PatientID', id);
  if (visitErr) throw visitErr;
  const { error } = await table('patients')
    .delete()
    .eq('PatientID', id);
  if (error) throw error;
  return { message: 'Patient deleted successfully' };
}

export async function searchPatients(q) {
  const term = `%${q}%`;
  const { data, error } = await table('patients')
    .select('*')
    .or(`Name.ilike.${term},Mobile.ilike.${term}`)
    .limit(20);
  if (error) throw error;
  return data || [];
}

export async function findPatientByMobile(mobile) {
  const { data, error } = await table('patients')
    .select('*')
    .eq('Mobile', mobile)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPatientVisitHistory(patientId) {
  const { data: visits, error } = await table('visits')
    .select('*')
    .eq('PatientID', patientId)
    .order('VisitDate', { ascending: false });
  if (error) throw error;
  const { data: workers } = await table('workers').select('WorkerID, Name');
  const workerMap = {};
  (workers || []).forEach(w => { workerMap[w.WorkerID] = w.Name; });
  return (visits || []).map(v => ({
    ...v,
    WorkerName: workerMap[v.WorkerID] || 'Unknown',
  }));
}

export async function getRecentPatients(limit = 10) {
  const { data, error } = await table('patients')
    .select('*')
    .order('CreatedAt', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/* ─────────── Visits ─────────── */

async function enrichVisits(visits) {
  if (!visits || visits.length === 0) return [];
  const { data: patients } = await table('patients').select('PatientID, Name');
  const { data: workers } = await table('workers').select('WorkerID, Name');
  const pMap = {}, wMap = {};
  (patients || []).forEach(p => { pMap[p.PatientID] = p.Name; });
  (workers || []).forEach(w => { wMap[w.WorkerID] = w.Name; });
  return visits.map(v => ({
    ...v,
    PatientName: pMap[v.PatientID] || 'Unknown',
    WorkerName: wMap[v.WorkerID] || 'Unknown',
  }));
}

export async function getVisits(params = {}) {
  let query = table('visits').select('*', { count: 'exact' });
  if (params.VisitDate) query = query.eq('VisitDate', params.VisitDate);
  if (params.WorkerID) query = query.eq('WorkerID', params.WorkerID);
  if (params.PatientID) query = query.eq('PatientID', params.PatientID);
  if (params.VisitType) query = query.eq('VisitType', params.VisitType);
  const p = parseInt(params.page) || 1;
  const limit = Math.min(parseInt(params.limit) || 20, 100);
  const from = (p - 1) * limit;
  query = query.range(from, from + limit - 1).order('VisitDate', { ascending: false });
  const { data, count, error } = await query;
  if (error) throw error;
  const enriched = await enrichVisits(data || []);
  return {
    data: enriched,
    pagination: {
      total: count || 0,
      page: p,
      limit,
      totalPages: Math.ceil((count || 0) / limit) || 1,
    },
  };
}

export async function getVisitById(id) {
  const { data, error } = await table('visits')
    .select('*')
    .eq('VisitID', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createVisit(data, workerId) {
  const visitId = generateId('VIS');
  const visitData = {
    VisitID: visitId,
    PatientID: data.PatientID,
    WorkerID: workerId,
    VisitDate: data.VisitDate || todayStr(),
    VisitTime: data.VisitTime || timeStr(),
    VisitType: data.VisitType || 'Home',
    FeesCollected: data.FeesCollected || 'No',
    Amount: data.Amount || '0',
    TreatmentNotes: data.TreatmentNotes || '',
    Remarks: data.Remarks || '',
    NextVisit: data.NextVisit || '',
    CreatedAt: now(),
    UpdatedAt: now(),
  };
  const { data: inserted, error } = await table('visits')
    .insert(visitData)
    .select()
    .maybeSingle();
  if (error) throw error;
  const { data: patients } = await table('patients').select('Name').eq('PatientID', data.PatientID).maybeSingle();
  await logActivity(workerId, 'VISIT_CREATED', `Visit created for patient: ${patients?.Name || 'Unknown'}`);
  return inserted || visitData;
}

export async function updateVisit(id, data) {
  const payload = { ...data, UpdatedAt: now() };
  const { data: updated, error } = await table('visits')
    .update(payload)
    .eq('VisitID', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return updated;
}

export async function deleteVisit(id) {
  const { error } = await table('visits').delete().eq('VisitID', id);
  if (error) throw error;
  return { message: 'Visit deleted successfully' };
}

export async function getTodayVisits() {
  const { data, error } = await table('visits')
    .select('*')
    .eq('VisitDate', todayStr())
    .order('VisitTime', { ascending: true });
  if (error) throw error;
  return enrichVisits(data || []);
}

export async function getVisitsByDateRange(startDate, endDate, page = 1, limit = 50) {
  const { data, count, error } = await table('visits')
    .select('*', { count: 'exact' })
    .gte('VisitDate', startDate)
    .lte('VisitDate', endDate)
    .order('VisitDate', { ascending: false });
  if (error) throw error;
  const enriched = await enrichVisits(data || []);
  const totalPages = Math.ceil((count || 0) / limit);
  return {
    data: enriched.slice((page - 1) * limit, page * limit),
    pagination: { total: count || 0, page, limit, totalPages: totalPages || 1 },
  };
}

export async function getVisitsByWorker(workerId, page = 1, limit = 20) {
  return getVisits({ WorkerID: workerId, page, limit });
}

export async function getVisitsByPatient(patientId, page = 1, limit = 20) {
  return getVisits({ PatientID: patientId, page, limit });
}

export async function searchVisits(q) {
  const term = q.toLowerCase();
  const { data: visits, error } = await table('visits').select('*');
  if (error) throw error;
  const enriched = await enrichVisits(visits || []);
  return enriched.filter(v =>
    v.VisitID?.toLowerCase().includes(term) ||
    v.PatientID?.toLowerCase().includes(term) ||
    v.VisitDate?.includes(term) ||
    v.PatientName?.toLowerCase().includes(term) ||
    v.WorkerName?.toLowerCase().includes(term)
  );
}

/* ─────────── Dashboard ─────────── */

export async function getAdminDashboard() {
  const { data: workers } = await table('workers').select('*').eq('Status', 'active');
  const { data: patients } = await table('patients').select('*');
  const { data: visits } = await table('visits').select('*');
  const { data: logs } = await table('activity_logs')
    .select('*')
    .order('Timestamp', { ascending: false })
    .limit(10);

  const today = todayStr();
  const todayVisits = (visits || []).filter(v => v.VisitDate === today);
  const nowDate = new Date();
  const month = nowDate.getMonth() + 1;
  const year = nowDate.getFullYear();
  const monthStr = String(month).padStart(2, '0');
  const monthlyVisits = (visits || []).filter(v =>
    v.VisitDate && v.VisitDate.startsWith(`${year}-${monthStr}`)
  );

  const totalFees = (visits || []).reduce((s, v) => s + (parseFloat(v.Amount) || 0), 0);
  const collectedFees = (visits || [])
    .filter(v => v.FeesCollected === 'Yes')
    .reduce((s, v) => s + (parseFloat(v.Amount) || 0), 0);

  const activeWorkers = (workers || []).filter(w => w.Status === 'active' && w.Role === 'worker');

  const cards = {
    totalWorkers: activeWorkers.length,
    totalPatients: (patients || []).length,
    todayVisits: todayVisits.length,
    monthlyVisits: monthlyVisits.length,
    pendingFees: totalFees - collectedFees,
    collectedFees,
  };

  const monthlyStats = getMonthlyStatsCalc(visits || [], year, month);
  const previousMonthlyStats = getMonthlyStatsCalc(
    visits || [],
    month === 1 ? year - 1 : year,
    month === 1 ? 12 : month - 1
  );
  const dailyGraph = getDailyGraphDataCalc(visits || [], year, month);
  const workerPerformance = getWorkerPerformanceCalc(visits || [], workers || [], `${year}-01-01`, `${year}-12-31`);

  return {
    cards,
    monthlyStats,
    previousMonthlyStats,
    dailyGraph,
    workerPerformance: workerPerformance.slice(0, 10),
    recentActivities: (logs || []).slice(0, 10),
  };
}

export async function getWorkerDashboard(workerId) {
  const { data: visits } = await table('visits').select('*').eq('WorkerID', workerId);
  const { data: patients } = await table('patients').select('*');

  const today = todayStr();
  const workerVisits = visits || [];
  const todayVisitsData = workerVisits.filter(v => v.VisitDate === today);
  const patientsTreated = new Set(workerVisits.map(v => v.PatientID)).size;

  const totalFees = workerVisits.reduce((s, v) => s + (parseFloat(v.Amount) || 0), 0);
  const collectedFees = workerVisits.filter(v => v.FeesCollected === 'Yes')
    .reduce((s, v) => s + (parseFloat(v.Amount) || 0), 0);

  const pMap = {};
  (patients || []).forEach(p => { pMap[p.PatientID] = p.Name; });

  const recentVisits = [...workerVisits]
    .sort((a, b) => new Date(b.VisitDate) - new Date(a.VisitDate))
    .slice(0, 10)
    .map(v => ({ ...v, PatientName: pMap[v.PatientID] || 'Unknown' }));

  const recentPatientList = (patients || []).slice(-10).reverse();

  return {
    stats: {
      todayVisits: todayVisitsData.length,
      totalVisits: workerVisits.length,
      patientsTreated,
      totalFees,
      collectedFees,
      pendingFees: totalFees - collectedFees,
    },
    todayVisits: todayVisitsData.map(v => ({ ...v, PatientName: pMap[v.PatientID] || 'Unknown' })),
    recentVisits,
    recentPatients: recentPatientList,
  };
}

function getMonthlyStatsCalc(visits, year, month) {
  const monthStr = String(month).padStart(2, '0');
  const monthVisits = visits.filter(v => v.VisitDate && v.VisitDate.startsWith(`${year}-${monthStr}`));
  const totalFees = monthVisits.reduce((s, v) => s + (parseFloat(v.Amount) || 0), 0);
  const collectedFees = monthVisits.filter(v => v.FeesCollected === 'Yes')
    .reduce((s, v) => s + (parseFloat(v.Amount) || 0), 0);
  return { totalVisits: monthVisits.length, totalFees, collectedFees, pendingFees: totalFees - collectedFees };
}

function getDailyGraphDataCalc(visits, year, month) {
  const monthStr = String(month).padStart(2, '0');
  const monthVisits = visits.filter(v => v.VisitDate && v.VisitDate.startsWith(`${year}-${monthStr}`));
  const daysInMonth = new Date(year, month, 0).getDate();
  const graphData = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;
    const dayVisits = monthVisits.filter(v => v.VisitDate === dateStr);
    graphData.push({
      date: dateStr,
      count: dayVisits.length,
      fees: dayVisits.reduce((s, v) => s + (parseFloat(v.Amount) || 0), 0),
    });
  }
  return graphData;
}

function getWorkerPerformanceCalc(visits, workers, startDate, endDate) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const filtered = visits.filter(v => {
    const t = new Date(v.VisitDate).getTime();
    return t >= start && t <= end;
  });
  const wMap = {};
  (workers || []).forEach(w => { wMap[w.WorkerID] = w.Name; });
  const perf = {};
  filtered.forEach(v => {
    if (!perf[v.WorkerID]) {
      perf[v.WorkerID] = { WorkerID: v.WorkerID, WorkerName: wMap[v.WorkerID] || 'Unknown', totalVisits: 0, totalFees: 0, collectedFees: 0 };
    }
    perf[v.WorkerID].totalVisits++;
    const amt = parseFloat(v.Amount) || 0;
    perf[v.WorkerID].totalFees += amt;
    if (v.FeesCollected === 'Yes') perf[v.WorkerID].collectedFees += amt;
  });
  return Object.values(perf).sort((a, b) => b.totalVisits - a.totalVisits);
}

/* ─────────── Reports ─────────── */

export async function getDailyReport(date) {
  const reportDate = date || todayStr();
  const visits = await getVisitsByDateRange(reportDate, reportDate, 1, 500);
  const data = visits.data;
  const totalFees = data.reduce((s, v) => s + (parseFloat(v.Amount) || 0), 0);
  const collectedFees = data.filter(v => v.FeesCollected === 'Yes')
    .reduce((s, v) => s + (parseFloat(v.Amount) || 0), 0);
  const workers = {};
  data.forEach(v => {
    if (!workers[v.WorkerID]) workers[v.WorkerID] = { name: v.WorkerName, visits: 0, fees: 0 };
    workers[v.WorkerID].visits++;
    workers[v.WorkerID].fees += parseFloat(v.Amount) || 0;
  });
  return {
    date: reportDate,
    totalVisits: data.length,
    totalFees,
    collectedFees,
    pendingFees: totalFees - collectedFees,
    visits: data,
    workerSummary: Object.values(workers),
  };
}

export async function getWeeklyReport(endDate) {
  const end = endDate ? new Date(endDate) : new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];
  const result = await getVisitsByDateRange(startStr, endStr, 1, 500);
  const totalFees = result.data.reduce((s, v) => s + (parseFloat(v.Amount) || 0), 0);
  const collectedFees = result.data.filter(v => v.FeesCollected === 'Yes')
    .reduce((s, v) => s + (parseFloat(v.Amount) || 0), 0);
  const dailyBreakdown = {};
  result.data.forEach(v => {
    if (!dailyBreakdown[v.VisitDate]) dailyBreakdown[v.VisitDate] = { date: v.VisitDate, count: 0, fees: 0 };
    dailyBreakdown[v.VisitDate].count++;
    dailyBreakdown[v.VisitDate].fees += parseFloat(v.Amount) || 0;
  });
  return {
    startDate: startStr, endDate: endStr,
    totalVisits: result.pagination.total,
    totalFees, collectedFees,
    pendingFees: totalFees - collectedFees,
    dailyBreakdown: Object.values(dailyBreakdown).sort((a, b) => a.date.localeCompare(b.date)),
    visits: result.data,
  };
}

export async function getMonthlyReport(year, month) {
  const y = year || new Date().getFullYear();
  const m = month || (new Date().getMonth() + 1);
  const monthStr = String(m).padStart(2, '0');
  const daysInMonth = new Date(y, m, 0).getDate();
  const startDate = `${y}-${monthStr}-01`;
  const endDate = `${y}-${monthStr}-${daysInMonth}`;
  const result = await getVisitsByDateRange(startDate, endDate, 1, 500);
  const { data: visits } = await table('visits').select('*');
  const { data: workers } = await table('workers').select('WorkerID, Name');
  const stats = getMonthlyStatsCalc(visits || [], y, m);
  const dailyGraph = getDailyGraphDataCalc(visits || [], y, m);
  const workerPerformance = getWorkerPerformanceCalc(visits || [], workers || [], startDate, endDate);
  return { year: y, month: m, ...stats, dailyGraph, workerPerformance, visits: result.data };
}

export async function getWorkerReport(workerId, startDate, endDate) {
  const { data: visits } = await table('visits').select('*').eq('WorkerID', workerId);
  const { data: patients } = await table('patients').select('PatientID, Name');
  const worker = await getWorkerById(workerId);
  if (!worker) return null;
  const pMap = {};
  (patients || []).forEach(p => { pMap[p.PatientID] = p.Name; });
  const start = startDate ? new Date(startDate).getTime() : 0;
  const end = endDate ? new Date(endDate).getTime() : Date.now();
  const workerVisits = (visits || [])
    .filter(v => {
      const t = new Date(v.VisitDate).getTime();
      return t >= start && t <= end;
    })
    .map(v => ({ ...v, PatientName: pMap[v.PatientID] || 'Unknown' }))
    .sort((a, b) => new Date(b.VisitDate) - new Date(a.VisitDate));
  const totalFees = workerVisits.reduce((s, v) => s + (parseFloat(v.Amount) || 0), 0);
  const collectedFees = workerVisits.filter(v => v.FeesCollected === 'Yes')
    .reduce((s, v) => s + (parseFloat(v.Amount) || 0), 0);
  const { PasswordHash, ...workerData } = worker;
  return {
    worker: workerData,
    reportPeriod: { startDate: startDate || 'All', endDate: endDate || 'All' },
    summary: { totalVisits: workerVisits.length, totalFees, collectedFees, pendingFees: totalFees - collectedFees },
    visits: workerVisits,
  };
}

export async function getPatientHistoryReport(patientId) {
  const { data: visits } = await table('visits').select('*').eq('PatientID', patientId);
  const { data: patients } = await table('patients').select('*').eq('PatientID', patientId).maybeSingle();
  const { data: workers } = await table('workers').select('WorkerID, Name');
  const wMap = {};
  (workers || []).forEach(w => { wMap[w.WorkerID] = w.Name; });
  const patientVisits = (visits || [])
    .map(v => ({ ...v, WorkerName: wMap[v.WorkerID] || 'Unknown' }))
    .sort((a, b) => new Date(b.VisitDate) - new Date(a.VisitDate));
  const totalFees = patientVisits.reduce((s, v) => s + (parseFloat(v.Amount) || 0), 0);
  const collectedFees = patientVisits.filter(v => v.FeesCollected === 'Yes')
    .reduce((s, v) => s + (parseFloat(v.Amount) || 0), 0);
  return {
    patient: patients,
    summary: { totalVisits: patientVisits.length, totalFees, collectedFees, pendingFees: totalFees - collectedFees },
    visits: patientVisits,
  };
}

export async function getFeeReport(startDate, endDate, workerId) {
  const { data: allVisits } = await table('visits').select('*');
  const { data: patients } = await table('patients').select('PatientID, Name');
  const { data: workers } = await table('workers').select('WorkerID, Name');
  let visits = allVisits || [];
  if (startDate && endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    visits = visits.filter(v => {
      const t = new Date(v.VisitDate).getTime();
      return t >= start && t <= end;
    });
  }
  if (workerId) visits = visits.filter(v => v.WorkerID === workerId);
  const pMap = {}, wMap = {};
  (patients || []).forEach(p => { pMap[p.PatientID] = p.Name; });
  (workers || []).forEach(w => { wMap[w.WorkerID] = w.Name; });
  const enriched = visits.map(v => ({
    ...v, PatientName: pMap[v.PatientID] || 'Unknown', WorkerName: wMap[v.WorkerID] || 'Unknown',
  })).sort((a, b) => new Date(b.VisitDate) - new Date(a.VisitDate));
  const totalFees = enriched.reduce((s, v) => s + (parseFloat(v.Amount) || 0), 0);
  const collectedFees = enriched.filter(v => v.FeesCollected === 'Yes')
    .reduce((s, v) => s + (parseFloat(v.Amount) || 0), 0);
  const pendingVisits = enriched.filter(v => v.FeesCollected === 'No');
  const pendingFees = pendingVisits.reduce((s, v) => s + (parseFloat(v.Amount) || 0), 0);
  return {
    summary: {
      totalVisits: enriched.length, totalFees, collectedFees, pendingFees,
      collectionRate: totalFees > 0 ? ((collectedFees / totalFees) * 100).toFixed(1) : 0,
    },
    collectedVisits: enriched.filter(v => v.FeesCollected === 'Yes'),
    pendingVisits,
    allVisits: enriched,
  };
}

/* ─────────── Activity Log ─────────── */

export async function logActivity(userId, action, description) {
  const logId = generateId('LOG');
  const { error } = await table('activity_logs').insert({
    LogID: logId,
    UserID: userId,
    Action: action,
    Description: description,
    Timestamp: now(),
  });
  if (error) console.error('Failed to log activity:', error.message);
}
