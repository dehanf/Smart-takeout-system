import * as Location from 'expo-location';
import socketService from './SocketService'; // Import the Singleton

class LocationService {
  constructor() {
    this.subscriber = null; // To keep track of the GPS listener
    this.currentOrderId = null; // We need to know WHICH order we are tracking
  }


  async startTracking(orderId) {
    console.log('Starting GPS Tracking for Order:', orderId);
    this.currentOrderId = orderId;

    // A. Ask for Permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.error('Permission to access location was denied');
      return;
    }

    // B. Enable the Socket Connection (if not already)
    socketService.connect();

    // C. Start Watching Position
    // We use 'watchPositionAsync' instead of 'getCurrentPosition' because
    // we want a continuous stream, not just one point.
    this.subscriber = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High, // Use GPS (not just Wi-Fi) for driving
        timeInterval: 5000,               // Minimum 5 seconds between updates
        distanceInterval: 10,             // Minimum 10 meters change to trigger update
      },
      (location) => {
        // This function runs every time the phone moves
        this.handleNewLocation(location);
      }
    );
  }

  // 2. The Logic to Send Data
  handleNewLocation(location) {
    const { latitude, longitude, speed } = location.coords;

    console.log(`New GPS: ${latitude}, ${longitude} (Speed: ${speed})`);

    // D. Emit to Server via Socket
    socketService.emit('update_location', {
      orderId: this.currentOrderId,
      latitude,
      longitude,
      // Optional: Send speed to help server guess transport mode
      speed: speed, 
    });
  }

  // 3. Stop the "Beacon" (Clean up)
  stopTracking() {
    if (this.subscriber) {
      this.subscriber.remove(); // Stop the GPS chip
      this.subscriber = null;
    }
    this.currentOrderId = null;
    console.log('GPS Tracking Stopped');
  }
}

// Export Singleton
export default new LocationService();

