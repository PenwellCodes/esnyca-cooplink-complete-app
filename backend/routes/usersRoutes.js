const express = require('express');
const bcrypt = require('bcryptjs');
const { sql, getPool } = require('../db');
const { requireAuth, requireAdmin, requireSelfOrAdmin } = require('../middleware/auth');

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

async function hasUsersDisabledColumn(pool) {
  const result = await pool
    .request()
    .query(
      "SELECT CASE WHEN COL_LENGTH('dbo.Users', 'Disabled') IS NULL THEN 0 ELSE 1 END AS HasDisabled",
    );
  return result.recordset?.[0]?.HasDisabled === 1;
}

// GET /api/users?email=...
router.get('/', requireAdmin, async (req, res) => {
  try {
    const pool = await getPool();
    const { email, role } = req.query;
    const hasDisabled = await hasUsersDisabledColumn(pool);

    const request = pool.request();
    let query = `
      SELECT
        Id, Email, Role, DisplayName, PhoneNumber, Region, RegistrationNumber,
        PhysicalAddress, Content, ProfilePicUrl, CompanyAddress,
        ${hasDisabled ? 'Disabled,' : 'CAST(0 AS bit) AS Disabled,'}
        LocationLat, LocationLng, CreatedAt, UpdatedAt
      FROM dbo.Users
    `;

    if (email) {
      request.input('Email', sql.NVarChar(320), String(email));
      query += ' WHERE Email = @Email';
      if (role) {
        request.input('Role', sql.NVarChar(32), String(role));
        query += ' AND Role = @Role';
      }
    } else if (role) {
      request.input('Role', sql.NVarChar(32), String(role));
      query += ' WHERE Role = @Role';
    }

    query += ' ORDER BY CreatedAt DESC';
    const result = await request.query(query);
    return res.json(result.recordset);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// GET /api/users/:id
router.get('/:id', requireSelfOrAdmin('id'), async (req, res) => {
  const { id } = req.params;
  if (!isGuid(id)) return res.status(400).json({ message: 'Invalid Id' });

  try {
    const pool = await getPool();
    const hasDisabled = await hasUsersDisabledColumn(pool);
    const result = await pool
      .request()
      .input('Id', sql.UniqueIdentifier, id)
      .query(`
        SELECT
          Id, Email, Role, DisplayName, PhoneNumber, Region, RegistrationNumber,
          PhysicalAddress, Content, ProfilePicUrl, CompanyAddress,
          ${hasDisabled ? 'Disabled,' : 'CAST(0 AS bit) AS Disabled,'}
          LocationLat, LocationLng, CreatedAt, UpdatedAt
        FROM dbo.Users
        WHERE Id = @Id
      `);

    const user = result.recordset[0];
    if (!user) return res.status(404).json({ message: 'Not found' });
    return res.json(user);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// POST /api/users (admin-style create)
router.post('/', requireAdmin, async (req, res) => {
  const { email, password, role, displayName } = req.body || {};
  if (!email || !password || !displayName) {
    return res
      .status(400)
      .json({ message: 'email, password and displayName are required' });
  }

  try {
    const pool = await getPool();
    const passwordHash = await bcrypt.hash(String(password), 10);

    const created = await pool
      .request()
      .input('Email', sql.NVarChar(320), String(email))
      .input('PasswordHash', sql.NVarChar(255), passwordHash)
      .input('Role', sql.NVarChar(32), role || 'individual')
      .input('DisplayName', sql.NVarChar(120), String(displayName))
      .query(`
        INSERT INTO dbo.Users (Email, PasswordHash, Role, DisplayName)
        OUTPUT inserted.Id, inserted.Email, inserted.Role, inserted.DisplayName,
               inserted.CreatedAt, inserted.UpdatedAt
        VALUES (@Email, @PasswordHash, @Role, @DisplayName)
      `);

    return res.status(201).json(created.recordset[0]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to create user' });
  }
});

// PUT /api/users/:id
router.put('/:id', requireSelfOrAdmin('id'), async (req, res) => {
  const { id } = req.params;
  if (!isGuid(id)) return res.status(400).json({ message: 'Invalid Id' });

  const {
    role,
    displayName,
    phoneNumber,
    region,
    registrationNumber,
    physicalAddress,
    content,
    profilePicUrl,
    companyAddress,
    locationLat,
    locationLng,
    disabled,
  } = req.body || {};

  try {
    const pool = await getPool();
    const hasDisabled = await hasUsersDisabledColumn(pool);
    const request = pool
      .request()
      .input('Id', sql.UniqueIdentifier, id)
      .input('Role', sql.NVarChar(32), role || null)
      .input('DisplayName', sql.NVarChar(120), displayName || null)
      .input('PhoneNumber', sql.NVarChar(40), phoneNumber || null)
      .input('Region', sql.NVarChar(40), region || null)
      .input('RegistrationNumber', sql.NVarChar(80), registrationNumber || null)
      .input('PhysicalAddress', sql.NVarChar(255), physicalAddress || null)
      .input('Content', sql.NVarChar(sql.MAX), content || null)
      .input('ProfilePicUrl', sql.NVarChar(2048), profilePicUrl || null)
      .input('CompanyAddress', sql.NVarChar(255), companyAddress || null)
      .input(
        'LocationLat',
        sql.Float,
        locationLat !== undefined && locationLat !== null
          ? Number(locationLat)
          : null,
      )
      .input(
        'LocationLng',
        sql.Float,
        locationLng !== undefined && locationLng !== null
          ? Number(locationLng)
          : null,
      );
    if (hasDisabled) {
      request.input('Disabled', sql.Bit, disabled === undefined ? null : !!disabled);
    }
    const result = await request.query(`
        UPDATE dbo.Users
        SET
          Role = COALESCE(@Role, Role),
          DisplayName = COALESCE(@DisplayName, DisplayName),
          PhoneNumber = @PhoneNumber,
          Region = @Region,
          RegistrationNumber = @RegistrationNumber,
          PhysicalAddress = @PhysicalAddress,
          Content = @Content,
          ProfilePicUrl = @ProfilePicUrl,
          CompanyAddress = @CompanyAddress,
          ${hasDisabled ? 'Disabled = COALESCE(@Disabled, Disabled),' : ''}
          LocationLat = @LocationLat,
          LocationLng = @LocationLng,
          UpdatedAt = SYSUTCDATETIME()
        OUTPUT inserted.Id, inserted.Email, inserted.Role, inserted.DisplayName,
               inserted.PhoneNumber, inserted.Region, inserted.RegistrationNumber,
               inserted.PhysicalAddress, inserted.Content, inserted.ProfilePicUrl,
               inserted.CompanyAddress, ${hasDisabled ? 'inserted.Disabled' : 'CAST(0 AS bit) AS Disabled'}, inserted.LocationLat, inserted.LocationLng,
               inserted.CreatedAt, inserted.UpdatedAt
        WHERE Id = @Id
      `);

    const updated = result.recordset[0];
    if (!updated) return res.status(404).json({ message: 'Not found' });
    return res.json(updated);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to update user' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isGuid(id)) return res.status(400).json({ message: 'Invalid Id' });

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('Id', sql.UniqueIdentifier, id)
      .query('DELETE FROM dbo.Users WHERE Id = @Id');

    if (result.rowsAffected?.[0] === 0) {
      return res.status(404).json({ message: 'Not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete user' });
  }
});

module.exports = router;

