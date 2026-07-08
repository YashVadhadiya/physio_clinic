const workerService = require('../services/worker.service');
const { success, paginated } = require('../helpers/response.helper');

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query;
    const result = await workerService.getAll(parseInt(page), parseInt(limit), filters);
    return paginated(res, result.data, result.pagination.total, result.pagination.page, result.pagination.limit);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const worker = await workerService.getById(req.params.id);
    return success(res, worker);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const worker = await workerService.update(req.params.id, req.body);
    return success(res, worker, 'Worker updated successfully');
  } catch (err) {
    next(err);
  }
};

exports.toggleStatus = async (req, res, next) => {
  try {
    const worker = await workerService.toggleStatus(req.params.id);
    return success(res, worker, 'Worker status updated');
  } catch (err) {
    next(err);
  }
};

exports.getActiveWorkers = async (req, res, next) => {
  try {
    const workers = await workerService.getActiveWorkers();
    return success(res, workers);
  } catch (err) {
    next(err);
  }
};

exports.getWorkerStats = async (req, res, next) => {
  try {
    const stats = await workerService.getWorkerStats(req.params.id);
    return success(res, stats);
  } catch (err) {
    next(err);
  }
};

exports.search = async (req, res, next) => {
  try {
    const { q } = req.query;
    const workers = await workerService.search(q);
    return success(res, workers);
  } catch (err) {
    next(err);
  }
};
