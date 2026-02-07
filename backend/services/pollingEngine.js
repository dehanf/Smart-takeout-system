// backend/services/pollingEngine.js
const Order = require('../models/Order');
const { getLiveETA } = require('./mapsService'); // Import the wrapper

// CONFIGURATION
const SLACK_BUFFER_MINUTES = 1; 

const processLocationUpdate = async (io, data) => {
  const { orderId, latitude, longitude } = data;

  try {
    const order = await Order.findById(orderId);
    if (!order || order.status !== 'TRACKING') return;

    // --- SMART LOGIC: WHEN TO CALL GOOGLE? ---
    // Option A: Only call if 1 minute has passed since last check
    // Option B: Only call if user moved > 500m
    // For now, let's assume we call it every time (WARNING: COSTS MONEY)
    // In production, you MUST save 'lastCheckedTime' in DB and compare.

    console.log(`🌍 Calling Google Maps for accurate traffic data...`);

    // 1. Get Exact Duration from Google (in seconds)
    const durationSeconds = await getLiveETA(
      latitude, 
      longitude, 
      order.shopLocation.lat, 
      order.shopLocation.lng
    );

    if (!durationSeconds) {
       console.log('⚠️ Google API failed, skipping this update.');
       return; 
    }

    const etaMinutes = Math.round(durationSeconds / 60);

    // 2. Calculate Slack Time
    // Slack = (Live ETA) - (Prep Time)
    const slackTime = etaMinutes - order.prepTime;

    console.log(`🚦 Google Says: ${etaMinutes} mins away | Prep: ${order.prepTime}m | Slack: ${slackTime}m`);

    // 3. THE DECISION
    if (slackTime <= SLACK_BUFFER_MINUTES) {
      
      // Trigger Prep
      order.status = 'PREPARING';
      await order.save();

      io.emit('prep_started', {
        orderId: orderId,
        message: `START COOKING! Traffic-adjusted ETA: ${etaMinutes} mins.`
      });

      console.log(`🔥 JIT TRIGGERED (Verified by Google Maps)`);
    } else {
       // Just update dashboard
       io.emit('eta_update', {
        orderId: orderId,
        eta: etaMinutes,
        slack: slackTime
      });
    }

  } catch (error) {
    console.error('Engine Error:', error);
  }
};

module.exports = { processLocationUpdate };