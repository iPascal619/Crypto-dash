const axios = require('axios');
const crypto = require('crypto');

const COINBASE_API_KEY = process.env.COINBASE_API_KEY || '';
const COINBASE_API_SECRET = process.env.COINBASE_API_SECRET || '';
const COINBASE_PASSPHRASE = process.env.COINBASE_PASSPHRASE || '';
const BASE_URL = 'https://api.exchange.coinbase.com';

function getSignature(requestPath, method, body, timestamp) {
  const what = timestamp + method + requestPath + body;
  const key = Buffer.from(COINBASE_API_SECRET, 'base64');
  return crypto.createHmac('sha256', key).update(what).digest('base64');
}

async function getAccountInfo() {
  const timestamp = String(Date.now() / 1000);
  const method = 'GET';
  const requestPath = '/accounts';
  const body = '';
  const signature = getSignature(requestPath, method, body, timestamp);
  const headers = {
    'CB-ACCESS-KEY': COINBASE_API_KEY,
    'CB-ACCESS-SIGN': signature,
    'CB-ACCESS-TIMESTAMP': timestamp,
    'CB-ACCESS-PASSPHRASE': COINBASE_PASSPHRASE
  };
  const url = BASE_URL + requestPath;
  const res = await axios.get(url, { headers });
  return res.data;
}

async function placeOrder({ product_id, side, price, size, type }) {
  const timestamp = String(Date.now() / 1000);
  const method = 'POST';
  const requestPath = '/orders';
  const bodyObj = { product_id, side, price, size, type };
  const body = JSON.stringify(bodyObj);
  const signature = getSignature(requestPath, method, body, timestamp);
  const headers = {
    'CB-ACCESS-KEY': COINBASE_API_KEY,
    'CB-ACCESS-SIGN': signature,
    'CB-ACCESS-TIMESTAMP': timestamp,
    'CB-ACCESS-PASSPHRASE': COINBASE_PASSPHRASE,
    'Content-Type': 'application/json'
  };
  const url = BASE_URL + requestPath;
  const res = await axios.post(url, bodyObj, { headers });
  return res.data;
}

async function getMarketPrice(product_id) {
  const url = `${BASE_URL}/products/${product_id}/ticker`;
  const res = await axios.get(url);
  return res.data;
}

module.exports = { getAccountInfo, placeOrder, getMarketPrice };
