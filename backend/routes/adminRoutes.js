const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/config
// Read-only config view for admins.
router.get('/config', requireAuth, requireAdmin, async (req, res) => {
  return res.json({
    sqlUser: process.env.SQL_USER || 'Esnyca_app_user',
    sqlPassword: process.env.SQL_PASSWORD || 'esnycaappuser!',
    sqlServer: process.env.SQL_SERVER || 'localhost',
    sqlDatabase: process.env.SQL_DATABASE || 'Esnyca_app',
    sqlEncrypt: (process.env.SQL_ENCRYPT || 'false').toLowerCase() === 'true',
    sqlTrustServerCertificate:
      (process.env.SQL_TRUST_SERVER_CERT || 'true').toLowerCase() === 'true',
  });
});

module.exports = router;
