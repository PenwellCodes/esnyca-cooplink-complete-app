const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  sendForgotPasswordEmail,
  resetPasswordWithToken,
} = require('../controllers/authController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// --- THE ENDPOINTS ---

// 1. POST /api/auth/register (Handles Data + Profile Image)
router.post('/register', upload.single('profilePic'), registerUser);

// 2. POST /api/auth/login (Handles Email/Password)
router.post('/login', loginUser);

// 3. POST /api/auth/forgot-password/email
router.post('/forgot-password/email', sendForgotPasswordEmail);

// 4. POST /api/auth/forgot-password/reset
router.post('/forgot-password/reset', resetPasswordWithToken);

module.exports = router;
