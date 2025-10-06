const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
// const rateLimit = require('express-rate-limit'); // DEAKTIVIERT für Entwicklung
const { poolPromise } = require('./db');
const errorHandler = require('./middleware/errorHandler');
const { formatSuccess, formatError } = require('./utils/responseFormatter');
const connectionManager = require('./utils/connectionManager');
const dbConnectionMiddleware = require('./middleware/dbConnectionMiddleware');
const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting (KOMPLETT DEAKTIVIERT für Entwicklung)
console.log('⚠️  Rate limiting komplett deaktiviert für Entwicklung');
// const limiter = rateLimit({
//   windowMs: 1 * 60 * 1000,
//   max: 100,
//   message: formatError('Zu viele Anfragen, bitte warten Sie.'),
//   standardHeaders: true,
//   legacyHeaders: false
// });
// app.use(limiter);

// Database health check middleware
app.use('/api', connectionManager.healthCheckMiddleware());

app.use(express.json());

// Database connection middleware - must be after express.json()
app.use(dbConnectionMiddleware);

// Routen importieren
const merkmalstexteRoutes = require('./routes/merkmalstexteRoutes');
const groupedRoutes = require('./routes/groupedRoutes');
const identnrRoutes = require('./routes/identnrRoutes');
const databaseRoutes = require('./routes/databaseRoutes');

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

// API-Routen mit /api Präfix verwenden
app.use('/api', merkmalstexteRoutes);
app.use('/api/grouped', groupedRoutes);
app.use('/api', identnrRoutes);
app.use('/api/database', databaseRoutes);

// Global error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;