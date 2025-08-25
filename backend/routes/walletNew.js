const express = require('express');
const router = express.Router();
const WalletV2 = require('../models/WalletNew');
const binanceService = require('../services/binance');
const { requireAuth } = require('./auth');

// Get user wallet and balances
router.get('/balances', requireAuth, async (req, res) => {
  try {
    let wallet = await WalletV2.findOne({ userId: req.user.userId });
    
    if (!wallet) {
      // Create new wallet for user with demo starting balance
      wallet = new WalletV2({
        userId: req.user.userId,
        balances: [
          { asset: 'USDT', free: 10000, locked: 0, staked: 0 }, // Demo starting balance
          { asset: 'BTC', free: 0, locked: 0, staked: 0 },
          { asset: 'ETH', free: 0, locked: 0, staked: 0 }
        ]
      });
      await wallet.save();
    }
    
    // Calculate total portfolio value with current prices
    const prices = binanceService.getCachedPrices();
    await wallet.calculateTotalValue(prices);
    await wallet.save();
    
    res.json({
      success: true,
      data: {
        balances: wallet.balances,
        totalValue: wallet.totalValue,
        riskLevel: wallet.riskLevel,
        withdrawalLimits: wallet.withdrawalLimits
      }
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet data'
    });
  }
});

// Get transaction history
router.get('/transactions', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, asset } = req.query;
    const skip = (page - 1) * limit;
    
    const wallet = await WalletV2.findOne({ userId: req.user.userId });
    if (!wallet) {
      return res.json({
        success: true,
        data: {
          transactions: [],
          pagination: { page: 1, limit: 50, total: 0, pages: 0 }
        }
      });
    }
    
    let transactions = wallet.transactions;
    
    // Filter by type if specified
    if (type) {
      transactions = transactions.filter(tx => tx.type === type);
    }
    
    // Filter by asset if specified
    if (asset) {
      transactions = transactions.filter(tx => tx.asset === asset.toUpperCase());
    }
    
    // Sort by timestamp (newest first)
    transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Paginate
    const paginatedTransactions = transactions.slice(skip, skip + parseInt(limit));
    
    res.json({
      success: true,
      data: {
        transactions: paginatedTransactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: transactions.length,
          pages: Math.ceil(transactions.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction history'
    });
  }
});

// Deposit funds (demo implementation)
router.post('/deposit', requireAuth, async (req, res) => {
  try {
    const { asset, amount } = req.body;
    
    if (!asset || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid asset or amount'
      });
    }
    
    let wallet = await WalletV2.findOne({ userId: req.user.userId });
    if (!wallet) {
      wallet = new WalletV2({ userId: req.user.userId });
    }
    
    // Update balance
    const currentBalance = wallet.getBalance(asset);
    wallet.updateBalance(
      asset,
      currentBalance.free + parseFloat(amount),
      currentBalance.locked,
      currentBalance.staked
    );
    
    // Add transaction record
    wallet.addTransaction({
      type: 'deposit',
      asset: asset.toUpperCase(),
      amount: parseFloat(amount),
      status: 'completed'
    });
    
    await wallet.save();
    
    console.log(`Deposit completed for user ${req.user.email}: ${amount} ${asset}`);
    
    res.json({
      success: true,
      data: {
        balance: wallet.getBalance(asset),
        transaction: wallet.transactions[wallet.transactions.length - 1]
      }
    });
  } catch (error) {
    console.error('Error processing deposit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process deposit'
    });
  }
});

// Withdraw funds (demo implementation with security checks)
router.post('/withdraw', requireAuth, async (req, res) => {
  try {
    const { asset, amount, address } = req.body;
    
    if (!asset || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid asset or amount'
      });
    }
    
    const wallet = await WalletV2.findOne({ userId: req.user.userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }
    
    // Check if user has enough balance
    if (!wallet.hasEnoughBalance(asset, amount)) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }
    
    // Process withdrawal
    const currentBalance = wallet.getBalance(asset);
    wallet.updateBalance(
      asset,
      currentBalance.free - parseFloat(amount),
      currentBalance.locked,
      currentBalance.staked
    );
    
    // Add transaction record
    wallet.addTransaction({
      type: 'withdrawal',
      asset: asset.toUpperCase(),
      amount: parseFloat(amount),
      status: 'completed',
      metadata: { address: address || 'demo-address' }
    });
    
    await wallet.save();
    
    console.log(`Withdrawal completed for user ${req.user.email}: ${amount} ${asset}`);
    
    res.json({
      success: true,
      data: {
        balance: wallet.getBalance(asset),
        transaction: wallet.transactions[wallet.transactions.length - 1]
      }
    });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process withdrawal'
    });
  }
});

