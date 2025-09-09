// Super simple OAuth test - just check if Google redirects work
console.log('🔍 Starting super simple OAuth test...');

const express = require('express');
const app = express();

// Basic health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Super simple OAuth test server',
        timestamp: new Date()
    });
});

// Environment check
app.get('/api/env-test', (req, res) => {
    console.log('Environment variables check:');
    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set (length: ' + process.env.GOOGLE_CLIENT_ID.length + ')' : 'Missing');
    console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Set (length: ' + process.env.GOOGLE_CLIENT_SECRET.length + ')' : 'Missing');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    res.json({
        nodeEnv: process.env.NODE_ENV || 'not set',
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasJwtSecret: !!process.env.JWT_SECRET,
        googleClientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
        googleClientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
        callbackUrl: process.env.NODE_ENV === 'production' 
            ? 'https://cryptodash.tech/api/auth/google/callback'
            : 'http://localhost:3001/api/auth/google/callback',
        currentDomain: 'crypto-dash-psi.vercel.app'
    });
});

// Manual Google OAuth URL builder - bypass Passport for testing
app.get('/api/auth/google/login', (req, res) => {
    console.log('🔍 Manual Google OAuth initiated');
    
    if (!process.env.GOOGLE_CLIENT_ID) {
        console.error('❌ GOOGLE_CLIENT_ID not set');
        return res.status(500).json({ error: 'Google Client ID not configured' });
    }
    
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = encodeURIComponent('https://crypto-dash-psi.vercel.app/api/auth/google/callback');
    const scope = encodeURIComponent('profile email');
    const responseType = 'code';
    const state = 'test-state-' + Date.now();
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${redirectUri}&` +
        `scope=${scope}&` +
        `response_type=${responseType}&` +
        `state=${state}`;
    
    console.log('🔍 Redirecting to Google:', googleAuthUrl);
    
    res.redirect(googleAuthUrl);
});

// Simple callback handler
app.get('/api/auth/google/callback', (req, res) => {
    console.log('🔍 Google callback received');
    console.log('Query parameters:', req.query);
    
    if (req.query.error) {
        console.error('❌ Google OAuth error:', req.query.error);
        return res.redirect(`/login.html?error=${req.query.error}&details=${req.query.error_description || 'unknown'}`);
    }
    
    if (req.query.code) {
        console.log('✅ Got authorization code:', req.query.code.substring(0, 20) + '...');
        console.log('✅ State:', req.query.state);
        
        // For now, just redirect to dashboard to test the flow
        res.redirect('/dashboard.html?test=manual_oauth&code_received=true');
    } else {
        console.error('❌ No authorization code received');
        res.redirect('/login.html?error=no_code');
    }
});

// Test Google OAuth configuration
app.get('/api/test-google-config', (req, res) => {
    const config = {
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        clientIdValid: process.env.GOOGLE_CLIENT_ID?.includes('.googleusercontent.com'),
        redirectUri: 'https://crypto-dash-psi.vercel.app/api/auth/google/callback',
        expectedDomains: [
            'crypto-dash-psi.vercel.app',
            'cryptodash.tech'
        ]
    };
    
    res.json(config);
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('🚨 Error:', err);
    res.status(500).json({ 
        error: 'Server error', 
        message: err.message
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Super simple OAuth test server running on port ${PORT}`);
});

module.exports = app;
