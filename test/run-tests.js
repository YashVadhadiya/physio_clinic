const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const BACKEND_DIR = path.join(__dirname, '..', 'backend');
const MOCK_URL = 'http://localhost:3001';

process.env.APPS_SCRIPT_URL = MOCK_URL;
process.env.APPS_SCRIPT_TOKEN = 'test-token-123';
process.env.JWT_SECRET = 'test-jwt-secret-999';
process.env.ADMIN_EMAIL = 'admin@test.com';
process.env.ADMIN_PASSWORD = 'admin123';
process.env.ADMIN_NAME = 'Test Admin';
process.env.ADMIN_MOBILE = '+911234567890';
process.env.PORT = 5000;

let results = { passed: 0, failed: 0, errors: [] };

function pass(msg) { results.passed++; console.log(`  ✓ ${msg}`); }
function fail(msg, detail) {
  results.failed++;
  results.errors.push({ msg, detail: detail ? (typeof detail === 'string' ? detail : JSON.stringify(detail).substring(0, 300)) : undefined });
  console.log(`  ✗ ${msg}`);
  if (detail) console.log(`    → ${typeof detail === 'string' ? detail : JSON.stringify(detail).substring(0, 300)}`);
}

function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = { 'Content-Type': 'application/json' };
    const opts = {
      hostname: 'localhost',
      port: 5000,
      path: '/',
      method: 'GET',
      ...options,
      headers: { ...defaultHeaders, ...(options.headers || {}) },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function retryHttpRequest(options, body, maxRetries = 10, delay = 800) {
  return new Promise(async (resolve, reject) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await httpRequest(options, body);
        resolve(res);
        return;
      } catch (e) {
        if (i === maxRetries - 1) reject(e);
        else await new Promise(r => setTimeout(r, delay));
      }
    }
  });
}

function spawnAndWait(script, args, waitForMsg, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [script, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });
    let resolved = false;
    const onData = (d) => {
      const txt = d.toString();
      if (!resolved && txt.includes(waitForMsg)) {
        resolved = true;
        resolve(proc);
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', reject);

    if (waitForMsg === 'HTTP') {
      // For backend: poll health endpoint
      const poll = setInterval(async () => {
        try {
          const res = await httpRequest({ path: '/api/health', hostname: 'localhost', port: 5000, method: 'GET' });
          if (res.status === 200 && !resolved) {
            resolved = true;
            clearInterval(poll);
            resolve(proc);
          }
        } catch {}
      }, 500);
      setTimeout(() => {
        if (!resolved) { resolved = true; clearInterval(poll); resolve(proc); }
      }, timeout);
    } else {
      setTimeout(() => {
        if (!resolved) { resolved = true; resolve(proc); }
      }, timeout);
    }
  });
}

function kill(proc) {
  return new Promise((resolve) => {
    proc.on('exit', resolve);
    proc.kill('SIGTERM');
    setTimeout(resolve, 1000);
  });
}

