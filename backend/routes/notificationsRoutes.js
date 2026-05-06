// backend/routes/notifications.js
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { savePushToken } = require('../services/pushNotifications');

const router = express.Router();
router.use(requireAuth);

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
  } catch (error) {
    console.error('Error registering token:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;