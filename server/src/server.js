require('dotenv').config();
const { validateEnvironment } = require('./config/validateEnv');

// Validate environment before starting the application
validateEnvironment();

const app = require('./app');
const { poolPromise } = require('./db');
const connectionManager = require('./utils/connectionManager');

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`🚀 Server läuft erfolgreich auf http://localhost:${PORT}`);
  console.log(`📅 Gestartet um: ${new Date().toLocaleString('de-DE')}`);
  
  // Start database health monitoring
  try {
    const pool = await poolPromise;
    connectionManager.startHealthMonitoring(pool);
  } catch (err) {
    console.error('❌ Datenbank-Gesundheitsüberwachung konnte nicht gestartet werden:', err.message);
  }
});