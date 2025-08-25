const mongoose = require('mongoose');

const riskProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  
  // Overall risk assessment
  riskLevel: {
    type: String,
    enum: ['very_low', 'low', 'medium', 'high', 'very_high', 'restricted'],
    default: 'medium'
  },
  riskScore: { type: Number, min: 0, max: 100, default: 50 },
  lastAssessment: { type: Date, default: Date.now },
  
  // Trading limits
  limits: {
    // Daily limits
    dailyTradingLimit: { type: Number, default: 50000 }, // USD
    dailyWithdrawalLimit: { type: Number, default: 10000 }, // USD
    dailyDepositLimit: { type: Number, default: 25000 }, // USD
    
    // Position limits
    maxPositionSize: { type: Number, default: 100000 }, // USD per position
    maxOpenPositions: { type: Number, default: 20 },
    maxLeverage: { type: Number, default: 1 }, // 1 = no leverage
    
    // Loss limits
    maxDailyLoss: { type: Number, default: 5000 }, // USD
    maxWeeklyLoss: { type: Number, default: 15000 }, // USD
    maxMonthlyLoss: { type: Number, default: 50000 }, // USD
    
    // Concentration limits
    maxAssetConcentration: { type: Number, default: 50 }, // % of portfolio
    maxSingleTradeSize: { type: Number, default: 10000 }, // USD
  },
  
  // Current usage (rolling)
  currentUsage: {
    dailyTrading: { type: Number, default: 0 },
    dailyWithdrawals: { type: Number, default: 0 },
    dailyDeposits: { type: Number, default: 0 },
    dailyLoss: { type: Number, default: 0 },
    weeklyLoss: { type: Number, default: 0 },
    monthlyLoss: { type: Number, default: 0 },
    openPositions: { type: Number, default: 0 },
    lastReset: { type: Date, default: Date.now }
  },
  
  // Risk factors
  riskFactors: {
    // Account age and activity
    accountAge: { type: Number, default: 0 }, // days
    tradingExperience: { 
      type: String, 
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'beginner'
    },
    verificationLevel: {
      type: String,
      enum: ['none', 'basic', 'enhanced', 'institutional'],
      default: 'none'
    },
    
    // Behavioral factors
    tradingFrequency: { type: Number, default: 0 }, // trades per day average
    averageTradeSize: { type: Number, default: 0 }, // USD
    winRate: { type: Number, default: 0 }, // percentage
    profitLossRatio: { type: Number, default: 0 },
    
    // External factors
    ipReputation: { type: Number, min: 0, max: 100, default: 50 },
    deviceTrust: { type: Number, min: 0, max: 100, default: 50 },
    geographicRisk: { type: Number, min: 0, max: 100, default: 20 },
    
    // Compliance factors
    kycStatus: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected', 'expired'],
      default: 'pending'
    },
    amlRisk: { type: Number, min: 0, max: 100, default: 10 },
    sanctionsCheck: { type: Boolean, default: false },
    pepCheck: { type: Boolean, default: false } // Politically Exposed Person
  },
  
  // Violations and warnings
  violations: [{
    type: { 
      type: String,
      enum: ['limit_breach', 'suspicious_activity', 'policy_violation', 'manual_flag']
    },
    description: { type: String },
    severity: { 
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    date: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    resolvedBy: { type: String },
    actions: [{ type: String }] // Actions taken
  }],
  
  // Monitoring flags
  monitoring: {
    isMonitored: { type: Boolean, default: false },
    monitoringReason: { type: String },
    monitoringStarted: { type: Date },
    isRestricted: { type: Boolean, default: false },
    restrictionReason: { type: String },
    restrictionLevel: {
      type: String,
      enum: ['none', 'trading_suspended', 'withdrawals_suspended', 'account_frozen'],
      default: 'none'
    }
  },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastReview: { type: Date },
  nextReview: { type: Date }
});

const alertSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  alertId: { type: String, required: true, unique: true },
  
  // Alert details
  type: {
    type: String,
    required: true,
    enum: [
      'limit_breach', 'unusual_activity', 'high_risk_transaction',
      'compliance_issue', 'security_alert', 'market_risk',
      'concentration_risk', 'loss_limit_approach'
    ]
  },
  severity: {
    type: String,
    required: true,
    enum: ['info', 'warning', 'high', 'critical'],
    default: 'info'
  },
  status: {
    type: String,
    enum: ['open', 'investigating', 'resolved', 'false_positive'],
    default: 'open'
  },
  
  // Alert content
  title: { type: String, required: true },
  description: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed }, // Flexible object for alert-specific data
  
  // Triggering event
  triggerEvent: {
    type: { type: String }, // transaction, login, trade, etc.
    eventId: { type: String },
    eventData: { type: mongoose.Schema.Types.Mixed }
  },
  
  // Risk assessment
  riskScore: { type: Number, min: 0, max: 100 },
  riskFactors: [{ type: String }],
  
  // Response and resolution
  requiresAction: { type: Boolean, default: false },
  actionRequired: { type: String },
  assignedTo: { type: String },
  escalated: { type: Boolean, default: false },
  escalatedAt: { type: Date },
  escalatedTo: { type: String },
  
  // Resolution
  resolvedAt: { type: Date },
  resolvedBy: { type: String },
  resolution: { type: String },
  actionsTaken: [{ type: String }],
  
  // Notifications
  userNotified: { type: Boolean, default: false },
  adminNotified: { type: Boolean, default: false },
  externalNotified: { type: Boolean, default: false }, // Regulatory reporting
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance
riskProfileSchema.index({ userId: 1 });
riskProfileSchema.index({ riskLevel: 1 });
riskProfileSchema.index({ 'monitoring.isMonitored': 1 });
riskProfileSchema.index({ 'monitoring.isRestricted': 1 });
riskProfileSchema.index({ nextReview: 1 });

