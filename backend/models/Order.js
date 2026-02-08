const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true,
  },
  // THE STATUS MACHINE
  // TRACKING: Driver is moving, engine is calculating ETA.
  // PREPARING: Slack Time reached <= 1 min. Kitchen is cooking.
  // READY: Kitchen finished cooking. 
  status: {
    type: String,
    enum: ['TRACKING', 'PREPARING', 'READY', 'COMPLETED'],
    default: 'TRACKING',
  },

  // THE STATIONARY ANCHOR (The Shop)
  shopLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String }
  },

  // THE JIT CONSTANTS
  prepTime: { 
    type: Number, 
    required: true,
    help: "Time in minutes the kitchen needs to cook this order" 
  },

  // THE COST-SAVER (Throttling)
  lastGoogleCheck: { 
    type: Date, 
    default: null,
    help: "Used to ensure we only call Google Maps API once every 60 seconds"
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Order', OrderSchema);