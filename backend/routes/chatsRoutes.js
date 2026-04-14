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
      value,
    )
  );
}

// POST /api/chats
// body: { isGroup?: boolean, participantUserIds: string[] }
router.post('/', async (req, res) => {
  const { isGroup, participantUserIds } = req.body || {};
  if (!Array.isArray(participantUserIds) || participantUserIds.length === 0) {
    return res
      .status(400)
      .json({ message: 'participantUserIds is required' });
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
        .query(
          `INSERT INTO dbo.ChatParticipants (ChatId, UserId) VALUES (@ChatId, @UserId)`,
        );
    }

    await tx.commit();
    return res.status(201).json({ ...chat, Participants: participants });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    try {
      // best-effort rollback if tx exists; ignore
      // eslint-disable-next-line no-empty
    } catch {}
    return res.status(500).json({ message: 'Failed to create chat' });
  }
});

// GET /api/chats?userId=...
router.get('/', async (req, res) => {
  const { userId } = req.query;
  if (userId && !isGuid(String(userId))) {
    return res.status(400).json({ message: 'Invalid userId' });
  }

  try {
    const pool = await getPool();
    const request = pool.request();
    let query = `
      SELECT c.Id, c.IsGroup, c.CreatedAt
      FROM dbo.Chats c
    `;
    if (userId) {
      request.input('UserId', sql.UniqueIdentifier, String(userId));
      query += `
        INNER JOIN dbo.ChatParticipants p ON p.ChatId = c.Id
        WHERE p.UserId = @UserId
      `;
    }
    query += ' ORDER BY c.CreatedAt DESC';
    const result = await request.query(query);
    return res.json(result.recordset);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch chats' });
  }
});

// GET /api/chats/:chatId/participants
router.get('/:chatId/participants', async (req, res) => {
  const { chatId } = req.params;
  if (!isGuid(chatId)) return res.status(400).json({ message: 'Invalid chatId' });

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
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch participants' });
  }
});

// POST /api/chats/:chatId/participants
router.post('/:chatId/participants', async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body || {};
  if (!isGuid(chatId)) return res.status(400).json({ message: 'Invalid chatId' });
  if (!isGuid(String(userId))) return res.status(400).json({ message: 'Invalid userId' });

  try {
    const pool = await getPool();
    await pool
      .request()
      .input('ChatId', sql.UniqueIdentifier, chatId)
      .input('UserId', sql.UniqueIdentifier, String(userId))
      .query(
        `INSERT INTO dbo.ChatParticipants (ChatId, UserId) VALUES (@ChatId, @UserId)`,
      );
    return res.status(201).json({ success: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to add participant' });
  }
});

// POST /api/chats/:chatId/messages
router.post('/:chatId/messages', async (req, res) => {
  const { chatId } = req.params;
  if (!isGuid(chatId)) return res.status(400).json({ message: 'Invalid chatId' });

  const { senderUserId, receiverUserId, type, text, fileUrl, fileName } =
    req.body || {};

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
        receiverUserId ? String(receiverUserId) : null,
      )
      .input('Type', sql.NVarChar(16), type || 'text')
      .input('Text', sql.NVarChar(sql.MAX), text || null)
      .input('FileUrl', sql.NVarChar(2048), fileUrl || null)
      .input('FileName', sql.NVarChar(255), fileName || null)
      .query(`
        INSERT INTO dbo.ChatMessages
          (ChatId, SenderUserId, ReceiverUserId, Type, Text, FileUrl, FileName)
        OUTPUT inserted.Id, inserted.ChatId, inserted.SenderUserId, inserted.ReceiverUserId,
               inserted.Type, inserted.Text, inserted.FileUrl, inserted.FileName,
               inserted.CreatedAt, inserted.ReadAt
        VALUES
          (@ChatId, @SenderUserId, @ReceiverUserId, @Type, @Text, @FileUrl, @FileName)
      `);
    const createdMessage = created.recordset[0];

    try {
      let recipientIds = [];
      if (receiverUserId) {
        recipientIds = [String(receiverUserId)];
      } else {
        const participants = await pool
          .request()
          .input('ChatId', sql.UniqueIdentifier, chatId)
          .query('SELECT UserId FROM dbo.ChatParticipants WHERE ChatId = @ChatId');
        recipientIds = (participants.recordset || [])
          .map((row) => String(row.UserId))
          .filter((id) => id !== String(senderUserId));
      }

      if (recipientIds.length) {
        await sendPushToUsers(recipientIds, {
          title: 'New message',
          body: text || (fileUrl ? 'Attachment' : 'You received a new message'),
          data: {
            chatId,
            senderUserId: String(senderUserId),
            receiverUserId: receiverUserId ? String(receiverUserId) : null,
          },
        });
      }
    } catch (pushError) {
      // eslint-disable-next-line no-console
      console.error('Push notification send failed:', pushError);
    }

    return res.status(201).json(createdMessage);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to send message' });
  }
});

// GET /api/chats/:chatId/messages?limit=50
router.get('/:chatId/messages', async (req, res) => {
  const { chatId } = req.params;
  if (!isGuid(chatId)) return res.status(400).json({ message: 'Invalid chatId' });

  const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('ChatId', sql.UniqueIdentifier, chatId)
      .input('Limit', sql.Int, limit)
      .query(`
        SELECT TOP (@Limit)
          Id, ChatId, SenderUserId, ReceiverUserId, Type, Text, FileUrl, FileName,
          CreatedAt, ReadAt
        FROM dbo.ChatMessages
        WHERE ChatId = @ChatId
        ORDER BY CreatedAt DESC
      `);
    return res.json(result.recordset);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// POST /api/chats/:chatId/messages/:messageId/read
router.post('/:chatId/messages/:messageId/read', async (req, res) => {
  const { chatId, messageId } = req.params;
  if (!isGuid(chatId)) return res.status(400).json({ message: 'Invalid chatId' });
  if (!isGuid(messageId)) return res.status(400).json({ message: 'Invalid messageId' });

  try {
    const pool = await getPool();
    const updated = await pool
      .request()
      .input('ChatId', sql.UniqueIdentifier, chatId)
      .input('Id', sql.UniqueIdentifier, messageId)
      .query(`
        UPDATE dbo.ChatMessages
        SET ReadAt = COALESCE(ReadAt, SYSUTCDATETIME())
        OUTPUT inserted.Id, inserted.ChatId, inserted.ReadAt
        WHERE Id = @Id AND ChatId = @ChatId
      `);
    const item = updated.recordset[0];
    if (!item) return res.status(404).json({ message: 'Not found' });
    return res.json(item);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: 'Failed to mark read' });
  }
});

module.exports = router;

