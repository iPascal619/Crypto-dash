// Debug server to identify the crashing module
console.log('🔍 Starting debug server for cryptodash.tech...');

try {
    console.log('Loading basic dependencies...');
    const express = require('express');
    console.log('✅ Express loaded');
    
    const app = express();
    app.use(express.json());
    console.log('✅ Express app initialized');

    // Basic health check
    app.get('/api/health', (req, res) => {
        console.log('Health check hit for cryptodash.tech');
        res.json({ 
            status: 'ok', 
            timestamp: new Date(),
            message: 'CryptoDash.tech debug server running',
            domain: 'cryptodash.tech'
        });
    });

    // Environment variables check
    app.get('/api/env-test', (req, res) => {
        console.log('Environment test requested');
        res.json({
            nodeEnv: process.env.NODE_ENV || 'not set',
            hasMongoUri: !!process.env.MONGODB_URI,
            hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
            hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
            hasJwtSecret: !!process.env.JWT_SECRET,
            port: process.env.PORT || 'not set'
        });
    });

    console.log('Loading environment variables...');
    require('dotenv').config();
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Missing');
    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing');

    console.log('Testing mongoose...');
    const mongoose = require('mongoose');
    console.log('✅ Mongoose loaded');

    // Test mongoose connection with better error handling
    if (process.env.MONGODB_URI) {
        mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log('✅ MongoDB connected successfully');
        })
        .catch(err => {
            console.error('❌ MongoDB connection error:', err.message);
            console.error('MongoDB error details:', err);
        });
    } else {
        console.log('⚠️ MongoDB URI not provided, skipping connection');
    }

    console.log('Testing passport...');
    const passport = require('passport');
    console.log('✅ Passport loaded');

    console.log('Testing User model...');
    const User = require('./backend/models/User');
    console.log('✅ User model loaded');

    console.log('Testing passport config...');
    require('./backend/services/passport');
    console.log('✅ Passport config loaded');

    // Add session middleware for passport
    const session = require('express-session');
    app.use(session({
        secret: process.env.JWT_SECRET || 'fallback-secret',
        resave: false,
        saveUninitialized: false
    }));
    
    app.use(passport.initialize());
    app.use(passport.session());
    console.log('✅ Passport middleware configured');

    console.log('Testing auth routes...');
    const { router: authRoutes } = require('./backend/routes/auth');
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes loaded');

    // Global error handler for better debugging
    app.use((err, req, res, next) => {
        console.error('🚨 OAuth Error:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ 
            error: 'OAuth error', 
            message: err.message,
            details: process.env.NODE_ENV === 'development' ? err.stack : 'Check logs'
        });
    });

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`🚀 CryptoDash.tech debug server running on port ${PORT}`);
    });

} catch (error) {
    console.error('🚨 Error in cryptodash.tech debug server:', error);
    console.error('Stack trace:', error.stack);
}
