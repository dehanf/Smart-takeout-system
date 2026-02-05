import { io } from 'socket.io-client';

// Replace with your actual Local IP (e.g., 192.168.1.5) for testing on a real phone
// Do NOT use 'localhost' if testing on a real device, as 'localhost' refers to the phone itself.
const SOCKET_URL = 'http://YOUR_PC_IP_ADDRESS:3001'; 

class SocketService {
  constructor() {
    this.socket = null;
  }

  // 1. Initialize the connection
  connect() {
    // Prevent multiple connections
    if (this.socket) return;

    console.log('Initializing Socket Connection...');
    
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'], // Force WebSocket to avoid polling delays
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Socket Connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket Connection Error:', error);
    });
  }

  // 2. Disconnect manually (save battery when order is done)
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('Socket Manually Disconnected');
    }
  }

  // 3. Emit Data (Send to Server)
  // Usage: SocketService.emit('update_location', { lat: 10, lng: 10 })
  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Cannot emit: Socket not connected');
    }
  }

  // 4. Listen for Data (Receive from Server)
  // Usage: SocketService.on('start_prep', (data) => { ... })
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // 5. Remove Listener (Clean up memory)
  off(event) {
    if (this.socket) {
      this.socket.off(event);
    }
  }
}

// Export a single instance (Singleton Pattern)
const socketService = new SocketService();
export default socketService;