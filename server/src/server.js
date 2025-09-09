require('dotenv').config();
const { validateEnvironment } = require('./config/validateEnv');

// Validate environment before starting the application
validateEnvironment();

const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server läuft erfolgreich auf http://localhost:${PORT}`);
  console.log(`📅 Gestartet um: ${new Date().toLocaleString('de-DE')}`);
});