// Execute trade (integrated with real market data)
router.post('/trade', requireAuth, async (req, res) => {
  try {
    const { symbol, side, type, quantity, price } = req.body;
    
    if (!symbol || !side || !type || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    const wallet = await WalletV2.findOne({ userId: req.user.userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }
    
    // Parse symbol to get base and quote assets
    const baseAsset = symbol.replace('USDT', '').replace('BUSD', '');
    const quoteAsset = 'USDT';
    
    // Get current market price
    const currentPrices = binanceService.getCachedPrices();
    const marketPrice = currentPrices[symbol]?.price || 0;
    const tradePrice = type === 'MARKET' ? marketPrice : parseFloat(price);
    
    if (!tradePrice) {
      return res.status(400).json({
        success: false,
        error: 'Unable to determine trade price'
      });
    }
    
    // Check balances before placing order
    if (side === 'BUY') {
      const requiredAmount = parseFloat(quantity) * tradePrice;
      
      if (!wallet.hasEnoughBalance(quoteAsset, requiredAmount)) {
        return res.status(400).json({
          success: false,
          error: `Insufficient ${quoteAsset} balance. Required: ${requiredAmount}`
        });
      }
    } else {
      if (!wallet.hasEnoughBalance(baseAsset, parseFloat(quantity))) {
        return res.status(400).json({
          success: false,
          error: `Insufficient ${baseAsset} balance. Required: ${quantity}`
        });
      }
    }
    
    // Execute the trade
    if (side === 'BUY') {
      const cost = parseFloat(quantity) * tradePrice;
      
      // Deduct quote asset
      const quoteBalance = wallet.getBalance(quoteAsset);
      wallet.updateBalance(
        quoteAsset,
        quoteBalance.free - cost,
        quoteBalance.locked,
        quoteBalance.staked
      );
      
      // Add base asset
      const baseBalance = wallet.getBalance(baseAsset);
      wallet.updateBalance(
        baseAsset,
        baseBalance.free + parseFloat(quantity),
        baseBalance.locked,
        baseBalance.staked
      );
      
      // Record transaction
      wallet.addTransaction({
        type: 'trade_buy',
        asset: baseAsset,
        amount: parseFloat(quantity),
        price: tradePrice,
        status: 'completed',
        orderId: `demo_${Date.now()}`
      });
    } else {
      const proceeds = parseFloat(quantity) * tradePrice;
      
      // Deduct base asset
      const baseBalance = wallet.getBalance(baseAsset);
      wallet.updateBalance(
        baseAsset,
        baseBalance.free - parseFloat(quantity),
        baseBalance.locked,
        baseBalance.staked
      );
      
      // Add quote asset
      const quoteBalance = wallet.getBalance(quoteAsset);
      wallet.updateBalance(
        quoteAsset,
        quoteBalance.free + proceeds,
        quoteBalance.locked,
        quoteBalance.staked
      );
      
      // Record transaction
      wallet.addTransaction({
        type: 'trade_sell',
        asset: baseAsset,
        amount: parseFloat(quantity),
        price: tradePrice,
        status: 'completed',
        orderId: `demo_${Date.now()}`
      });
    }
    
    await wallet.save();
    
    console.log(`Trade executed for user ${req.user.email}: ${side} ${quantity} ${symbol} at ${tradePrice}`);
    
    res.json({
      success: true,
      data: {
        order: {
          orderId: `demo_${Date.now()}`,
          symbol,
          side,
          type,
          quantity: parseFloat(quantity),
          price: tradePrice,
          status: 'FILLED'
        },
        balances: wallet.balances.filter(b => b.free > 0 || b.locked > 0 || b.staked > 0)
      }
    });
  } catch (error) {
    console.error('Error executing trade:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute trade'
    });
  }
});

module.exports = router;
