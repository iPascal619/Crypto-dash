const express = require('express');
const router = express.Router();
const binanceService = require('../services/binance');
const { requireAuth } = require('./auth');

// WebSocket connections for real-time data
const wsConnections = new Set();

// Get current market prices
router.get('/prices', async (req, res) => {
  try {
    const prices = binanceService.getCachedPrices();
    res.json({
      success: true,
      data: prices,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market prices'
    });
  }
});

// Get detailed market data for a symbol
router.get('/market/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const marketData = await binanceService.getMarketData(symbol.toUpperCase());
    
    if (marketData.success) {
      res.json(marketData);
    } else {
      res.status(400).json(marketData);
    }
  } catch (error) {
    console.error('Error fetching market data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market data'
    });
  }
});

// Get kline/candlestick data
router.get('/klines/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1h', limit = 100 } = req.query;
    
    const klineData = await binanceService.getKlineData(
      symbol.toUpperCase(), 
      interval, 
      parseInt(limit)
    );
    
    if (klineData.success) {
      res.json(klineData);
    } else {
      res.status(400).json(klineData);
    }
  } catch (error) {
    console.error('Error fetching kline data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch kline data'
    });
  }
});

// Place a new order (protected route)
router.post('/order', requireAuth, async (req, res) => {
  try {
    const { symbol, side, type, quantity, price } = req.body;
    
    // Validate required fields
    if (!symbol || !side || !type || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, side, type, quantity'
      });
    }
    
    // Validate order type and price
    if (type === 'LIMIT' && !price) {
      return res.status(400).json({
        success: false,
        error: 'Price is required for LIMIT orders'
      });
    }
    
    const orderResult = await binanceService.placeOrder({
      symbol: symbol.toUpperCase(),
      side: side.toUpperCase(),
      type: type.toUpperCase(),
      quantity: parseFloat(quantity),
      price: price ? parseFloat(price) : undefined
    });
    
    if (orderResult.success) {
      // Log the trade for the user
      console.log(`Trade executed for user ${req.user.email}:`, orderResult.data);
      res.json(orderResult);
    } else {
      res.status(400).json(orderResult);
    }
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to place order'
    });
  }
});

// Get order status (protected route)
router.get('/order/:symbol/:orderId', requireAuth, async (req, res) => {
  try {
    const { symbol, orderId } = req.params;
    
    const orderStatus = await binanceService.getOrderStatus(
      symbol.toUpperCase(), 
      orderId
    );
    
    if (orderStatus.success) {
      res.json(orderStatus);
    } else {
      res.status(400).json(orderStatus);
    }
  } catch (error) {
    console.error('Error fetching order status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order status'
    });
  }
});

// Cancel an order (protected route)
router.delete('/order/:symbol/:orderId', requireAuth, async (req, res) => {
  try {
    const { symbol, orderId } = req.params;
    
    const cancelResult = await binanceService.cancelOrder(
      symbol.toUpperCase(), 
      orderId
    );
    
    if (cancelResult.success) {
      console.log(`Order cancelled for user ${req.user.email}:`, cancelResult.data);
      res.json(cancelResult);
    } else {
      res.status(400).json(cancelResult);
    }
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order'
    });
  }
});

// WebSocket endpoint for real-time price updates
router.get('/ws/prices', (req, res) => {
  res.json({
    message: 'WebSocket endpoint available at /api/market/stream',
    instructions: 'Connect using WebSocket protocol'
  });
});

// Trading pairs and exchange info
router.get('/info', async (req, res) => {
  try {
    // Static trading pairs for now - can be fetched from Binance
    const tradingPairs = [
      {
        symbol: 'BTCUSDT',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
        status: 'TRADING',
        minQty: 0.00001,
        maxQty: 9000,
        stepSize: 0.00001,
        minPrice: 0.01,
        maxPrice: 1000000,
        tickSize: 0.01
      },
      {
        symbol: 'ETHUSDT',
        baseAsset: 'ETH',
        quoteAsset: 'USDT',
        status: 'TRADING',
        minQty: 0.0001,
        maxQty: 90000,
        stepSize: 0.0001,
        minPrice: 0.01,
        maxPrice: 100000,
        tickSize: 0.01
      },
      {
        symbol: 'ADAUSDT',
        baseAsset: 'ADA',
        quoteAsset: 'USDT',
        status: 'TRADING',
        minQty: 0.1,
        maxQty: 90000000,
        stepSize: 0.1,
        minPrice: 0.0001,
        maxPrice: 1000,
        tickSize: 0.0001
      }
    ];
    
    res.json({
      success: true,
      data: {
        exchange: 'Binance',
        tradingPairs,
        serverTime: Date.now()
      }
    });
  } catch (error) {
    console.error('Error fetching exchange info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch exchange info'
    });
  }
});

module.exports = router;
