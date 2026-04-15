const express = require('express');
const { sql, getPool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendPushToUsers } = require('../services/pushNotifications');

const router = express.Router();
router.use(requireAuth);

function isGuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      value
    )
  );
}

/* =========================
   CREATE CHAT
========================= */
router.post('/', async (req, res) => {
  const { isGroup, participantUserIds } = req.body || {};

  if (!Array.isArray(participantUserIds) || participantUserIds.length === 0) {
    return res.status(400).json({ message: 'participantUserIds is required' });
  }

  const participants = participantUserIds.map(String);

  if (participants.some((id) => !isGuid(id))) {
    return res.status(400).json({ message: 'Invalid participant id' });
  }

  try {
    const pool = await getPool();

    const tx = new sql.Transaction(pool);
    await tx.begin();

    const chatInsert = await new sql.Request(tx)
      .input('IsGroup', sql.Bit, !!isGroup)
      .query(`
        INSERT INTO dbo.Chats (IsGroup)
        OUTPUT inserted.Id, inserted.IsGroup, inserted.CreatedAt
        VALUES (@IsGroup)
      `);

    const chat = chatInsert.recordset[0];

    for (const userId of participants) {
      await new sql.Request(tx)
        .input('ChatId', sql.UniqueIdentifier, chat.Id)
        .input('UserId', sql.UniqueIdentifier, userId)
        .query(`
          INSERT INTO dbo.ChatParticipants (ChatId, UserId)
          VALUES (@ChatId, @UserId)
        `);
    }

    await tx.commit();

    return res.status(201).json({
      ...chat,
      Participants: participants,
    });
  } catch (err) {
    console.error('🔥 CREATE CHAT ERROR:', err);
    return res.status(500).json({
      message: err.message,
    });
  }
});

/* =========================
   GET CHATS (FIXED)
========================= */
router.get('/', async (req, res) => {
  const requestedUserId = req.query.userId ? String(req.query.userId) : null;
  const tokenUserId = req.user?.Id ? String(req.user.Id) : null;

  const effectiveUserId =
    requestedUserId && isGuid(requestedUserId)
      ? requestedUserId
      : tokenUserId && isGuid(tokenUserId)
      ? tokenUserId
      : null;

  try {
    const pool = await getPool();
    const request = pool.request();

    let query = `
      SELECT c.Id, c.IsGroup, c.CreatedAt
      FROM dbo.Chats c
    `;

    if (effectiveUserId) {
      request.input('UserId', sql.UniqueIdentifier, effectiveUserId);

      query += `
        WHERE EXISTS (
          SELECT 1
          FROM dbo.ChatParticipants p
          WHERE p.ChatId = c.Id
          AND p.UserId = @UserId
        )
      `;
    }

    query += ` ORDER BY c.CreatedAt DESC`;

    const result = await request.query(query);
    return res.json(result.recordset);
  } catch (err) {
    console.error('🔥 GET /api/chats ERROR:', err);

    return res.status(500).json({
      message: err.message,
      stack: err.stack,
    });
  }
});

/* =========================
   GET PARTICIPANTS
========================= */
router.get('/:chatId/participants', async (req, res) => {
  const { chatId } = req.params;

  if (!isGuid(chatId)) {
    return res.status(400).json({ message: 'Invalid chatId' });
  }

  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input('ChatId', sql.UniqueIdentifier, chatId)
      .query(`
        SELECT UserId, CreatedAt
        FROM dbo.ChatParticipants
        WHERE ChatId = @ChatId
        ORDER BY CreatedAt ASC
      `);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch participants' });
  }
});

/* =========================
   ADD PARTICIPANT
========================= */
router.post('/:chatId/participants', async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body || {};

  if (!isGuid(chatId)) {
    return res.status(400).json({ message: 'Invalid chatId' });
  }

  if (!isGuid(String(userId))) {
    return res.status(400).json({ message: 'Invalid userId' });
  }

  try {
    const pool = await getPool();

    await pool
      .request()
      .input('ChatId', sql.UniqueIdentifier, chatId)
      .input('UserId', sql.UniqueIdentifier, String(userId))
      .query(`
        INSERT INTO dbo.ChatParticipants (ChatId, UserId)
        VALUES (@ChatId, @UserId)
      `);

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to add participant' });
  }
});

/* =========================
   SEND MESSAGE
========================= */
router.post('/:chatId/messages', async (req, res) => {
  const { chatId } = req.params;
  const {
    senderUserId,
    receiverUserId,
    type,
    text,
    fileUrl,
    fileName,
  } = req.body || {};

  if (!isGuid(chatId)) {
    return res.status(400).json({ message: 'Invalid chatId' });
  }

  if (!isGuid(String(senderUserId))) {
    return res.status(400).json({ message: 'senderUserId is required' });
  }

  if (receiverUserId && !isGuid(String(receiverUserId))) {
    return res.status(400).json({ message: 'Invalid receiverUserId' });
  }

  try {
    const pool = await getPool();

    const created = await pool
      .request()
      .input('ChatId', sql.UniqueIdentifier, chatId)
      .input('SenderUserId', sql.UniqueIdentifier, String(senderUserId))
      .input(
        'ReceiverUserId',
        sql.UniqueIdentifier,
        receiverUserId ? String(receiverUserId) : null
      )
      .input('Type', sql.NVarChar(16), type || 'text')
      .input('Text', sql.NVarChar(sql.MAX), text || null)
      .input('FileUrl', sql.NVarChar(2048), fileUrl || null)
      .input('FileName', sql.NVarChar(255), fileName || null)
      .query(`
        INSERT INTO dbo.ChatMessages
          (ChatId, SenderUserId, ReceiverUserId, Type, Text, FileUrl, FileName)
        OUTPUT inserted.*
        VALUES
          (@ChatId, @SenderUserId, @ReceiverUserId, @Type, @Text, @FileUrl, @FileName)
      `);

    const createdMessage = created.recordset[0];

    return res.status(201).json(createdMessage);
  } catch (err) {
    console.error('🔥 SEND MESSAGE ERROR:', err);
    return res.status(500).json({ message: err.message });
  }
});

/* =========================
   GET MESSAGES
========================= */
router.get('/:chatId/messages', async (req, res) => {
  const { chatId } = req.params;

  if (!isGuid(chatId)) {
    return res.status(400).json({ message: 'Invalid chatId' });
  }

  const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));

  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input('ChatId', sql.UniqueIdentifier, chatId)
      .input('Limit', sql.Int, limit)
      .query(`
        SELECT TOP (@Limit) *
        FROM dbo.ChatMessages
        WHERE ChatId = @ChatId
        ORDER BY CreatedAt DESC
      `);

    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

/* =========================
   MARK AS READ
========================= */
router.post('/:chatId/messages/:messageId/read', async (req, res) => {
  const { chatId, messageId } = req.params;

  if (!isGuid(chatId) || !isGuid(messageId)) {
    return res.status(400).json({ message: 'Invalid IDs' });
  }

  try {
    const pool = await getPool();

    const updated = await pool
      .request()
      .input('ChatId', sql.UniqueIdentifier, chatId)
      .input('Id', sql.UniqueIdentifier, messageId)
      .query(`
        UPDATE dbo.ChatMessages
        SET ReadAt = COALESCE(ReadAt, SYSUTCDATETIME())
        WHERE Id = @Id AND ChatId = @ChatId
      `);

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to mark read' });
  }
});

module.exports = router;