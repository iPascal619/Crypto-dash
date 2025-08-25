const crypto = require('crypto');
const winston = require('winston');
const { PaymentMethod, Transaction } = require('../models/Payment');

// Initialize Stripe only if API key is available
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} else {
  console.log('Warning: STRIPE_SECRET_KEY not found. Payment processing will use demo mode.');
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/payment.log' })
  ]
});

class PaymentService {
  constructor() {
    this.encryptionKey = process.env.PAYMENT_ENCRYPTION_KEY || crypto.randomBytes(32);
    this.supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
    this.fees = {
      credit_card: 0.029, // 2.9%
      debit_card: 0.025, // 2.5%
      bank_account: 0.008, // 0.8%
      wire_transfer: 15, // $15 flat fee
      crypto_deposit: 0.001, // 0.1%
      crypto_withdrawal: 0.002 // 0.2%
    };
  }

  // Encryption utilities
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedData) {
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Add payment method
  async addPaymentMethod(userId, paymentMethodData) {
    try {
      logger.info(`Adding payment method for user ${userId}`);
      
      let providerPaymentMethod;
      let encryptedData;
      
      switch (paymentMethodData.provider) {
        case 'stripe':
          providerPaymentMethod = await this.createStripePaymentMethod(paymentMethodData);
          break;
        case 'paypal':
          providerPaymentMethod = await this.createPayPalPaymentMethod(paymentMethodData);
          break;
        case 'plaid':
          providerPaymentMethod = await this.createPlaidPaymentMethod(paymentMethodData);
          break;
        default:
          throw new Error('Unsupported payment provider');
      }
      
      // Encrypt sensitive data
      encryptedData = this.encrypt(JSON.stringify({
        cardNumber: paymentMethodData.cardNumber,
        expiryMonth: paymentMethodData.expiryMonth,
        expiryYear: paymentMethodData.expiryYear,
        cvv: paymentMethodData.cvv,
        accountNumber: paymentMethodData.accountNumber,
        routingNumber: paymentMethodData.routingNumber
      }));
      
      // Create payment method record
      const paymentMethod = new PaymentMethod({
        userId,
        type: paymentMethodData.type,
        provider: paymentMethodData.provider,
        encryptedData,
        lastFourDigits: paymentMethodData.lastFourDigits,
        expiryDate: `${paymentMethodData.expiryMonth}/${paymentMethodData.expiryYear}`,
        providerPaymentMethodId: providerPaymentMethod.id,
        providerCustomerId: providerPaymentMethod.customer,
        bankName: paymentMethodData.bankName,
        cardBrand: paymentMethodData.cardBrand,
        cardType: paymentMethodData.cardType,
        accountType: paymentMethodData.accountType,
        routingNumber: paymentMethodData.routingNumber?.substring(0, 4) + '****'
      });
      
      await paymentMethod.save();
      logger.info(`Payment method added successfully: ${paymentMethod._id}`);
      
      return {
        success: true,
        paymentMethodId: paymentMethod._id,
        data: {
          id: paymentMethod._id,
          type: paymentMethod.type,
          lastFourDigits: paymentMethod.lastFourDigits,
          cardBrand: paymentMethod.cardBrand,
          isVerified: paymentMethod.isVerified
        }
      };
      
    } catch (error) {
      logger.error('Error adding payment method:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Process deposit
  async processDeposit(userId, paymentMethodId, amount, currency = 'USD') {
    try {
      const transactionId = `dep_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      logger.info(`Processing deposit: ${transactionId} for user ${userId}`);
      
      // Get payment method
      const paymentMethod = await PaymentMethod.findById(paymentMethodId);
      if (!paymentMethod || paymentMethod.userId !== userId) {
        throw new Error('Payment method not found');
      }
      
      if (!paymentMethod.isActive || paymentMethod.isSuspended) {
        throw new Error('Payment method is not available');
      }
      
      // Calculate fees
      const feeRate = this.fees[paymentMethod.type] || 0.03;
      const fee = paymentMethod.type === 'wire_transfer' ? 
        this.fees.wire_transfer : 
        amount * feeRate;
      
      // Create transaction record
      const transaction = new Transaction({
        userId,
        transactionId,
        type: 'deposit',
        amount,
        currency,
        amountUSD: currency === 'USD' ? amount : await this.convertToUSD(amount, currency),
        fees: {
          payment: fee,
          total: fee
        },
        paymentMethodId: paymentMethod._id,
        paymentProvider: paymentMethod.provider,
        ipAddress: paymentMethod.lastUsedIP,
        status: 'processing'
      });
      
      await transaction.save();
      
      // Process payment based on provider
      let providerResult;
      switch (paymentMethod.provider) {
        case 'stripe':
          providerResult = await this.processStripePayment(paymentMethod, amount, currency, transactionId);
          break;
        case 'paypal':
          providerResult = await this.processPayPalPayment(paymentMethod, amount, currency, transactionId);
          break;
        case 'plaid':
          providerResult = await this.processPlaidPayment(paymentMethod, amount, currency, transactionId);
          break;
        default:
          throw new Error('Unsupported payment provider');
      }
      
      // Update transaction with provider response
      transaction.providerTransactionId = providerResult.transactionId;
      transaction.providerStatus = providerResult.status;
      transaction.status = providerResult.success ? 'completed' : 'failed';
      
      if (!providerResult.success) {
        transaction.errorCode = providerResult.errorCode;
        transaction.errorMessage = providerResult.errorMessage;
      }
      
      await transaction.save();
      await paymentMethod.markAsUsed();
      
      logger.info(`Deposit ${providerResult.success ? 'completed' : 'failed'}: ${transactionId}`);
      
      return {
        success: providerResult.success,
        transactionId,
        amount,
        fee,
        status: transaction.status,
        providerTransactionId: providerResult.transactionId,
        error: providerResult.success ? null : providerResult.errorMessage
      };
      
    } catch (error) {
      logger.error('Error processing deposit:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Process withdrawal
  async processWithdrawal(userId, paymentMethodId, amount, currency = 'USD') {
    try {
      const transactionId = `wth_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      logger.info(`Processing withdrawal: ${transactionId} for user ${userId}`);
      
      // Get payment method
      const paymentMethod = await PaymentMethod.findById(paymentMethodId);
      if (!paymentMethod || paymentMethod.userId !== userId) {
        throw new Error('Payment method not found');
      }
      
      // Check daily limits (this would integrate with risk management)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayWithdrawals = await Transaction.aggregate([
        {
          $match: {
            userId,
            type: 'withdrawal',
            status: { $in: ['completed', 'processing'] },
            createdAt: { $gte: today }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amountUSD' }
          }
        }
      ]);
      
      const todayTotal = todayWithdrawals[0]?.total || 0;
      if (todayTotal + amount > paymentMethod.dailyLimit) {
        throw new Error('Daily withdrawal limit exceeded');
      }
      
      // Calculate fees
      const feeRate = this.fees[paymentMethod.type] || 0.03;
      const fee = paymentMethod.type === 'wire_transfer' ? 
        this.fees.wire_transfer : 
        amount * feeRate;
      
      // Create transaction record
      const transaction = new Transaction({
        userId,
        transactionId,
        type: 'withdrawal',
        amount,
        currency,
        amountUSD: currency === 'USD' ? amount : await this.convertToUSD(amount, currency),
        fees: {
          payment: fee,
          total: fee
        },
        paymentMethodId: paymentMethod._id,
        paymentProvider: paymentMethod.provider,
        status: 'processing',
        requiresManualReview: amount > 10000 // Large withdrawals need review
      });
      
      await transaction.save();
      
      // For large amounts or high-risk, require manual approval
      if (transaction.requiresManualReview) {
        transaction.status = 'pending';
        await transaction.save();
        
        logger.info(`Withdrawal requires manual review: ${transactionId}`);
        return {
          success: true,
          transactionId,
          amount,
          fee,
          status: 'pending_review',
          message: 'Withdrawal requires manual review and will be processed within 24 hours'
        };
      }
      
      // Process withdrawal based on provider
      let providerResult;
      switch (paymentMethod.provider) {
        case 'stripe':
          providerResult = await this.processStripeTransfer(paymentMethod, amount, currency, transactionId);
          break;
        case 'paypal':
          providerResult = await this.processPayPalTransfer(paymentMethod, amount, currency, transactionId);
          break;
        case 'plaid':
          providerResult = await this.processPlaidTransfer(paymentMethod, amount, currency, transactionId);
          break;
        default:
          throw new Error('Unsupported payment provider');
      }
      
      // Update transaction
      transaction.providerTransactionId = providerResult.transactionId;
      transaction.providerStatus = providerResult.status;
      transaction.status = providerResult.success ? 'completed' : 'failed';
      
      if (!providerResult.success) {
        transaction.errorCode = providerResult.errorCode;
        transaction.errorMessage = providerResult.errorMessage;
      }
      
      await transaction.save();
      
      logger.info(`Withdrawal ${providerResult.success ? 'completed' : 'failed'}: ${transactionId}`);
      
      return {
        success: providerResult.success,
        transactionId,
        amount,
        fee,
        status: transaction.status,
        providerTransactionId: providerResult.transactionId,
        error: providerResult.success ? null : providerResult.errorMessage
      };
      
    } catch (error) {
      logger.error('Error processing withdrawal:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Stripe integration methods
  async createStripePaymentMethod(paymentData) {
    try {
      if (!stripe) {
        // Demo mode - return mock payment method
        return {
          id: `pm_demo_${Date.now()}`,
          customer: `cust_demo_${Date.now()}`
        };
      }
      
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: paymentData.cardNumber,
          exp_month: paymentData.expiryMonth,
          exp_year: paymentData.expiryYear,
          cvc: paymentData.cvv,
        },
      });
      
      return paymentMethod;
    } catch (error) {
      logger.error('Stripe payment method creation failed:', error);
      throw error;
    }
  }

  async processStripePayment(paymentMethod, amount, currency, transactionId) {
    try {
      if (!stripe) {
        // Demo mode - simulate successful payment
        return {
          success: true,
          transactionId: `pi_demo_${Date.now()}`,
          status: 'succeeded'
        };
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe uses cents
        currency: currency.toLowerCase(),
        payment_method: paymentMethod.providerPaymentMethodId,
        confirm: true,
        metadata: {
          transactionId,
          userId: paymentMethod.userId
        }
      });
      
      return {
        success: paymentIntent.status === 'succeeded',
        transactionId: paymentIntent.id,
        status: paymentIntent.status,
        errorCode: paymentIntent.last_payment_error?.code,
        errorMessage: paymentIntent.last_payment_error?.message
      };
    } catch (error) {
      logger.error('Stripe payment processing failed:', error);
      return {
        success: false,
        errorCode: error.code,
        errorMessage: error.message
      };
    }
  }

  async processStripeTransfer(paymentMethod, amount, currency, transactionId) {
    try {
      if (!stripe) {
        // Demo mode - simulate successful transfer
        return {
          success: true,
          transactionId: `tr_demo_${Date.now()}`,
          status: 'completed'
        };
      }
      
      // This would typically involve creating a transfer to a connected account
      // or using Stripe's payout functionality
      const transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        destination: paymentMethod.providerCustomerId,
        metadata: {
          transactionId,
          userId: paymentMethod.userId
        }
      });
      
      return {
        success: true,
        transactionId: transfer.id,
        status: 'completed'
      };
    } catch (error) {
      logger.error('Stripe transfer failed:', error);
      return {
        success: false,
        errorCode: error.code,
        errorMessage: error.message
      };
    }
  }

  // PayPal integration methods (simplified)
  async createPayPalPaymentMethod(paymentData) {
    // This would integrate with PayPal's API
    return {
      id: `pp_${Date.now()}`,
      customer: `pp_cust_${Date.now()}`
    };
  }

  async processPayPalPayment(paymentMethod, amount, currency, transactionId) {
    // PayPal payment processing implementation
    return {
      success: true,
      transactionId: `pp_txn_${Date.now()}`,
      status: 'completed'
    };
  }

  async processPayPalTransfer(paymentMethod, amount, currency, transactionId) {
    // PayPal transfer implementation
    return {
      success: true,
      transactionId: `pp_transfer_${Date.now()}`,
      status: 'completed'
    };
  }

  // Plaid integration methods (simplified)
  async createPlaidPaymentMethod(paymentData) {
    return {
      id: `plaid_${Date.now()}`,
      customer: `plaid_cust_${Date.now()}`
    };
  }

  async processPlaidPayment(paymentMethod, amount, currency, transactionId) {
    return {
      success: true,
      transactionId: `plaid_txn_${Date.now()}`,
      status: 'completed'
    };
  }

  async processPlaidTransfer(paymentMethod, amount, currency, transactionId) {
    return {
      success: true,
      transactionId: `plaid_transfer_${Date.now()}`,
      status: 'completed'
    };
  }

  // Utility methods
  async convertToUSD(amount, fromCurrency) {
    // This would integrate with a real exchange rate API
    const rates = {
      'EUR': 1.1,
      'GBP': 1.3,
      'CAD': 0.8,
      'AUD': 0.7
    };
    
    return amount * (rates[fromCurrency] || 1);
  }

  // Get transaction history
  async getTransactionHistory(userId, options = {}) {
    const {
      page = 1,
      limit = 50,
      type,
      status,
      startDate,
      endDate
    } = options;
    
    const query = { userId };
    
    if (type) query.type = type;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('paymentMethodId', 'type lastFourDigits cardBrand');
    
    const total = await Transaction.countDocuments(query);
    
    return {
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get payment methods for user
  async getPaymentMethods(userId) {
    const paymentMethods = await PaymentMethod.find({
      userId,
      isActive: true
    }).select('-encryptedData');
    
    return {
      success: true,
      data: paymentMethods
    };
  }
}

module.exports = new PaymentService();
