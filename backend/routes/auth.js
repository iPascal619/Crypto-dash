const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecurekey';

// Registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = new User({ 
      email, 
      passwordHash, 
      name,
      authMethod: 'email' // Set auth method for email/password users
    });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });
    
    // Check if user is OAuth user trying to login with email/password
    if (user.authMethod === 'google') {
      return res.status(400).json({ 
        error: 'This account uses Google Sign-In. Please use the Google login button.' 
      });
    }
    
    // Check password for email/password users
    if (!user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    user.lastLogin = new Date();
    await user.save();
    const token = jwt.sign({ userId: user._id, email: user.email, roles: user.roles }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: { email: user.email, name: user.name, roles: user.roles, kycStatus: user.kycStatus } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// JWT Middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing token' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Profile
router.get('/profile', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ 
    email: user.email, 
    name: user.name, 
    roles: user.roles, 
    kycStatus: user.kycStatus,
    authMethod: user.authMethod
  });
});

// Debug endpoint to check if user exists (development only)
router.get('/check-user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });
    res.json({ 
      exists: !!user, 
      user: user ? { 
        email: user.email, 
        name: user.name, 
        createdAt: user.createdAt,
        isActive: user.isActive 
      } : null 
    });
  } catch (err) {
    res.status(500).json({ error: 'Check failed' });
  }
});

// Debug endpoint to check Google OAuth config (development only)
router.get('/oauth-debug', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID ? 'Set ✅' : 'Missing ❌',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Set ✅' : 'Missing ❌',
    callbackUrl: '/api/auth/google/callback',
    loginUrl: '/api/auth/google/login',
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT
  });
});

// Google OAuth routes
router.get('/google/login', (req, res, next) => {
  console.log('🔍 Google OAuth login initiated');
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })(req, res, next);
});

router.get('/google/callback', 
  (req, res, next) => {
    console.log('🔍 Google OAuth callback received');
    passport.authenticate('google', { failureRedirect: '/login.html' })(req, res, next);
  },
  async (req, res) => {
    try {
      console.log('🔍 Processing OAuth callback for user:', req.user?.email);
      // Generate JWT token for the authenticated user
      const token = jwt.sign(
        { userId: req.user._id, email: req.user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      console.log('🔍 Generated JWT token, redirecting to dashboard');
      // Redirect to dashboard with token
      res.redirect(`/dashboard.html?token=${token}`);
    } catch (err) {
      console.error('❌ OAuth callback error:', err);
      res.redirect('/login.html?error=oauth_failed');
    }
  }
);

module.exports = { router, requireAuth };
