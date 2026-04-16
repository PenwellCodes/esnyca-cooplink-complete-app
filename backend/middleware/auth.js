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
  const userId = String(req.headers['x-user-id'] || '').trim();
  const requestedRole = String(req.headers['x-user-role'] || '').trim();

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const user = await getUserById(userId);
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (user.Disabled) return res.status(403).json({ message: 'Account is disabled' });

    req.user = {
      ...user,
      Role: requestedRole || user.Role,
    };
    return next();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Authentication user lookup failed:', error);
    return res.status(500).json({ message: 'Authentication lookup failed' });
  }
}

async function optionalAuth(req, _res, next) {
  const userId = String(req.headers['x-user-id'] || '').trim();
  const requestedRole = String(req.headers['x-user-role'] || '').trim();

  if (!userId) return next();

  try {
    const user = await getUserById(userId);
    if (user && !user.Disabled) {
      req.user = {
        ...user,
        Role: requestedRole || user.Role,
      };
    }
    return next();
  } catch {
    return next();
  }
}

function requireAdmin(req, res, next) {
  const role = String(req.user?.Role || '').toLowerCase();
  if (role !== 'admin' && role !== 'superadmin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  return next();
}

function requireSelfOrAdmin(paramName = 'id') {
  return (req, res, next) => {
    const role = String(req.user?.Role || '').toLowerCase();
    if (role === 'admin' || role === 'superadmin') return next();
    if (req.params[paramName] === req.user?.Id) return next();
    return res.status(403).json({ message: 'Not authorized for this resource' });
  };
}

module.exports = { requireAuth, optionalAuth, requireAdmin, requireSelfOrAdmin };
