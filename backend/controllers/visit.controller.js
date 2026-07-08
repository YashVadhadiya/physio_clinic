const visitService = require('../services/visit.service');
const { success, created, paginated } = require('../helpers/response.helper');

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query;
    const result = await visitService.getAll(parseInt(page), parseInt(limit), filters);
    return paginated(res, result.data, result.pagination.total, result.pagination.page, result.pagination.limit);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const visit = await visitService.getById(req.params.id);
    return success(res, visit);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const visit = await visitService.create(req.body, req.user.id);
    return created(res, visit, 'Visit recorded successfully');
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const visit = await visitService.update(req.params.id, req.body);
    return success(res, visit, 'Visit updated successfully');
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const result = await visitService.delete(req.params.id);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

exports.getTodayVisits = async (req, res, next) => {
  try {
    const visits = await visitService.getTodayVisits();
    return success(res, visits);
  } catch (err) {
    next(err);
  }
};

exports.getByDateRange = async (req, res, next) => {
  try {
    const { startDate, endDate, page = 1, limit = 50 } = req.query;
    const result = await visitService.getByDateRange(startDate, endDate, parseInt(page), parseInt(limit));
    return paginated(res, result.data, result.pagination.total, result.pagination.page, result.pagination.limit);
  } catch (err) {
    next(err);
  }
};

exports.getByWorker = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await visitService.getByWorker(req.params.workerId, parseInt(page), parseInt(limit));
    return paginated(res, result.data, result.pagination.total, result.pagination.page, result.pagination.limit);
  } catch (err) {
    next(err);
  }
};

exports.getByPatient = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await visitService.getByPatient(req.params.patientId, parseInt(page), parseInt(limit));
    return paginated(res, result.data, result.pagination.total, result.pagination.page, result.pagination.limit);
  } catch (err) {
    next(err);
  }
};

exports.search = async (req, res, next) => {
  try {
    const { q } = req.query;
    const visits = await visitService.search(q);
    return success(res, visits);
  } catch (err) {
    next(err);
  }
};
