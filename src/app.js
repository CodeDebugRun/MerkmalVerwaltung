const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// Güvenlik middleware'leri
app.use(helmet());
app.use(cors());

// Rate limiting - dakikada 100 istek
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 dakika
  max: 100,
  message: 'Sie senden zu viele Anfragen, bitte warten Sie'
});
app.use(limiter);

// JSON parser
app.use(express.json());

// Test endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'API çalışıyor!',
    timestamp: new Date().toISOString()
  });
});

module.exports = app;