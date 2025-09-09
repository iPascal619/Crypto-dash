// OAuth test server without MongoDB dependency
console.log('🔍 Starting OAuth test server (no MongoDB)...');

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

// Session middleware
app.use(session({
    secret: process.env.JWT_SECRET || 'test-secret',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// In-memory user storage for testing (replace with MongoDB later)
const users = new Map();

// Passport Google strategy without MongoDB
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'production' 
        ? 'https://cryptodash.tech/api/auth/google/callback'
        : 'http://localhost:3001/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('🔍 Google OAuth profile received:', profile.emails[0].value);
        
        // Store user in memory (no MongoDB)
        const email = profile.emails[0].value;
        const user = {
            id: profile.id,
            email: email,
            name: profile.displayName,
            authMethod: 'google'
        };
        
        users.set(email, user);
        console.log('✅ User stored in memory:', email);
        
        return done(null, user);
    } catch (err) {
        console.error('❌ OAuth error:', err);
        return done(err, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.email);
});

passport.deserializeUser(async (email, done) => {
    const user = users.get(email);
    done(null, user);
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'OAuth test server (no MongoDB)',
        timestamp: new Date()
    });
});

// Environment check
app.get('/api/env-test', (req, res) => {
    res.json({
        nodeEnv: process.env.NODE_ENV || 'not set',
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasJwtSecret: !!process.env.JWT_SECRET,
        mongoStatus: 'Skipped for testing'
    });
});

// Google OAuth routes
app.get('/api/auth/google/login', (req, res, next) => {
    console.log('🔍 Google OAuth login initiated');
    passport.authenticate('google', { 
        scope: ['profile', 'email'] 
    })(req, res, next);
});

app.get('/api/auth/google/callback', 
    (req, res, next) => {
        console.log('🔍 Google OAuth callback received');
        passport.authenticate('google', { failureRedirect: '/login.html' })(req, res, next);
    },
    async (req, res) => {
        try {
            console.log('🔍 Processing OAuth callback for user:', req.user?.email);
            
            // Generate JWT token
            const token = jwt.sign(
                { userId: req.user.id, email: req.user.email },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '7d' }
            );
            
            console.log('✅ Generated JWT token, redirecting to dashboard');
            // Redirect to dashboard with token
            res.redirect(`/dashboard.html?token=${token}&test=true`);
        } catch (err) {
            console.error('❌ OAuth callback error:', err);
            res.redirect('/login.html?error=oauth_failed');
        }
    }
);

// Global error handler
app.use((err, req, res, next) => {
    console.error('🚨 Error:', err);
    res.status(500).json({ 
        error: 'OAuth test error', 
        message: err.message
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 OAuth test server running on port ${PORT}`);
});

module.exports = app;
