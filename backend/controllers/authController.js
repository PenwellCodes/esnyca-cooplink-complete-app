const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// 1. Generate the JWT Token (Security)
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// 2. REGISTER USER (Replaces Firebase signup + addDoc)
exports.registerUser = async (req, res) => {
    const { displayName, email, password, role, registrationNumber, physicalAddress, region } = req.body;

    try {
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const profilePic = req.file ? `http://YOUR_SERVER_IP/apk/uploads/${req.file.filename}` : null;

        const user = await User.create({
            displayName, email, password, role,
            registrationNumber, physicalAddress, region,
            profilePic
        });

        if (user) {
            res.status(201).json({
                status: 'success',
                token: generateToken(user._id),
                user: { id: user._id, displayName: user.displayName, email: user.email, role: user.role }
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 3. LOGIN USER (Replaces Firebase sign-in)
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                status: 'success',
                token: generateToken(user._id),
                user: { id: user._id, displayName: user.displayName, role: user.role }
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
