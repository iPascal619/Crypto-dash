const express = require('express');
const { requireAuth } = require('./auth');
const coinbase = require('../services/coinbase');
const router = express.Router();

// Get Coinbase account info
router.get('/account', requireAuth, async (req, res) => {
  try {
    const info = await coinbase.getAccountInfo();
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: 'Coinbase API error' });
  }
});

// Place Coinbase order
router.post('/order', requireAuth, async (req, res) => {
  try {
    const { product_id, side, price, size, type } = req.body;
    const result = await coinbase.placeOrder({ product_id, side, price, size, type });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Order failed' });
  }
});

// Get market price
router.get('/price/:product_id', async (req, res) => {
  try {
    const price = await coinbase.getMarketPrice(req.params.product_id);
    res.json(price);
  } catch (err) {
    res.status(500).json({ error: 'Price fetch failed' });
  }
});

module.exports = router;
