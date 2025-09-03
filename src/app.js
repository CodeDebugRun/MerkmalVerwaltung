const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const merkmalstexteRoutes = require('./routes/merkmalstexteRoutes');
// const { poolPromise } = require('./db'); // kommentiert, bis die DB-Verbindung getestet wird
const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please wait.'
});
app.use(limiter);

app.use(express.json());

// Test endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'API is running!',
    timestamp: new Date().toISOString()
  });
});

// Database test endpoint
/*
app.get('/db-test', async (req, res) => {
  // Database bağlantısı hazır olduğunda bu kısmı açın
});
*/

// API rotalarını /api öneki ile kullan
app.use('/api', merkmalstexteRoutes);

module.exports = app;