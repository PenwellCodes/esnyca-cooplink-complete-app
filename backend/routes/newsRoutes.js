const express = require('express');
const { sql, getPool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function isGuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      value,
    )
  );
}

// GET /api/news?published=true|false
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const { published } = req.query;
    const request = pool.request();
    let query = `
      SELECT Id, Title, Summary, Content, ImageUrl, Author, Published, CreatedAt
      FROM dbo.News
    `;
    if (published !== undefined) {
      request.input(
        'Published',
        sql.Bit,
        String(published).toLowerCase() === 'true',
      );
      query += ' WHERE Published = @Published';
    }
    query += ' ORDER BY CreatedAt DESC';
    const result = await request.query(query);
    return res.json(result.recordset);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch news' });
  }
});

// GET /api/news/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isGuid(id)) return res.status(400).json({ message: 'Invalid Id' });

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('Id', sql.UniqueIdentifier, id)
      .query(
        `SELECT Id, Title, Summary, Content, ImageUrl, Author, Published, CreatedAt
         FROM dbo.News WHERE Id = @Id`,
      );
    const item = result.recordset[0];
    if (!item) return res.status(404).json({ message: 'Not found' });
    return res.json(item);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch news item' });
  }
});

// POST /api/news
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { title, summary, content, imageUrl, author, published } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ message: 'title and content are required' });
  }

  try {
    const pool = await getPool();
    const created = await pool
      .request()
      .input('Title', sql.NVarChar(255), String(title))
      .input('Summary', sql.NVarChar(sql.MAX), summary || null)
      .input('Content', sql.NVarChar(sql.MAX), String(content))
      .input('ImageUrl', sql.NVarChar(2048), imageUrl || null)
      .input('Author', sql.NVarChar(120), author || null)
      .input('Published', sql.Bit, !!published)
      .query(`
        INSERT INTO dbo.News (Title, Summary, Content, ImageUrl, Author, Published)
        OUTPUT inserted.Id, inserted.Title, inserted.Summary, inserted.Content, inserted.ImageUrl,
               inserted.Author, inserted.Published, inserted.CreatedAt
        VALUES (@Title, @Summary, @Content, @ImageUrl, @Author, @Published)
      `);
    return res.status(201).json(created.recordset[0]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to create news' });
  }
});

// PUT /api/news/:id
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isGuid(id)) return res.status(400).json({ message: 'Invalid Id' });

  const { title, summary, content, imageUrl, author, published } = req.body || {};

  try {
    const pool = await getPool();
    const updated = await pool
      .request()
      .input('Id', sql.UniqueIdentifier, id)
      .input('Title', sql.NVarChar(255), title || null)
      .input('Summary', sql.NVarChar(sql.MAX), summary || null)
      .input('Content', sql.NVarChar(sql.MAX), content || null)
      .input('ImageUrl', sql.NVarChar(2048), imageUrl || null)
      .input('Author', sql.NVarChar(120), author || null)
      .input(
        'Published',
        sql.Bit,
        published === undefined ? null : !!published,
      )
      .query(`
        UPDATE dbo.News
        SET
          Title = COALESCE(@Title, Title),
          Summary = @Summary,
          Content = COALESCE(@Content, Content),
          ImageUrl = @ImageUrl,
          Author = @Author,
          Published = COALESCE(@Published, Published)
        OUTPUT inserted.Id, inserted.Title, inserted.Summary, inserted.Content, inserted.ImageUrl,
               inserted.Author, inserted.Published, inserted.CreatedAt
        WHERE Id = @Id
      `);

    const item = updated.recordset[0];
    if (!item) return res.status(404).json({ message: 'Not found' });
    return res.json(item);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to update news' });
  }
});

// DELETE /api/news/:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isGuid(id)) return res.status(400).json({ message: 'Invalid Id' });

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('Id', sql.UniqueIdentifier, id)
      .query('DELETE FROM dbo.News WHERE Id = @Id');

    if (result.rowsAffected?.[0] === 0) {
      return res.status(404).json({ message: 'Not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete news' });
  }
});

module.exports = router;