alertSchema.index({ userId: 1, createdAt: -1 });
alertSchema.index({ alertId: 1 });
alertSchema.index({ status: 1, severity: 1 });
alertSchema.index({ type: 1, status: 1 });
alertSchema.index({ assignedTo: 1, status: 1 });

// Update timestamp on save
riskProfileSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

alertSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Risk profile methods
riskProfileSchema.methods.assessRisk = function() {
  let score = 0;
  const factors = this.riskFactors;
  
  // Account age risk (newer = higher risk)
  if (factors.accountAge < 30) score += 20;
  else if (factors.accountAge < 90) score += 10;
  
  // Experience level
  const expScores = { beginner: 20, intermediate: 10, advanced: 5, expert: 0 };
  score += expScores[factors.tradingExperience] || 20;
  
  // Verification level
  const verificationScores = { none: 30, basic: 15, enhanced: 5, institutional: 0 };
  score += verificationScores[factors.verificationLevel] || 30;
  
  // Geographic and device risk
  score += (100 - factors.ipReputation) * 0.2;
  score += (100 - factors.deviceTrust) * 0.2;
  score += factors.geographicRisk * 0.3;
  
  // Trading behavior
  if (factors.winRate < 30) score += 15; // Poor performance
  if (factors.averageTradeSize > 50000) score += 10; // Large trades
  if (factors.tradingFrequency > 50) score += 15; // High frequency
  
  // Compliance factors
  if (factors.kycStatus !== 'approved') score += 25;
  score += factors.amlRisk * 0.5;
  if (factors.pepCheck) score += 20;
  
  this.riskScore = Math.min(100, Math.max(0, score));
  
  // Set risk level based on score
  if (this.riskScore < 20) this.riskLevel = 'very_low';
  else if (this.riskScore < 40) this.riskLevel = 'low';
  else if (this.riskScore < 60) this.riskLevel = 'medium';
  else if (this.riskScore < 80) this.riskLevel = 'high';
  else this.riskLevel = 'very_high';
  
  this.lastAssessment = new Date();
  return this.save();
};

riskProfileSchema.methods.checkLimits = function(operation, amount, asset) {
  const violations = [];
  const usage = this.currentUsage;
  const limits = this.limits;
  
  // Check daily limits
  switch (operation) {
    case 'trade':
      if (usage.dailyTrading + amount > limits.dailyTradingLimit) {
        violations.push('daily_trading_limit');
      }
      if (amount > limits.maxSingleTradeSize) {
        violations.push('single_trade_size_limit');
      }
      break;
      
    case 'withdrawal':
      if (usage.dailyWithdrawals + amount > limits.dailyWithdrawalLimit) {
        violations.push('daily_withdrawal_limit');
      }
      break;
      
    case 'deposit':
      if (usage.dailyDeposits + amount > limits.dailyDepositLimit) {
        violations.push('daily_deposit_limit');
      }
      break;
  }
  
  // Check position limits
  if (usage.openPositions >= limits.maxOpenPositions) {
    violations.push('max_open_positions');
  }
  
  // Check loss limits
  if (usage.dailyLoss >= limits.maxDailyLoss) {
    violations.push('daily_loss_limit');
  }
  if (usage.weeklyLoss >= limits.maxWeeklyLoss) {
    violations.push('weekly_loss_limit');
  }
  if (usage.monthlyLoss >= limits.maxMonthlyLoss) {
    violations.push('monthly_loss_limit');
  }
  
  return violations;
};

riskProfileSchema.methods.updateUsage = function(operation, amount) {
  const usage = this.currentUsage;
  
  // Reset daily counters if needed
  const now = new Date();
  const lastReset = new Date(usage.lastReset);
  const daysDiff = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24));
  
  if (daysDiff >= 1) {
    usage.dailyTrading = 0;
    usage.dailyWithdrawals = 0;
    usage.dailyDeposits = 0;
    usage.dailyLoss = 0;
    usage.lastReset = now;
  }
  
  // Update usage counters
  switch (operation) {
    case 'trade':
      usage.dailyTrading += amount;
      break;
    case 'withdrawal':
      usage.dailyWithdrawals += amount;
      break;
    case 'deposit':
      usage.dailyDeposits += amount;
      break;
    case 'loss':
      usage.dailyLoss += amount;
      usage.weeklyLoss += amount;
      usage.monthlyLoss += amount;
      break;
  }
  
  return this.save();
};

riskProfileSchema.methods.addViolation = function(type, description, severity = 'medium') {
  this.violations.push({
    type,
    description,
    severity,
    date: new Date(),
    resolved: false
  });
  
  // Auto-escalate if too many violations
  if (this.violations.filter(v => !v.resolved).length >= 3) {
    this.monitoring.isMonitored = true;
    this.monitoring.monitoringReason = 'Multiple violations detected';
    this.monitoring.monitoringStarted = new Date();
  }
  
  return this.save();
};

// Alert methods
alertSchema.methods.escalate = function(escalatedTo) {
  this.escalated = true;
  this.escalatedAt = new Date();
  this.escalatedTo = escalatedTo;
  this.severity = this.severity === 'critical' ? 'critical' : 'high';
  return this.save();
};

alertSchema.methods.resolve = function(resolvedBy, resolution, actionsTaken = []) {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  this.resolution = resolution;
  this.actionsTaken = actionsTaken;
  return this.save();
};

module.exports = {
  RiskProfile: mongoose.model('RiskProfile', riskProfileSchema),
  Alert: mongoose.model('Alert', alertSchema)
};
