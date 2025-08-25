const winston = require('winston');
const { RiskProfile, Alert } = require('../models/RiskManagement');
const { Transaction } = require('../models/Payment');
const crypto = require('crypto');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/risk.log' })
  ]
});

class RiskManagementService {
  constructor() {
    this.alertThresholds = {
      deposit: {
        single_large: 25000,
        daily_total: 50000,
        velocity: 10 // transactions per hour
      },
      withdrawal: {
        single_large: 10000,
        daily_total: 25000,
        velocity: 5
      },
      trading: {
        single_large: 100000,
        daily_total: 500000,
        velocity: 100
      }
    };
    
    this.complianceRules = {
      kyc_required_amount: 2000,
      enhanced_kyc_amount: 10000,
      daily_limit_basic: 5000,
      daily_limit_enhanced: 25000,
      daily_limit_institutional: 100000
    };
  }

  // Initialize risk profile for new user
  async initializeRiskProfile(userId, userData = {}) {
    try {
      logger.info(`Initializing risk profile for user ${userId}`);
      
      const existingProfile = await RiskProfile.findOne({ userId });
      if (existingProfile) {
        return { success: true, data: existingProfile };
      }
      
      const riskProfile = new RiskProfile({
        userId,
        riskFactors: {
          accountAge: 0,
          tradingExperience: userData.tradingExperience || 'beginner',
          verificationLevel: userData.verificationLevel || 'none',
          kycStatus: userData.kycStatus || 'pending',
          ipReputation: 50, // Default neutral score
          deviceTrust: 50,
          geographicRisk: this.calculateGeographicRisk(userData.country),
          amlRisk: 10
        }
      });
      
      // Set initial limits based on verification level
      this.setLimitsByVerificationLevel(riskProfile, userData.verificationLevel || 'none');
      
      await riskProfile.assessRisk();
      
      logger.info(`Risk profile initialized for user ${userId}: ${riskProfile.riskLevel}`);
      
      return {
        success: true,
        data: riskProfile
      };
      
    } catch (error) {
      logger.error('Error initializing risk profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Check if operation is allowed
  async checkOperationRisk(userId, operation, amount, additionalData = {}) {
    try {
      logger.info(`Checking operation risk: ${operation} for user ${userId}, amount: ${amount}`);
      
      const riskProfile = await RiskProfile.findOne({ userId });
      if (!riskProfile) {
        throw new Error('Risk profile not found');
      }
      
      const result = {
        allowed: true,
        warnings: [],
        violations: [],
        riskScore: 0,
        requiresApproval: false,
        limitBreaches: []
      };
      
      // Check if user is restricted
      if (riskProfile.monitoring.isRestricted) {
        result.allowed = false;
        result.violations.push('Account is restricted');
        return result;
      }
      
      // Check limits
      const limitViolations = riskProfile.checkLimits(operation, amount);
      if (limitViolations.length > 0) {
        result.violations.push(...limitViolations);
        result.limitBreaches = limitViolations;
        result.allowed = false;
      }
      
      // Calculate transaction risk score
      const transactionRisk = await this.calculateTransactionRisk(userId, operation, amount, additionalData);
      result.riskScore = transactionRisk.score;
      
      // Check velocity limits
      const velocityCheck = await this.checkVelocityLimits(userId, operation);
      if (!velocityCheck.allowed) {
        result.warnings.push('High transaction velocity detected');
        result.riskScore += 20;
      }
      
      // Check for unusual patterns
      const patternCheck = await this.checkUnusualPatterns(userId, operation, amount);
      if (patternCheck.isUnusual) {
        result.warnings.push('Unusual transaction pattern detected');
        result.riskScore += 15;
      }
      
      // Determine if manual approval is required
      if (result.riskScore > 70 || amount > this.alertThresholds[operation]?.single_large) {
        result.requiresApproval = true;
        result.warnings.push('Transaction requires manual approval');
      }
      
      // Create alert if high risk
      if (result.riskScore > 60) {
        await this.createAlert(userId, 'high_risk_transaction', {
          operation,
          amount,
          riskScore: result.riskScore,
          factors: transactionRisk.factors
        });
      }
      
      // Log the decision
      logger.info(`Operation risk check result for ${userId}: allowed=${result.allowed}, score=${result.riskScore}`);
      
      return result;
      
    } catch (error) {
      logger.error('Error checking operation risk:', error);
      return {
        allowed: false,
        error: error.message
      };
    }
  }

  // Calculate transaction-specific risk
  async calculateTransactionRisk(userId, operation, amount, additionalData) {
    let score = 0;
    const factors = [];
    
    try {
      const riskProfile = await RiskProfile.findOne({ userId });
      if (!riskProfile) return { score: 50, factors: ['no_risk_profile'] };
      
      // Amount-based risk
      const thresholds = this.alertThresholds[operation];
      if (amount > thresholds.single_large) {
        score += 30;
        factors.push('large_amount');
      }
      if (amount > thresholds.single_large * 2) {
        score += 20;
        factors.push('very_large_amount');
      }
      
      // User profile risk
      score += Math.max(0, riskProfile.riskScore - 50);
      
      // New account risk
      if (riskProfile.riskFactors.accountAge < 30) {
        score += 25;
        factors.push('new_account');
      }
      
      // Time-based risk
      const hour = new Date().getHours();
      if ((hour < 6 || hour > 22) && amount > 5000) {
        score += 15;
        factors.push('off_hours_transaction');
      }
      
      // Geographic risk
      if (additionalData.country && this.isHighRiskCountry(additionalData.country)) {
        score += 20;
        factors.push('high_risk_geography');
      }
      
      // Device risk
      if (additionalData.newDevice) {
        score += 15;
        factors.push('new_device');
      }
      
      // IP reputation
      if (additionalData.ipReputation && additionalData.ipReputation < 30) {
        score += 20;
        factors.push('low_ip_reputation');
      }
      
      // Recent violations
      const recentViolations = riskProfile.violations.filter(
        v => !v.resolved && (Date.now() - v.date.getTime()) < 7 * 24 * 60 * 60 * 1000
      );
      if (recentViolations.length > 0) {
        score += recentViolations.length * 10;
        factors.push('recent_violations');
      }
      
      return {
        score: Math.min(100, score),
        factors
      };
      
    } catch (error) {
      logger.error('Error calculating transaction risk:', error);
      return { score: 80, factors: ['calculation_error'] };
    }
  }

  // Check velocity limits
  async checkVelocityLimits(userId, operation) {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const recentTransactions = await Transaction.countDocuments({
        userId,
        type: operation,
        createdAt: { $gte: oneHourAgo },
        status: { $in: ['completed', 'processing'] }
      });
      
      const threshold = this.alertThresholds[operation]?.velocity || 10;
      const allowed = recentTransactions < threshold;
      
      if (!allowed) {
        await this.createAlert(userId, 'unusual_activity', {
          type: 'high_velocity',
          operation,
          count: recentTransactions,
          threshold
        });
      }
      
      return {
        allowed,
        count: recentTransactions,
        threshold
      };
      
    } catch (error) {
      logger.error('Error checking velocity limits:', error);
      return { allowed: true };
    }
  }

  // Check for unusual patterns
  async checkUnusualPatterns(userId, operation, amount) {
    try {
      // Get user's transaction history
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const transactions = await Transaction.find({
        userId,
        type: operation,
        createdAt: { $gte: last30Days },
        status: 'completed'
      });
      
      if (transactions.length < 5) {
        return { isUnusual: false }; // Not enough data
      }
      
      // Calculate statistics
      const amounts = transactions.map(t => t.amountUSD);
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const maxAmount = Math.max(...amounts);
      
      // Check if current amount is unusually large
      const isUnusuallyLarge = amount > avgAmount * 3 && amount > maxAmount * 1.5;
      
      // Check for round number pattern (potential structuring)
      const isRoundNumber = amount % 1000 === 0 && amount >= 5000;
      
      // Check for just-under-threshold amounts (potential structuring)
      const kycThreshold = this.complianceRules.kyc_required_amount;
      const isJustUnderThreshold = amount >= kycThreshold * 0.9 && amount < kycThreshold;
      
      const isUnusual = isUnusuallyLarge || (isRoundNumber && isJustUnderThreshold);
      
      if (isUnusual) {
        const reasons = [];
        if (isUnusuallyLarge) reasons.push('unusually_large_amount');
        if (isRoundNumber) reasons.push('round_number_pattern');
        if (isJustUnderThreshold) reasons.push('just_under_threshold');
        
        await this.createAlert(userId, 'unusual_activity', {
          type: 'unusual_pattern',
          operation,
          amount,
          reasons,
          avgAmount,
          maxAmount
        });
      }
      
      return {
        isUnusual,
        avgAmount,
        maxAmount
      };
      
    } catch (error) {
      logger.error('Error checking unusual patterns:', error);
      return { isUnusual: false };
    }
  }

  // Create security alert
  async createAlert(userId, type, details) {
    try {
      const alertId = `alert_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      
      const alertData = {
        userId,
        alertId,
        type,
        title: this.getAlertTitle(type),
        description: this.getAlertDescription(type, details),
        details,
        severity: this.getAlertSeverity(type, details),
        triggerEvent: {
          type: details.operation || 'manual',
          eventData: details
        }
      };
      
      // Calculate risk score for alert
      if (details.riskScore) {
        alertData.riskScore = details.riskScore;
      } else {
        alertData.riskScore = this.calculateAlertRiskScore(type, details);
      }
      
      // Determine if action is required
      alertData.requiresAction = alertData.severity === 'high' || alertData.severity === 'critical';
      
      const alert = new Alert(alertData);
      await alert.save();
      
      // Auto-escalate critical alerts
      if (alertData.severity === 'critical') {
        await alert.escalate('risk_team');
      }
      
      logger.info(`Alert created: ${alertId} for user ${userId}`);
      
      return alert;
      
    } catch (error) {
      logger.error('Error creating alert:', error);
      throw error;
    }
  }

  // Update user risk profile after transaction
  async updateRiskProfile(userId, operation, amount, wasSuccessful = true) {
    try {
      const riskProfile = await RiskProfile.findOne({ userId });
      if (!riskProfile) return;
      
      // Update usage counters
      if (wasSuccessful) {
        await riskProfile.updateUsage(operation, amount);
        
        // Update trading statistics
        if (operation === 'trade') {
          riskProfile.riskFactors.tradingFrequency += 1;
          riskProfile.riskFactors.averageTradeSize = 
            (riskProfile.riskFactors.averageTradeSize + amount) / 2;
        }
      }
      
      // Update account age
      const accountCreated = riskProfile.createdAt;
      const daysSinceCreation = Math.floor((Date.now() - accountCreated.getTime()) / (1000 * 60 * 60 * 24));
      riskProfile.riskFactors.accountAge = daysSinceCreation;
      
      // Reassess risk
      await riskProfile.assessRisk();
      
      logger.info(`Risk profile updated for user ${userId}: ${riskProfile.riskLevel}`);
      
    } catch (error) {
      logger.error('Error updating risk profile:', error);
    }
  }

  // KYC compliance check
  async checkKYCCompliance(userId, operation, amount) {
    try {
      const riskProfile = await RiskProfile.findOne({ userId });
      if (!riskProfile) return { required: true, level: 'basic' };
      
      const kycStatus = riskProfile.riskFactors.kycStatus;
      const verificationLevel = riskProfile.riskFactors.verificationLevel;
      
      // Check if KYC is required based on amount
      if (amount >= this.complianceRules.enhanced_kyc_amount && verificationLevel !== 'enhanced') {
        return {
          required: true,
          level: 'enhanced',
          reason: 'Large transaction amount requires enhanced verification'
        };
      }
      
      if (amount >= this.complianceRules.kyc_required_amount && kycStatus !== 'approved') {
        return {
          required: true,
          level: 'basic',
          reason: 'Transaction amount requires identity verification'
        };
      }
      
      return { required: false };
      
    } catch (error) {
      logger.error('Error checking KYC compliance:', error);
      return { required: true, level: 'basic' };
    }
  }

  // AML screening
  async performAMLScreening(userId, transactionData) {
    try {
      logger.info(`Performing AML screening for user ${userId}`);
      
      // This would integrate with external AML providers like Chainalysis, Elliptic, etc.
      // For now, we'll simulate the screening
      
      const riskFactors = [];
      let riskScore = 0;
      
      // Check transaction amount
      if (transactionData.amount > 50000) {
        riskScore += 20;
        riskFactors.push('large_amount');
      }
      
      // Check for rapid succession of transactions
      const recentCount = await Transaction.countDocuments({
        userId,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      
      if (recentCount > 10) {
        riskScore += 25;
        riskFactors.push('high_frequency');
      }
      
      // Simulate sanctions list check
      const sanctionsHit = false; // Would be actual check
      if (sanctionsHit) {
        riskScore = 100;
        riskFactors.push('sanctions_list_match');
      }
      
      // Simulate PEP check
      const pepCheck = false; // Would be actual check
      if (pepCheck) {
        riskScore += 30;
        riskFactors.push('politically_exposed_person');
      }
      
      const result = {
        status: riskScore > 80 ? 'failed' : riskScore > 50 ? 'manual_review' : 'passed',
        score: riskScore,
        riskFactors,
        checkedAt: new Date()
      };
      
      // Create alert for high-risk AML results
      if (result.status === 'failed' || result.status === 'manual_review') {
        await this.createAlert(userId, 'compliance_issue', {
          type: 'aml_screening',
          result,
          transactionData
        });
      }
      
      logger.info(`AML screening completed for user ${userId}: ${result.status}`);
      
      return result;
      
    } catch (error) {
      logger.error('Error performing AML screening:', error);
      return {
        status: 'manual_review',
        score: 80,
        error: error.message
      };
    }
  }

  // Utility methods
  setLimitsByVerificationLevel(riskProfile, level) {
    switch (level) {
      case 'none':
        riskProfile.limits.dailyTradingLimit = 1000;
        riskProfile.limits.dailyWithdrawalLimit = 500;
        riskProfile.limits.maxSingleTradeSize = 1000;
        break;
      case 'basic':
        riskProfile.limits.dailyTradingLimit = 10000;
        riskProfile.limits.dailyWithdrawalLimit = 5000;
        riskProfile.limits.maxSingleTradeSize = 5000;
        break;
      case 'enhanced':
        riskProfile.limits.dailyTradingLimit = 100000;
        riskProfile.limits.dailyWithdrawalLimit = 25000;
        riskProfile.limits.maxSingleTradeSize = 50000;
        break;
      case 'institutional':
        riskProfile.limits.dailyTradingLimit = 1000000;
        riskProfile.limits.dailyWithdrawalLimit = 100000;
        riskProfile.limits.maxSingleTradeSize = 500000;
        break;
    }
  }

  calculateGeographicRisk(country) {
    const highRiskCountries = ['AF', 'IR', 'KP', 'MM', 'SY'];
    const mediumRiskCountries = ['BD', 'BO', 'KH', 'EC', 'GH', 'LA', 'MZ', 'NP', 'PK', 'UG', 'YE', 'ZW'];
    
    if (highRiskCountries.includes(country)) return 80;
    if (mediumRiskCountries.includes(country)) return 50;
    return 20;
  }

  isHighRiskCountry(country) {
    const highRiskCountries = ['AF', 'IR', 'KP', 'MM', 'SY'];
    return highRiskCountries.includes(country);
  }

  getAlertTitle(type) {
    const titles = {
      'limit_breach': 'Transaction Limit Exceeded',
      'unusual_activity': 'Unusual Account Activity',
      'high_risk_transaction': 'High Risk Transaction',
      'compliance_issue': 'Compliance Issue Detected',
      'security_alert': 'Security Alert',
      'market_risk': 'Market Risk Warning',
      'concentration_risk': 'Portfolio Concentration Risk'
    };
    return titles[type] || 'Security Alert';
  }

  getAlertDescription(type, details) {
    switch (type) {
      case 'limit_breach':
        return `User attempted to exceed ${details.limitType} limit`;
      case 'unusual_activity':
        return `Unusual ${details.type} detected for user account`;
      case 'high_risk_transaction':
        return `High risk ${details.operation} transaction of $${details.amount}`;
      case 'compliance_issue':
        return `Compliance issue detected: ${details.type}`;
      default:
        return 'Security alert triggered';
    }
  }

  getAlertSeverity(type, details) {
    if (type === 'compliance_issue' || (details.riskScore && details.riskScore > 80)) {
      return 'critical';
    }
    if (type === 'high_risk_transaction' || (details.riskScore && details.riskScore > 60)) {
      return 'high';
    }
    if (type === 'unusual_activity') {
      return 'warning';
    }
    return 'info';
  }

  calculateAlertRiskScore(type, details) {
    switch (type) {
      case 'compliance_issue': return 90;
      case 'high_risk_transaction': return details.amount > 50000 ? 80 : 60;
      case 'unusual_activity': return 50;
      case 'limit_breach': return 40;
      default: return 30;
    }
  }

  // Get risk profile
  async getRiskProfile(userId) {
    try {
      const riskProfile = await RiskProfile.findOne({ userId });
      return {
        success: true,
        data: riskProfile
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get alerts for user
  async getAlerts(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        severity,
        type
      } = options;
      
      const query = { userId };
      if (status) query.status = status;
      if (severity) query.severity = severity;
      if (type) query.type = type;
      
      const alerts = await Alert.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      
      const total = await Alert.countDocuments(query);
      
      return {
        success: true,
        data: alerts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new RiskManagementService();
