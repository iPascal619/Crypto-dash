const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { 
    type: String, 
    required: true,
    enum: ['credit_card', 'debit_card', 'bank_account', 'paypal', 'crypto_wallet', 'wire_transfer']
  },
  provider: {
    type: String,
    required: true,
    enum: ['stripe', 'paypal', 'plaid', 'coinbase', 'binance', 'bank_wire']
  },
  isDefault: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  
  // Encrypted payment details
  encryptedData: { type: String, required: true }, // Encrypted payment method details
  lastFourDigits: { type: String }, // For display purposes
  expiryDate: { type: String }, // For cards
  
  // Provider-specific data
  providerPaymentMethodId: { type: String }, // Stripe payment method ID, PayPal billing agreement, etc.
  providerCustomerId: { type: String }, // Stripe customer ID, PayPal payer ID, etc.
  
  // Bank account specific
  bankName: { type: String },
  accountType: { type: String, enum: ['checking', 'savings'] },
  routingNumber: { type: String }, // First 4 digits only for display
  
  // Credit/Debit card specific
  cardBrand: { type: String }, // visa, mastercard, amex, etc.
  cardType: { type: String, enum: ['credit', 'debit'] },
  
  // Verification status
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'failed', 'requires_action'],
    default: 'pending'
  },
  verificationDate: { type: Date },
  verificationAttempts: { type: Number, default: 0 },
  
  // Limits and restrictions
  dailyLimit: { type: Number, default: 10000 }, // USD
  monthlyLimit: { type: Number, default: 100000 }, // USD
  perTransactionLimit: { type: Number, default: 5000 }, // USD
  
  // Security
  isActive: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },
  suspensionReason: { type: String },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastUsed: { type: Date },
  usageCount: { type: Number, default: 0 }
});

const transactionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  transactionId: { type: String, required: true, unique: true },
  
  // Transaction details
  type: {
    type: String,
    required: true,
    enum: ['deposit', 'withdrawal', 'trade', 'fee', 'refund', 'chargeback', 'transfer']
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'disputed', 'refunded'],
    default: 'pending'
  },
  
  // Amount details
  amount: { type: Number, required: true }, // Original amount
  currency: { type: String, required: true }, // USD, EUR, BTC, etc.
  amountUSD: { type: Number, required: true }, // Converted to USD for reporting
  
  // Fee breakdown
  fees: {
    platform: { type: Number, default: 0 },
    payment: { type: Number, default: 0 },
    network: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  
  // Payment method used
  paymentMethodId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentMethod' },
  paymentProvider: { type: String },
  
  // Provider transaction details
  providerTransactionId: { type: String }, // Stripe payment intent, PayPal transaction I
  providerStatus: { type: String },
  providerFees: { type: Number, default: 0 },
  
  // Risk assessment
  riskScore: { type: Number, min: 0, max: 100 }, // 0 = low risk, 100 = high risk
  riskFactors: [{ type: String }], // Array of risk indicators
  isHighRisk: { type: Boolean, default: false },
  requiresManualReview: { type: Boolean, default: false },
  
  // Compliance and verification
  kycRequired: { type: Boolean, default: false },
  kycCompleted: { type: Boolean, default: false },
  amlCheck: {
    status: { type: String, enum: ['pending', 'passed', 'failed', 'manual_review'] },
    score: { type: Number },
    checkedAt: { type: Date }
  },
  
  // Geographic and device information
  ipAddress: { type: String },
  country: { type: String },
  region: { type: String },
  deviceFingerprint: { type: String },
  userAgent: { type: String },
  
  // Processing details
  processingStarted: { type: Date },
  processingCompleted: { type: Date },
  estimatedCompletion: { type: Date },
  
  // Error handling
  errorCode: { type: String },
  errorMessage: { type: String },
  retryCount: { type: Number, default: 0 },
  
  // Notifications
  userNotified: { type: Boolean, default: false },
  emailSent: { type: Boolean, default: false },
  smsNotified: { type: Boolean, default: false },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  
  // Additional context
  description: { type: String },
  internalNotes: [{ 
    note: String, 
    addedBy: String, 
    addedAt: { type: Date, default: Date.now } 
  }]
});

// Indexes for performance
paymentMethodSchema.index({ userId: 1, isActive: 1 });
paymentMethodSchema.index({ userId: 1, isDefault: 1 });
paymentMethodSchema.index({ providerPaymentMethodId: 1 });

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ isHighRisk: 1, requiresManualReview: 1 });

// Update timestamp on save
paymentMethodSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

transactionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Payment method methods
paymentMethodSchema.methods.markAsUsed = function() {
  this.lastUsed = new Date();
  this.usageCount += 1;
  return this.save();
};

paymentMethodSchema.methods.suspend = function(reason) {
  this.isSuspended = true;
  this.suspensionReason = reason;
  this.isActive = false;
  return this.save();
};

paymentMethodSchema.methods.reactivate = function() {
  this.isSuspended = false;
  this.suspensionReason = null;
  this.isActive = true;
  return this.save();
};

// Transaction methods
transactionSchema.methods.updateStatus = function(newStatus, additionalData = {}) {
  this.status = newStatus;
  this.updatedAt = new Date();
  
  if (newStatus === 'completed') {
    this.completedAt = new Date();
    this.processingCompleted = new Date();
  }
  
  // Update additional fields if provided
  Object.assign(this, additionalData);
  
  return this.save();
};

transactionSchema.methods.addInternalNote = function(note, addedBy) {
  this.internalNotes.push({
    note,
    addedBy,
    addedAt: new Date()
  });
  return this.save();
};

transactionSchema.methods.calculateRiskScore = function() {
  let score = 0;
  const factors = [];
  
  // Amount-based risk
  if (this.amountUSD > 10000) {
    score += 20;
    factors.push('high_amount');
  }
  if (this.amountUSD > 50000) {
    score += 30;
    factors.push('very_high_amount');
  }
  
  // New user risk
  if (this.usageCount < 5) {
    score += 15;
    factors.push('new_user');
  }
  
  // Geographic risk (simplified)
  const highRiskCountries = ['VPN', 'Unknown', 'TOR'];
  if (highRiskCountries.includes(this.country)) {
    score += 25;
    factors.push('high_risk_geography');
  }
  
  // Time-based risk
  const now = new Date();
  const isOffHours = now.getHours() < 6 || now.getHours() > 22;
  if (isOffHours && this.amountUSD > 5000) {
    score += 10;
    factors.push('off_hours_large_transaction');
  }
  
  this.riskScore = Math.min(100, score);
  this.riskFactors = factors;
  this.isHighRisk = score > 60;
  this.requiresManualReview = score > 80;
  
  return this.save();
};

module.exports = {
  PaymentMethod: mongoose.model('PaymentMethod', paymentMethodSchema),
  Transaction: mongoose.model('Transaction', transactionSchema)
};
