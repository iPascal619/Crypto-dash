// OAuth test for cryptodash.tech ONLY
console.log('🔍 Starting OAuth test for cryptodash.tech...');

const express = require('express');
const app = express();

// Basic health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'CryptoDash.tech OAuth test server',
        domain: 'cryptodash.tech',
        timestamp: new Date()
    });
});

// Environment check - cryptodash.tech focused
app.get('/api/env-test', (req, res) => {
    console.log('Environment variables check for cryptodash.tech:');
    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set (length: ' + process.env.GOOGLE_CLIENT_ID.length + ')' : 'Missing');
    console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Set (length: ' + process.env.GOOGLE_CLIENT_SECRET.length + ')' : 'Missing');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    res.json({
        domain: 'cryptodash.tech',
        nodeEnv: process.env.NODE_ENV || 'not set',
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasJwtSecret: !!process.env.JWT_SECRET,
        googleClientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
        googleClientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
        callbackUrl: 'https://cryptodash.tech/api/auth/google/callback',
        requiredInGoogleConsole: [
            'Authorized JavaScript origins: https://cryptodash.tech',
            'Authorized redirect URIs: https://cryptodash.tech/api/auth/google/callback'
        ]
    });
});

// Google OAuth for cryptodash.tech ONLY
app.get('/api/auth/google/login', (req, res) => {
    console.log('🔍 Google OAuth initiated for cryptodash.tech');
    
    if (!process.env.GOOGLE_CLIENT_ID) {
        console.error('❌ GOOGLE_CLIENT_ID not set');
        return res.status(500).json({ 
            error: 'Google Client ID not configured',
            message: 'Please set GOOGLE_CLIENT_ID in Vercel environment variables'
        });
    }
    
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = encodeURIComponent('https://cryptodash.tech/api/auth/google/callback');
    const scope = encodeURIComponent('profile email');
    const responseType = 'code';
    const state = 'cryptodash-' + Date.now();
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${redirectUri}&` +
        `scope=${scope}&` +
        `response_type=${responseType}&` +
        `state=${state}`;
    
    console.log('🔍 Redirecting to Google with cryptodash.tech callback');
    console.log('Callback URL:', 'https://cryptodash.tech/api/auth/google/callback');
    
    res.redirect(googleAuthUrl);
});

// Callback handler for cryptodash.tech
app.get('/api/auth/google/callback', (req, res) => {
    console.log('🔍 Google callback received at cryptodash.tech');
    console.log('Query parameters:', req.query);
    
    if (req.query.error) {
        console.error('❌ Google OAuth error:', req.query.error);
        console.error('Error description:', req.query.error_description);
        
        return res.redirect(`/login.html?error=${req.query.error}&details=${req.query.error_description || 'OAuth failed'}&domain=cryptodash.tech`);
    }
    
    if (req.query.code) {
        console.log('✅ Got authorization code from Google');
        console.log('✅ State:', req.query.state);
        console.log('✅ OAuth flow successful for cryptodash.tech');
        
        // Success - redirect to dashboard
        res.redirect('/dashboard.html?success=oauth_complete&domain=cryptodash.tech&code=received');
    } else {
        console.error('❌ No authorization code received from Google');
        res.redirect('/login.html?error=no_code&domain=cryptodash.tech');
    }
});

// Test configuration specifically for cryptodash.tech
app.get('/api/test-config', (req, res) => {
    const config = {
        domain: 'cryptodash.tech',
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        clientIdValid: process.env.GOOGLE_CLIENT_ID?.includes('.googleusercontent.com'),
        callbackUrl: 'https://cryptodash.tech/api/auth/google/callback',
        requiredGoogleConsoleSettings: {
            authorizedJavaScriptOrigins: ['https://cryptodash.tech'],
            authorizedRedirectUris: ['https://cryptodash.tech/api/auth/google/callback']
        },
        instructions: [
            '1. Go to Google Cloud Console',
            '2. APIs & Services → Credentials',
            '3. Find your OAuth 2.0 Client ID',
            '4. Add https://cryptodash.tech to Authorized JavaScript origins',
            '5. Add https://cryptodash.tech/api/auth/google/callback to Authorized redirect URIs',
            '6. Save changes'
        ]
    };
    
    res.json(config);
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('🚨 CryptoDash.tech Error:', err);
    res.status(500).json({ 
        error: 'Server error', 
        message: err.message,
        domain: 'cryptodash.tech'
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 CryptoDash.tech OAuth server running on port ${PORT}`);
});

module.exports = app;
