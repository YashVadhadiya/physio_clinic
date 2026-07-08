const googleSheetsService = require('../services/database.service');
// const googleSheetsService = require('../services/googleSheets.service');
const visitService = require('../services/visit.service');
const { SHEET_NAMES, WORKER_STATUS } = require('../utils/constants');
const { success } = require('../helpers/response.helper');

exports.adminDashboard = async (req, res, next) => {
  try {
    const { Workers, Patients, Visits, ActivityLogs } = await googleSheetsService.getMultipleSheets([
      SHEET_NAMES.WORKERS,
      SHEET_NAMES.PATIENTS,
      SHEET_NAMES.VISITS,
      SHEET_NAMES.ACTIVITY_LOGS,
    ]);

    const today = new Date().toISOString().split('T')[0];
    const todayVisits = Visits.filter(v => v.VisitDate === today);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const monthStr = String(currentMonth).padStart(2, '0');
    const monthlyVisits = Visits.filter(v =>
      v.VisitDate && v.VisitDate.startsWith(`${currentYear}-${monthStr}`)
    );

    const totalFees = Visits.reduce((sum, v) => sum + (parseFloat(v.Amount) || 0), 0);
    const collectedFees = Visits
      .filter(v => v.FeesCollected === 'Yes')
      .reduce((sum, v) => sum + (parseFloat(v.Amount) || 0), 0);

    const activeWorkers = Workers.filter(w => w.Status === WORKER_STATUS.ACTIVE && w.Role === 'worker');

    const cards = {
      totalWorkers: activeWorkers.length,
      totalPatients: Patients.length,
      todayVisits: todayVisits.length,
      monthlyVisits: monthlyVisits.length,
      pendingFees: totalFees - collectedFees,
      collectedFees,
    };

    const monthlyStats = await visitService.getMonthlyStats(currentYear, currentMonth);
    const dailyGraph = await visitService.getDailyGraphData(currentYear, currentMonth);

    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const previousMonthlyStats = await visitService.getMonthlyStats(lastMonthYear, lastMonth);

    const workerPerformance = await visitService.getWorkerPerformance(
      `${currentYear}-01-01`,
      `${currentYear}-12-31`
    );

    const recentLogs = ActivityLogs.slice(-10).reverse();

    return success(res, {
      cards,
      monthlyStats,
      previousMonthlyStats,
      dailyGraph,
      workerPerformance: workerPerformance.slice(0, 10),
      recentActivities: recentLogs,
    });
  } catch (err) {
    next(err);
  }
};

exports.workerDashboard = async (req, res, next) => {
  try {
    const workerId = req.user.id;
    const { Visits: visits, Patients: patients } = await googleSheetsService.getMultipleSheets([
      SHEET_NAMES.VISITS,
      SHEET_NAMES.PATIENTS,
    ]);

    const workerVisits = visits.filter(v => v.WorkerID === workerId);
    const today = new Date().toISOString().split('T')[0];
    const todayVisits = workerVisits.filter(v => v.VisitDate === today);

    const patientsTreated = new Set(workerVisits.map(v => v.PatientID)).size;

    const totalFees = workerVisits.reduce((sum, v) => sum + (parseFloat(v.Amount) || 0), 0);
    const collectedFees = workerVisits
      .filter(v => v.FeesCollected === 'Yes')
      .reduce((sum, v) => sum + (parseFloat(v.Amount) || 0), 0);

    const recentVisits = workerVisits
      .sort((a, b) => new Date(b.VisitDate) - new Date(a.VisitDate))
      .slice(0, 10)
      .map(v => {
        const patient = patients.find(p => p.PatientID === v.PatientID);
        return { ...v, PatientName: patient ? patient.Name : 'Unknown' };
      });

    const recentPatientList = patients.slice(-10).reverse();

    return success(res, {
      stats: {
        todayVisits: todayVisits.length,
        totalVisits: workerVisits.length,
        patientsTreated,
        totalFees,
        collectedFees,
        pendingFees: totalFees - collectedFees,
      },
      todayVisits: todayVisits.map(v => {
        const patient = patients.find(p => p.PatientID === v.PatientID);
        return { ...v, PatientName: patient ? patient.Name : 'Unknown' };
      }),
      recentVisits,
      recentPatients: recentPatientList,
    });
  } catch (err) {
    next(err);
  }
};
