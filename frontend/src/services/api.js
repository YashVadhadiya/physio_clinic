import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (data) => api.put('/auth/change-password', data),
  resetPassword: (id) => api.put(`/auth/reset-password/${id}`),
};

export const workerAPI = {
  getAll: (params) => api.get('/workers', { params }),
  getById: (id) => api.get(`/workers/${id}`),
  getActive: () => api.get('/workers/active'),
  update: (id, data) => api.put(`/workers/${id}`, data),
  toggleStatus: (id) => api.patch(`/workers/${id}/toggle-status`),
  getStats: (id) => api.get(`/workers/${id}/stats`),
  search: (q) => api.get('/workers/search', { params: { q } }),
};

export const patientAPI = {
  getAll: (params) => api.get('/patients', { params }),
  getById: (id) => api.get(`/patients/${id}`),
  create: (data) => api.post('/patients', data),
  update: (id, data) => api.put(`/patients/${id}`, data),
  delete: (id) => api.delete(`/patients/${id}`),
  search: (q) => api.get('/patients/search', { params: { q } }),
  findByMobile: (mobile) => api.get(`/patients/mobile/${mobile}`),
  getVisitHistory: (id) => api.get(`/patients/${id}/visits`),
  getRecent: (limit) => api.get('/patients/recent', { params: { limit } }),
};

export const visitAPI = {
  getAll: (params) => api.get('/visits', { params }),
  getById: (id) => api.get(`/visits/${id}`),
  create: (data) => api.post('/visits', data),
  update: (id, data) => api.put(`/visits/${id}`, data),
  delete: (id) => api.delete(`/visits/${id}`),
  getToday: () => api.get('/visits/today'),
  getByDateRange: (params) => api.get('/visits/date-range', { params }),
  getByWorker: (workerId, params) => api.get(`/visits/worker/${workerId}`, { params }),
  getByPatient: (patientId, params) => api.get(`/visits/patient/${patientId}`, { params }),
  search: (q) => api.get('/visits/search', { params: { q } }),
};

export const dashboardAPI = {
  getAdmin: () => api.get('/dashboard/admin'),
  getWorker: () => api.get('/dashboard/worker'),
};

export const reportAPI = {
  daily: (params) => api.get('/reports/daily', { params }),
  weekly: (params) => api.get('/reports/weekly', { params }),
  monthly: (params) => api.get('/reports/monthly', { params }),
  worker: (params) => api.get('/reports/worker', { params }),
  patientHistory: (id) => api.get(`/reports/patient/${id}/history`),
  fees: (params) => api.get('/reports/fees', { params }),
};

export default api;
