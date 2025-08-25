const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: false }, // Optional for OAuth users
  name: { type: String },
  authMethod: { type: String, enum: ['email', 'google', 'facebook'], default: 'email' }, // Track auth method
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  roles: { type: [String], default: ['user'] },
  isActive: { type: Boolean, default: true },
  twoFAEnabled: { type: Boolean, default: false },
  twoFASecret: { type: String },
  kycStatus: { type: String, default: 'pending' }
});

module.exports = mongoose.model('User', userSchema);
