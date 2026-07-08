function generateId(prefix = '') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

function generateWorkerId() {
  return generateId('WKR');
}

function generatePatientId() {
  return generateId('PAT');
}

function generateVisitId() {
  return generateId('VIS');
}

function generateLogId() {
  return generateId('LOG');
}

module.exports = {
  generateId,
  generateWorkerId,
  generatePatientId,
  generateVisitId,
  generateLogId,
};
