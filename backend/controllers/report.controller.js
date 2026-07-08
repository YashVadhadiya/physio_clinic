const googleSheetsService = require('../services/database.service');
// const googleSheetsService = require('../services/googleSheets.service');
const visitService = require('../services/visit.service');
const { SHEET_NAMES } = require('../utils/constants');
const { success } = require('../helpers/response.helper');

exports.dailyReport = async (req, res, next) => {
  try {
    const { date } = req.query;
    const reportDate = date || new Date().toISOString().split('T')[0];
    const visits = await visitService.getByDate(reportDate);

    const totalFees = visits.reduce((sum, v) => sum + (parseFloat(v.Amount) || 0), 0);
    const collectedFees = visits.filter(v => v.FeesCollected === 'Yes')
      .reduce((sum, v) => sum + (parseFloat(v.Amount) || 0), 0);

    const workers = {};
    visits.forEach(v => {
      if (!workers[v.WorkerID]) {
        workers[v.WorkerID] = { name: v.WorkerName, visits: 0, fees: 0 };
      }
      workers[v.WorkerID].visits++;
      workers[v.WorkerID].fees += parseFloat(v.Amount) || 0;
    });

    return success(res, {
      date: reportDate,
      totalVisits: visits.length,
      totalFees,
      collectedFees,
      pendingFees: totalFees - collectedFees,
      visits,
      workerSummary: Object.values(workers),
    });
  } catch (err) {
    next(err);
  }
};

exports.weeklyReport = async (req, res, next) => {
  try {
    const { endDate } = req.query;
    const end = endDate ? new Date(endDate) : new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 6);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const result = await visitService.getByDateRange(startStr, endStr, 1, 500);

    const totalFees = result.data.reduce((sum, v) => sum + (parseFloat(v.Amount) || 0), 0);
    const collectedFees = result.data.filter(v => v.FeesCollected === 'Yes')
      .reduce((sum, v) => sum + (parseFloat(v.Amount) || 0), 0);

    const dailyBreakdown = {};
    result.data.forEach(v => {
      if (!dailyBreakdown[v.VisitDate]) {
        dailyBreakdown[v.VisitDate] = { date: v.VisitDate, count: 0, fees: 0 };
      }
      dailyBreakdown[v.VisitDate].count++;
      dailyBreakdown[v.VisitDate].fees += parseFloat(v.Amount) || 0;
    });

    return success(res, {
      startDate: startStr,
      endDate: endStr,
      totalVisits: result.pagination.total,
      totalFees,
      collectedFees,
      pendingFees: totalFees - collectedFees,
      dailyBreakdown: Object.values(dailyBreakdown).sort((a, b) => a.date.localeCompare(b.date)),
      visits: result.data,
    });
  } catch (err) {
    next(err);
  }
};

exports.monthlyReport = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);

    const stats = await visitService.getMonthlyStats(year, month);
    const dailyGraph = await visitService.getDailyGraphData(year, month);
    const workerPerformance = await visitService.getWorkerPerformance(
      `${year}-${String(month).padStart(2, '0')}-01`,
      `${year}-${String(month).padStart(2, '0')}-31`
    );

    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;

    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = `${year}-${monthStr}-${daysInMonth}`;

    const result = await visitService.getByDateRange(startDate, endDate, 1, 500);

    return success(res, {
      year,
      month,
      ...stats,
      dailyGraph,
      workerPerformance,
      visits: result.data,
    });
  } catch (err) {
    next(err);
  }
};

