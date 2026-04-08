const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sql, getPool } = require('../db');
const { uploadBufferToImageBB } = require('../services/imagebb');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

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
    const pool = await getPool();

    const existing = await pool
      .request()
      .input('Email', sql.NVarChar(320), email)
      .query('SELECT TOP 1 Id FROM dbo.Users WHERE Email = @Email');

    if (existing.recordset.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const profilePicUrl = req.file
      ? await uploadBufferToImageBB(req.file.buffer, req.file.originalname)
      : null;

    const created = await pool
      .request()
      .input('Email', sql.NVarChar(320), email)
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
    const pool = await getPool();
    const result = await pool
      .request()
      .input('Email', sql.NVarChar(320), email)
      .query(`
        SELECT TOP 1
          Id, Email, PasswordHash, Role, DisplayName, ProfilePicUrl,
          PhoneNumber, Region, RegistrationNumber, PhysicalAddress, Content,
          CompanyAddress, LocationLat, LocationLng, CreatedAt, UpdatedAt
        FROM dbo.Users
        WHERE Email = @Email
      `);

    const user = result.recordset[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(password, user.PasswordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Do not return PasswordHash
    // eslint-disable-next-line no-unused-vars
    const { PasswordHash, ...safeUser } = user;

    return res.json({
      status: 'success',
      token: generateToken(user.Id),
      user: safeUser,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: 'Login failed' });
  }
};
