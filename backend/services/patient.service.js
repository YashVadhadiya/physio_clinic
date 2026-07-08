const googleSheetsService = require('./database.service');
// const googleSheetsService = require('./googleSheets.service');
const activityLogService = require('./activityLog.service');
const { SHEET_NAMES } = require('../utils/constants');
const { generatePatientId } = require('../helpers/idGenerator.helper');

class PatientService {
  async getAll(page = 1, limit = 20, filters = {}) {
    return googleSheetsService.getPaginatedRows(SHEET_NAMES.PATIENTS, page, limit, filters);
  }

  async getById(patientId) {
    const patient = await googleSheetsService.getRowById(SHEET_NAMES.PATIENTS, 'PatientID', patientId);
    if (!patient) throw new Error('Patient not found');
    return patient;
  }

  async findByMobile(mobile) {
    const patients = await googleSheetsService.searchRows(
      SHEET_NAMES.PATIENTS,
      mobile,
      ['Mobile']
    );
    return patients.find(p => p.Mobile === mobile) || null;
  }

  async create(data, createdBy) {
    const existing = await this.findByMobile(data.Mobile);
    if (existing) {
      throw new Error('Patient with this mobile number already exists');
    }

    const patientId = generatePatientId();
    const patientData = {
      PatientID: patientId,
      Name: data.Name,
      Mobile: data.Mobile,
      Address: data.Address || '',
      Gender: data.Gender || '',
      Age: data.Age || '',
      Notes: data.Notes || '',
      CreatedBy: createdBy,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    };

    await googleSheetsService.insertRow(SHEET_NAMES.PATIENTS, patientData);
    await activityLogService.log(createdBy, 'PATIENT_CREATED', `Created patient: ${data.Name}`);

    return patientData;
  }

  async update(patientId, data) {
    const patient = await this.getById(patientId);

    const updateData = {};
    const allowedFields = ['Name', 'Mobile', 'Address', 'Gender', 'Age', 'Notes'];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });

    await googleSheetsService.updateRow(SHEET_NAMES.PATIENTS, 'PatientID', patientId, updateData);
    await activityLogService.log(data.UpdatedBy || 'system', 'PATIENT_UPDATED', `Updated patient: ${patient.Name}`);

    return this.getById(patientId);
  }

  async delete(patientId) {
    const patient = await this.getById(patientId);
    await googleSheetsService.deleteRow(SHEET_NAMES.PATIENTS, 'PatientID', patientId, true);
    await activityLogService.log('system', 'PATIENT_DELETED', `Deleted patient: ${patient.Name}`);
    return { message: 'Patient deleted successfully' };
  }

  async search(query) {
    return googleSheetsService.searchRows(
      SHEET_NAMES.PATIENTS,
      query,
      ['Name', 'Mobile', 'PatientID']
    );
  }

  async getPatientVisits(patientId, page = 1, limit = 20) {
    const visits = await googleSheetsService.getPaginatedRows(
      SHEET_NAMES.VISITS,
      page,
      limit,
      { PatientID: patientId }
    );
    return visits;
  }

  async getVisitHistory(patientId) {
    const visits = await googleSheetsService.getAllRows(SHEET_NAMES.VISITS);
    return visits
      .filter(v => v.PatientID === patientId)
      .sort((a, b) => new Date(b.VisitDate) - new Date(a.VisitDate));
  }

  async getRecentPatients(limit = 10) {
    const result = await googleSheetsService.getPaginatedRows(SHEET_NAMES.PATIENTS, 1, limit);
    return result.data.reverse();
  }
}

module.exports = new PatientService();