async function runTests() {
  console.log('\n========================================');
  console.log('  PhysioClinic - Full API Test Suite');
  console.log('========================================\n');

  let mockServer, backend;

  try {
    console.log('1. Starting mock Apps Script server...');
    mockServer = await spawnAndWait(
      path.join(__dirname, 'mock-apps-script.js'), [],
      'running on port 3001', 5000
    );
    pass('Mock server running on port 3001');

    console.log('\n2. Starting backend...');
    backend = await spawnAndWait(
      path.join(BACKEND_DIR, 'server.js'), [],
      'HTTP', 15000
    );
    pass('Backend running on port 5000');

    // ===== AUTH TESTS =====
    console.log('\n═══════════════════════════════════');
    console.log('  AUTH MODULE');
    console.log('═══════════════════════════════════\n');

    let token = null;
    let workerToken = null;
    let workerId = null;

    console.log('  2.1 Login with default admin...');
    {
      const res = await retryHttpRequest(
        { path: '/api/auth/login', method: 'POST' },
        { mobileOrEmail: 'admin@test.com', password: 'admin123' }
      );

      if (res.status === 200 && res.body.success) {
        token = res.body.data.token;
        pass('Admin login successful');
        if (res.body.data.worker.Role === 'admin') pass('  Admin role correct');
        else fail('  Admin role should be "admin"', 'got: ' + res.body.data.worker.Role);
      } else {
        fail('Admin login failed', res.body);
      }
    }

    console.log('\n  2.2 Invalid credentials rejected...');
    {
      const res = await httpRequest(
        { path: '/api/auth/login', method: 'POST' },
        { mobileOrEmail: 'admin@test.com', password: 'wrongpass' }
      );
      (res.status === 401 || !res.body.success) ? pass('Invalid login rejected') : fail('Should reject bad password');
    }

    console.log('\n  2.3 Get profile...');
    {
      const res = await httpRequest(
        { path: '/api/auth/profile', method: 'GET', headers: { Authorization: `Bearer ${token}` } }
      );
      (res.status === 200 && res.body.success) ? pass('Profile fetched') : fail('Profile failed', res.body);
    }

    console.log('\n  2.4 Register new worker...');
    {
      const res = await httpRequest(
        { path: '/api/auth/register', method: 'POST' },
        { Name: 'Test Worker', Mobile: '+919999999991', Email: 'worker1@test.com', Password: 'pass123', Address: 'Addr' }
      );
      if (res.status === 201 && res.body.success) {
        workerId = res.body.data.WorkerID;
        pass(`Worker registered (ID: ${workerId})`);
      } else fail('Register worker failed', res.body);
    }

    console.log('\n  2.5 Duplicate registration rejected...');
    {
      const res = await httpRequest(
        { path: '/api/auth/register', method: 'POST' },
        { Name: 'Test Worker', Mobile: '+919999999991', Email: 'worker1@test.com', Password: 'pass123' }
      );
      (!res.body.success) ? pass('Duplicate rejected') : fail('Should reject duplicate', res.body);
    }

    console.log('\n  2.6 Worker login by mobile...');
    {
      const res = await httpRequest(
        { path: '/api/auth/login', method: 'POST' },
        { mobileOrEmail: '+919999999991', password: 'pass123' }
      );
      if (res.status === 200 && res.body.success) {
        workerToken = res.body.data.token;
        pass('Worker login by mobile OK');
      } else fail('Worker login failed', res.body);
    }

    console.log('\n  2.7 Worker login by email...');
    {
      const res = await httpRequest(
        { path: '/api/auth/login', method: 'POST' },
        { mobileOrEmail: 'worker1@test.com', password: 'pass123' }
      );
      (res.status === 200 && res.body.success) ? pass('Worker login by email OK') : fail('Login by email failed');
    }

    // ===== WORKER MODULE =====
    console.log('\n═══════════════════════════════════');
    console.log('  WORKER MODULE');
    console.log('═══════════════════════════════════\n');

    console.log('  3.1 List workers...');
    {
      const res = await httpRequest({ path: '/api/workers', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200 && res.body.success) ? pass(`Listed ${res.body.data?.length || 0} workers`) : fail('List failed', res.body);
    }

    console.log('\n  3.2 Get worker by ID (no password hash)...');
    {
      const res = await httpRequest({ path: `/api/workers/${workerId}`, method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 200 && res.body.success) {
        pass(`Worker ${workerId} fetched`);
        if (!res.body.data.PasswordHash) pass('  Password hash NOT exposed');
        else fail('  Password hash should be stripped');
      } else fail('Get worker failed', res.body);
    }

    console.log('\n  3.3 Active workers...');
    {
      const res = await httpRequest({ path: '/api/workers/active', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('Active workers listed') : fail('Failed', res.body);
    }

    console.log('\n  3.5 Worker search...');
    {
      const res = await httpRequest({ path: '/api/workers/search?q=Test', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('Search works') : fail('Search failed', res.body);
    }

    console.log('\n  3.6 Worker stats...');
    {
      const res = await httpRequest({ path: `/api/workers/${workerId}/stats`, method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('Stats fetched') : fail('Stats failed', res.body);
    }

    console.log('\n  3.7 No-token rejected...');
    {
      const res = await httpRequest({ path: '/api/workers', method: 'GET' });
      (res.status === 401) ? pass('No token → 401') : fail('Should be 401', res.status);
    }

    console.log('\n  3.8 Worker forbidden from list...');
    {
      const res = await httpRequest({ path: '/api/workers', method: 'GET', headers: { Authorization: `Bearer ${workerToken}` } });
      (res.status === 403) ? pass('Worker → 403') : fail('Should be 403', res.status);
    }

    console.log('\n  3.9 Toggle worker status (active → inactive → active)...');
    {
      // Toggle to inactive
      const res1 = await httpRequest({ path: `/api/workers/${workerId}/toggle-status`, method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      if (res1.status === 200) pass('  Toggled to inactive');
      else fail('Toggle to inactive failed', res1.body);
      // Toggle back to active
      const res2 = await httpRequest({ path: `/api/workers/${workerId}/toggle-status`, method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      if (res2.status === 200) pass('  Toggled back to active');
      else fail('Toggle to active failed', res2.body);
      // Re-login to get fresh token for the now-active worker
      const loginRes = await httpRequest(
        { path: '/api/auth/login', method: 'POST' },
        { mobileOrEmail: 'worker1@test.com', password: 'pass123' }
      );
      if (loginRes.status === 200) {
        workerToken = loginRes.body.data.token;
        pass('  Re-logged in after status toggle');
      }
    }

    // ===== PATIENT MODULE =====
    console.log('\n═══════════════════════════════════');
    console.log('  PATIENT MODULE');
    console.log('═══════════════════════════════════\n');

    let patientId, patientId2;

    console.log('  4.1 Create patient...');
    {
      const res = await httpRequest(
        { path: '/api/patients', method: 'POST', headers: { Authorization: `Bearer ${token}` } },
        { Name: 'John Doe', Mobile: '+919999999992', Address: '123 St', Gender: 'Male', Age: '35', Notes: 'Back pain' }
      );
      if (res.status === 201 && res.body.success) {
        patientId = res.body.data.PatientID;
        pass(`Patient created (${patientId})`);
      } else fail('Patient create failed', res.body);
    }

    console.log('\n  4.2 Duplicate patient rejected...');
    {
      const res = await httpRequest(
        { path: '/api/patients', method: 'POST', headers: { Authorization: `Bearer ${token}` } },
        { Name: 'John Doe', Mobile: '+919999999992' }
      );
      (!res.body.success) ? pass('Duplicate rejected') : fail('Should reject', res.body);
    }

    console.log('\n  4.3 Find by mobile...');
    {
      const res = await httpRequest({ path: '/api/patients/mobile/+919999999992', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200 && res.body.data) ? pass('Found by mobile') : fail('Not found', res.body);
    }

    console.log('\n  4.4 Get by ID...');
    {
      const res = await httpRequest({ path: `/api/patients/${patientId}`, method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('Fetched by ID') : fail('Get failed', res.body);
    }

    console.log('\n  4.5 Update patient...');
    {
      const res = await httpRequest(
        { path: `/api/patients/${patientId}`, method: 'PUT', headers: { Authorization: `Bearer ${token}` } },
        { Name: 'John Updated', Notes: 'Updated notes' }
      );
      (res.status === 200) ? pass('Updated') : fail('Update failed', res.body);
    }

    console.log('\n  4.6 Search patient...');
    {
      const res = await httpRequest({ path: '/api/patients/search?q=John', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('Search works') : fail('Search failed', res.body);
    }

    console.log('\n  4.7 List patients...');
    {
      const res = await httpRequest({ path: '/api/patients', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('Listed') : fail('List failed', res.body);
    }

    console.log('\n  4.8 Recent patients...');
    {
      const res = await httpRequest({ path: '/api/patients/recent', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('Recent fetched') : fail('Recent failed', res.body);
    }

    console.log('\n  4.9 Create second patient...');
    {
      const res = await httpRequest(
        { path: '/api/patients', method: 'POST', headers: { Authorization: `Bearer ${token}` } },
        { Name: 'Jane Smith', Mobile: '+919999999993', Gender: 'Female', Age: '28' }
      );
      if (res.status === 201) {
        patientId2 = res.body.data.PatientID;
        pass(`Second patient created (${patientId2})`);
      } else fail('Create failed', res.body);
    }

    // ===== VISIT MODULE =====
    console.log('\n═══════════════════════════════════');
    console.log('  VISIT MODULE');
    console.log('═══════════════════════════════════\n');

    let visitId, visitId2;

    console.log('  5.1 Create visit (admin)...');
    {
      const res = await httpRequest(
        { path: '/api/visits', method: 'POST', headers: { Authorization: `Bearer ${token}` } },
        { PatientID: patientId, VisitType: 'Home', FeesCollected: 'No', Amount: '500', TreatmentNotes: 'Massage', Remarks: 'Good', NextVisit: '2025-01-01' }
      );
      if (res.status === 201) {
        visitId = res.body.data.VisitID;
        pass(`Visit created (${visitId})`);
      } else fail('Visit create failed', res.body);
    }

    console.log('\n  5.2 Create visit (worker)...');
    {
      const res = await httpRequest(
        { path: '/api/visits', method: 'POST', headers: { Authorization: `Bearer ${workerToken}` } },
        { PatientID: patientId2, VisitType: 'Hospital', FeesCollected: 'Yes', Amount: '1000', TreatmentNotes: 'US therapy' }
      );
      if (res.status === 201) {
        visitId2 = res.body.data.VisitID;
        pass(`Worker visit created (${visitId2})`);
      } else fail('Worker visit failed', res.body);
    }

    console.log('\n  5.3 Today visits...');
    {
      const res = await httpRequest({ path: '/api/visits/today', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('Today visits fetched') : fail('Failed', res.body);
    }

    console.log('\n  5.4 List all visits...');
    {
      const res = await httpRequest({ path: '/api/visits', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('All visits listed') : fail('Failed', res.body);
    }

    console.log('\n  5.5 Get visit by ID...');
    {
      const res = await httpRequest({ path: `/api/visits/${visitId}`, method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('Visit fetched by ID') : fail('Failed', res.body);
    }

    console.log('\n  5.6 Update visit...');
    {
      const res = await httpRequest(
        { path: `/api/visits/${visitId}`, method: 'PUT', headers: { Authorization: `Bearer ${token}` } },
        { FeesCollected: 'Yes', Amount: '600', Remarks: 'Paid' }
      );
      (res.status === 200) ? pass('Visit updated') : fail('Failed', res.body);
    }

    console.log('\n  5.7 Visits by worker...');
    {
      const res = await httpRequest({ path: '/api/visits/worker/ADMIN001', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('By worker fetched') : fail('Failed', res.body);
    }

    console.log('\n  5.8 Visits by patient...');
    {
      const res = await httpRequest({ path: `/api/visits/patient/${patientId}`, method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('By patient fetched') : fail('Failed', res.body);
    }

    console.log('\n  5.9 Date range...');
    {
      const res = await httpRequest({ path: '/api/visits/date-range?startDate=2020-01-01&endDate=2030-01-01', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('Date range works') : fail('Failed', res.body);
    }

    console.log('\n  5.10 Visit search...');
    {
      const res = await httpRequest({ path: '/api/visits/search?q=Massage', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('Visit search works') : fail('Failed', res.body);
    }

    console.log('\n  5.11 Patient visit history...');
    {
      const res = await httpRequest({ path: `/api/patients/${patientId}/visits`, method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('Patient visit history fetched') : fail('Failed', res.body);
    }

    // ===== DASHBOARD =====
    console.log('\n═══════════════════════════════════');
    console.log('  DASHBOARD MODULE');
    console.log('═══════════════════════════════════\n');

    console.log('  6.1 Admin dashboard...');
    {
      const res = await httpRequest({ path: '/api/dashboard/admin', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 200 && res.body.success) {
        pass('Admin dashboard loaded');
        const d = res.body.data;
        if (d.cards) pass('  Cards present');
        if (d.monthlyStats) pass('  Monthly stats present');
        if (d.dailyGraph) pass('  Daily graph present');
        if (d.workerPerformance) pass('  Worker performance present');
        if (d.recentActivities) pass('  Recent activities present');
      } else fail('Dashboard failed', res.body);
    }

    console.log('\n  6.2 Worker dashboard...');
    {
      const res = await httpRequest({ path: '/api/dashboard/worker', method: 'GET', headers: { Authorization: `Bearer ${workerToken}` } });
      if (res.status === 200 && res.body.success) {
        pass('Worker dashboard loaded');
        if (res.body.data.stats) pass('  Stats present');
        if (res.body.data.recentVisits) pass('  Recent visits present');
        if (res.body.data.recentPatients) pass('  Recent patients present');
      } else fail('Dashboard failed', res.body);
    }

    // ===== REPORTS =====
    console.log('\n═══════════════════════════════════');
    console.log('  REPORTS MODULE');
    console.log('═══════════════════════════════════\n');

    console.log('  7.1 Daily report...');
    {
      const res = await httpRequest({ path: '/api/reports/daily', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('Daily report generated') : fail('Failed', res.body);
    }

    console.log('\n  7.2 Weekly report...');
    {
      const res = await httpRequest({ path: '/api/reports/weekly', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('Weekly report generated') : fail('Failed', res.body);
    }

    console.log('\n  7.3 Monthly report...');
    {
      const res = await httpRequest({ path: '/api/reports/monthly', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('Monthly report generated') : fail('Failed', res.body);
    }

    console.log('\n  7.4 Worker report...');
    {
      const res = await httpRequest({ path: `/api/reports/worker?workerId=${workerId}`, method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('Worker report generated') : fail('Failed', res.body);
    }

    console.log('\n  7.5 Patient history report...');
    {
      const res = await httpRequest({ path: `/api/reports/patient/${patientId}/history`, method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('Patient history report generated') : fail('Failed', res.body);
    }

    console.log('\n  7.6 Fee report...');
    {
      const res = await httpRequest({ path: '/api/reports/fees', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 200) ? pass('Fee report generated') : fail('Failed', res.body);
    }

    // ===== HEALTH & EDGE =====
    console.log('\n═══════════════════════════════════');
    console.log('  HEALTH & EDGE CASES');
    console.log('═══════════════════════════════════\n');

    {
      const res = await httpRequest({ path: '/api/health', method: 'GET' });
      (res.status === 200 && res.body.success) ? pass('Health check OK') : fail('Health check failed');
    }

    {
      const res = await httpRequest({ path: '/api/nonexistent', method: 'GET' });
      (res.status === 404) ? pass('404 for unknown routes') : fail('Should be 404', res.status);
    }

    {
      const res = await httpRequest({ path: '/api/visits/INVALID', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      (res.status === 404 || (res.body && !res.body.success)) ? pass('Invalid visit ID handled') : fail('Should handle invalid ID', res.body);
    }

  } catch (err) {
    console.error('\n  TEST HARNESS ERROR:', err.message);
    console.error(err.stack);
  } finally {
    if (backend) await kill(backend);
    if (mockServer) await kill(mockServer);
  }

  console.log('\n========================================');
  console.log('  TEST RESULTS');
  console.log('========================================\n');
  console.log(`  Passed: ${results.passed}`);
  console.log(`  Failed: ${results.failed}`);
  if (results.errors.length > 0) {
    console.log('\n  Failures:');
    results.errors.forEach((e, i) => console.log(`    ${i + 1}. ${e.msg}${e.detail ? ' — ' + e.detail : ''}`));
  }
  console.log('\n========================================\n');
  process.exit(results.failed > 0 ? 1 : 0);
}

runTests();
