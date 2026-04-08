const sql = require('mssql');

// Use env vars when available; fall back to current defaults.
const config = {
  user: process.env.SQL_USER || 'Esnyca_app_user',
  password: process.env.SQL_PASSWORD || 'esnycaappuser!',
  server: process.env.SQL_SERVER || 'localhost',
  database: process.env.SQL_DATABASE || 'Esnyca_app',
  options: {
    encrypt: (process.env.SQL_ENCRYPT || 'false').toLowerCase() === 'true',
    trustServerCertificate:
      (process.env.SQL_TRUST_SERVER_CERT || 'true').toLowerCase() === 'true',
  },
};

let poolPromise;

function getPool() {
  if (!poolPromise) {
    poolPromise = sql
      .connect(config)
      .then((pool) => {
        // eslint-disable-next-line no-console
        console.log(`Connected to SQL Server: ${config.database}`);
        return pool;
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('DB Connection Error:', err);
        poolPromise = undefined;
        throw err;
      });
  }

  return poolPromise;
}

module.exports = { sql, getPool };