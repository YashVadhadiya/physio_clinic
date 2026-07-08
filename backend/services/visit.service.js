const googleSheetsService = require('./database.service');
// const googleSheetsService = require('./googleSheets.service');
const activityLogService = require('./activityLog.service');
const { SHEET_NAMES } = require('../utils/constants');
const { generateVisitId } = require('../helpers/idGenerator.helper');

class VisitService {
  async getAll(page = 1, limit = 20, filters = {}) {
    let visitData = await googleSheetsService.getPaginatedRows(SHEET_NAMES.VISITS, page, limit, filters);

    const patients = await googleSheetsService.getAllRows(SHEET_NAMES.PATIENTS);
    const workers = await googleSheetsService.getAllRows(SHEET_NAMES.WORKERS);

    visitData.data = visitData.data.map(visit => {
      const patient = patients.find(p => p.PatientID === visit.PatientID);
      const worker = workers.find(w => w.WorkerID === visit.WorkerID);
      return {
        ...visit,
        PatientName: patient ? patient.Name : 'Unknown',
        WorkerName: worker ? worker.Name : 'Unknown',
      };
    });

    return visitData;
  }

  async getById(visitId) {
    const visit = await googleSheetsService.getRowById(SHEET_NAMES.VISITS, 'VisitID', visitId);
    if (!visit) throw new Error('Visit not found');
    return visit;
  }

  async create(data, workerId) {
    const visitId = generateVisitId();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().split(' ')[0].substring(0, 5);

    const visitData = {
      VisitID: visitId,
      PatientID: data.PatientID,
      WorkerID: workerId,
      VisitDate: data.VisitDate || today,
      VisitTime: data.VisitTime || now,
      VisitType: data.VisitType || 'Home',
      FeesCollected: data.FeesCollected || 'No',
      Amount: data.Amount || '0',
      TreatmentNotes: data.TreatmentNotes || '',
      Remarks: data.Remarks || '',
      NextVisit: data.NextVisit || '',
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    };

    await googleSheetsService.insertRow(SHEET_NAMES.VISITS, visitData);

    const patients = await googleSheetsService.getAllRows(SHEET_NAMES.PATIENTS);
    const patient = patients.find(p => p.PatientID === data.PatientID);
    await activityLogService.log(
      workerId,
      'VISIT_CREATED',
      `Visit created for patient: ${patient ? patient.Name : 'Unknown'}`
    );

    return visitData;
  }

