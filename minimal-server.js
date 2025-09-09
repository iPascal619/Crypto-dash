// Minimal test server - absolutely basic
console.log('🔍 Starting minimal test server...');

const express = require('express');
const app = express();

// Super basic health check - no dependencies
app.get('/api/health', (req, res) => {
    console.log('Basic health check hit');
    res.json({ 
        status: 'ok',
        message: 'Minimal server working',
        timestamp: new Date().toISOString()
    });
});

// Test environment variables
app.get('/api/env-test', (req, res) => {
    res.json({
        nodeEnv: process.env.NODE_ENV || 'not set',
        hasMongoUri: !!process.env.MONGODB_URI,
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        port: process.env.PORT || 'not set'
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Minimal server running on port ${PORT}`);
});

module.exports = app;
