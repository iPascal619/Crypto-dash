require('dotenv').config();

// Environment variables check
console.log('🔍 Environment Check:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing');
console.log('');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const winston = require('winston');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const session = require('express-session');
const passport = require('passport');
const path = require('path');

// Initialize Passport configuration
require('./services/passport');

const app = express();
app.use(express.json());

// Configure Helmet with more permissive CSP for development
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "'unsafe-eval'",
        "https://www.gstatic.com",
        "https://apis.google.com",
        "https://accounts.google.com",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://unpkg.com",
        "https://js.stripe.com"
      ],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],
      fontSrc: [
        "'self'", 
        "data:",
        "https://fonts.gstatic.com",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],
      connectSrc: [
        "'self'", 
        "https://api.binance.com",
        "https://api.coinbase.com",
        "https://identitytoolkit.googleapis.com",
        "https://securetoken.googleapis.com",
        "https://api.stripe.com"
      ],
      frameSrc: [
        "'self'", 
        "https://accounts.google.com",
        "https://js.stripe.com",
        "https://hooks.stripe.com"
      ],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

app.use(cors());

// Session middleware for Passport
app.use(session({
  secret: process.env.JWT_SECRET || 'supersecurekey',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Initialize Binance service for real-time price streaming
const binanceService = require('./services/binance');
binanceService.initializePriceStream();

// Serve static files from the parent directory (frontend)
app.use(express.static(require('path').join(__dirname, '..')));

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/app.log' })
  ]
});

// MongoDB connection with better error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptodash')
.then(() => {
    logger.info('MongoDB connected successfully');
    console.log('✅ MongoDB connected successfully');
})
.catch(err => {
    logger.error('MongoDB connection error:', err);
    console.error('❌ MongoDB connection failed:', err.message);
    // Don't exit the process, let other functions work
});

// Health check
app.get('/api/health', (req, res) => {
  console.log('Health check endpoint hit');
  res.json({ status: 'ok', timestamp: new Date() });
});

// Basic ping endpoint for connectivity testing
app.get('/api/ping', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server is running', 
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

console.log('Routes being loaded...');

// Wrap route loading in try-catch for better error handling
try {
    console.log('Loading auth routes...');
    const { router: authRoutes } = require('./routes/auth');
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading auth routes:', error.message);
    logger.error('Auth routes loading failed:', error);
}

try {
    console.log('Loading security routes...');
    const securityRoutes = require('./routes/security');
    app.use('/api/security', securityRoutes);
    console.log('✅ Security routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading security routes:', error.message);
    logger.error('Security routes loading failed:', error);
}

try {
    console.log('Loading order routes...');
    const orderRoutes = require('./routes/orders');
    app.use('/api/orders', orderRoutes);
    console.log('✅ Order routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading order routes:', error.message);
    logger.error('Order routes loading failed:', error);
}

try {
    console.log('Loading wallet routes...');
    const walletRoutes = require('./routes/wallet');
    app.use('/api/wallet', walletRoutes);
    console.log('✅ Wallet routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading wallet routes:', error.message);
    logger.error('Wallet routes loading failed:', error);
}

try {
    console.log('Loading walletNew routes...');
    const walletNewRoutes = require('./routes/walletNew');
    app.use('/api/wallet-v2', walletNewRoutes);
    console.log('✅ WalletNew routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading walletNew routes:', error.message);
    logger.error('WalletNew routes loading failed:', error);
}

try {
    console.log('Loading market routes...');
    const marketRoutes = require('./routes/market');
    app.use('/api/market', marketRoutes);
    console.log('✅ Market routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading market routes:', error.message);
    logger.error('Market routes loading failed:', error);
}

try {
    console.log('Loading exchange routes...');
    const exchangeRoutes = require('./routes/exchange');
    app.use('/api/exchange', exchangeRoutes);
    console.log('✅ Exchange routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading exchange routes:', error.message);
    logger.error('Exchange routes loading failed:', error);
}

try {
    console.log('Loading coinbase routes...');
    const coinbaseRoutes = require('./routes/coinbase');
    app.use('/api/coinbase', coinbaseRoutes);
    console.log('✅ Coinbase routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading coinbase routes:', error.message);
    logger.error('Coinbase routes loading failed:', error);
}

try {
    console.log('Loading payment routes...');
    const paymentRoutes = require('./routes/payment');
    app.use('/api/payment', paymentRoutes);
    console.log('✅ Payment routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading payment routes:', error.message);
    logger.error('Payment routes loading failed:', error);
}

try {
    console.log('Loading risk management routes...');
    const riskRoutes = require('./routes/riskManagement');
    app.use('/api/risk', riskRoutes);
    console.log('✅ Risk management routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading risk management routes:', error.message);
    logger.error('Risk management routes loading failed:', error);
}

console.log('✅ All routes processing completed');

// Global error handler
app.use((err, req, res, next) => {
    console.error('🚨 Unhandled error:', err);
    logger.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error', 
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Promise Rejection:', reason);
    logger.error('Unhandled Promise Rejection:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    logger.error('Uncaught Exception:', error);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 CryptoDash backend running on port ${PORT}`);
    logger.info(`CryptoDash backend running on port ${PORT}`);
});
