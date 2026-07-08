const axios = require('axios');
const { HEADERS, PAGINATION } = require('../utils/constants');

let sheetsCache = {};
let cacheTimestamps = {};
const CACHE_TTL = 120000;

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const APPS_SCRIPT_TOKEN = process.env.APPS_SCRIPT_TOKEN || '';

class GoogleSheetsService {
  constructor() {
    this.initialized = false;
  }

  async request(action, payload = {}) {
    if (!APPS_SCRIPT_URL) {
      throw new Error('APPS_SCRIPT_URL not configured in environment variables');
    }

    const body = {
      token: APPS_SCRIPT_TOKEN,
      action,
      ...payload,
    };

    try {
      const response = await axios.post(APPS_SCRIPT_URL, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      const result = response.data;

      if (!result.success) {
        throw new Error(result.message || 'Apps Script request failed');
      }

      return result.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Apps Script error: ${error.response.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async init() {
    if (this.initialized) return;
    try {
      await this.request('init');
      this.initialized = true;
      console.log('Google Sheets initialized via Apps Script');
    } catch (error) {
      console.error('Failed to initialize Google Sheets:', error.message);
      throw error;
    }
  }

  clearCache(sheetName) {
    if (sheetName) {
      delete sheetsCache[sheetName];
      delete cacheTimestamps[sheetName];
    } else {
      sheetsCache = {};
      cacheTimestamps = {};
    }
  }

  isCacheValid(sheetName) {
    if (!sheetsCache[sheetName] || !cacheTimestamps[sheetName]) return false;
    return Date.now() - cacheTimestamps[sheetName] < CACHE_TTL;
  }

  async getAllRows(sheetName, useCache = true) {
    if (useCache && this.isCacheValid(sheetName)) {
      return sheetsCache[sheetName];
    }

    const data = await this.request('getAll', { sheet: sheetName });

    sheetsCache[sheetName] = data;
    cacheTimestamps[sheetName] = Date.now();
    return data;
  }

  async getMultipleSheets(sheetNames) {
    const uncached = sheetNames.filter(s => !this.isCacheValid(s));
    
    if (uncached.length > 0) {
      try {
        const data = await this.request('getMultiple', { sheets: uncached });
        const now = Date.now();
        uncached.forEach(s => {
          sheetsCache[s] = data[s] || [];
          cacheTimestamps[s] = now;
        });
      } catch (err) {
        console.warn('getMultiple failed, falling back to individual requests:', err.message);
        for (const s of uncached) {
          sheetsCache[s] = await this.getAllRows(s, false);
          cacheTimestamps[s] = Date.now();
        }
      }
    }

    const result = {};
    sheetNames.forEach(s => { result[s] = sheetsCache[s] || []; });
    return result;
  }

  async getRowById(sheetName, idField, idValue) {
    return this.request('getById', {
      sheet: sheetName,
      idField,
      idValue,
    });
  }

  async insertRow(sheetName, data) {
    this.clearCache(sheetName);
    return this.request('insert', {
      sheet: sheetName,
      data,
    });
  }

  async updateRow(sheetName, idField, idValue, updateData) {
    this.clearCache(sheetName);
    return this.request('update', {
      sheet: sheetName,
      idField,
      idValue,
      data: updateData,
    });
  }

  async deleteRow(sheetName, idField, idValue, softDelete = true) {
    this.clearCache(sheetName);
    return this.request('delete', {
      sheet: sheetName,
      idField,
      idValue,
      softDelete,
    });
  }

  async searchRows(sheetName, searchTerm, fields = []) {
    return this.request('search', {
      sheet: sheetName,
      searchTerm,
      fields,
    });
  }

  async filterRows(sheetName, filters) {
    return this.request('filter', {
      sheet: sheetName,
      filters,
    });
  }

  async getPaginatedRows(sheetName, page = 1, limit = PAGINATION.DEFAULT_LIMIT, filters = {}) {
    return this.request('paginate', {
      sheet: sheetName,
      page,
      limit,
      filters,
    });
  }

  async sortRows(sheetName, sortField, sortOrder = 'asc') {
    return this.request('sort', {
      sheet: sheetName,
      sortField,
      sortOrder,
    });
  }

  async getLastInsertedRow(sheetName) {
    const rows = await this.getAllRows(sheetName, false);
    return rows.length > 0 ? rows[rows.length - 1] : null;
  }

  async getRowsByDateRange(sheetName, dateField, startDate, endDate) {
    return this.request('dateRange', {
      sheet: sheetName,
      dateField,
      startDate,
      endDate,
    });
  }

  async getRowCount(sheetName, filters = {}) {
    return this.request('count', {
      sheet: sheetName,
      filters,
    });
  }

  async aggregate(sheetName, valueField, groupByField) {
    return this.request('aggregate', {
      sheet: sheetName,
      valueField,
      groupByField,
    });
  }
}

module.exports = new GoogleSheetsService();
