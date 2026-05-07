const bcrypt = require('bcryptjs');
const axios = require('axios');
const { sql, getPool } = require('../db');
const { uploadBufferToImageBB } = require('../services/imagebb');

async function getUserByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  try {
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
  } catch (error) {
    // Database connection failed - return null to allow Firebase fallback
    // eslint-disable-next-line no-console
    console.warn('SQL Server connection failed, will use Firebase as fallback:', error.message);
    return null;
  }
}

async function getUserByEmailSafe(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  try {
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
    return { user: result.recordset?.[0] || null, dbError: false };
  } catch (error) {
    // Database connection failed; continue using Firebase fallback.
    // eslint-disable-next-line no-console
    console.warn('SQL Server connection failed, continuing with Firebase fallback:', error.message);
    return { user: null, dbError: true };
  }
}

async function verifyWithFirebase(email, password) {
  const firebaseWebApiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!firebaseWebApiKey) return false;

  try {
    await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(
        firebaseWebApiKey,
      )}`,
      {
        email: String(email || '').trim().toLowerCase(),
        password: String(password || ''),
        returnSecureToken: true,
      },
    );
    return true;
  } catch (_error) {
    return false;
  }
}

function buildTemporaryPassword() {
  return `Tmp#${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

async function sendFirebaseResetEmail(firebaseWebApiKey, normalizedEmail) {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
    const resetUrl = `${frontendUrl}/confirm-password-reset`;

    // eslint-disable-next-line no-console
    console.log(`Sending Firebase reset email to: ${normalizedEmail}`);
    // eslint-disable-next-line no-console
    console.log(`Reset URL configured: ${resetUrl}`);

    await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(
        firebaseWebApiKey,
      )}`,
      {
        requestType: 'PASSWORD_RESET',
        email: normalizedEmail,
        // Custom action code settings for Esnyca App branding
        actionCodeSettings: {
          url: resetUrl,
          handleCodeInApp: false,
          dynamicLinkDomain: undefined,
        },
      },
    );
    // eslint-disable-next-line no-console
    console.log(`Firebase reset email request sent for: ${normalizedEmail}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Firebase reset email failed for ${normalizedEmail}:`, error.message);
    throw error;
  }
}

async function createFirebaseUserIfMissing(firebaseWebApiKey, normalizedEmail) {
  try {
    await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(
        firebaseWebApiKey,
      )}`,
      {
        email: normalizedEmail,
        password: buildTemporaryPassword(),
        returnSecureToken: true,
      },
    );
    // eslint-disable-next-line no-console
    console.log(`Firebase user created for ${normalizedEmail}`);
    return true;
  } catch (error) {
    const errorCode =
      error?.response?.data?.error?.message ||
      error?.response?.data?.error?.errors?.[0]?.message ||
      '';
    // eslint-disable-next-line no-console
    console.log(`Firebase user creation attempt for ${normalizedEmail}: ${errorCode}`);
    if (errorCode === 'EMAIL_EXISTS') {
      return true;
    }
    // eslint-disable-next-line no-console
    console.error(`Firebase user creation failed for ${normalizedEmail}:`, errorCode || error.message);
    return false;
  }
}

