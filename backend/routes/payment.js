const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const riskManagement = require('../services/riskManagement');
const { requireAuth } = require('./auth');

// Get payment methods for user
router.get('/methods', requireAuth, async (req, res) => {
  try {
    const result = await paymentService.getPaymentMethods(req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add new payment method
router.post('/methods', requireAuth, async (req, res) => {
  try {
    const {
      type,
      provider,
      cardNumber,
      expiryMonth,
      expiryYear,
      cvv,
      cardBrand,
      accountNumber,
      routingNumber,
      bankName,
      accountType
    } = req.body;

    // Validate required fields based on payment type
    if (type === 'credit_card' || type === 'debit_card') {
      if (!cardNumber || !expiryMonth || !expiryYear || !cvv) {
        return res.status(400).json({
          success: false,
          error: 'Card details are required'
        });
      }
    }

    if (type === 'bank_account') {
      if (!accountNumber || !routingNumber || !bankName) {
        return res.status(400).json({
          success: false,
          error: 'Bank account details are required'
        });
      }
    }

    // Prepare payment method data
    const paymentMethodData = {
      type,
      provider: provider || 'stripe',
      cardNumber: cardNumber?.replace(/\s/g, ''),
      expiryMonth,
      expiryYear,
      cvv,
      cardBrand,
      cardType: type === 'credit_card' ? 'credit' : 'debit',
      accountNumber,
      routingNumber,
      bankName,
      accountType,
      lastFourDigits: cardNumber ? cardNumber.slice(-4) : accountNumber?.slice(-4)
    };

    const result = await paymentService.addPaymentMethod(req.user.userId, paymentMethodData);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process deposit
router.post('/deposit', requireAuth, async (req, res) => {
  try {
    const { paymentMethodId, amount, currency = 'USD' } = req.body;

    if (!paymentMethodId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Payment method ID and valid amount are required'
      });
    }

    // Risk assessment
    const riskCheck = await riskManagement.checkOperationRisk(
      req.user.userId,
      'deposit',
      amount,
      {
        paymentMethodId,
        currency,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        country: req.get('CF-IPCountry') || 'US'
      }
    );

    if (!riskCheck.allowed) {
      return res.status(403).json({
        success: false,
        error: 'Transaction not allowed',
        violations: riskCheck.violations,
        riskScore: riskCheck.riskScore
      });
    }

    // Check KYC compliance
    const kycCheck = await riskManagement.checkKYCCompliance(req.user.userId, 'deposit', amount);
    if (kycCheck.required) {
      return res.status(400).json({
        success: false,
        error: 'KYC verification required',
        kycLevel: kycCheck.level,
        reason: kycCheck.reason
      });
    }

    // Perform AML screening for large deposits
    if (amount > 10000) {
      const amlResult = await riskManagement.performAMLScreening(req.user.userId, {
        type: 'deposit',
        amount,
        currency,
        paymentMethodId
      });

      if (amlResult.status === 'failed') {
        return res.status(403).json({
          success: false,
          error: 'Transaction blocked due to compliance screening',
          amlResult
        });
      }

      if (amlResult.status === 'manual_review') {
        return res.status(202).json({
          success: true,
          message: 'Deposit submitted for review. Processing may take 24-48 hours.',
          requiresReview: true,
          amlResult
        });
      }
    }

    // Process the deposit
    const result = await paymentService.processDeposit(
      req.user.userId,
      paymentMethodId,
      amount,
      currency
    );

    // Update risk profile
    if (result.success) {
      await riskManagement.updateRiskProfile(req.user.userId, 'deposit', amount, true);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process withdrawal
router.post('/withdraw', requireAuth, async (req, res) => {
  try {
    const { paymentMethodId, amount, currency = 'USD' } = req.body;

    if (!paymentMethodId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Payment method ID and valid amount are required'
      });
    }

    // Risk assessment
    const riskCheck = await riskManagement.checkOperationRisk(
      req.user.userId,
      'withdrawal',
      amount,
      {
        paymentMethodId,
        currency,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        country: req.get('CF-IPCountry') || 'US'
      }
    );

    if (!riskCheck.allowed) {
      return res.status(403).json({
        success: false,
        error: 'Withdrawal not allowed',
        violations: riskCheck.violations,
        riskScore: riskCheck.riskScore
      });
    }

    // Enhanced KYC check for withdrawals
    const kycCheck = await riskManagement.checkKYCCompliance(req.user.userId, 'withdrawal', amount);
    if (kycCheck.required) {
      return res.status(400).json({
        success: false,
        error: 'Enhanced verification required for withdrawals',
        kycLevel: kycCheck.level,
        reason: kycCheck.reason
      });
    }

    // AML screening for all withdrawals over $5000
    if (amount > 5000) {
      const amlResult = await riskManagement.performAMLScreening(req.user.userId, {
        type: 'withdrawal',
        amount,
        currency,
        paymentMethodId
      });

      if (amlResult.status === 'failed') {
        return res.status(403).json({
          success: false,
          error: 'Withdrawal blocked due to compliance screening',
          amlResult
        });
      }
    }

    // Process the withdrawal
    const result = await paymentService.processWithdrawal(
      req.user.userId,
      paymentMethodId,
      amount,
      currency
    );

    // Update risk profile
    if (result.success) {
      await riskManagement.updateRiskProfile(req.user.userId, 'withdrawal', amount, true);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get transaction history
router.get('/transactions', requireAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      type,
      status,
      startDate,
      endDate
    } = req.query;

    const result = await paymentService.getTransactionHistory(req.user.userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      status,
      startDate,
      endDate
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific transaction
router.get('/transactions/:transactionId', requireAuth, async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const Transaction = require('../models/Payment').Transaction;
    const transaction = await Transaction.findOne({
      transactionId,
      userId: req.user.userId
    }).populate('paymentMethodId', 'type lastFourDigits cardBrand');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get payment limits and balances
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

    res.json({
      success: true,
      data: {
        limits: {
          dailyTrading: {
            limit: limits.dailyTradingLimit,
            used: usage.dailyTrading,
            remaining: Math.max(0, limits.dailyTradingLimit - usage.dailyTrading)
          },
          dailyWithdrawal: {
            limit: limits.dailyWithdrawalLimit,
            used: usage.dailyWithdrawals,
            remaining: Math.max(0, limits.dailyWithdrawalLimit - usage.dailyWithdrawals)
          },
          dailyDeposit: {
            limit: limits.dailyDepositLimit,
            used: usage.dailyDeposits,
            remaining: Math.max(0, limits.dailyDepositLimit - usage.dailyDeposits)
          },
          maxSingleTrade: limits.maxSingleTradeSize,
          maxOpenPositions: limits.maxOpenPositions
        },
        riskLevel: profile.riskLevel,
        verificationLevel: profile.riskFactors.verificationLevel,
        kycStatus: profile.riskFactors.kycStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Verify payment method
router.post('/methods/:methodId/verify', requireAuth, async (req, res) => {
  try {
    const { methodId } = req.params;
    const { verificationCode, microDepositAmounts } = req.body;

    const PaymentMethod = require('../models/Payment').PaymentMethod;
    const paymentMethod = await PaymentMethod.findById(methodId);

    if (!paymentMethod || paymentMethod.userId !== req.user.userId) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found'
      });
    }

    // Simulate verification process
    // In reality, this would verify micro deposits or process verification codes
    const isValid = verificationCode === '123456' || 
                   (microDepositAmounts && microDepositAmounts.length === 2);

    if (isValid) {
      paymentMethod.isVerified = true;
      paymentMethod.verificationStatus = 'verified';
      paymentMethod.verificationDate = new Date();
      await paymentMethod.save();

      res.json({
        success: true,
        message: 'Payment method verified successfully'
      });
    } else {
      paymentMethod.verificationAttempts += 1;
      
      if (paymentMethod.verificationAttempts >= 3) {
        paymentMethod.verificationStatus = 'failed';
        paymentMethod.isActive = false;
      }
      
      await paymentMethod.save();

      res.status(400).json({
        success: false,
        error: 'Verification failed',
        attemptsRemaining: Math.max(0, 3 - paymentMethod.verificationAttempts)
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete payment method
router.delete('/methods/:methodId', requireAuth, async (req, res) => {
  try {
    const { methodId } = req.params;

    const PaymentMethod = require('../models/Payment').PaymentMethod;
    const paymentMethod = await PaymentMethod.findById(methodId);

    if (!paymentMethod || paymentMethod.userId !== req.user.userId) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found'
      });
    }

    // Soft delete - mark as inactive instead of removing
    paymentMethod.isActive = false;
    paymentMethod.updatedAt = new Date();
    await paymentMethod.save();

    res.json({
      success: true,
      message: 'Payment method removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get supported payment methods and fees
router.get('/info', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        supportedMethods: [
          {
            type: 'credit_card',
            providers: ['stripe'],
            fee: '2.9%',
            processingTime: 'Instant',
            limits: { min: 10, max: 50000 }
          },
          {
            type: 'debit_card',
            providers: ['stripe'],
            fee: '2.5%',
            processingTime: 'Instant',
            limits: { min: 10, max: 25000 }
          },
          {
            type: 'bank_account',
            providers: ['stripe', 'plaid'],
            fee: '0.8%',
            processingTime: '3-5 business days',
            limits: { min: 100, max: 100000 }
          },
          {
            type: 'wire_transfer',
            providers: ['bank_wire'],
            fee: '$15 flat fee',
            processingTime: '1-2 business days',
            limits: { min: 1000, max: 1000000 }
          }
        ],
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
        kycRequirements: {
          basic: {
            threshold: 2000,
            requirements: ['Identity verification', 'Address verification']
          },
          enhanced: {
            threshold: 10000,
            requirements: ['Enhanced identity verification', 'Source of funds', 'Income verification']
          }
        }
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
