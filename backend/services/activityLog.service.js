const googleSheetsService = require('./database.service');
// const googleSheetsService = require('./googleSheets.service');
const { SHEET_NAMES } = require('../utils/constants');
const { generateLogId } = require('../helpers/idGenerator.helper');

class ActivityLogService {
  async log(userId, action, description) {
    try {
      const logData = {
        LogID: generateLogId(),
        UserID: userId,
        Action: action,
        Description: description,
        Timestamp: new Date().toISOString(),
      };
      await googleSheetsService.insertRow(SHEET_NAMES.ACTIVITY_LOGS, logData);
      return logData;
    } catch (error) {
      console.error('Failed to log activity:', error.message);
    }
  }

  async getLogs(page = 1, limit = 50, filters = {}) {
    return googleSheetsService.getPaginatedRows(
      SHEET_NAMES.ACTIVITY_LOGS,
      page,
      limit,
      filters
    );
  }

  async getUserLogs(userId, page = 1, limit = 20) {
    return googleSheetsService.getPaginatedRows(
      SHEET_NAMES.ACTIVITY_LOGS,
      page,
      limit,
      { UserID: userId }
    );
  }

  async getRecentLogs(limit = 10) {
    const logs = await googleSheetsService.getAllRows(SHEET_NAMES.ACTIVITY_LOGS);
    return logs.slice(-limit).reverse();
  }
}

module.exports = new ActivityLogService();