async function checkFirebaseUserExists(firebaseWebApiKey, normalizedEmail) {
  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${encodeURIComponent(
        firebaseWebApiKey,
      )}`,
      {
        identifier: normalizedEmail,
        continueUri: 'http://localhost',
      },
    );
    const exists = Boolean(response?.data?.registered);
    // eslint-disable-next-line no-console
    console.log(`Firebase user check for ${normalizedEmail}: ${exists ? 'EXISTS' : 'NOT_FOUND'}`);
    return exists;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Firebase user check failed for ${normalizedEmail}:`, error.message);
    return false;
  }
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

  const normalizedEmail = String(email).trim().toLowerCase();
  // eslint-disable-next-line no-console
  console.log(`Login attempt for: ${normalizedEmail}`);

  let sqlUser = null;
  let sqlAuthSuccess = false;
  let sqlConnectionFailed = false;

  // Step 1: Try SQL authentication first
  try {
    // eslint-disable-next-line no-console
    console.log('Trying SQL authentication...');
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
    // eslint-disable-next-line no-console
    console.log(`Found ${users.length} users in SQL for ${normalizedEmail}`);

    if (users.length > 0) {
      sqlUser = users[0]; // Use the most recent user

      // Try to authenticate with SQL password
      if (sqlUser.PasswordHash) {
        sqlAuthSuccess = await bcrypt.compare(password, sqlUser.PasswordHash);
        // eslint-disable-next-line no-console
        console.log(`SQL authentication result: ${sqlAuthSuccess ? 'SUCCESS' : 'FAILED'}`);
      } else {
        // eslint-disable-next-line no-console
        console.log(`SQL user ${sqlUser.Id} has no password hash`);
      }
    }
  } catch (sqlError) {
    sqlConnectionFailed = true;
    // eslint-disable-next-line no-console
    console.warn('SQL Server connection failed, will use Firebase as fallback:', sqlError.message);
  }

  // Step 2: If SQL auth succeeded, use SQL user
  if (sqlAuthSuccess && sqlUser) {
    const normalizedRole = String(sqlUser.Role || sqlUser.role || '').trim().toLowerCase();
    const isAdmin = normalizedRole === 'admin' || normalizedRole === 'superadmin';

    // Do not return PasswordHash
    // eslint-disable-next-line no-unused-vars
    const { PasswordHash, ...safeUser } = sqlUser;

    return res.json({
      status: 'success',
      user: safeUser,
      role: normalizedRole,
      isAdmin,
      authMethod: 'sql',
    });
  }

  // Step 3: Try Firebase authentication (either SQL failed or no SQL user found)
  // eslint-disable-next-line no-console
  console.log(`Trying Firebase authentication for ${normalizedEmail}`);
  const firebaseOk = await verifyWithFirebase(normalizedEmail, password);
  // eslint-disable-next-line no-console
  console.log(`Firebase authentication result: ${firebaseOk ? 'SUCCESS' : 'FAILED'}`);

  if (!firebaseOk) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  // Step 4: Firebase auth succeeded, now handle user data
  let finalUser = sqlUser;

  // If we have SQL user but no password hash (or connection failed), sync the password
  if (sqlUser && !sqlConnectionFailed) {
    try {
      const passwordHash = await bcrypt.hash(String(password), 10);
      const pool = await getPool();
      await pool
        .request()
        .input('Id', sql.UniqueIdentifier, sqlUser.Id)
        .input('PasswordHash', sql.NVarChar(255), passwordHash)
        .query(`
          UPDATE dbo.Users
          SET PasswordHash = @PasswordHash, UpdatedAt = SYSUTCDATETIME()
          WHERE Id = @Id
        `);
      finalUser = { ...sqlUser, PasswordHash: passwordHash };
      // eslint-disable-next-line no-console
      console.log(`Password synced to SQL for user: ${normalizedEmail}`);
    } catch (syncError) {
      // If sync fails, still allow login since Firebase auth succeeded
      // eslint-disable-next-line no-console
      console.error(`Failed to sync password to SQL for ${normalizedEmail}:`, syncError.message);
      finalUser = { ...sqlUser, PasswordHash: null };
    }
  } else if (!sqlUser) {
    // No SQL user found, create a minimal user object for Firebase-only auth
    finalUser = {
      Id: `firebase-${Date.now()}`, // Temporary ID
      Email: normalizedEmail,
      Role: 'individual', // Default role
      DisplayName: normalizedEmail.split('@')[0], // Use email prefix as display name
      PasswordHash: null, // No SQL hash for Firebase-only users
    };
    // eslint-disable-next-line no-console
    console.log(`Created temporary user object for Firebase-only auth: ${normalizedEmail}`);
  }

  const normalizedRole = String(finalUser.Role || finalUser.role || '').trim().toLowerCase();
  const isAdmin = normalizedRole === 'admin' || normalizedRole === 'superadmin';

  // Do not return PasswordHash
  // eslint-disable-next-line no-unused-vars
  const { PasswordHash, ...safeUser } = finalUser;

  return res.json({
    status: 'success',
    user: safeUser,
    role: normalizedRole,
    isAdmin,
    authMethod: sqlConnectionFailed ? 'firebase_fallback' : 'firebase',
  });
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

