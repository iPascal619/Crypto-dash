const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3001/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('🔍 Google OAuth profile received:', profile.emails[0].value);
    let user = await User.findOne({ email: profile.emails[0].value });
    if (!user) {
      console.log('🔍 Creating new user for:', profile.emails[0].value);
      user = new User({
        email: profile.emails[0].value,
        name: profile.displayName,
        authMethod: 'google', // Set auth method to google
        roles: ['user'],
        isActive: true,
        kycStatus: 'pending'
        // passwordHash is intentionally omitted for OAuth users
      });
      await user.save();
      console.log('🔍 New user created successfully');
    } else {
      console.log('🔍 Existing user found:', user.email);
      // Update last login time
      user.lastLogin = new Date();
      await user.save();
    }
    return done(null, user);
  } catch (err) {
    console.error('❌ Google OAuth strategy error:', err);
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

module.exports = passport;
