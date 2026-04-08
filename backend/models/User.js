const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  displayName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['individual', 'cooperative'], default: 'individual' },
  profilePic: { type: String }, // Local URL to the uploads folder
  registrationNumber: { type: String, sparse: true, unique: true },
  physicalAddress: String,
  region: String,
}, { timestamps: true });

// Hash password before saving to DGRV server
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', UserSchema);
