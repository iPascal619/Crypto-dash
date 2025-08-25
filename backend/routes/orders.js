const express = require('express');
const Order = require('../models/Order');
const { requireAuth } = require('./auth');
const router = express.Router();

// Place new order
router.post('/place', requireAuth, async (req, res) => {
  const { side, symbol, price, quantity, type } = req.body;
  if (!side || !symbol || !price || !quantity || !type) return res.status(400).json({ error: 'Missing order fields' });
  const order = new Order({ userId: req.user.userId, side, symbol, price, quantity, type });
  await order.save();
  res.status(201).json({ order });
});

// Get order book for a symbol
router.get('/book/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  const buys = await Order.find({ symbol, side: 'buy', status: 'open' }).sort({ price: -1 });
  const sells = await Order.find({ symbol, side: 'sell', status: 'open' }).sort({ price: 1 });
  res.json({ buys, sells });
});

// Get user orders
router.get('/my', requireAuth, async (req, res) => {
  const orders = await Order.find({ userId: req.user.userId });
  res.json({ orders });
});

// Simulated matching engine (fills matching orders)
router.post('/match/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  const buys = await Order.find({ symbol, side: 'buy', status: 'open' }).sort({ price: -1 });
  const sells = await Order.find({ symbol, side: 'sell', status: 'open' }).sort({ price: 1 });
  let trades = [];
  for (const buy of buys) {
    for (const sell of sells) {
      if (buy.price >= sell.price && buy.status === 'open' && sell.status === 'open') {
        const fillQty = Math.min(buy.quantity - buy.filledQuantity, sell.quantity - sell.filledQuantity);
        if (fillQty > 0) {
          buy.filledQuantity += fillQty;
          sell.filledQuantity += fillQty;
          buy.trades.push({ price: sell.price, quantity: fillQty, timestamp: new Date() });
          sell.trades.push({ price: sell.price, quantity: fillQty, timestamp: new Date() });
          if (buy.filledQuantity >= buy.quantity) buy.status = 'filled';
          if (sell.filledQuantity >= sell.quantity) sell.status = 'filled';
          await buy.save();
          await sell.save();
          trades.push({ buyId: buy._id, sellId: sell._id, price: sell.price, quantity: fillQty });
        }
      }
    }
  }
  res.json({ trades });
});

module.exports = router;
