const axios = require('axios');
const { sql, getPool } = require('../db');

let tableReady = false;

async function ensurePushTable() {
  if (tableReady) return;
  const pool = await getPool();
  await pool.query(`
    IF OBJECT_ID('dbo.UserPushTokens', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.UserPushTokens (
        UserId UNIQUEIDENTIFIER NOT NULL,
        ExpoPushToken NVARCHAR(255) NOT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserPushTokens_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserPushTokens_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_UserPushTokens PRIMARY KEY (UserId, ExpoPushToken),
        CONSTRAINT FK_UserPushTokens_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id)
      );
    END
  `);
  tableReady = true;
}

function isExpoToken(token) {
  return typeof token === 'string' && /^ExponentPushToken\[.+\]$/.test(token);
}

async function registerUserPushToken(userId, token) {
  if (!isExpoToken(token)) return;
  await ensurePushTable();
  const pool = await getPool();
  await pool
    .request()
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('ExpoPushToken', sql.NVarChar(255), token)
    .query(`
      MERGE dbo.UserPushTokens AS target
      USING (SELECT @UserId AS UserId, @ExpoPushToken AS ExpoPushToken) AS source
      ON target.UserId = source.UserId AND target.ExpoPushToken = source.ExpoPushToken
      WHEN MATCHED THEN
        UPDATE SET UpdatedAt = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (UserId, ExpoPushToken) VALUES (source.UserId, source.ExpoPushToken);
    `);
}

async function getTokensForUsers(userIds) {
  const ids = (userIds || []).filter(Boolean);
  if (!ids.length) return [];
  await ensurePushTable();
  const pool = await getPool();
  const request = pool.request();
  const placeholders = ids.map((id, idx) => {
    const name = `UserId${idx}`;
    request.input(name, sql.UniqueIdentifier, id);
    return `@${name}`;
  });
  const result = await request.query(`
    SELECT ExpoPushToken
    FROM dbo.UserPushTokens
    WHERE UserId IN (${placeholders.join(',')})
  `);
  return (result.recordset || [])
    .map((row) => row.ExpoPushToken)
    .filter(isExpoToken);
}

async function sendPushToUsers(userIds, payload) {
  const tokens = await getTokensForUsers(userIds);
  if (!tokens.length) return;

  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    title: payload?.title || 'New message',
    body: payload?.body || '',
    data: payload?.data || {},
    priority: 'high',
  }));

  await axios.post('https://exp.host/--/api/v2/push/send', messages, {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });
}

module.exports = {
  registerUserPushToken,
  sendPushToUsers,
};
