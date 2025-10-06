const express = require('express');
const router = express.Router();
const sql = require('mssql');
const asyncHandler = require('../middleware/asyncHandler');
const { success, error } = require('../utils/responseFormatter');

/**
 * Test database connection with provided credentials
 * @route POST /api/database/test
 */
router.post('/test', asyncHandler(async (req, res) => {
  const { host, port, database, username, password } = req.body;

  // Validate required fields
  if (!host || !database || !username) {
    return res.status(400).json(error(
      'Missing required fields: host, database, and username are required',
      400
    ));
  }

  // Create test configuration
  const testConfig = {
    server: host,
    port: port ? parseInt(port) : 1433,
    database: database,
    user: username,
    password: password || '',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true
    },
    pool: {
      max: 1,
      min: 0,
      idleTimeoutMillis: 5000
    },
    requestTimeout: 5000,
    connectionTimeout: 5000
  };

  let testPool = null;

  try {
    // Attempt to create a connection pool
    testPool = new sql.ConnectionPool(testConfig);

    // Try to connect
    await testPool.connect();

    // Test a simple query
    const result = await testPool.request().query('SELECT 1 AS test');

    if (result.recordset && result.recordset[0].test === 1) {
      // Connection successful
      res.json(success({
        connected: true,
        server: host,
        database: database
      }, 'Database connection successful'));
    } else {
      throw new Error('Test query failed');
    }
  } catch (err) {
    console.error('Database connection test failed:', err);

    // Format error message
    let errorMessage = 'Connection failed: ';

    if (err.code === 'ELOGIN') {
      errorMessage += 'Invalid username or password';
    } else if (err.code === 'ETIMEOUT') {
      errorMessage += 'Connection timeout - check host and port';
    } else if (err.code === 'ECONNREFUSED') {
      errorMessage += 'Connection refused - check if SQL Server is running';
    } else if (err.code === 'EREQUEST') {
      errorMessage += 'Invalid database name or insufficient permissions';
    } else {
      errorMessage += err.message || 'Unknown error';
    }

    res.status(400).json(error(errorMessage, 400));
  } finally {
    // Always close the test connection
    if (testPool) {
      try {
        await testPool.close();
      } catch (closeErr) {
        console.error('Error closing test connection:', closeErr);
      }
    }
  }
}));

/**
 * Get current database connection info (without credentials)
 * @route GET /api/database/info
 */
router.get('/info', (req, res) => {
  const config = {
    server: process.env.DB_SERVER || 'Not configured',
    database: process.env.DB_DATABASE || 'Not configured',
    port: process.env.DB_PORT || '1433'
  };

  res.json(success(config, 'Current database configuration'));
});

module.exports = router;