const express = require('express');
const { sql, getPool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/mission-vision (returns latest row)
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.query(`
      SELECT TOP 1 Id, Mission, Vision, CreatedAt
      FROM dbo.MissionVision
      ORDER BY CreatedAt DESC
    `);
    return res.json(result.recordset[0] || null);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch mission/vision' });
  }
});

// PUT /api/mission-vision (creates a new row; treat as versioned)
router.put('/', requireAdmin, async (req, res) => {
  const { mission, vision } = req.body || {};

  try {
    const pool = await getPool();
    const created = await pool
      .request()
      .input('Mission', sql.NVarChar(sql.MAX), mission || null)
      .input('Vision', sql.NVarChar(sql.MAX), vision || null)
      .query(`
        INSERT INTO dbo.MissionVision (Mission, Vision)
        OUTPUT inserted.Id, inserted.Mission, inserted.Vision, inserted.CreatedAt
        VALUES (@Mission, @Vision)
      `);
    return res.json(created.recordset[0]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to update mission/vision' });
  }
});

module.exports = router;

