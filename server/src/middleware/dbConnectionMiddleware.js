const sql = require('mssql');

// Store active connection pools
const connectionPools = new Map();

// Create a unique key for each database configuration
const getPoolKey = (config) => {
  return `${config.server}:${config.port}:${config.database}:${config.user}`;
};

// Database connection middleware
const dbConnectionMiddleware = async (req, res, next) => {
  try {
    // Get database config from request headers
    const dbConfig = req.headers['x-db-config'];

    if (!dbConfig) {
      // If no config in headers, continue without database
      req.dbPool = null;
      return next();
    }

    // Parse the config
    const config = JSON.parse(dbConfig);

    // Validate required fields
    if (!config.host || !config.database || !config.username) {
      req.dbPool = null;
      return next();
    }

    // Create SQL Server configuration
    const sqlConfig = {
      server: config.host,
      port: config.port ? parseInt(config.port) : 1433,
      database: config.database,
      user: config.username,
      password: config.password || '',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      },
      connectionTimeout: 30000,
      requestTimeout: 30000
    };

    const poolKey = getPoolKey(sqlConfig);

    // Check if we already have a connection pool for this config
    let pool = connectionPools.get(poolKey);

    if (!pool || !pool.connected) {
      // Create new connection pool
      pool = new sql.ConnectionPool(sqlConfig);
      await pool.connect();
      connectionPools.set(poolKey, pool);
      console.log(`New database connection established: ${config.host}/${config.database}`);
    }

    // Attach the pool to the request
    req.dbPool = pool;
    req.sql = sql;

    next();
  } catch (error) {
    console.error('Database connection middleware error:', error);
    req.dbPool = null;
    next();
  }
};

// Clean up old connections periodically
setInterval(() => {
  connectionPools.forEach((pool, key) => {
    if (!pool.connected) {
      connectionPools.delete(key);
      console.log(`Removed disconnected pool: ${key}`);
    }
  });
}, 60000); // Check every minute

module.exports = dbConnectionMiddleware;