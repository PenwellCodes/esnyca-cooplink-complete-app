const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sql, getPool } = require('../db');
const { uploadBufferToImageBB } = require('../services/imagebb');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

async function getUserByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const pool = await getPool();
  const result = await pool
    .request()
    .input('Email', sql.NVarChar(320), normalizedEmail)
    .query(`
      SELECT TOP 1
        Id, Email, Role, DisplayName, RegistrationNumber, PasswordHash, CreatedAt, UpdatedAt
      FROM dbo.Users
      WHERE LOWER(Email) = LOWER(@Email)
      ORDER BY UpdatedAt DESC, CreatedAt DESC
    `);
  return result.recordset?.[0] || null;
}

exports.registerUser = async (req, res) => {
  const {
    email,
    password,
    role,
    displayName,
    phoneNumber,
    region,
    registrationNumber,
    physicalAddress,
    content,
    companyAddress,
    locationLat,
    locationLng,
  } = req.body;

  if (!email || !password || !displayName) {
    return res
      .status(400)
      .json({ message: 'email, password and displayName are required' });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const pool = await getPool();

    const existing = await pool
      .request()
      .input('Email', sql.NVarChar(320), normalizedEmail)
      .query('SELECT TOP 1 Id FROM dbo.Users WHERE LOWER(Email) = LOWER(@Email)');

    if (existing.recordset.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const profilePicUrl = req.file
      ? await uploadBufferToImageBB(req.file.buffer, req.file.originalname)
      : null;

    const created = await pool
      .request()
      .input('Email', sql.NVarChar(320), normalizedEmail)
      .input('PasswordHash', sql.NVarChar(255), passwordHash)
      .input('Role', sql.NVarChar(32), role || 'individual')
      .input('DisplayName', sql.NVarChar(120), displayName)
      .input('PhoneNumber', sql.NVarChar(40), phoneNumber || null)
      .input('Region', sql.NVarChar(40), region || null)
      .input(
        'RegistrationNumber',
        sql.NVarChar(80),
        registrationNumber || null,
      )
      .input(
        'PhysicalAddress',
        sql.NVarChar(255),
        physicalAddress || null,
      )
      .input('Content', sql.NVarChar(sql.MAX), content || null)
      .input('ProfilePicUrl', sql.NVarChar(2048), profilePicUrl)
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
      )
      .query(`
        INSERT INTO dbo.Users
          (Email, PasswordHash, Role, DisplayName, PhoneNumber, Region, RegistrationNumber,
           PhysicalAddress, Content, ProfilePicUrl, CompanyAddress, LocationLat, LocationLng)
        OUTPUT inserted.Id, inserted.Email, inserted.Role, inserted.DisplayName, inserted.ProfilePicUrl,
               inserted.PhoneNumber, inserted.Region, inserted.RegistrationNumber,
               inserted.PhysicalAddress, inserted.Content, inserted.CompanyAddress,
               inserted.LocationLat, inserted.LocationLng, inserted.CreatedAt, inserted.UpdatedAt
        VALUES
          (@Email, @PasswordHash, @Role, @DisplayName, @PhoneNumber, @Region, @RegistrationNumber,
           @PhysicalAddress, @Content, @ProfilePicUrl, @CompanyAddress, @LocationLat, @LocationLng)
      `);

    const user = created.recordset[0];
    return res.status(201).json({
      status: 'success',
      token: generateToken(user.Id),
      user,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: 'Registration failed' });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const pool = await getPool();
    const result = await pool
      .request()
      .input('Email', sql.NVarChar(320), normalizedEmail)
      .query(`
        SELECT
          Id, Email, PasswordHash, Role, DisplayName, ProfilePicUrl,
          PhoneNumber, Region, RegistrationNumber, PhysicalAddress, Content,
          CompanyAddress, LocationLat, LocationLng, CreatedAt, UpdatedAt
        FROM dbo.Users
        WHERE LOWER(Email) = LOWER(@Email)
        ORDER BY UpdatedAt DESC, CreatedAt DESC
      `);

    const users = result.recordset || [];
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // In case multiple rows exist for the same email in legacy data,
    // authenticate against the first row whose hash matches.
    let matchedUser = null;
    for (const candidate of users) {
      if (!candidate?.PasswordHash) continue;
      // eslint-disable-next-line no-await-in-loop
      const ok = await bcrypt.compare(password, candidate.PasswordHash);
      if (ok) {
        matchedUser = candidate;
        break;
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Do not return PasswordHash
    // eslint-disable-next-line no-unused-vars
    const { PasswordHash, ...safeUser } = matchedUser;

    return res.json({
      status: 'success',
      token: generateToken(matchedUser.Id),
      user: safeUser,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: 'Login failed' });
  }
};

exports.getForgotPasswordQuestions = async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ message: 'email is required' });
  }

  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const questions = [
      {
        key: 'displayName',
        label: 'What is your display name?',
      },
      {
        key: 'role',
        label: 'What is your account role? (admin/superadmin/cooperative/individual)',
      },
    ];

    if (String(user.Role || '').toLowerCase() === 'cooperative') {
      questions.push({
        key: 'registrationNumber',
        label: 'What is your cooperative registration number?',
      });
    }

    return res.json({
      status: 'success',
      questions,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: 'Failed to load reset questions' });
  }
};

exports.resetPasswordWithQuestions = async (req, res) => {
  const { email, answers, newPassword } = req.body || {};
  if (!email || !answers || typeof answers !== 'object' || !newPassword) {
    return res.status(400).json({ message: 'email, answers and newPassword are required' });
  }
  if (String(newPassword).trim().length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  }

  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const submittedDisplayName = String(answers.displayName || '').trim().toLowerCase();
    const submittedRole = String(answers.role || '').trim().toLowerCase();
    const submittedRegistration = String(answers.registrationNumber || '').trim().toLowerCase();

    const expectedDisplayName = String(user.DisplayName || '').trim().toLowerCase();
    const expectedRole = String(user.Role || '').trim().toLowerCase();
    const expectedRegistration = String(user.RegistrationNumber || '').trim().toLowerCase();

    if (!submittedDisplayName || submittedDisplayName !== expectedDisplayName) {
      return res.status(401).json({ message: 'Security answers are incorrect' });
    }
    if (!submittedRole || submittedRole !== expectedRole) {
      return res.status(401).json({ message: 'Security answers are incorrect' });
    }
    if (expectedRole === 'cooperative' && submittedRegistration !== expectedRegistration) {
      return res.status(401).json({ message: 'Security answers are incorrect' });
    }

    const passwordHash = await bcrypt.hash(String(newPassword).trim(), 10);
    const pool = await getPool();
    await pool
      .request()
      .input('Id', sql.UniqueIdentifier, user.Id)
      .input('PasswordHash', sql.NVarChar(255), passwordHash)
      .query(`
        UPDATE dbo.Users
        SET PasswordHash = @PasswordHash, UpdatedAt = SYSUTCDATETIME()
        WHERE Id = @Id
      `);

    return res.json({ status: 'success', message: 'Password reset successful' });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: 'Failed to reset password' });
  }
};
