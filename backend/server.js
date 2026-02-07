require('dotenv').config();
const connectDB = require('./config/db'); // Import the connection function
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
// Connect to Database
connectDB(); // <--- ADD THIS LINE

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.io
// CORS is critical here: It allows your Phone (different IP) to talk to the Server
const io = new Server(server, {
  cors: {
    origin: '*', // Allow any origin for development
    methods: ['GET', 'POST']
  }
});

// --- THE RECEIVER LOGIC ---
io.on('connection', (socket) => {
  console.log('✅ New Client Connected:', socket.id);

  // 1. Listen for the 'Join Room' event (Optional for now, but good practice)
  socket.on('join_order', (orderId) => {
    socket.join(orderId);
    console.log(`Socket ${socket.id} joined room: ${orderId}`);
  });

  // 2. Listen for GPS Coordinates (The Core Feature)
  socket.on('update_location', (data) => {
    const { orderId, latitude, longitude, speed } = data;
    
    // VISUAL CONFIRMATION:
    console.log(`📍 UPDATE [${orderId}]: Lat ${latitude}, Lng ${longitude} | Speed: ${speed}`);

    // TODO (Next Step): 
    // - Calculate Distance to Shop
    // - Check if we need to update ETA
    // - Emit 'prep_started' if close enough
  });

  socket.on('disconnect', () => {
    console.log('❌ Client Disconnected:', socket.id);
  });
});

// Start the Server
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Waiting for mobile app connections...`);
});