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

// GET /api/team-members
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.query(`
      SELECT Id, Name, Title, Description, Bio, ImageUrl, CreatedAt
      FROM dbo.TeamMembers
      ORDER BY CreatedAt DESC
    `);
    return res.json(result.recordset);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch team members' });
  }
});

// GET /api/team-members/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isGuid(id)) return res.status(400).json({ message: 'Invalid Id' });
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('Id', sql.UniqueIdentifier, id)
      .query(
        `SELECT Id, Name, Title, Description, Bio, ImageUrl, CreatedAt
         FROM dbo.TeamMembers WHERE Id = @Id`,
      );
    const item = result.recordset[0];
    if (!item) return res.status(404).json({ message: 'Not found' });
    return res.json(item);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch team member' });
  }
});

// POST /api/team-members
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, title, description, bio, imageUrl } = req.body || {};
  if (!name) return res.status(400).json({ message: 'name is required' });

  try {
    const pool = await getPool();
    const created = await pool
      .request()
      .input('Name', sql.NVarChar(120), String(name))
      .input('Title', sql.NVarChar(255), title || null)
      .input('Description', sql.NVarChar(sql.MAX), description || null)
      .input('Bio', sql.NVarChar(sql.MAX), bio || null)
      .input('ImageUrl', sql.NVarChar(2048), imageUrl || null)
      .query(`
        INSERT INTO dbo.TeamMembers (Name, Title, Description, Bio, ImageUrl)
        OUTPUT inserted.Id, inserted.Name, inserted.Title, inserted.Description, inserted.Bio,
               inserted.ImageUrl, inserted.CreatedAt
        VALUES (@Name, @Title, @Description, @Bio, @ImageUrl)
      `);
    return res.status(201).json(created.recordset[0]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to create team member' });
  }
});

// PUT /api/team-members/:id
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isGuid(id)) return res.status(400).json({ message: 'Invalid Id' });

  const { name, title, description, bio, imageUrl } = req.body || {};

  try {
    const pool = await getPool();
    const updated = await pool
      .request()
      .input('Id', sql.UniqueIdentifier, id)
      .input('Name', sql.NVarChar(120), name || null)
      .input('Title', sql.NVarChar(255), title || null)
      .input('Description', sql.NVarChar(sql.MAX), description || null)
      .input('Bio', sql.NVarChar(sql.MAX), bio || null)
      .input('ImageUrl', sql.NVarChar(2048), imageUrl || null)
      .query(`
        UPDATE dbo.TeamMembers
        SET
          Name = COALESCE(@Name, Name),
          Title = @Title,
          Description = @Description,
          Bio = @Bio,
          ImageUrl = @ImageUrl
        OUTPUT inserted.Id, inserted.Name, inserted.Title, inserted.Description, inserted.Bio,
               inserted.ImageUrl, inserted.CreatedAt
        WHERE Id = @Id
      `);

    const item = updated.recordset[0];
    if (!item) return res.status(404).json({ message: 'Not found' });
    return res.json(item);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to update team member' });
  }
});

// DELETE /api/team-members/:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isGuid(id)) return res.status(400).json({ message: 'Invalid Id' });

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('Id', sql.UniqueIdentifier, id)
      .query('DELETE FROM dbo.TeamMembers WHERE Id = @Id');

    if (result.rowsAffected?.[0] === 0) {
      return res.status(404).json({ message: 'Not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete team member' });
  }
});

module.exports = router;