exports.sendForgotPasswordEmail = async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ message: 'email is required' });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const firebaseWebApiKey = process.env.FIREBASE_WEB_API_KEY;
    
    // eslint-disable-next-line no-console
    console.log(`Processing forgot password for: ${normalizedEmail}`);
    // eslint-disable-next-line no-console
    console.log(`Firebase API Key configured: ${firebaseWebApiKey ? 'YES' : 'NO'}`);
    
    const { user: existingSqlUser, dbError } = await getUserByEmailSafe(normalizedEmail);

    if (!firebaseWebApiKey) {
      return res
        .status(500)
        .json({ message: 'FIREBASE_WEB_API_KEY is not configured on server' });
    }

    const firebaseUserExists = await checkFirebaseUserExists(
      firebaseWebApiKey,
      normalizedEmail,
    );

    // eslint-disable-next-line no-console
    console.log(`SQL user found: ${existingSqlUser ? 'YES' : 'NO'}, Firebase user found: ${firebaseUserExists ? 'YES' : 'NO'}, DB error: ${dbError ? 'YES' : 'NO'}`);

    // If we know the email is absent from both SQL and Firebase, return 404.
    if (!existingSqlUser && !firebaseUserExists && !dbError) {
      return res.status(404).json({ message: 'No account found for that email' });
    }

    if (existingSqlUser && !firebaseUserExists) {
      const created = await createFirebaseUserIfMissing(
        firebaseWebApiKey,
        normalizedEmail,
      );
      if (!created) {
        return res
          .status(500)
          .json({ message: 'Failed to prepare Firebase reset account' });
      }
    }

    await sendFirebaseResetEmail(firebaseWebApiKey, normalizedEmail);

    // eslint-disable-next-line no-console
    console.log(`Password reset email sent successfully for: ${normalizedEmail}`);

    return res.json({
      status: 'success',
      message: 'Password reset email sent. Check your inbox.',
    });
  } catch (error) {
    const errorCode =
      error?.response?.data?.error?.message ||
      error?.response?.data?.error?.errors?.[0]?.message ||
      '';

    if (errorCode === 'OPERATION_NOT_ALLOWED') {
      return res.status(500).json({
        message:
          'Firebase Email/Password sign-in is disabled. Enable it in Firebase Authentication.',
      });
    }

    if (errorCode === 'EMAIL_NOT_FOUND') {
      return res.status(404).json({ message: 'No account found for that email' });
    }

    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: 'Failed to send password reset email' });
  }
};

