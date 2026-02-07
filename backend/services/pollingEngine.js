const Order = require('../models/Order');
const { getLiveETA } = require('./mapsService');

const SLACK_BUFFER_MINUTES = 1; 
const GOOGLE_CHECK_INTERVAL_MS = 60000; // 1 minute cooldown

const processLocationUpdate = async (io, data) => {
  const { orderId, latitude, longitude } = data;

  try {
    const order = await Order.findById(orderId);
    
    // EDIT 3: Don't process if order is already being prepared or done
    if (!order || order.status !== 'TRACKING') return;

    // EDIT 1: The Throttling Logic (Save Money)
    const now = Date.now();
    const lastCheck = order.lastGoogleCheck ? new Date(order.lastGoogleCheck).getTime() : 0;
    
    if (now - lastCheck < GOOGLE_CHECK_INTERVAL_MS) {
      console.log(`⏱️ Skipping Google API: Last check was ${(now - lastCheck)/1000}s ago.`);
      return; 
    }

    console.log(`🌍 Calling Google Maps for Order: ${orderId}`);

    const durationSeconds = await getLiveETA(
      latitude, 
      longitude, 
      order.shopLocation.lat, 
      order.shopLocation.lng
    );

    if (!durationSeconds) return;

    // Update the timestamp in the DB
    order.lastGoogleCheck = now;
    const etaMinutes = Math.round(durationSeconds / 60);
    const slackTime = etaMinutes - order.prepTime;

    console.log(`🚦 ETA: ${etaMinutes}m | Prep: ${order.prepTime}m | Slack: ${slackTime}m`);

    if (slackTime <= SLACK_BUFFER_MINUTES) {
      order.status = 'PREPARING';
      await order.save();

      // EDIT 2: Targeted Broadcasting using Rooms
      io.to(orderId).emit('prep_started', {
        orderId: orderId,
        message: `START COOKING! Driver arrives in ${etaMinutes} mins.`
      });

      console.log(`🔥 JIT TRIGGERED`);
    } else {
      // EDIT 2: Targeted Broadcasting
      io.to(orderId).emit('eta_update', {
        orderId: orderId,
        eta: etaMinutes,
        slack: slackTime
      });
      
      await order.save(); // Save the lastGoogleCheck timestamp
    }

  } catch (error) {
    console.error('Engine Error:', error);
  }
};

module.exports = { processLocationUpdate };