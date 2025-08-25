const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['deposit', 'withdrawal', 'trade_buy', 'trade_sell', 'fee'], 
    required: true 
  },
  asset: { type: String, required: true },
  amount: { type: Number, required: true },
  price: { type: Number }, // Price at time of transaction
  fee: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'cancelled'], 
    default: 'pending' 
  },
  txHash: { type: String }, // Blockchain transaction hash
  orderId: { type: String }, // Associated order ID
  timestamp: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed } // Additional transaction data
});

const balanceSchema = new mongoose.Schema({
  asset: { type: String, required: true },
  free: { type: Number, default: 0 }, // Available balance
  locked: { type: Number, default: 0 }, // Locked in orders
  staked: { type: Number, default: 0 }, // Staked amount
  lastUpdated: { type: Date, default: Date.now }
});

const walletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balances: [balanceSchema],
  transactions: [transactionSchema],
  totalValue: { type: Number, default: 0 }, // Total portfolio value in USDT
  isActive: { type: Boolean, default: true },
  riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  withdrawalLimits: {
    daily: { type: Number, default: 10000 }, // Daily withdrawal limit in USDT
    monthly: { type: Number, default: 100000 } // Monthly withdrawal limit in USDT
  },
  securitySettings: {
    twoFactorRequired: { type: Boolean, default: false },
    withdrawalWhitelist: [String], // Whitelisted withdrawal addresses
    maxOrderSize: { type: Number, default: 50000 } // Maximum single order size in USDT
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for better performance
walletSchema.index({ userId: 1 });
walletSchema.index({ 'balances.asset': 1 });
walletSchema.index({ 'transactions.timestamp': -1 });
walletSchema.index({ 'transactions.status': 1 });

// Methods
walletSchema.methods.getBalance = function(asset) {
  const balance = this.balances.find(b => b.asset === asset.toUpperCase());
  return balance || { asset: asset.toUpperCase(), free: 0, locked: 0, staked: 0 };
};

walletSchema.methods.getTotalBalance = function(asset) {
  const balance = this.getBalance(asset);
  return balance.free + balance.locked + balance.staked;
};

walletSchema.methods.updateBalance = function(asset, free = 0, locked = 0, staked = 0) {
  const balanceIndex = this.balances.findIndex(b => b.asset === asset.toUpperCase());
  
  if (balanceIndex >= 0) {
    this.balances[balanceIndex].free = Math.max(0, free);
    this.balances[balanceIndex].locked = Math.max(0, locked);
    this.balances[balanceIndex].staked = Math.max(0, staked);
    this.balances[balanceIndex].lastUpdated = new Date();
  } else {
    this.balances.push({
      asset: asset.toUpperCase(),
      free: Math.max(0, free),
      locked: Math.max(0, locked),
      staked: Math.max(0, staked),
      lastUpdated: new Date()
    });
  }
  
  this.updatedAt = new Date();
};

walletSchema.methods.addTransaction = function(transactionData) {
  this.transactions.push({
    ...transactionData,
    timestamp: new Date()
  });
  this.updatedAt = new Date();
};

walletSchema.methods.hasEnoughBalance = function(asset, amount) {
  const balance = this.getBalance(asset);
  return balance.free >= amount;
};

walletSchema.methods.lockBalance = function(asset, amount) {
  const balance = this.getBalance(asset);
  if (balance.free >= amount) {
    this.updateBalance(
      asset, 
      balance.free - amount, 
      balance.locked + amount, 
      balance.staked
    );
    return true;
  }
  return false;
};

walletSchema.methods.unlockBalance = function(asset, amount) {
  const balance = this.getBalance(asset);
  if (balance.locked >= amount) {
    this.updateBalance(
      asset, 
      balance.free + amount, 
      balance.locked - amount, 
      balance.staked
    );
    return true;
  }
  return false;
};

// Calculate total portfolio value
walletSchema.methods.calculateTotalValue = async function(priceData = {}) {
  let totalValue = 0;
  
  for (const balance of this.balances) {
    const totalAmount = balance.free + balance.locked + balance.staked;
    
    if (balance.asset === 'USDT' || balance.asset === 'USD') {
      totalValue += totalAmount;
    } else {
      // Get price from provided data or use cached price
      const priceKey = `${balance.asset}USDT`;
      const price = priceData[priceKey]?.price || 0;
      totalValue += totalAmount * price;
    }
  }
  
  this.totalValue = totalValue;
  return totalValue;
};

// Pre-save middleware
walletSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('WalletV2', walletSchema);
