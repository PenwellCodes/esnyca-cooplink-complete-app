const express = require('express');
const { sql, getPool } = require('../db');

const router = express.Router();

function isGuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      value,
    )
  );
}

// GET /api/about-us-cards
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.query(`
      SELECT Id, Title, Description, ImageUrl, FacebookUrl, CreatedAt
      FROM dbo.AboutUsCards
      ORDER BY CreatedAt DESC
    `);
    return res.json(result.recordset);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch about us cards' });
  }
});

// GET /api/about-us-cards/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isGuid(id)) return res.status(400).json({ message: 'Invalid Id' });
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('Id', sql.UniqueIdentifier, id)
      .query(
        `SELECT Id, Title, Description, ImageUrl, FacebookUrl, CreatedAt
         FROM dbo.AboutUsCards WHERE Id = @Id`,
      );
    const item = result.recordset[0];
    if (!item) return res.status(404).json({ message: 'Not found' });
    return res.json(item);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch about us card' });
  }
});

// POST /api/about-us-cards
router.post('/', async (req, res) => {
  const { title, description, imageUrl, facebookUrl } = req.body || {};
  if (!title) return res.status(400).json({ message: 'title is required' });

  try {
    const pool = await getPool();
    const created = await pool
      .request()
      .input('Title', sql.NVarChar(255), String(title))
      .input('Description', sql.NVarChar(sql.MAX), description || null)
      .input('ImageUrl', sql.NVarChar(2048), imageUrl || null)
      .input('FacebookUrl', sql.NVarChar(2048), facebookUrl || null)
      .query(`
        INSERT INTO dbo.AboutUsCards (Title, Description, ImageUrl, FacebookUrl)
        OUTPUT inserted.Id, inserted.Title, inserted.Description, inserted.ImageUrl,
               inserted.FacebookUrl, inserted.CreatedAt
        VALUES (@Title, @Description, @ImageUrl, @FacebookUrl)
      `);
    return res.status(201).json(created.recordset[0]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to create about us card' });
  }
});

// PUT /api/about-us-cards/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isGuid(id)) return res.status(400).json({ message: 'Invalid Id' });

  const { title, description, imageUrl, facebookUrl } = req.body || {};

  try {
    const pool = await getPool();
    const updated = await pool
      .request()
      .input('Id', sql.UniqueIdentifier, id)
      .input('Title', sql.NVarChar(255), title || null)
      .input('Description', sql.NVarChar(sql.MAX), description || null)
      .input('ImageUrl', sql.NVarChar(2048), imageUrl || null)
      .input('FacebookUrl', sql.NVarChar(2048), facebookUrl || null)
      .query(`
        UPDATE dbo.AboutUsCards
        SET
          Title = COALESCE(@Title, Title),
          Description = @Description,
          ImageUrl = @ImageUrl,
          FacebookUrl = @FacebookUrl
        OUTPUT inserted.Id, inserted.Title, inserted.Description, inserted.ImageUrl,
               inserted.FacebookUrl, inserted.CreatedAt
        WHERE Id = @Id
      `);

    const item = updated.recordset[0];
    if (!item) return res.status(404).json({ message: 'Not found' });
    return res.json(item);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to update about us card' });
  }
});

// DELETE /api/about-us-cards/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isGuid(id)) return res.status(400).json({ message: 'Invalid Id' });

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('Id', sql.UniqueIdentifier, id)
      .query('DELETE FROM dbo.AboutUsCards WHERE Id = @Id');

    if (result.rowsAffected?.[0] === 0) {
      return res.status(404).json({ message: 'Not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete about us card' });
  }
});

module.exports = router;

