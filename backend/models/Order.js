const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  side: { type: String, enum: ['buy', 'sell'], required: true },
  symbol: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  type: { type: String, enum: ['market', 'limit'], required: true },
  status: { type: String, enum: ['open', 'filled', 'cancelled', 'partial'], default: 'open' },
  createdAt: { type: Date, default: Date.now },
  filledQuantity: { type: Number, default: 0 },
  trades: [{
    price: Number,
    quantity: Number,
    timestamp: Date
  }]
});

module.exports = mongoose.model('Order', orderSchema);
