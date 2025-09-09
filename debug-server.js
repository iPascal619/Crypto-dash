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

    console.log('Loading environment variables...');
    require('dotenv').config();
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Missing');
    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing');

    console.log('Testing mongoose...');
    const mongoose = require('mongoose');
    console.log('✅ Mongoose loaded');

    // Test mongoose connection
    if (process.env.MONGODB_URI) {
        mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log('✅ MongoDB connected'))
        .catch(err => console.error('❌ MongoDB error:', err.message));
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

    console.log('Testing auth routes...');
    const { router: authRoutes } = require('./backend/routes/auth');
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes loaded');

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`🚀 CryptoDash.tech debug server running on port ${PORT}`);
    });

} catch (error) {
    console.error('🚨 Error in cryptodash.tech debug server:', error);
    console.error('Stack trace:', error.stack);
}
