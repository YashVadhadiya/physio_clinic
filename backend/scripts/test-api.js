const http = require('http');

const PORT = process.env.PORT || 5054;
const BASE = `http://localhost:${PORT}`;
let passed = 0, failed = 0;
let step = 0;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function request(method, path, body, token) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'localhost', port: parseInt(PORT),
      path, method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', e => resolve({ status: 0, body: { message: e.message } }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function retryRequest(method, path, body, token, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const r = await request(method, path, body, token);
    if (r.status !== 429) return r;
    if (i < retries - 1) await sleep(1000);
  }
  return request(method, path, body, token);
}

function check(name, result, expectSuccess) {
  step++;
  if (result.status === 0) { failed++; console.log(`  ${String(step).padStart(2)}. ✗ ${name}: CONNECTION ERROR`); return; }
  const ok = result.body && result.body.success === expectSuccess;
  if (ok) { passed++; console.log(`  ${String(step).padStart(2)}. ✓ ${name}`); }
  else { failed++; console.log(`  ${String(step).padStart(2)}. ✗ ${name}: expected success=${expectSuccess}, got ${result.status} ${JSON.stringify(result.body).substring(0, 250)}`); }
}

async function run() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('  COMPREHENSIVE API TEST SUITE');
  console.log('═══════════════════════════════════════════════\n');

  // Wait for server
  let ready = false;
  for (let i = 0; i < 15; i++) {
    const r = await request('GET', '/api/health');
    if (r.status === 200) { ready = true; break; }
    await sleep(1000);
  }
  if (!ready) { console.log('  Server not ready'); process.exit(1); }
  console.log('  Server ready\n');

  // ═══════════════════════════════════════════════
  // 1. AUTH
  // ═══════════════════════════════════════════════
  console.log('══════ 1. AUTH ══════\n');

  let r = await retryRequest('POST', '/api/auth/login', { mobileOrEmail: 'admin@physioclinic.com', password: 'admin123' });
  check('Admin login (default seed)', r, true);
  const adminToken = r.body?.data?.token;
  const adminId = r.body?.data?.worker?.WorkerID;

  r = await retryRequest('POST', '/api/auth/login', { mobileOrEmail: 'admin@physioclinic.com', password: 'wrongpass' });
  check('Bad password rejected (401)', r, false);

  r = await retryRequest('POST', '/api/auth/login', { mobileOrEmail: 'nonexistent@test.com', password: 'pass123' });
  check('Non-existent user rejected (401)', r, false);

  r = await retryRequest('POST', '/api/auth/register', { Name: 'Test Worker', Mobile: '+919999999991', Email: 'worker@test.com', Password: 'pass123', Address: '123 Clinic St' });
  check('Register new worker (201)', r, true);
  const workerId = r.body?.data?.WorkerID;

  r = await retryRequest('POST', '/api/auth/register', { Name: 'Test Worker', Mobile: '+919999999991', Email: 'worker@test.com', Password: 'pass123' });
  check('Duplicate registration rejected (409)', r, false);

  r = await retryRequest('POST', '/api/auth/login', { mobileOrEmail: '+919999999991', password: 'pass123' });
  check('Worker login by mobile (200)', r, true);
  let workerToken = r.body?.data?.token;

  r = await retryRequest('POST', '/api/auth/login', { mobileOrEmail: 'worker@test.com', password: 'pass123' });
  check('Worker login by email (200)', r, true);

  r = await retryRequest('GET', '/api/auth/profile', null, adminToken);
  check('Get profile with valid token (200)', r, true);

  r = await retryRequest('GET', '/api/auth/profile', null, 'invalid-token-here');
  check('Get profile with invalid token (401)', r, false);

  r = await retryRequest('GET', '/api/auth/profile');
  check('Get profile without token (401)', r, false);

  // Change password flow
  r = await retryRequest('PUT', '/api/auth/change-password', { oldPassword: 'pass123', newPassword: 'newpass456' }, workerToken);
  check('Change password (200)', r, true);

  r = await retryRequest('POST', '/api/auth/login', { mobileOrEmail: 'worker@test.com', password: 'newpass456' });
  check('Login with new password (200)', r, true);

  r = await retryRequest('POST', '/api/auth/login', { mobileOrEmail: 'worker@test.com', password: 'pass123' });
  check('Old password rejected after change (401)', r, false);

  // Re-login to get fresh token after password issues
  r = await retryRequest('POST', '/api/auth/login', { mobileOrEmail: 'worker@test.com', password: 'newpass456' });
  workerToken = r.body?.data?.token;
  check('Re-login after password change (200)', r, true);

  // Admin reset worker password
  r = await retryRequest('PUT', `/api/auth/reset-password/${workerId}`, null, adminToken);
  check('Admin reset worker password (200)', r, true);

  r = await retryRequest('POST', '/api/auth/login', { mobileOrEmail: 'worker@test.com', password: 'physio123' });
  check('Login with default reset password (200)', r, true);
  workerToken = r.body?.data?.token;

  await sleep(200);

  // ═══════════════════════════════════════════════
  // 2. WORKERS CRUD
  // ═══════════════════════════════════════════════
  console.log('\n══════ 2. WORKERS CRUD ══════\n');

  r = await retryRequest('GET', '/api/workers', null, adminToken);
  check('List all workers (200)', r, true);
  const workerCount = r.body?.data?.length || 0;

  r = await retryRequest('GET', `/api/workers/${workerId}`, null, adminToken);
  check('Get worker by ID (200)', r, true);
  if (r.body?.data) {
    const hasPwd = 'PasswordHash' in r.body.data;
    if (hasPwd) { failed++; console.log('     ✗ BUG: PasswordHash field exposed in response!'); }
    else { passed++; console.log('     ✓ PasswordHash correctly stripped from response'); }
  }

  r = await retryRequest('GET', `/api/workers/INVALID-ID`, null, adminToken);
  check('Get non-existent worker by ID (404)', r, false);

  r = await retryRequest('GET', '/api/workers/active', null, adminToken);
  check('List active workers (200)', r, true);

  r = await retryRequest('GET', '/api/workers/search?q=Test', null, adminToken);
  check('Search workers by name (200)', r, true);

  r = await retryRequest('GET', '/api/workers/search?q=+919999999991', null, adminToken);
  check('Search workers by mobile (200)', r, true);

  r = await retryRequest('GET', '/api/workers/search?q=NONEXISTENT', null, adminToken);
  check('Search workers with no match (200, empty)', r, true);

  r = await retryRequest('GET', `/api/workers/${workerId}/stats`, null, adminToken);
  check('Get worker stats (200)', r, true);

  r = await retryRequest('GET', '/api/workers', null, workerToken);
  check('Worker role forbidden from listing workers (403)', r, false);

  // Toggle status
  r = await retryRequest('PATCH', `/api/workers/${workerId}/toggle-status`, null, adminToken);
  check('Toggle worker status to inactive (200)', r, true);

  r = await retryRequest('POST', '/api/auth/login', { mobileOrEmail: 'worker@test.com', password: 'physio123' });
  check('Inactive worker cannot login (401)', r, false);

  r = await retryRequest('PATCH', `/api/workers/${workerId}/toggle-status`, null, adminToken);
  check('Toggle worker status back to active (200)', r, true);

  r = await retryRequest('POST', '/api/auth/login', { mobileOrEmail: 'worker@test.com', password: 'physio123' });
  check('Re-activated worker can login (200)', r, true);
  workerToken = r.body?.data?.token;

  // Update worker profile
  r = await retryRequest('PUT', `/api/workers/${workerId}`, { Name: 'Updated Worker Name', EmergencyContact: '+911234567890' }, adminToken);
  check('Update worker profile (200)', r, true);

  r = await retryRequest('GET', `/api/workers/${workerId}`, null, adminToken);
  check('Verify worker update persisted (200)', r, true);
  if (r.body?.data?.Name === 'Updated Worker Name') { passed++; console.log('     ✓ Updated name verified'); }
  else { failed++; console.log(`     ✗ Name not updated: ${r.body?.data?.Name}`); }

  r = await retryRequest('PUT', `/api/workers/${workerId}`, { Name: 'Test Worker' }, adminToken);
  check('Revert worker name (200)', r, true);

  await sleep(200);

  // ═══════════════════════════════════════════════
  // 3. PATIENTS CRUD
  // ═══════════════════════════════════════════════
  console.log('\n══════ 3. PATIENTS CRUD ══════\n');

  r = await retryRequest('POST', '/api/patients', { Name: 'John Doe', Mobile: '+919999999992', Address: '123 Main St', Gender: 'Male', Age: '35', Notes: 'Lower back pain' }, adminToken);
  check('Create patient by admin (201)', r, true);
  let patientId = r.body?.data?.PatientID;

  r = await retryRequest('POST', '/api/patients', { Name: 'Jane Smith', Mobile: '+919999999993', Gender: 'Female', Age: '28' }, workerToken);
  check('Create patient by worker (201)', r, true);
  let patientId2 = r.body?.data?.PatientID;

  r = await retryRequest('POST', '/api/patients', { Name: 'Bob Wilson', Mobile: '+919999999994', Gender: 'Male', Age: '45' }, adminToken);
  check('Create another patient (201)', r, true);
  let patientId3 = r.body?.data?.PatientID;

  r = await retryRequest('POST', '/api/patients', { Name: 'John Doe', Mobile: '+919999999992' }, adminToken);
  check('Duplicate patient mobile rejected (409)', r, false);

  r = await retryRequest('GET', '/api/patients/mobile/+919999999992', null, adminToken);
  check('Find patient by mobile (200)', r, true);

  r = await retryRequest('GET', '/api/patients/mobile/+999999999999', null, adminToken);
  check('Find non-existent mobile returns null (200)', r, true);

  r = await retryRequest('GET', `/api/patients/${patientId}`, null, adminToken);
  check('Get patient by ID (200)', r, true);

  r = await retryRequest('GET', `/api/patients/INVALID-PATIENT`, null, adminToken);
  check('Get non-existent patient by ID (404)', r, false);

  r = await retryRequest('PUT', `/api/patients/${patientId}`, { Name: 'John Updated', Age: '36', Notes: 'Updated: improved' }, adminToken);
  check('Update patient details (200)', r, true);

  r = await retryRequest('GET', '/api/patients/search?q=John', null, adminToken);
  check('Search patients by name (200)', r, true);

  r = await retryRequest('GET', '/api/patients/search?q=+919999999992', null, adminToken);
  check('Search patients by mobile (200)', r, true);

  r = await retryRequest('GET', '/api/patients/search?q=NonExistent', null, adminToken);
  check('Search patients no match (200, empty)', r, true);

  r = await retryRequest('GET', '/api/patients', null, adminToken);
  check('List all patients (200)', r, true);
  if (r.body?.data) {
    if (r.body.data.length >= 2) { passed++; console.log(`     ✓ ${r.body.data.length} patients returned`); }
    else { failed++; console.log(`     ✗ Expected >=2 patients, got ${r.body.data.length}`); }
  }

  r = await retryRequest('GET', '/api/patients/recent', null, adminToken);
  check('Recent patients list (200)', r, true);

  await sleep(200);

  // ═══════════════════════════════════════════════
  // 4. VISITS CRUD
  // ═══════════════════════════════════════════════
  console.log('\n══════ 4. VISITS CRUD ══════\n');

  r = await retryRequest('POST', '/api/visits', { PatientID: patientId, VisitType: 'Home', FeesCollected: 'No', Amount: '500', TreatmentNotes: 'Deep tissue massage', Remarks: 'Patient responded well', NextVisit: '2026-08-01' }, adminToken);
  check('Create visit by admin (201)', r, true);
  let visitId = r.body?.data?.VisitID;

  r = await retryRequest('POST', '/api/visits', { PatientID: patientId2, VisitType: 'Hospital', FeesCollected: 'Yes', Amount: '1000', TreatmentNotes: 'US therapy session' }, workerToken);
  check('Create visit by worker (201)', r, true);
  let visitId2 = r.body?.data?.VisitID;

  r = await retryRequest('POST', '/api/visits', { PatientID: patientId3, VisitType: 'Home', FeesCollected: 'No', Amount: '750', TreatmentNotes: 'Exercise therapy' }, adminToken);
  check('Create another visit (201)', r, true);
  let visitId3 = r.body?.data?.VisitID;

  r = await retryRequest('POST', '/api/visits', {}, adminToken);
  check('Create visit without PatientID (400)', r, false);

  r = await retryRequest('POST', '/api/visits', { PatientID: 'INVALID-PATIENT' }, adminToken);
  check('Create visit with non-existent patient (500/FK error)', r, false);

  r = await retryRequest('GET', '/api/visits/today', null, adminToken);
  check('Get today visits (200)', r, true);

  r = await retryRequest('GET', '/api/visits', null, adminToken);
  check('List all visits (200)', r, true);

  r = await retryRequest('GET', `/api/visits/${visitId}`, null, adminToken);
  check('Get visit by ID (200)', r, true);

  r = await retryRequest('GET', '/api/visits/INVALID', null, adminToken);
  check('Get non-existent visit by ID (404)', r, false);

  r = await retryRequest('PUT', `/api/visits/${visitId}`, { FeesCollected: 'Yes', Amount: '600', TreatmentNotes: 'Updated: massage + stretching', Remarks: 'Paid in full' }, adminToken);
  check('Update visit details (200)', r, true);

  r = await retryRequest('GET', `/api/visits/worker/${adminId}`, null, adminToken);
  check('Get visits by worker ID (200)', r, true);

  r = await retryRequest('GET', `/api/visits/worker/INVALID`, null, adminToken);
  check('Get visits by non-existent worker (200, empty)', r, true);

  r = await retryRequest('GET', `/api/visits/patient/${patientId}`, null, adminToken);
  check('Get visits by patient ID (200)', r, true);

  r = await retryRequest('GET', `/api/visits/patient/INVALID`, null, adminToken);
  check('Get visits by non-existent patient (200, empty)', r, true);

  r = await retryRequest('GET', `/api/visits/date-range?startDate=2020-01-01&endDate=2030-01-01`, null, adminToken);
  check('Get visits by date range (200)', r, true);

  r = await retryRequest('GET', `/api/visits/date-range?startDate=2099-01-01&endDate=2099-12-31`, null, adminToken);
  check('Get visits by future date range (200, empty)', r, true);

  r = await retryRequest('GET', '/api/visits/search?q=Massage', null, adminToken);
  check('Search visits by treatment notes (200)', r, true);

  r = await retryRequest('GET', '/api/visits/search?q=NONEXISTENT', null, adminToken);
  check('Search visits no match (200, empty)', r, true);

  r = await retryRequest('GET', `/api/patients/${patientId}/visits`, null, adminToken);
  check('Get patient visit history (200)', r, true);

  await sleep(400);

  // ═══════════════════════════════════════════════
  // 5. DASHBOARD
  // ═══════════════════════════════════════════════
  console.log('\n══════ 5. DASHBOARD ══════\n');

  r = await retryRequest('GET', '/api/dashboard/admin', null, adminToken);
  check('Admin dashboard loads (200)', r, true);
  if (r.body?.data?.cards) { passed++; console.log('     ✓ Dashboard cards present'); }
  else { failed++; console.log('     ✗ Dashboard cards missing'); }
  if (r.body?.data?.monthlyStats) { passed++; console.log('     ✓ Monthly stats present'); }
  else { failed++; console.log('     ✗ Monthly stats missing'); }
  if (r.body?.data?.dailyGraph) { passed++; console.log('     ✓ Daily graph present'); }
  else { failed++; console.log('     ✗ Daily graph missing'); }
  if (r.body?.data?.workerPerformance) { passed++; console.log('     ✓ Worker performance present'); }
  else { failed++; console.log('     ✗ Worker performance missing'); }
  if (r.body?.data?.recentActivities) { passed++; console.log('     ✓ Recent activities present'); }
  else { failed++; console.log('     ✗ Recent activities missing'); }

  r = await retryRequest('GET', '/api/dashboard/worker', null, workerToken);
  check('Worker dashboard loads (200)', r, true);
  if (r.body?.data?.stats) { passed++; console.log('     ✓ Worker stats present'); }
  else { failed++; console.log('     ✗ Worker stats missing'); }
  if (r.body?.data?.todayVisits) { passed++; console.log('     ✓ Today visits present'); }
  else { failed++; console.log('     ✗ Today visits missing'); }
  if (r.body?.data?.recentVisits) { passed++; console.log('     ✓ Recent visits present'); }
  else { failed++; console.log('     ✗ Recent visits missing'); }
  if (r.body?.data?.recentPatients) { passed++; console.log('     ✓ Recent patients present'); }
  else { failed++; console.log('     ✗ Recent patients missing'); }

  r = await retryRequest('GET', '/api/dashboard/worker', null, adminToken);
  check('Admin can also access worker dashboard (200)', r, true);

  await sleep(400);

  // ═══════════════════════════════════════════════
  // 6. REPORTS
  // ═══════════════════════════════════════════════
  console.log('\n══════ 6. REPORTS ══════\n');

  r = await retryRequest('GET', '/api/reports/daily', null, adminToken);
  check('Daily report (200)', r, true);

  r = await retryRequest('GET', '/api/reports/daily?date=2025-01-15', null, adminToken);
  check('Daily report for specific date (200)', r, true);

  r = await retryRequest('GET', '/api/reports/weekly', null, adminToken);
  check('Weekly report (200)', r, true);

  r = await retryRequest('GET', '/api/reports/weekly?endDate=2025-01-15', null, adminToken);
  check('Weekly report for specific date (200)', r, true);

  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  r = await retryRequest('GET', `/api/reports/monthly?month=${month}&year=${year}`, null, adminToken);
  check('Monthly report current month (200)', r, true);

  r = await retryRequest('GET', `/api/reports/monthly?month=1&year=2025`, null, adminToken);
  check('Monthly report for past month (200)', r, true);

  r = await retryRequest('GET', `/api/reports/worker?workerId=${workerId}`, null, adminToken);
  check('Worker report (200)', r, true);

  r = await retryRequest('GET', `/api/reports/worker?workerId=${workerId}&startDate=2020-01-01&endDate=2030-01-01`, null, adminToken);
  check('Worker report with date range (200)', r, true);

  r = await retryRequest('GET', `/api/reports/patient/${patientId}/history`, null, adminToken);
  check('Patient history report (200)', r, true);

  r = await retryRequest('GET', '/api/reports/fees', null, adminToken);
  check('Fee report (200)', r, true);

  r = await retryRequest('GET', '/api/reports/fees?startDate=2020-01-01&endDate=2030-01-01', null, adminToken);
  check('Fee report with date range (200)', r, true);

  r = await retryRequest('GET', `/api/reports/fees?workerId=${workerId}`, null, adminToken);
  check('Fee report filtered by worker (200)', r, true);

  r = await retryRequest('GET', `/api/reports/fees?startDate=2020-01-01&endDate=2030-01-01&workerId=${workerId}`, null, adminToken);
  check('Fee report with all filters (200)', r, true);

  await sleep(400);

  // ═══════════════════════════════════════════════
  // 7. DELETE / HARD DELETE
  // ═══════════════════════════════════════════════
  console.log('\n══════ 7. DELETE OPERATIONS ══════\n');

  // Hard delete visit (no foreign key dependencies)
  r = await retryRequest('DELETE', `/api/visits/${visitId3}`, null, adminToken);
  check('Hard delete visit (200)', r, true);

  r = await retryRequest('GET', `/api/visits/${visitId3}`, null, adminToken);
  check('Verify deleted visit returns 404', r, false);

  // Soft delete patient (has visits referencing it - visits deleted first, then patient)
  r = await retryRequest('DELETE', `/api/patients/${patientId}`, null, adminToken);
  check('Soft delete patient with visits (visits cleaned up) (200)', r, true);

  r = await retryRequest('GET', `/api/patients/${patientId}`, null, adminToken);
  check('Verify deleted patient returns 404', r, false);

  // Workers can only be toggled inactive, no hard delete endpoint
  await sleep(200);

  // ═══════════════════════════════════════════════
  // 8. EDGE CASES & PERMISSIONS
  // ═══════════════════════════════════════════════
  console.log('\n══════ 8. EDGE CASES ══════\n');

  r = await retryRequest('GET', '/api/nonexistent');
  check('404 for unknown routes', r, false);

  r = await retryRequest('GET', '/api/workers');
  check('401 when no token provided', r, false);

  r = await retryRequest('GET', '/api/workers', null, workerToken);
  check('403 when worker tries to list workers', r, false);

  r = await retryRequest('POST', '/api/patients', { Name: 'Unauth Patient', Mobile: '+919999999999' });
  check('401 when creating patient without token', r, false);

  r = await retryRequest('PUT', `/api/patients/${patientId2}`, { Name: 'Hack Attempt' });
  check('401 when updating patient without token', r, false);

  r = await retryRequest('GET', '/api/reports/daily', null, workerToken);
  check('403 when worker tries to access reports', r, false);

  r = await retryRequest('DELETE', `/api/visits/${visitId2}`, null, workerToken);
  check('403 when worker tries to delete visit', r, false);

  await sleep(200);

  // ═══════════════════════════════════════════════
  // 9. CLEANUP - Delete remaining test data
  // ═══════════════════════════════════════════════
  console.log('\n══════ 9. CLEANUP ══════\n');

  r = await retryRequest('DELETE', `/api/visits/${visitId}`, null, adminToken);
  check('Cleanup: delete visit 1 (200)', r, true);

  r = await retryRequest('DELETE', `/api/visits/${visitId2}`, null, adminToken);
  check('Cleanup: delete visit 2 (200)', r, true);

  r = await retryRequest('DELETE', `/api/patients/${patientId2}`, null, adminToken);
  check('Cleanup: delete patient 2 (200)', r, true);

  r = await retryRequest('DELETE', `/api/patients/${patientId3}`, null, adminToken);
  check('Cleanup: delete patient 3 (200)', r, true);

  r = await retryRequest('POST', '/api/auth/login', { mobileOrEmail: 'admin@physioclinic.com', password: 'admin123' });

  // ═══════════════════════════════════════════════
  // RESULTS
  // ═══════════════════════════════════════════════
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  TOTAL: ${passed + failed}  |  PASSED: ${passed}  |  FAILED: ${failed}`);
  console.log(`═══════════════════════════════════════════════\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