exports.workerReport = async (req, res, next) => {
  try {
    const { workerId, startDate, endDate } = req.query;
    const visits = await googleSheetsService.getAllRows(SHEET_NAMES.VISITS);
    const workers = await googleSheetsService.getAllRows(SHEET_NAMES.WORKERS);
    const patients = await googleSheetsService.getAllRows(SHEET_NAMES.PATIENTS);
    const worker = workers.find(w => w.WorkerID === workerId);
    if (!worker) return success(res, null, 'Worker not found');

    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).getTime() : Date.now();

    const workerVisits = visits.filter(v => {
      if (v.WorkerID !== workerId) return false;
      const visitTime = new Date(v.VisitDate).getTime();
      return visitTime >= start && visitTime <= end;
    }).map(v => {
      const patient = patients.find(p => p.PatientID === v.PatientID);
      return { ...v, PatientName: patient ? patient.Name : 'Unknown' };
    }).sort((a, b) => new Date(b.VisitDate) - new Date(a.VisitDate));

    const totalFees = workerVisits.reduce((sum, v) => sum + (parseFloat(v.Amount) || 0), 0);
    const collectedFees = workerVisits.filter(v => v.FeesCollected === 'Yes')
      .reduce((sum, v) => sum + (parseFloat(v.Amount) || 0), 0);

    const { PasswordHash, ...workerData } = worker;

    return success(res, {
      worker: workerData,
      reportPeriod: { startDate: startDate || 'All', endDate: endDate || 'All' },
      summary: {
        totalVisits: workerVisits.length,
        totalFees,
        collectedFees,
        pendingFees: totalFees - collectedFees,
      },
      visits: workerVisits,
    });
  } catch (err) {
    next(err);
  }
};

exports.patientHistory = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const visits = await googleSheetsService.getAllRows(SHEET_NAMES.VISITS);
    const patients = await googleSheetsService.getAllRows(SHEET_NAMES.PATIENTS);
    const workers = await googleSheetsService.getAllRows(SHEET_NAMES.WORKERS);

    const patient = patients.find(p => p.PatientID === patientId);
    if (!patient) return success(res, null, 'Patient not found');

    const patientVisits = visits
      .filter(v => v.PatientID === patientId)
      .map(v => {
        const worker = workers.find(w => w.WorkerID === v.WorkerID);
        return { ...v, WorkerName: worker ? worker.Name : 'Unknown' };
      })
      .sort((a, b) => new Date(b.VisitDate) - new Date(a.VisitDate));

    const totalFees = patientVisits.reduce((sum, v) => sum + (parseFloat(v.Amount) || 0), 0);
    const collectedFees = patientVisits.filter(v => v.FeesCollected === 'Yes')
      .reduce((sum, v) => sum + (parseFloat(v.Amount) || 0), 0);

    return success(res, {
      patient,
      summary: {
        totalVisits: patientVisits.length,
        totalFees,
        collectedFees,
        pendingFees: totalFees - collectedFees,
      },
      visits: patientVisits,
    });
  } catch (err) {
    next(err);
  }
};

exports.feeReport = async (req, res, next) => {
  try {
    const { startDate, endDate, workerId } = req.query;

    let visits = await googleSheetsService.getAllRows(SHEET_NAMES.VISITS);
    const patients = await googleSheetsService.getAllRows(SHEET_NAMES.PATIENTS);
    const workers = await googleSheetsService.getAllRows(SHEET_NAMES.WORKERS);

    if (startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      visits = visits.filter(v => {
        const visitTime = new Date(v.VisitDate).getTime();
        return visitTime >= start && visitTime <= end;
      });
    }

    if (workerId) {
      visits = visits.filter(v => v.WorkerID === workerId);
    }

    const enrichedVisits = visits.map(v => {
      const patient = patients.find(p => p.PatientID === v.PatientID);
      const worker = workers.find(w => w.WorkerID === v.WorkerID);
      return {
        ...v,
        PatientName: patient ? patient.Name : 'Unknown',
        WorkerName: worker ? worker.Name : 'Unknown',
      };
    }).sort((a, b) => new Date(b.VisitDate) - new Date(a.VisitDate));

    const totalFees = enrichedVisits.reduce((sum, v) => sum + (parseFloat(v.Amount) || 0), 0);
    const collectedFees = enrichedVisits.filter(v => v.FeesCollected === 'Yes')
      .reduce((sum, v) => sum + (parseFloat(v.Amount) || 0), 0);
    const pendingVisits = enrichedVisits.filter(v => v.FeesCollected === 'No');
    const pendingFees = pendingVisits.reduce((sum, v) => sum + (parseFloat(v.Amount) || 0), 0);

    return success(res, {
      summary: {
        totalVisits: enrichedVisits.length,
        totalFees,
        collectedFees,
        pendingFees,
        collectionRate: totalFees > 0 ? ((collectedFees / totalFees) * 100).toFixed(1) : 0,
      },
      collectedVisits: enrichedVisits.filter(v => v.FeesCollected === 'Yes'),
      pendingVisits,
      allVisits: enrichedVisits,
    });
  } catch (err) {
    next(err);
  }
};
