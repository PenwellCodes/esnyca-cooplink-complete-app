const express = require('express');
const { sql, getPool } = require('../db');

const router = express.Router();

// GET /api/our-story (latest row)
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.query(`
      SELECT TOP 1 Id, Story, CreatedAt
      FROM dbo.OurStory
      ORDER BY CreatedAt DESC
    `);
    return res.json(result.recordset[0] || null);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch story' });
  }
});

// PUT /api/our-story (creates a new row; treat as versioned)
router.put('/', async (req, res) => {
  const { story } = req.body || {};

  try {
    const pool = await getPool();
    const created = await pool
      .request()
      .input('Story', sql.NVarChar(sql.MAX), story || null)
      .query(`
        INSERT INTO dbo.OurStory (Story)
        OUTPUT inserted.Id, inserted.Story, inserted.CreatedAt
        VALUES (@Story)
      `);
    return res.json(created.recordset[0]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to update story' });
  }
});

module.exports = router;

