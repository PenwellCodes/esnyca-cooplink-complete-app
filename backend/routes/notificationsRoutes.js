// backend/routes/notifications.js
const express = require('express');
<<<<<<< HEAD
const { requireAuth } = require('../middleware/auth');
const { savePushToken } = require('../services/pushNotifications');
=======
const { registerUserPushToken } = require('../services/pushNotifications');
>>>>>>> 60d420dcd55cb95ba0f677eeb91c22d3e5ff6b24

const router = express.Router();
router.use(requireAuth);

<<<<<<< HEAD
// Register push token
router.post('/register-token', async (req, res) => {
  try {
    const { token, platform } = req.body;
    const userId = req.user.Id;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    await savePushToken(userId, token, platform || 'unknown');
    
    console.log(`✅ Push token registered for user ${userId}`);
    res.json({ success: true });
=======
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
>>>>>>> 60d420dcd55cb95ba0f677eeb91c22d3e5ff6b24
  } catch (error) {
    console.error('Error registering token:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;