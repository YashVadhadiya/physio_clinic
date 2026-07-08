const SHEET_NAMES = {
  WORKERS: 'Workers',
  PATIENTS: 'Patients',
  VISITS: 'Visits',
  ACTIVITY_LOGS: 'ActivityLogs',
  SETTINGS: 'Settings',
};

const ROLES = {
  ADMIN: 'admin',
  WORKER: 'worker',
};

const VISIT_TYPES = {
  HOME: 'Home',
  HOSPITAL: 'Hospital',
};

const VISIT_STATUS = {
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const WORKER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

const HEADERS = {
  [SHEET_NAMES.WORKERS]: [
    'WorkerID', 'Name', 'Mobile', 'Email', 'Address', 'PasswordHash',
    'Role', 'Status', 'JoiningDate', 'EmergencyContact', 'ProfilePhoto',
    'CreatedAt', 'UpdatedAt',
  ],
  [SHEET_NAMES.PATIENTS]: [
    'PatientID', 'Name', 'Mobile', 'Address', 'Gender', 'Age',
    'Notes', 'CreatedBy', 'CreatedAt', 'UpdatedAt',
  ],
  [SHEET_NAMES.VISITS]: [
    'VisitID', 'PatientID', 'WorkerID', 'VisitDate', 'VisitTime',
    'VisitType', 'FeesCollected', 'Amount', 'TreatmentNotes',
    'Remarks', 'NextVisit', 'CreatedAt', 'UpdatedAt',
  ],
  [SHEET_NAMES.ACTIVITY_LOGS]: [
    'LogID', 'UserID', 'Action', 'Description', 'Timestamp',
  ],
  [SHEET_NAMES.SETTINGS]: [
    'Key', 'Value', 'UpdatedAt',
  ],
};

const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

module.exports = {
  SHEET_NAMES,
  ROLES,
  VISIT_TYPES,
  VISIT_STATUS,
  WORKER_STATUS,
  HEADERS,
  PAGINATION,
};
