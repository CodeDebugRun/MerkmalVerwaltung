const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { poolPromise } = require('./db');
const errorHandler = require('./middleware/errorHandler');
const { formatSuccess, formatError } = require('./utils/responseFormatter');
const connectionManager = require('./utils/connectionManager');
const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 50,
  message: formatError('Zu viele Anfragen, bitte warten Sie.'),
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Database health check middleware
app.use('/api', connectionManager.healthCheckMiddleware());

app.use(express.json());

// Route'ları import et / Routen importieren
const merkmalstexteRoutes = require('./routes/merkmalstexteRoutes');

// Test endpoint
app.get('/', (req, res) => {
  res.json(formatSuccess(null, 'API läuft erfolgreich!'));
});

// Database test endpoint
app.get('/db-test', async (req, res) => {
  try {
    const pool = await poolPromise;
    res.json(formatSuccess(null, 'Datenbankverbindung erfolgreich!'));
  } catch (err) {
    res.status(500).json(formatError('Datenbankverbindung fehlgeschlagen'));
  }
});

// API rotalarını /api öneki ile kullan

app.use('/api', merkmalstexteRoutes);

// Global error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;