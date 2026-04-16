const express = require('express');
const { registerUserPushToken } = require('../services/pushNotifications');

const router = express.Router();

function isGuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      value,
    )
  );
}

router.post('/register-token', async (req, res) => {
  const { userId } = req.body || {};
  const token = String(req.body?.token || '').trim();

  if (!userId) return res.status(400).json({ message: 'userId is required' });
  if (!isGuid(String(userId))) return res.status(400).json({ message: 'Invalid userId' });
  if (!token) return res.status(400).json({ message: 'token is required' });

  try {
    await registerUserPushToken(String(userId), token);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to register push token' });
  }
});

module.exports = router;
