const { sql, getPool } = require('../db');

async function getUserById(id) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('Id', sql.UniqueIdentifier, id)
    .query(`
      SELECT TOP 1 Id, Email, Role, DisplayName,
        CASE WHEN COL_LENGTH('dbo.Users', 'Disabled') IS NULL THEN CAST(0 AS bit) ELSE Disabled END AS Disabled
      FROM dbo.Users
      WHERE Id = @Id
    `);
  return result.recordset?.[0] || null;
}

async function requireAuth(req, res, next) {
  // PUBLIC MODE:
  // This middleware no longer enforces JWT/authentication. It only provides
  // backward-compatible `req.user` context for any routes that reference it.
  const userId = String(req.headers['x-user-id'] || '').trim();
  const requestedRole = String(req.headers['x-user-role'] || '').trim();

  req.user = {
    Id: userId || undefined,
    // Default to `admin` so code paths like "current user vs admin" don't block.
    Role: requestedRole || 'admin',
  };

  return next();
}

async function optionalAuth(req, _res, next) {
  // Same as requireAuth in public mode.
  return requireAuth(req, _res, next);
}

function requireAdmin(req, res, next) {
  return next();
}

function requireSelfOrAdmin(paramName = 'id') {
  return (req, res, next) => {
    // Public mode: no resource-level authorization checks.
    return next();
  };
}

module.exports = { requireAuth, optionalAuth, requireAdmin, requireSelfOrAdmin };