exports.resetPasswordWithToken = async (req, res) => {
  const { oobCode, newPassword } = req.body;

  if (!oobCode || !newPassword) {
    return res.status(400).json({ message: 'oobCode and newPassword are required' });
  }

  try {
    // First, confirm the password reset with Firebase
    const firebaseResponse = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${process.env.FIREBASE_WEB_API_KEY}`,
      {
        oobCode,
        newPassword,
      },
    );

    if (firebaseResponse.data.email) {
      const email = firebaseResponse.data.email;
      // eslint-disable-next-line no-console
      console.log(`Password reset confirmed for Firebase user: ${email}`);

      // Now sync the new password to SQL database
      const { user } = await getUserByEmailSafe(email);
      if (user) {
        try {
          const passwordHash = await bcrypt.hash(String(newPassword), 10);
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
          // eslint-disable-next-line no-console
          console.log(`Password synced to SQL for user: ${email}`);
        } catch (syncError) {
          // eslint-disable-next-line no-console
          console.error(`Failed to sync password to SQL for ${email}:`, syncError.message);
          // Continue anyway since Firebase was updated
        }
      }

      return res.json({
        status: 'success',
        message: 'Password reset successfully',
      });
    } else {
      return res.status(400).json({ message: 'Invalid reset code' });
    }
  } catch (error) {
    const errorCode = error?.response?.data?.error?.message || '';
    // eslint-disable-next-line no-console
    console.error('Password reset error:', errorCode || error.message);
    return res.status(400).json({ message: 'Invalid or expired reset code' });
  }
};

exports.loginUser = async (req, res) => {
  // eslint-disable-next-line no-console
  console.log('🔐 LOGIN REQUEST RECEIVED:', req.body);
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  // eslint-disable-next-line no-console
  console.log(`Login attempt for: ${normalizedEmail}`);

  let sqlUser = null;
  let sqlAuthSuccess = false;
  let sqlConnectionFailed = false;

  // Step 1: Try SQL authentication first
  try {
    // eslint-disable-next-line no-console
    console.log('Trying SQL authentication...');
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
    // eslint-disable-next-line no-console
    console.log(`Found ${users.length} users in SQL for ${normalizedEmail}`);

    if (users.length > 0) {
      sqlUser = users[0]; // Use the most recent user

      // Try to authenticate with SQL password
      if (sqlUser.PasswordHash) {
        sqlAuthSuccess = await bcrypt.compare(password, sqlUser.PasswordHash);
        // eslint-disable-next-line no-console
        console.log(`SQL authentication result: ${sqlAuthSuccess ? 'SUCCESS' : 'FAILED'}`);
      } else {
        // eslint-disable-next-line no-console
        console.log(`SQL user ${sqlUser.Id} has no password hash`);
      }
    }
  } catch (sqlError) {
    sqlConnectionFailed = true;
    // eslint-disable-next-line no-console
    console.warn('SQL Server connection failed, will use Firebase as fallback:', sqlError.message);
  }

  // Step 2: If SQL auth succeeded, use SQL user
  if (sqlAuthSuccess && sqlUser) {
    const normalizedRole = String(sqlUser.Role || sqlUser.role || '').trim().toLowerCase();
    const isAdmin = normalizedRole === 'admin' || normalizedRole === 'superadmin';

    // Do not return PasswordHash
    // eslint-disable-next-line no-unused-vars
    const { PasswordHash, ...safeUser } = sqlUser;

    return res.json({
      status: 'success',
      user: safeUser,
      role: normalizedRole,
      isAdmin,
      authMethod: 'sql',
    });
  }

  // Step 3: Try Firebase authentication (either SQL failed or no SQL user found)
  // eslint-disable-next-line no-console
  console.log(`Trying Firebase authentication for ${normalizedEmail}`);
  const firebaseOk = await verifyWithFirebase(normalizedEmail, password);
  // eslint-disable-next-line no-console
  console.log(`Firebase authentication result: ${firebaseOk ? 'SUCCESS' : 'FAILED'}`);

  if (!firebaseOk) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  // Step 4: Firebase auth succeeded, now handle user data
  let finalUser = sqlUser;

  // If we have SQL user but no password hash (or connection failed), sync the password
  if (sqlUser && !sqlConnectionFailed) {
    try {
      const passwordHash = await bcrypt.hash(String(password), 10);
      const pool = await getPool();
      await pool
        .request()
        .input('Id', sql.UniqueIdentifier, sqlUser.Id)
        .input('PasswordHash', sql.NVarChar(255), passwordHash)
        .query(`
          UPDATE dbo.Users
          SET PasswordHash = @PasswordHash, UpdatedAt = SYSUTCDATETIME()
          WHERE Id = @Id
        `);
      finalUser = { ...sqlUser, PasswordHash: passwordHash };
      // eslint-disable-next-line no-console
      console.log(`Password synced to SQL for user: ${normalizedEmail}`);
    } catch (syncError) {
      // If sync fails, still allow login since Firebase auth succeeded
      // eslint-disable-next-line no-console
      console.error(`Failed to sync password to SQL for ${normalizedEmail}:`, syncError.message);
      finalUser = { ...sqlUser, PasswordHash: null };
    }
  } else if (!sqlUser) {
    // No SQL user found, create a minimal user object for Firebase-only auth
    finalUser = {
      Id: `firebase-${Date.now()}`, // Temporary ID
      Email: normalizedEmail,
      Role: 'individual', // Default role
      DisplayName: normalizedEmail.split('@')[0], // Use email prefix as display name
      PasswordHash: null, // No SQL hash for Firebase-only users
    };
    // eslint-disable-next-line no-console
    console.log(`Created temporary user object for Firebase-only auth: ${normalizedEmail}`);
  }

  const normalizedRole = String(finalUser.Role || finalUser.role || '').trim().toLowerCase();
  const isAdmin = normalizedRole === 'admin' || normalizedRole === 'superadmin';

  // Do not return PasswordHash
  // eslint-disable-next-line no-unused-vars
  const { PasswordHash, ...safeUser } = finalUser;

  return res.json({
    status: 'success',
    user: safeUser,
    role: normalizedRole,
    isAdmin,
    authMethod: sqlConnectionFailed ? 'firebase_fallback' : 'firebase',
  });
};
