require('dotenv').config(); // Loads your .env file
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Connect to MongoDB on the DGRV Server
connectDB();

const app = express();

// Middleware
app.use(cors()); // Allows your mobile app to talk to this server
app.use(express.json()); // Allows the server to read JSON data

// MAKE THE UPLOADS FOLDER PUBLIC
// This lets the app view images at: http://YOUR_IP:3000/uploads/filename.jpg
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- USE THE ROUTES ---
// All auth routes will now start with /api/auth
app.use('/api/auth', require('./routes/authRoutes'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`DGRV API is running on port ${PORT}`);
});
