const express = require('express');
const { sql, getPool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function isGuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      value,
    )
  );
}

// GET /api/stories/active
router.get('/active', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.query(`
      SELECT Id, UserId, ImageUrl, Caption, CreatedAt, ExpiresAt
      FROM dbo.Stories
      WHERE ExpiresAt > SYSUTCDATETIME()
      ORDER BY CreatedAt DESC
    `);
    return res.json(result.recordset);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch active stories' });
  }
});

// POST /api/stories
// body: { userId, imageUrl, caption?, expiresAt? } (expiresAt defaults to now + 24h)
router.post('/', async (req, res) => {
  const { userId, imageUrl, caption, expiresAt } = req.body || {};
  if (!isGuid(String(userId))) {
    return res.status(400).json({ message: 'userId is required' });
  }
  if (!imageUrl) {
    return res.status(400).json({ message: 'imageUrl is required' });
  }

  const expiry =
    expiresAt != null
      ? new Date(expiresAt)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (Number.isNaN(expiry.getTime())) {
    return res.status(400).json({ message: 'Invalid expiresAt' });
  }

  try {
    const pool = await getPool();
    const created = await pool
      .request()
      .input('UserId', sql.UniqueIdentifier, String(userId))
      .input('ImageUrl', sql.NVarChar(2048), String(imageUrl))
      .input('Caption', sql.NVarChar(255), caption || null)
      .input('ExpiresAt', sql.DateTime2, expiry)
      .query(`
        INSERT INTO dbo.Stories (UserId, ImageUrl, Caption, ExpiresAt)
        OUTPUT inserted.Id, inserted.UserId, inserted.ImageUrl, inserted.Caption,
               inserted.CreatedAt, inserted.ExpiresAt
        VALUES (@UserId, @ImageUrl, @Caption, @ExpiresAt)
      `);
    return res.status(201).json(created.recordset[0]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to create story' });
  }
});

// DELETE /api/stories/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isGuid(id)) return res.status(400).json({ message: 'Invalid Id' });

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('Id', sql.UniqueIdentifier, id)
      .query('DELETE FROM dbo.Stories WHERE Id = @Id');
    if (result.rowsAffected?.[0] === 0) {
      return res.status(404).json({ message: 'Not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete story' });
  }
});

// POST /api/stories/:id/views
// body: { viewerUserId }
router.post('/:id/views', async (req, res) => {
  const { id } = req.params;
  const { viewerUserId } = req.body || {};
  if (!isGuid(id)) return res.status(400).json({ message: 'Invalid story Id' });
  if (!isGuid(String(viewerUserId))) {
    return res.status(400).json({ message: 'viewerUserId is required' });
  }

  try {
    const pool = await getPool();
    await pool
      .request()
      .input('StoryId', sql.UniqueIdentifier, id)
      .input('ViewerUserId', sql.UniqueIdentifier, String(viewerUserId))
      .query(`
        MERGE dbo.StoryViews AS target
        USING (SELECT @StoryId AS StoryId, @ViewerUserId AS ViewerUserId) AS source
        ON target.StoryId = source.StoryId AND target.ViewerUserId = source.ViewerUserId
        WHEN NOT MATCHED THEN
          INSERT (StoryId, ViewerUserId) VALUES (source.StoryId, source.ViewerUserId)
        WHEN MATCHED THEN
          UPDATE SET ViewedAt = SYSUTCDATETIME();
      `);
    return res.status(201).json({ success: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to record view' });
  }
});

// GET /api/stories/:id/views
router.get('/:id/views', async (req, res) => {
  const { id } = req.params;
  if (!isGuid(id)) return res.status(400).json({ message: 'Invalid story Id' });

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('StoryId', sql.UniqueIdentifier, id)
      .query(`
        SELECT ViewerUserId, ViewedAt
        FROM dbo.StoryViews
        WHERE StoryId = @StoryId
        ORDER BY ViewedAt DESC
      `);
    return res.json(result.recordset);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch views' });
  }
});

module.exports = router;

