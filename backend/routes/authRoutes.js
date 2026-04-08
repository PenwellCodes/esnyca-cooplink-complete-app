const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');
const multer = require('multer');
const path = require('path');

// Configure how images are saved in the 'uploads' folder
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Saves to C:\inetpub\wwwroot\apk\uploads
        cb(null, '../uploads/');
    },
    filename: (req, file, cb) => {
        // Gives each image a unique name using the current timestamp
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// --- THE ENDPOINTS ---

// 1. POST /api/auth/register (Handles Data + Profile Image)
router.post('/register', upload.single('profilePic'), registerUser);

// 2. POST /api/auth/login (Handles Email/Password)
router.post('/login', loginUser);

module.exports = router;
