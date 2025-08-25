const axios = require('axios');
const crypto = require('crypto');
const WebSocket = require('ws');
const winston = require('winston');

const BINANCE_API_KEY = process.env.BINANCE_API_KEY || '';
const BINANCE_API_SECRET = process.env.BINANCE_SECRET_KEY || '';
const BASE_URL = process.env.BINANCE_TESTNET === 'true' ? 'https://testnet.binance.vision' : 'https://api.binance.com';
const WS_BASE_URL = process.env.BINANCE_TESTNET === 'true' ? 'wss://testnet.binance.vision/ws' : 'wss://stream.binance.com:9443/ws';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/binance.log' }),
    new winston.transports.Console()
  ]
});

// Price cache for real-time data
const priceCache = new Map();
const subscribers = new Set();

function sign(queryString) {
  return crypto.createHmac('sha256', BINANCE_API_SECRET).update(queryString).digest('hex');
}

// Real-time price streaming
class BinancePriceStream {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'BNBUSDT', 'SOLUSDT'];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    const streamName = this.symbols.map(s => `${s.toLowerCase()}@ticker`).join('/');
    const wsUrl = `${WS_BASE_URL}/${streamName}`;
    
    logger.info(`Connecting to Binance WebSocket: ${wsUrl}`);
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.on('open', () => {
      logger.info('✅ Binance WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });
    
    this.ws.on('message', (data) => {
      try {
        const ticker = JSON.parse(data);
        this.handlePriceUpdate(ticker);
      } catch (error) {
        logger.error('Error parsing WebSocket data:', error);
      }
    });
    
    this.ws.on('close', () => {
      logger.warn('Binance WebSocket disconnected');
      this.isConnected = false;
      this.reconnect();
    });
    
    this.ws.on('error', (error) => {
      logger.error('Binance WebSocket error:', error);
      this.isConnected = false;
    });
  }

  handlePriceUpdate(ticker) {
    const priceData = {
      symbol: ticker.s,
      price: parseFloat(ticker.c),
      change: parseFloat(ticker.P),
      volume: parseFloat(ticker.v),
      high: parseFloat(ticker.h),
      low: parseFloat(ticker.l),
      timestamp: Date.now()
    };
    
    priceCache.set(ticker.s, priceData);
    
    // Notify all subscribers
    subscribers.forEach(callback => {
      try {
        callback(priceData);
      } catch (error) {
        logger.error('Error notifying subscriber:', error);
      }
    });
  }

  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      
      logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      logger.error('Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}

// Global price stream instance
const priceStream = new BinancePriceStream();

// Subscribe to price updates
function subscribeToPriceUpdates(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

// Get current cached prices
function getCachedPrices() {
  const prices = {};
  priceCache.forEach((data, symbol) => {
    prices[symbol] = data;
  });
  return prices;
}

async function getAccountInfo() {
  try {
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}`;
    const signature = sign(query);
    const url = `${BASE_URL}/api/v3/account?${query}&signature=${signature}`;
    const headers = { 'X-MBX-APIKEY': BINANCE_API_KEY };
    
    logger.info('Fetching Binance account info');
    const res = await axios.get(url, { headers });
    
    return {
      success: true,
      data: res.data,
      balances: res.data.balances.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
    };
  } catch (error) {
    logger.error('Error fetching account info:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.msg || error.message
    };
  }
}

async function placeOrder({ symbol, side, type, quantity, price, timeInForce = 'GTC' }) {
  try {
    const timestamp = Date.now();
    let query = `symbol=${symbol}&side=${side}&type=${type}&quantity=${quantity}&timestamp=${timestamp}`;
    
    if (type === 'LIMIT') {
      query += `&price=${price}&timeInForce=${timeInForce}`;
    }
    
    const signature = sign(query);
    const url = `${BASE_URL}/api/v3/order?${query}&signature=${signature}`;
    const headers = { 'X-MBX-APIKEY': BINANCE_API_KEY };
    
    logger.info(`Placing ${type} order: ${side} ${quantity} ${symbol} ${price ? `at ${price}` : ''}`);
    const res = await axios.post(url, null, { headers });
    
    logger.info(`Order placed successfully: ${res.data.orderId}`);
    return {
      success: true,
      data: res.data
    };
  } catch (error) {
    logger.error('Error placing order:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.msg || error.message
    };
  }
}

async function getOrderStatus(symbol, orderId) {
  try {
    const timestamp = Date.now();
    const query = `symbol=${symbol}&orderId=${orderId}&timestamp=${timestamp}`;
    const signature = sign(query);
    const url = `${BASE_URL}/api/v3/order?${query}&signature=${signature}`;
    const headers = { 'X-MBX-APIKEY': BINANCE_API_KEY };
    
    const res = await axios.get(url, { headers });
    return {
      success: true,
      data: res.data
    };
  } catch (error) {
    logger.error('Error fetching order status:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.msg || error.message
    };
  }
}

async function cancelOrder(symbol, orderId) {
  try {
    const timestamp = Date.now();
    const query = `symbol=${symbol}&orderId=${orderId}&timestamp=${timestamp}`;
    const signature = sign(query);
    const url = `${BASE_URL}/api/v3/order?${query}&signature=${signature}`;
    const headers = { 'X-MBX-APIKEY': BINANCE_API_KEY };
    
    logger.info(`Cancelling order: ${orderId} for ${symbol}`);
    const res = await axios.delete(url, { headers });
    
    return {
      success: true,
      data: res.data
    };
  } catch (error) {
    logger.error('Error cancelling order:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.msg || error.message
    };
  }
}

async function getMarketData(symbol = 'BTCUSDT') {
  try {
    const [ticker, depth] = await Promise.all([
      axios.get(`${BASE_URL}/api/v3/ticker/24hr?symbol=${symbol}`),
      axios.get(`${BASE_URL}/api/v3/depth?symbol=${symbol}&limit=10`)
    ]);
    
    return {
      success: true,
      data: {
        ticker: ticker.data,
        orderBook: depth.data
      }
    };
  } catch (error) {
    logger.error('Error fetching market data:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.msg || error.message
    };
  }
}

async function getKlineData(symbol, interval = '1h', limit = 100) {
  try {
    const url = `${BASE_URL}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await axios.get(url);
    
    const klines = res.data.map(k => ({
      openTime: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      closeTime: k[6]
    }));
    
    return {
      success: true,
      data: klines
    };
  } catch (error) {
    logger.error('Error fetching kline data:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.msg || error.message
    };
  }
}

// Initialize price streaming
function initializePriceStream() {
  if (!priceStream.isConnected) {
    priceStream.connect();
  }
}

// Cleanup function
function cleanup() {
  priceStream.disconnect();
  subscribers.clear();
  priceCache.clear();
}

module.exports = {
  getAccountInfo,
  placeOrder,
  getOrderStatus,
  cancelOrder,
  getMarketData,
  getKlineData,
  subscribeToPriceUpdates,
  getCachedPrices,
  initializePriceStream,
  cleanup,
  priceStream
};
