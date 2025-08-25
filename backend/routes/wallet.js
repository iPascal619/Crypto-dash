const express = require('express');
const Wallet = require('../models/Wallet');
const { requireAuth } = require('./auth');
const router = express.Router();

// Get wallet balances
router.get('/balances', requireAuth, async (req, res) => {
  let wallet = await Wallet.findOne({ userId: req.user.userId });
  if (!wallet) {
    wallet = new Wallet({ userId: req.user.userId });
    await wallet.save();
  }
  res.json({ balances: wallet.balances });
});

// Deposit funds (simulate, ready for real integration)
router.post('/deposit', requireAuth, async (req, res) => {
  const { asset, amount } = req.body;
  if (!asset || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid deposit' });
  let wallet = await Wallet.findOne({ userId: req.user.userId });
  if (!wallet) {
    wallet = new Wallet({ userId: req.user.userId });
  }
  wallet.balances[asset] = (wallet.balances[asset] || 0) + amount;
  wallet.transactions.push({ type: 'deposit', asset, amount, status: 'completed', timestamp: new Date() });
  await wallet.save();
  res.json({ balances: wallet.balances });
});

// Withdraw funds (simulate, ready for real integration)
router.post('/withdraw', requireAuth, async (req, res) => {
  const { asset, amount } = req.body;
  if (!asset || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid withdrawal' });
  let wallet = await Wallet.findOne({ userId: req.user.userId });
  if (!wallet || (wallet.balances[asset] || 0) < amount) return res.status(400).json({ error: 'Insufficient balance' });
  wallet.balances[asset] -= amount;
  wallet.transactions.push({ type: 'withdraw', asset, amount, status: 'completed', timestamp: new Date() });
  await wallet.save();
  res.json({ balances: wallet.balances });
});

// Get transaction history
router.get('/transactions', requireAuth, async (req, res) => {
  let wallet = await Wallet.findOne({ userId: req.user.userId });
  if (!wallet) return res.json({ transactions: [] });
  res.json({ transactions: wallet.transactions });
});

module.exports = router;
