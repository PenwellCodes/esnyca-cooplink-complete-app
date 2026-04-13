const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { registerUserPushToken } = require('../services/pushNotifications');

const router = express.Router();

router.post('/register-token', requireAuth, async (req, res) => {
  const token = String(req.body?.token || '').trim();
  if (!token) return res.status(400).json({ message: 'token is required' });

  try {
    await registerUserPushToken(req.user.Id, token);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to register push token' });
  }
});

module.exports = router;
