const { createClient } = require('@supabase/supabase-js');
const { PAGINATION } = require('../utils/constants');

let ws;
try {
  ws = require('ws');
} catch {
  ws = null;
}

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const TABLE_MAP = {
  Workers: 'workers',
  Patients: 'patients',
  Visits: 'visits',
  ActivityLogs: 'activity_logs',
  Settings: 'settings',
};

function toTableName(sheetName) {
  return TABLE_MAP[sheetName] || sheetName.toLowerCase();
}

function checkEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be configured in environment variables');
  }
}

class SupabaseService {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    checkEnv();
    const options = {};
    if (ws) {
      options.realtime = { transport: ws };
    }
    this.client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, options);
    this.initialized = true;
    console.log('Supabase client initialized');
  }

  ensureClient() {
    if (!this.client) {
      throw new Error('Supabase client not initialized. Call init() first.');
    }
  }

  clearCache(sheetName) {
    // Supabase is fast; no cache needed
  }

  isCacheValid(sheetName) {
    return false;
  }

  async getAllRows(sheetName, useCache = true) {
    this.ensureClient();
    const table = toTableName(sheetName);
    const { data, error } = await this.client
      .from(table)
      .select('*');
    if (error) throw new Error(`Supabase getAllRows error (${table}): ${error.message}`);
    return data || [];
  }

  async getMultipleSheets(sheetNames) {
    this.ensureClient();
    const result = {};
    for (const s of sheetNames) {
      result[s] = await this.getAllRows(s, false);
    }
    return result;
  }

  async getRowById(sheetName, idField, idValue) {
    this.ensureClient();
    const table = toTableName(sheetName);
    const { data, error } = await this.client
      .from(table)
      .select('*')
      .eq(idField, idValue)
      .maybeSingle();
    if (error) throw new Error(`Supabase getRowById error (${table}): ${error.message}`);
    return data || null;
  }

  async insertRow(sheetName, data) {
    this.ensureClient();
    const table = toTableName(sheetName);
    const { data: inserted, error } = await this.client
      .from(table)
      .insert(data)
      .select()
      .maybeSingle();
    if (error) throw new Error(`Supabase insertRow error (${table}): ${error.message}`);
    return inserted || data;
  }

  async updateRow(sheetName, idField, idValue, updateData) {
    this.ensureClient();
    const table = toTableName(sheetName);
    const { data: updated, error } = await this.client
      .from(table)
      .update(updateData)
      .eq(idField, idValue)
      .select()
      .maybeSingle();
    if (error) throw new Error(`Supabase updateRow error (${table}): ${error.message}`);
    return updated || { ...updateData, [idField]: idValue };
  }

  async deleteRow(sheetName, idField, idValue, softDelete = true) {
    this.ensureClient();
    const table = toTableName(sheetName);

    // Workers: soft delete by setting Status column (FK preserved)
    if (softDelete && table === 'workers') {
      const { data, error } = await this.client
        .from(table)
        .update({ Status: 'deleted', UpdatedAt: new Date().toISOString() })
        .eq(idField, idValue)
        .select()
        .maybeSingle();
      if (error) throw new Error(`Supabase softDelete error (${table}): ${error.message}`);
      return data || { message: 'Soft deleted successfully' };
    }

    // Patients: soft delete by removing visits first, then hard-deleting patient
    if (softDelete && table === 'patients') {
      const { error: visitError } = await this.client
        .from('visits')
        .delete()
        .eq('PatientID', idValue);
      if (visitError) throw new Error(`Supabase softDelete error (visits): ${visitError.message}`);

      const { data, error } = await this.client
        .from(table)
        .delete()
        .eq(idField, idValue)
        .select()
        .maybeSingle();
      if (error) throw new Error(`Supabase softDelete error (${table}): ${error.message}`);
      return data || { message: 'Soft deleted successfully' };
    }

    // Hard delete for all other cases
    const { error } = await this.client
      .from(table)
      .delete()
      .eq(idField, idValue);
    if (error) throw new Error(`Supabase deleteRow error (${table}): ${error.message}`);
    return { message: 'Deleted successfully' };
  }

  async searchRows(sheetName, searchTerm, fields = []) {
    this.ensureClient();
    const table = toTableName(sheetName);

    if (fields.length === 0) {
      const { data, error } = await this.client
        .from(table)
        .select('*');
      if (error) throw new Error(`Supabase searchRows error (${table}): ${error.message}`);
      return (data || []).filter(row =>
        Object.values(row).some(v =>
          String(v).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    const term = `%${searchTerm}%`;
    const orConditions = fields.map(f => `${f}.ilike.${term}`).join(',');
    const { data, error } = await this.client
      .from(table)
      .select('*')
      .or(orConditions);
    if (error) throw new Error(`Supabase searchRows error (${table}): ${error.message}`);
    return data || [];
  }

  async filterRows(sheetName, filters) {
    this.ensureClient();
    const table = toTableName(sheetName);
    let query = this.client.from(table).select('*');
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value);
      }
    }
    const { data, error } = await query;
    if (error) throw new Error(`Supabase filterRows error (${table}): ${error.message}`);
    return data || [];
  }

  async getPaginatedRows(sheetName, page = 1, limit = PAGINATION.DEFAULT_LIMIT, filters = {}) {
    this.ensureClient();
    const table = toTableName(sheetName);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.client.from(table).select('*', { count: 'exact' });
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value);
      }
    }
    query = query.range(from, to).order('CreatedAt', { ascending: false });

    const { data, count, error } = await query;
    if (error) throw new Error(`Supabase getPaginatedRows error (${table}): ${error.message}`);

    const total = count || 0;
    return {
      data: data || [],
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async sortRows(sheetName, sortField, sortOrder = 'asc') {
    this.ensureClient();
    const table = toTableName(sheetName);
    const { data, error } = await this.client
      .from(table)
      .select('*')
      .order(sortField, { ascending: sortOrder === 'asc' });
    if (error) throw new Error(`Supabase sortRows error (${table}): ${error.message}`);
    return data || [];
  }

  async getLastInsertedRow(sheetName) {
    this.ensureClient();
    const table = toTableName(sheetName);
    const { data, error } = await this.client
      .from(table)
      .select('*')
      .order('CreatedAt', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Supabase getLastInsertedRow error (${table}): ${error.message}`);
    return data || null;
  }

  async getRowsByDateRange(sheetName, dateField, startDate, endDate) {
    this.ensureClient();
    const table = toTableName(sheetName);
    const { data, error } = await this.client
      .from(table)
      .select('*')
      .gte(dateField, startDate)
      .lte(dateField, endDate)
      .order(dateField, { ascending: false });
    if (error) throw new Error(`Supabase getRowsByDateRange error (${table}): ${error.message}`);
    return data || [];
  }

  async getRowCount(sheetName, filters = {}) {
    this.ensureClient();
    const table = toTableName(sheetName);
    let query = this.client.from(table).select('*', { count: 'exact', head: true });
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value);
      }
    }
    const { count, error } = await query;
    if (error) throw new Error(`Supabase getRowCount error (${table}): ${error.message}`);
    return count || 0;
  }

  async aggregate(sheetName, valueField, groupByField) {
    this.ensureClient();
    const table = toTableName(sheetName);
    const { data, error } = await this.client
      .from(table)
      .select(`${groupByField}, sum:${valueField}`);
    if (error) throw new Error(`Supabase aggregate error (${table}): ${error.message}`);
    const result = {};
    for (const row of data || []) {
      const key = row[groupByField];
      if (!result[key]) result[key] = { [groupByField]: key, count: 0, total: 0 };
      result[key].count++;
      result[key].total += parseFloat(row.sum) || 0;
    }
    return Object.values(result);
  }
}

module.exports = new SupabaseService();
