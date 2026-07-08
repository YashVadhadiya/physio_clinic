require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const googleSheetsService = require('./services/database.service');
// const googleSheetsService = require('./services/googleSheets.service');
const authService = require('./services/auth.service');
const { errorHandler, notFound } = require('./middleware/error.middleware');

const authRoutes = require('./routes/auth.routes');
const workerRoutes = require('./routes/worker.routes');
const patientRoutes = require('./routes/patient.routes');
const visitRoutes = require('./routes/visit.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportRoutes = require('./routes/report.routes');

const app = express();
const PORT = process.env.PORT || 5000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 500 : 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'PhysioClinic API is running', timestamp: new Date().toISOString() });
});

app.use(notFound);
app.use(errorHandler);

async function startServer() {
  try {
    console.log('Initializing database...');
    await googleSheetsService.init();
    console.log('Database initialized successfully');

    console.log('Setting up default admin...');
    await authService.initAdmin();
    console.log('Default admin configured');

    app.listen(PORT, () => {
      console.log(`PhysioClinic server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
