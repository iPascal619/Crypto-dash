require('dotenv').config();

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

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptodash')
.then(() => logger.info('MongoDB connected successfully'))
.catch(err => logger.error('MongoDB connection error:', err));

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

// ... Add user, order, wallet, and exchange routes here ...
// User management routes
console.log('Loading auth routes...');
const { router: authRoutes } = require('./routes/auth');
app.use('/api/auth', authRoutes);
console.log('Auth routes loaded');

// Security routes (2FA, KYC)
console.log('Loading security routes...');
const securityRoutes = require('./routes/security');
app.use('/api/security', securityRoutes);
console.log('Security routes loaded');

// Trading/order routes
console.log('Loading order routes...');
const orderRoutes = require('./routes/orders');
app.use('/api/orders', orderRoutes);
console.log('Order routes loaded');

// Wallet management routes
console.log('Loading wallet routes...');
const walletRoutes = require('./routes/wallet');
app.use('/api/wallet', walletRoutes);
console.log('Wallet routes loaded');

// Enhanced wallet routes with real money management
console.log('Loading walletNew routes...');
const walletNewRoutes = require('./routes/walletNew');
app.use('/api/wallet-v2', walletNewRoutes);
console.log('WalletNew routes loaded');

// Live market data routes
console.log('Loading market routes...');
const marketRoutes = require('./routes/market');
app.use('/api/market', marketRoutes);
console.log('Market routes loaded');

// Exchange integration routes
console.log('Loading exchange routes...');
const exchangeRoutes = require('./routes/exchange');
app.use('/api/exchange', exchangeRoutes);
console.log('Exchange routes loaded');

// Coinbase Pro integration routes
console.log('Loading coinbase routes...');
const coinbaseRoutes = require('./routes/coinbase');
app.use('/api/coinbase', coinbaseRoutes);
console.log('Coinbase routes loaded');

// Payment processing routes
console.log('Loading payment routes...');
const paymentRoutes = require('./routes/payment');
app.use('/api/payment', paymentRoutes);
console.log('Payment routes loaded');

// Risk management routes
console.log('Loading risk management routes...');
const riskRoutes = require('./routes/riskManagement');
app.use('/api/risk', riskRoutes);
console.log('Risk management routes loaded');

console.log('All routes loaded successfully');

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => logger.info(`CryptoDash backend running on port ${PORT}`));
