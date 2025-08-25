const express = require('express');
const speakeasy = require('speakeasy');
const User = require('../models/User');
const { requireAuth } = require('./auth');
const router = express.Router();

// Enable 2FA
router.post('/2fa/setup', requireAuth, async (req, res) => {
  const secret = speakeasy.generateSecret();
  await User.findByIdAndUpdate(req.user.userId, { twoFASecret: secret.base32, twoFAEnabled: false });
  res.json({ secret: secret.base32, otpauth_url: secret.otpauth_url });
});

// Verify 2FA code and enable
router.post('/2fa/verify', requireAuth, async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user.userId);
  if (!user || !user.twoFASecret) return res.status(400).json({ error: '2FA not set up' });
  const verified = speakeasy.totp.verify({
    secret: user.twoFASecret,
    encoding: 'base32',
    token
  });
  if (verified) {
    user.twoFAEnabled = true;
    await user.save();
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Invalid 2FA code' });
});

// Disable 2FA
router.post('/2fa/disable', requireAuth, async (req, res) => {
  await User.findByIdAndUpdate(req.user.userId, { twoFAEnabled: false, twoFASecret: null });
  res.json({ success: true });
});

// Update KYC status (admin only)
router.post('/kyc/update', requireAuth, async (req, res) => {
  if (!req.user.roles.includes('admin')) return res.status(403).json({ error: 'Forbidden' });
  const { userId, kycStatus } = req.body;
  await User.findByIdAndUpdate(userId, { kycStatus });
  res.json({ success: true });
});

module.exports = router;
