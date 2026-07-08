const googleSheetsService = require('./database.service');
// const googleSheetsService = require('./googleSheets.service');
const activityLogService = require('./activityLog.service');
const { SHEET_NAMES, WORKER_STATUS } = require('../utils/constants');

class WorkerService {
  async getAll(page = 1, limit = 20, filters = {}) {
    const result = await googleSheetsService.getPaginatedRows(SHEET_NAMES.WORKERS, page, limit, filters);
    result.data = result.data.map(w => {
      const { PasswordHash, ...worker } = w;
      return worker;
    });
    return result;
  }

  async getById(workerId) {
    const worker = await googleSheetsService.getRowById(SHEET_NAMES.WORKERS, 'WorkerID', workerId);
    if (!worker) throw new Error('Worker not found');
    const { PasswordHash, ...workerData } = worker;
    return workerData;
  }

  async update(workerId, data) {
    const worker = await googleSheetsService.getRowById(SHEET_NAMES.WORKERS, 'WorkerID', workerId);
    if (!worker) throw new Error('Worker not found');

    const updateData = {};
    const allowedFields = ['Name', 'Mobile', 'Email', 'Address', 'EmergencyContact', 'ProfilePhoto'];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });

    await googleSheetsService.updateRow(SHEET_NAMES.WORKERS, 'WorkerID', workerId, updateData);
    await activityLogService.log(workerId, 'PROFILE_UPDATE', 'Profile updated');

    return this.getById(workerId);
  }

  async toggleStatus(workerId) {
    const worker = await googleSheetsService.getRowById(SHEET_NAMES.WORKERS, 'WorkerID', workerId);
    if (!worker) throw new Error('Worker not found');

    const newStatus = worker.Status === WORKER_STATUS.ACTIVE
      ? WORKER_STATUS.INACTIVE
      : WORKER_STATUS.ACTIVE;

    await googleSheetsService.updateRow(SHEET_NAMES.WORKERS, 'WorkerID', workerId, {
      Status: newStatus,
    });

    await activityLogService.log(
      workerId,
      'STATUS_CHANGE',
      `Status changed to ${newStatus}`
    );

    return this.getById(workerId);
  }

  async getActiveWorkers() {
    const result = await googleSheetsService.getPaginatedRows(SHEET_NAMES.WORKERS, 1, 100, {
      Status: WORKER_STATUS.ACTIVE,
    });
    return result.data.map(w => {
      const { PasswordHash, ...worker } = w;
      return worker;
    });
  }

  async getWorkerStats(workerId) {
    const visits = await googleSheetsService.getAllRows(SHEET_NAMES.VISITS);
    const workerVisits = visits.filter(v => v.WorkerID === workerId);

    const today = new Date().toISOString().split('T')[0];
    const todayVisits = workerVisits.filter(v => v.VisitDate === today);

    const totalFees = workerVisits.reduce((sum, v) => sum + (parseFloat(v.Amount) || 0), 0);
    const collectedFees = workerVisits
      .filter(v => v.FeesCollected === 'Yes')
      .reduce((sum, v) => sum + (parseFloat(v.Amount) || 0), 0);

    return {
      totalVisits: workerVisits.length,
      todayVisits: todayVisits.length,
      totalFees,
      collectedFees,
      pendingFees: totalFees - collectedFees,
    };
  }

  async search(query) {
    const results = await googleSheetsService.searchRows(
      SHEET_NAMES.WORKERS,
      query,
      ['Name', 'Mobile', 'Email', 'WorkerID']
    );
    return results.map(w => {
      const { PasswordHash, ...worker } = w;
      return worker;
    });
  }
}

module.exports = new WorkerService();
