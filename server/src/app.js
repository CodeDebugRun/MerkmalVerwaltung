const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { poolPromise } = require('./db');
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

// Route'ları import et / Routen importieren
const merkmalstexteRoutes = require('./routes/merkmalstexteRoutes');

// Test endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'API is running!',
    timestamp: new Date().toISOString()
  });
});

// Database test endpoint
app.get('/db-test', async (req, res) => {
  try {
    const pool = await poolPromise;
    res.json({ 
      message: 'Database connection successful!',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ 
      message: 'Database connection failed',
      error: err.message 
    });
  }
});

// API rotalarını /api öneki ile kullan

app.use('/api', merkmalstexteRoutes);


module.exports = app;