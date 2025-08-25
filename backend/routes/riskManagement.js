const express = require('express');
const router = express.Router();
const riskManagement = require('../services/riskManagement');
const { requireAuth } = require('./auth');

// Get user risk profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const result = await riskManagement.getRiskProfile(req.user.userId);
    
    if (!result.success) {
      // Initialize risk profile if it doesn't exist
      const initResult = await riskManagement.initializeRiskProfile(req.user.userId);
      return res.json(initResult);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update user risk profile
router.post('/profile', requireAuth, async (req, res) => {
  try {
    const {
      tradingExperience,
      annualIncome,
      netWorth,
      investmentGoals,
      riskTolerance
    } = req.body;

    const RiskProfile = require('../models/RiskManagement').RiskProfile;
    let riskProfile = await RiskProfile.findOne({ userId: req.user.userId });

    if (!riskProfile) {
      const initResult = await riskManagement.initializeRiskProfile(req.user.userId, req.body);
      return res.json(initResult);
    }

    // Update risk factors
    if (tradingExperience) {
      riskProfile.riskFactors.tradingExperience = tradingExperience;
    }

    // Update limits based on profile
    if (tradingExperience === 'expert' && annualIncome > 100000) {
      riskProfile.limits.dailyTradingLimit = Math.min(200000, riskProfile.limits.dailyTradingLimit * 2);
      riskProfile.limits.maxSingleTradeSize = Math.min(100000, riskProfile.limits.maxSingleTradeSize * 2);
    }

    // Reassess risk
    await riskProfile.assessRisk();

    res.json({
      success: true,
      data: riskProfile,
      message: 'Risk profile updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check if operation is allowed
router.post('/check', requireAuth, async (req, res) => {
  try {
    const { operation, amount, asset, additionalData = {} } = req.body;

    if (!operation || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Operation and amount are required'
      });
    }

    // Add request context to additional data
    const contextData = {
      ...additionalData,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      country: req.get('CF-IPCountry') || 'US'
    };

    const result = await riskManagement.checkOperationRisk(
      req.user.userId,
      operation,
      amount,
      contextData
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user alerts
router.get('/alerts', requireAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      severity,
      type
    } = req.query;

    const result = await riskManagement.getAlerts(req.user.userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      severity,
      type
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mark alert as read
router.patch('/alerts/:alertId/read', requireAuth, async (req, res) => {
  try {
    const { alertId } = req.params;

    const Alert = require('../models/RiskManagement').Alert;
    const alert = await Alert.findOne({ alertId, userId: req.user.userId });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    alert.userNotified = true;
    await alert.save();

    res.json({
      success: true,
      message: 'Alert marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get risk limits and usage
router.get('/limits', requireAuth, async (req, res) => {
  try {
    const riskProfile = await riskManagement.getRiskProfile(req.user.userId);
    
    if (!riskProfile.success) {
      return res.status(404).json({
        success: false,
        error: 'Risk profile not found'
      });
    }

    const profile = riskProfile.data;
    const limits = profile.limits;
    const usage = profile.currentUsage;

    // Calculate remaining limits
    const remainingLimits = {
      dailyTrading: Math.max(0, limits.dailyTradingLimit - usage.dailyTrading),
      dailyWithdrawal: Math.max(0, limits.dailyWithdrawalLimit - usage.dailyWithdrawals),
      dailyDeposit: Math.max(0, limits.dailyDepositLimit - usage.dailyDeposits),
      dailyLoss: Math.max(0, limits.maxDailyLoss - usage.dailyLoss),
      weeklyLoss: Math.max(0, limits.maxWeeklyLoss - usage.weeklyLoss),
      monthlyLoss: Math.max(0, limits.maxMonthlyLoss - usage.monthlyLoss)
    };

    // Calculate utilization percentages
    const utilization = {
      dailyTrading: (usage.dailyTrading / limits.dailyTradingLimit) * 100,
      dailyWithdrawal: (usage.dailyWithdrawals / limits.dailyWithdrawalLimit) * 100,
      dailyDeposit: (usage.dailyDeposits / limits.dailyDepositLimit) * 100,
      dailyLoss: (usage.dailyLoss / limits.maxDailyLoss) * 100,
      weeklyLoss: (usage.weeklyLoss / limits.maxWeeklyLoss) * 100,
      monthlyLoss: (usage.monthlyLoss / limits.maxMonthlyLoss) * 100
    };

    res.json({
      success: true,
      data: {
        limits,
        usage,
        remainingLimits,
        utilization,
        riskLevel: profile.riskLevel,
        riskScore: profile.riskScore,
        lastAssessment: profile.lastAssessment,
        monitoring: profile.monitoring
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Request limit increase
router.post('/limits/increase', requireAuth, async (req, res) => {
  try {
    const {
      limitType,
      requestedAmount,
      justification
    } = req.body;

    if (!limitType || !requestedAmount || !justification) {
      return res.status(400).json({
        success: false,
        error: 'Limit type, requested amount, and justification are required'
      });
    }

    const validLimitTypes = [
      'dailyTradingLimit',
      'dailyWithdrawalLimit', 
      'dailyDepositLimit',
      'maxSingleTradeSize',
      'maxOpenPositions'
    ];

    if (!validLimitTypes.includes(limitType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit type'
      });
    }

    // Create an alert for limit increase request
    await riskManagement.createAlert(req.user.userId, 'limit_increase_request', {
      limitType,
      requestedAmount,
      justification,
      currentAmount: req.body.currentAmount
    });

    res.json({
      success: true,
      message: 'Limit increase request submitted for review',
      estimatedProcessingTime: '24-48 hours'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get compliance status
router.get('/compliance', requireAuth, async (req, res) => {
  try {
    const riskProfile = await riskManagement.getRiskProfile(req.user.userId);
    
    if (!riskProfile.success) {
      return res.status(404).json({
        success: false,
        error: 'Risk profile not found'
      });
    }

    const profile = riskProfile.data;
    const factors = profile.riskFactors;

    const complianceStatus = {
      kyc: {
        status: factors.kycStatus,
        level: factors.verificationLevel,
        required: factors.kycStatus !== 'approved',
        nextStep: factors.kycStatus === 'pending' ? 'Submit documents' : 
                 factors.kycStatus === 'rejected' ? 'Resubmit documents' : null
      },
      aml: {
        riskScore: factors.amlRisk,
        status: factors.amlRisk < 30 ? 'low_risk' : 
                factors.amlRisk < 70 ? 'medium_risk' : 'high_risk',
        lastCheck: profile.lastAssessment,
        sanctionsCheck: factors.sanctionsCheck,
        pepCheck: factors.pepCheck
      },
      monitoring: {
        isMonitored: profile.monitoring.isMonitored,
        reason: profile.monitoring.monitoringReason,
        isRestricted: profile.monitoring.isRestricted,
        restrictionLevel: profile.monitoring.restrictionLevel
      },
      violations: {
        total: profile.violations.length,
        open: profile.violations.filter(v => !v.resolved).length,
        recent: profile.violations.filter(v => 
          !v.resolved && (Date.now() - v.date.getTime()) < 30 * 24 * 60 * 60 * 1000
        ).length
      }
    };

    res.json({
      success: true,
      data: complianceStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Perform KYC check
router.post('/kyc/check', requireAuth, async (req, res) => {
  try {
    const { operation, amount } = req.body;

    if (!operation || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Operation and amount are required'
      });
    }

    const result = await riskManagement.checkKYCCompliance(
      req.user.userId,
      operation,
      amount
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Submit KYC documents
router.post('/kyc/submit', requireAuth, async (req, res) => {
  try {
    const {
      documentType,
      documentNumber,
      issuingCountry,
      expiryDate,
      // In a real implementation, these would be file uploads
      frontImageUrl,
      backImageUrl,
      selfieUrl
    } = req.body;

    // Validate required fields
    if (!documentType || !documentNumber || !issuingCountry) {
      return res.status(400).json({
        success: false,
        error: 'Document type, number, and issuing country are required'
      });
    }

    // Update risk profile with KYC submission
    const RiskProfile = require('../models/RiskManagement').RiskProfile;
    const riskProfile = await RiskProfile.findOne({ userId: req.user.userId });

    if (riskProfile) {
      riskProfile.riskFactors.kycStatus = 'pending';
      riskProfile.riskFactors.verificationLevel = 'basic';
      await riskProfile.save();
    }

    // Create alert for KYC review
    await riskManagement.createAlert(req.user.userId, 'kyc_submission', {
      documentType,
      issuingCountry,
      submittedAt: new Date()
    });

    res.json({
      success: true,
      message: 'KYC documents submitted successfully',
      estimatedProcessingTime: '1-3 business days',
      status: 'pending_review'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get risk assessment summary
router.get('/assessment', requireAuth, async (req, res) => {
  try {
    const riskProfile = await riskManagement.getRiskProfile(req.user.userId);
    
    if (!riskProfile.success) {
      return res.status(404).json({
        success: false,
        error: 'Risk profile not found'
      });
    }

    const profile = riskProfile.data;
    
    // Calculate risk breakdown
    const riskBreakdown = {
      accountAge: profile.riskFactors.accountAge < 30 ? 20 : 
                 profile.riskFactors.accountAge < 90 ? 10 : 0,
      experience: profile.riskFactors.tradingExperience === 'beginner' ? 20 :
                 profile.riskFactors.tradingExperience === 'intermediate' ? 10 : 0,
      verification: profile.riskFactors.verificationLevel === 'none' ? 30 :
                   profile.riskFactors.verificationLevel === 'basic' ? 15 : 0,
      geographic: profile.riskFactors.geographicRisk,
      behavioral: profile.riskFactors.winRate < 30 ? 15 : 0,
      compliance: profile.riskFactors.amlRisk
    };

    const riskRecommendations = [];
    
    if (riskBreakdown.verification > 0) {
      riskRecommendations.push({
        type: 'verification',
        priority: 'high',
        action: 'Complete identity verification to reduce risk and increase limits'
      });
    }
    
    if (riskBreakdown.experience > 10) {
      riskRecommendations.push({
        type: 'education',
        priority: 'medium',
        action: 'Complete trading education modules to improve risk assessment'
      });
    }

    if (profile.violations.filter(v => !v.resolved).length > 0) {
      riskRecommendations.push({
        type: 'compliance',
        priority: 'high',
        action: 'Resolve outstanding compliance issues'
      });
    }

    res.json({
      success: true,
      data: {
        overallRiskLevel: profile.riskLevel,
        riskScore: profile.riskScore,
        lastAssessment: profile.lastAssessment,
        riskBreakdown,
        recommendations: riskRecommendations,
        nextReview: profile.nextReview,
        canTradeFreely: profile.riskLevel !== 'very_high' && !profile.monitoring.isRestricted,
        requiresMonitoring: profile.monitoring.isMonitored
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
