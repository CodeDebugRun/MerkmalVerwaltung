import React, { useState, useEffect } from 'react';

const SettingsModal = ({
  showSettings,
  darkMode,
  onToggleDarkMode,
  onClose,
  onDatabaseSettingsChange
}) => {
  // Database settings state
  const [dbSettings, setDbSettings] = useState({
    host: 'localhost',
    port: '3001',
    database: '',
    username: '',
    password: ''
  });

  const [connectionStatus, setConnectionStatus] = useState({
    testing: false,
    success: false,
    error: null
  });

  // Load saved settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('dbSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setDbSettings(parsed);
      } catch (error) {
        console.error('Error loading saved database settings:', error);
      }
    }
  }, []);

  if (!showSettings) {
    return null;
  }

  const handleDbSettingChange = (field, value) => {
    setDbSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTestConnection = async () => {
    setConnectionStatus({ testing: true, success: false, error: null });

    try {
      // Test database connection
      const apiUrl = `http://${dbSettings.host || 'localhost'}:${dbSettings.port || '3001'}/api/database/test`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dbSettings)
      });

      const result = await response.json();

      if (result.success) {
        setConnectionStatus({ testing: false, success: true, error: null });

        // Save settings to localStorage
        localStorage.setItem('dbSettings', JSON.stringify(dbSettings));

        // Notify parent component about successful connection
        if (onDatabaseSettingsChange) {
          onDatabaseSettingsChange(dbSettings);
        }
      } else {
        setConnectionStatus({
          testing: false,
          success: false,
          error: result.message || 'Verbindung fehlgeschlagen'
        });
      }
    } catch (error) {
      setConnectionStatus({
        testing: false,
        success: false,
        error: 'Netzwerkfehler: ' + error.message
      });
    }
  };

  return (
    <section className="settings-section">
      <h3>⚙️ Einstellungen</h3>

      {/* Dark Mode Setting */}
      <div className="settings-group">
        <h4>🎨 Erscheinungsbild</h4>
        <div className="settings-grid">
          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={onToggleDarkMode}
                className="setting-checkbox"
              />
              <span className="setting-text">
                {darkMode ? '🌙' : '☀️'} Dark Mode
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Database Settings */}
      <div className="settings-group">
        <h4>🗄️ Datenbankverbindung</h4>
        <div className="db-settings-form">
          <div className="form-group">
            <label htmlFor="db-host">Host:</label>
            <input
              id="db-host"
              type="text"
              value={dbSettings.host}
              onChange={(e) => handleDbSettingChange('host', e.target.value)}
              placeholder="localhost"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="db-port">Port:</label>
            <input
              id="db-port"
              type="text"
              value={dbSettings.port}
              onChange={(e) => handleDbSettingChange('port', e.target.value)}
              placeholder="3306"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="db-name">Datenbank:</label>
            <input
              id="db-name"
              type="text"
              value={dbSettings.database}
              onChange={(e) => handleDbSettingChange('database', e.target.value)}
              placeholder="merkmalstexte_db"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="db-username">Benutzername:</label>
            <input
              id="db-username"
              type="text"
              value={dbSettings.username}
              onChange={(e) => handleDbSettingChange('username', e.target.value)}
              placeholder="root"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="db-password">Passwort:</label>
            <input
              id="db-password"
              type="password"
              value={dbSettings.password}
              onChange={(e) => handleDbSettingChange('password', e.target.value)}
              placeholder="••••••••"
              className="form-control"
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleTestConnection}
            disabled={connectionStatus.testing}
          >
            {connectionStatus.testing ? '🔄 Teste Verbindung...' : '🔗 Verbindung testen'}
          </button>

          {/* Connection Status Messages */}
          {connectionStatus.success && (
            <div className="alert alert-success">
              ✅ Datenbankverbindung erfolgreich!
            </div>
          )}

          {connectionStatus.error && (
            <div className="alert alert-error">
              ❌ Fehler: {connectionStatus.error}
            </div>
          )}
        </div>
      </div>

      <div className="settings-actions">
        <button
          className="btn btn-secondary"
          onClick={onClose}
        >
          ✅ Schließen
        </button>
      </div>
    </section>
  );
};

export default SettingsModal;