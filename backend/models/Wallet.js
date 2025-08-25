const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  balances: {
    BTC: { type: Number, default: 0 },
    ETH: { type: Number, default: 0 },
    USDT: { type: Number, default: 0 },
    USD: { type: Number, default: 0 }
  },
  transactions: [{
    type: { type: String, enum: ['deposit', 'withdraw', 'trade'], required: true },
    asset: { type: String },
    amount: { type: Number },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    timestamp: { type: Date, default: Date.now },
    txid: { type: String }
  }]
});

module.exports = mongoose.model('Wallet', walletSchema);