  async update(visitId, data) {
    const visit = await this.getById(visitId);

    const updateData = {};
    const allowedFields = [
      'VisitDate', 'VisitTime', 'VisitType', 'FeesCollected',
      'Amount', 'TreatmentNotes', 'Remarks', 'NextVisit',
    ];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });

    await googleSheetsService.updateRow(SHEET_NAMES.VISITS, 'VisitID', visitId, updateData);
    return this.getById(visitId);
  }

  async delete(visitId) {
    const visit = await this.getById(visitId);
    await googleSheetsService.deleteRow(SHEET_NAMES.VISITS, 'VisitID', visitId, false);
    return { message: 'Visit deleted successfully' };
  }

  async getTodayVisits() {
    const today = new Date().toISOString().split('T')[0];
    return this.getByDate(today);
  }

  async getByDate(date) {
    const visits = await googleSheetsService.getAllRows(SHEET_NAMES.VISITS);
    const patients = await googleSheetsService.getAllRows(SHEET_NAMES.PATIENTS);
    const workers = await googleSheetsService.getAllRows(SHEET_NAMES.WORKERS);

    return visits
      .filter(v => v.VisitDate === date)
      .map(visit => {
        const patient = patients.find(p => p.PatientID === visit.PatientID);
        const worker = workers.find(w => w.WorkerID === visit.WorkerID);
        return {
          ...visit,
          PatientName: patient ? patient.Name : 'Unknown',
          WorkerName: worker ? worker.Name : 'Unknown',
        };
      })
      .sort((a, b) => a.VisitTime.localeCompare(b.VisitTime));
  }

  async getByDateRange(startDate, endDate, page = 1, limit = 50) {
    const allVisits = await googleSheetsService.getAllRows(SHEET_NAMES.VISITS);
    const patients = await googleSheetsService.getAllRows(SHEET_NAMES.PATIENTS);
    const workers = await googleSheetsService.getAllRows(SHEET_NAMES.WORKERS);

    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    let filtered = allVisits.filter(v => {
      const visitTime = new Date(v.VisitDate).getTime();
      return visitTime >= start && visitTime <= end;
    });

    filtered = filtered.map(visit => {
      const patient = patients.find(p => p.PatientID === visit.PatientID);
      const worker = workers.find(w => w.WorkerID === visit.WorkerID);
      return {
        ...visit,
        PatientName: patient ? patient.Name : 'Unknown',
        WorkerName: worker ? worker.Name : 'Unknown',
      };
    });

    filtered.sort((a, b) => new Date(b.VisitDate) - new Date(a.VisitDate));

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;

    return {
      data: filtered.slice(startIndex, startIndex + limit),
      pagination: { total, page, limit, totalPages },
    };
  }

  async getByWorker(workerId, page = 1, limit = 20) {
    return this.getAll(page, limit, { WorkerID: workerId });
  }

  async getByPatient(patientId, page = 1, limit = 20) {
    return this.getAll(page, limit, { PatientID: patientId });
  }

  async search(query) {
    const visits = await googleSheetsService.getAllRows(SHEET_NAMES.VISITS);
    const patients = await googleSheetsService.getAllRows(SHEET_NAMES.PATIENTS);
    const workers = await googleSheetsService.getAllRows(SHEET_NAMES.WORKERS);

    const term = query.toLowerCase();
    return visits
      .filter(v => {
        const patient = patients.find(p => p.PatientID === v.PatientID);
        const worker = workers.find(w => w.WorkerID === v.WorkerID);
        const patientName = patient ? patient.Name.toLowerCase() : '';
        const workerName = worker ? worker.Name.toLowerCase() : '';
        return (
          v.VisitID.toLowerCase().includes(term) ||
          v.PatientID.toLowerCase().includes(term) ||
          v.VisitDate.includes(term) ||
          patientName.includes(term) ||
          workerName.includes(term)
        );
      })
      .map(v => {
        const patient = patients.find(p => p.PatientID === v.PatientID);
        const worker = workers.find(w => w.WorkerID === v.WorkerID);
        return {
          ...v,
          PatientName: patient ? patient.Name : 'Unknown',
          WorkerName: worker ? worker.Name : 'Unknown',
        };
      });
  }

  async getMonthlyStats(year, month) {
    const visits = await googleSheetsService.getAllRows(SHEET_NAMES.VISITS);
    const monthStr = String(month).padStart(2, '0');

    const monthVisits = visits.filter(v => {
      if (!v.VisitDate) return false;
      return v.VisitDate.startsWith(`${year}-${monthStr}`);
    });

    const totalFees = monthVisits.reduce((sum, v) => sum + (parseFloat(v.Amount) || 0), 0);
    const collectedFees = monthVisits
      .filter(v => v.FeesCollected === 'Yes')
      .reduce((sum, v) => sum + (parseFloat(v.Amount) || 0), 0);

    return {
      totalVisits: monthVisits.length,
      totalFees,
      collectedFees,
      pendingFees: totalFees - collectedFees,
    };
  }

  async getDailyGraphData(year, month) {
    const visits = await googleSheetsService.getAllRows(SHEET_NAMES.VISITS);
    const monthStr = String(month).padStart(2, '0');

    const monthVisits = visits.filter(v => {
      if (!v.VisitDate) return false;
      return v.VisitDate.startsWith(`${year}-${monthStr}`);
    });

    const daysInMonth = new Date(year, month, 0).getDate();
    const graphData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      const dayVisits = monthVisits.filter(v => v.VisitDate === dateStr);
      graphData.push({
        date: dateStr,
        count: dayVisits.length,
        fees: dayVisits.reduce((sum, v) => sum + (parseFloat(v.Amount) || 0), 0),
      });
    }

    return graphData;
  }

  async getWorkerPerformance(startDate, endDate) {
    const visits = await googleSheetsService.getAllRows(SHEET_NAMES.VISITS);
    const workers = await googleSheetsService.getAllRows(SHEET_NAMES.WORKERS);

    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    const filteredVisits = visits.filter(v => {
      const visitTime = new Date(v.VisitDate).getTime();
      return visitTime >= start && visitTime <= end;
    });

    const performance = {};
    filteredVisits.forEach(v => {
      if (!performance[v.WorkerID]) {
        const worker = workers.find(w => w.WorkerID === v.WorkerID);
        performance[v.WorkerID] = {
          WorkerID: v.WorkerID,
          WorkerName: worker ? worker.Name : 'Unknown',
          totalVisits: 0,
          totalFees: 0,
          collectedFees: 0,
        };
      }
      performance[v.WorkerID].totalVisits++;
      const amount = parseFloat(v.Amount) || 0;
      performance[v.WorkerID].totalFees += amount;
      if (v.FeesCollected === 'Yes') {
        performance[v.WorkerID].collectedFees += amount;
      }
    });

    return Object.values(performance).sort((a, b) => b.totalVisits - a.totalVisits);
  }
}

module.exports = new VisitService();
