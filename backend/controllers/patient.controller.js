const patientService = require('../services/patient.service');
const { success, created, paginated } = require('../helpers/response.helper');

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query;
    const result = await patientService.getAll(parseInt(page), parseInt(limit), filters);
    return paginated(res, result.data, result.pagination.total, result.pagination.page, result.pagination.limit);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const patient = await patientService.getById(req.params.id);
    return success(res, patient);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const patient = await patientService.create(req.body, req.user.id);
    return created(res, patient, 'Patient created successfully');
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const patient = await patientService.update(req.params.id, {
      ...req.body,
      UpdatedBy: req.user.id,
    });
    return success(res, patient, 'Patient updated successfully');
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const result = await patientService.delete(req.params.id);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

exports.search = async (req, res, next) => {
  try {
    const { q } = req.query;
    const patients = await patientService.search(q);
    return success(res, patients);
  } catch (err) {
    next(err);
  }
};

exports.findByMobile = async (req, res, next) => {
  try {
    const { mobile } = req.params;
    const patient = await patientService.findByMobile(mobile);
    if (!patient) return success(res, null, 'Patient not found');
    return success(res, patient);
  } catch (err) {
    next(err);
  }
};

exports.getVisitHistory = async (req, res, next) => {
  try {
    const visits = await patientService.getVisitHistory(req.params.id);
    return success(res, visits);
  } catch (err) {
    next(err);
  }
};

exports.getRecentPatients = async (req, res, next) => {
  try {
    const patients = await patientService.getRecentPatients(parseInt(req.query.limit) || 10);
    return success(res, patients);
  } catch (err) {
    next(err);
  }
};
