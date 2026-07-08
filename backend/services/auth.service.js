const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const googleSheetsService = require('./database.service');
// const googleSheetsService = require('./googleSheets.service');
const activityLogService = require('./activityLog.service');
const { SHEET_NAMES, ROLES, WORKER_STATUS, HEADERS } = require('../utils/constants');
const { generateWorkerId } = require('../helpers/idGenerator.helper');

class AuthService {
  async register(data) {
    const existing = await this.findByLogin(data.Mobile);
    if (existing) {
      throw new Error('A worker with this mobile number or email already exists');
    }

    const passwordHash = await bcrypt.hash(data.Password, 10);
    const workerId = generateWorkerId();

    const workerData = {
      WorkerID: workerId,
      Name: data.Name,
      Mobile: data.Mobile,
      Email: data.Email,
      Address: data.Address || '',
      PasswordHash: passwordHash,
      Role: ROLES.WORKER,
      Status: WORKER_STATUS.ACTIVE,
      JoiningDate: data.JoiningDate || new Date().toISOString().split('T')[0],
      EmergencyContact: data.EmergencyContact || '',
      ProfilePhoto: data.ProfilePhoto || '',
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    };

    await googleSheetsService.insertRow(SHEET_NAMES.WORKERS, workerData);
    await activityLogService.log(workerId, 'REGISTER', 'Worker registered');

    const { PasswordHash, ...workerWithoutPassword } = workerData;
    return workerWithoutPassword;
  }

  async login(mobileOrEmail, password) {
    const worker = await this.findByLogin(mobileOrEmail);
    if (!worker) {
      throw new Error('Invalid credentials');
    }

    if (worker.Status === WORKER_STATUS.INACTIVE) {
      throw new Error('Account is disabled. Contact admin.');
    }

    const isValidPassword = await bcrypt.compare(password, worker.PasswordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken(worker);
    await activityLogService.log(worker.WorkerID, 'LOGIN', 'User logged in');

    const { PasswordHash, ...workerWithoutPassword } = worker;
    return { worker: workerWithoutPassword, token };
  }

  generateToken(worker) {
    return jwt.sign(
      {
        id: worker.WorkerID,
        role: worker.Role,
        name: worker.Name,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  async findByLogin(mobileOrEmail) {
    const workers = await googleSheetsService.getAllRows(SHEET_NAMES.WORKERS);
    const lowerInput = mobileOrEmail.toLowerCase();
    return workers.find(w =>
      w.Mobile === mobileOrEmail || w.Email?.toLowerCase() === lowerInput
    ) || null;
  }

  async findById(workerId) {
    return googleSheetsService.getRowById(SHEET_NAMES.WORKERS, 'WorkerID', workerId);
  }

  async changePassword(workerId, oldPassword, newPassword) {
    const worker = await this.findById(workerId);
    if (!worker) throw new Error('Worker not found');

    const isValid = await bcrypt.compare(oldPassword, worker.PasswordHash);
    if (!isValid) throw new Error('Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, 10);
    await googleSheetsService.updateRow(SHEET_NAMES.WORKERS, 'WorkerID', workerId, {
      PasswordHash: newHash,
    });

    await activityLogService.log(workerId, 'PASSWORD_CHANGE', 'Password changed');
    return { message: 'Password changed successfully' };
  }

  async resetPassword(workerId) {
    const defaultPassword = 'physio123';
    const newHash = await bcrypt.hash(defaultPassword, 10);
    await googleSheetsService.updateRow(SHEET_NAMES.WORKERS, 'WorkerID', workerId, {
      PasswordHash: newHash,
    });

    await activityLogService.log(workerId, 'PASSWORD_RESET', 'Password reset by admin');
    return { message: 'Password reset successfully', defaultPassword };
  }

  async initAdmin() {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@physioclinic.com';
    const existingAdmin = await this.findByLogin(adminEmail);
    if (existingAdmin) return;

    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const adminData = {
      WorkerID: 'ADMIN001',
      Name: process.env.ADMIN_NAME || 'Dr. Admin',
      Mobile: process.env.ADMIN_MOBILE || '+1234567890',
      Email: adminEmail,
      Address: 'Clinic Address',
      PasswordHash: passwordHash,
      Role: ROLES.ADMIN,
      Status: WORKER_STATUS.ACTIVE,
      JoiningDate: new Date().toISOString().split('T')[0],
      EmergencyContact: '',
      ProfilePhoto: '',
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    };

    await googleSheetsService.insertRow(SHEET_NAMES.WORKERS, adminData);
    console.log('Default admin created:', adminEmail);
  }
}

module.exports = new AuthService();
