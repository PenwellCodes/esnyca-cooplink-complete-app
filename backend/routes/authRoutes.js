const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// --- THE ENDPOINTS ---

// 1. POST /api/auth/register (Handles Data + Profile Image)
router.post('/register', upload.single('profilePic'), registerUser);

// 2. POST /api/auth/login (Handles Email/Password)
router.post('/login', loginUser);

module.exports = router;
