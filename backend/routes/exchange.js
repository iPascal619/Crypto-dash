const express = require('express');
const { requireAuth } = require('./auth');
const binance = require('../services/binance');
const router = express.Router();

// Get Binance account info
router.get('/binance/account', requireAuth, async (req, res) => {
  try {
    const info = await binance.getAccountInfo();
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: 'Binance API error' });
  }
});

// Place Binance order
router.post('/binance/order', requireAuth, async (req, res) => {
  try {
    const { symbol, side, type, quantity, price } = req.body;
    const result = await binance.placeOrder({ symbol, side, type, quantity, price });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Order failed' });
  }
});

// Get market price
router.get('/binance/price/:symbol', async (req, res) => {
  try {
    const price = await binance.getMarketPrice(req.params.symbol);
    res.json(price);
  } catch (err) {
    res.status(500).json({ error: 'Price fetch failed' });
  }
});

module.exports = router;
