// backend/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const orderRoutes = require('./routes/orderRoutes'); // Import new routes
const { processLocationUpdate } = require('./services/pollingEngine');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // Adjust for production security
});

// 1. DATABASE CONNECTION
connectDB();

// 2. MIDDLEWARE
app.use(express.json()); // CRITICAL: Allows server to read JSON from mobile app

// 3. REST API ROUTES (For Creating Orders)
app.use('/api/orders', orderRoutes);

// 4. WEBSOCKET LOGIC (For Live Tracking)
io.on('connection', (socket) => {
  console.log('⚡ User connected:', socket.id);

  // Join a specific room for the order to ensure targeted communication
  socket.on('join_order', (orderId) => {
    socket.join(orderId);
    console.log(`👥 Socket ${socket.id} joined Order Room: ${orderId}`);
  });

  // Handle incoming GPS packets from the Mobile Client
  socket.on('update_location', (data) => {
    // data = { orderId, latitude, longitude }
    processLocationUpdate(io, data);
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 JIT Server running on port ${PORT}`);
});