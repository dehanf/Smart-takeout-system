# Just-In-Time (JIT) Logistics System - Implementation Master Plan

## 1. Project Overview

**Goal:** To eliminate customer wait times and ensure food freshness by synchronizing the kitchen's preparation start time exactly with the customer's arrival.

**Core Concept:** A real-time tracking system that uses "Adaptive Polling" to calculate the user's ETA and triggers a "Start Prep" alert on the shop dashboard exactly when `ETA - PrepTime <= 1 minute`.

---

## 2. System Architecture

The system operates on a **Publisher-Subscriber** model enhanced with **Intelligent Throttling**.

### The Three Pillars

1. **The Publisher (Mobile App):** Acts as a "dumb beacon." It continuously streams raw GPS data via a persistent WebSocket connection.

2. **The Filter (Backend Server):** Acts as the "gatekeeper." It receives the stream, filters out noise, checks the distance, and decides *when* to pay for a Google Maps API call.

3. **The Subscriber (Shop Dashboard):** Receives the calculated "Slack Time" and prioritizes orders visually using a Min-Heap data structure.

### High-Level Data Flow

1. **Input:** User moves → Phone GPS triggers → Socket emits coordinates.
2. **Process:** Server receives coordinates → Calculates distance → Calls Google Maps (if needed).
3. **Output:** Server pushes new ETA to Dashboard → Dashboard updates Order Card position.

---

## 3. Key Engineering Techniques

### A. Client-Side (Mobile)

**Singleton Pattern:**
- *Files:* `SocketService.js`, `LocationService.js`
- *Why:* Ensures only *one* WebSocket connection and *one* GPS listener exist throughout the app's lifecycle. Prevents memory leaks, battery drain, and duplicate signals.

**Background Services:**
- *Why:* Keeps the GPS logic running even when the app is minimized or the phone is locked.

### B. Server-Side (Backend)

**Adaptive Polling (The "Cost Saver"):**
- *Logic:*
  - **Zone 1 (> 5km):** Poll Google Maps every **5 minutes**.
  - **Zone 2 (1-5km):** Poll Google Maps every **1 minute**.
  - **Zone 3 (< 1km):** Poll Google Maps every **30 seconds**.

**Throttling:**
- *Why:* The server ignores GPS updates if the user hasn't moved at least 100 meters since the last check, reducing unnecessary processing.

### C. Dashboard (Frontend)

**Min-Heap Data Structure:**
- *Why:* Mathematically guarantees that the order with the *least* slack time is always at the top of the list ($O(1)$ access time). Essential for high-stress kitchen environments where sorting arrays manually is too slow.

---

## 4. Detailed File Structure & Responsibilities

### A. Backend (Node.js & Express)

*Handles business logic, API cost management, and data persistence.*

```
/backend
├── /config
│   ├── db.js                    # Database connection (Mongoose).
│   └── maps.js                  # Google Maps API Client configuration.
│
├── /models
│   ├── Order.js                 # Mongoose Schema. Defines the Status Enum (pending -> tracking -> preparing).
│   └── Shop.js                  # Stores shop coordinates for distance calculation.
│
├── /services
│   ├── socketManager.js         # Manages WebSocket Rooms (e.g., "room_shop_1").
│   ├── pollingEngine.js         # THE BRAIN. Contains the "Adaptive Polling" logic.
│   └── mapsService.js           # Wrapper for Google Maps Distance Matrix API.
│
├── /controllers
│   └── orderController.js       # REST API logic (Create Order, Accept Order).
│
├── /routes
│   └── orderRoutes.js           # API Endpoints (/api/orders).
│
├── server.js                    # Entry Point. Initializes Socket.io and Express.
└── .env                         # Secrets (MONGO_URI, GOOGLE_MAPS_KEY).
```

### B. Mobile Client (React Native / Expo)

*Handles hardware interaction (GPS) and user experience.*

```
/mobile-client
├── /src
│   ├── /api
│   │   └── client.js            # Axios instance for REST API calls.
│   │
│   ├── /context
│   │   └── OrderContext.js      # Global State. Stores 'activeOrderId' for the tracking service.
│   │
│   ├── /screens
│   │   ├── MenuScreen.js        # UI: Pick items.
│   │   ├── CheckoutScreen.js    # UI: Pay and Create Order.
│   │   └── TrackingScreen.js    # UI: The "Active" screen. Displays status messages.
│   │
│   ├── /services
│   │   ├── LocationService.js   # THE SOURCE. Handles GPS permissions, filtering, and emits to Socket.
│   │   └── SocketService.js     # THE TRANSMITTER. Singleton. Manages persistent connection.
│   │
│   └── /utils
│       └── constants.js         # Config (API_URL, POLL_INTERVALS).
│
├── App.js                       # Root component.
└── app.json                     # Expo config (Permissions).
```

### C. Shop Dashboard (React Web)

*The "Control Tower" for the kitchen.*

```
/dashboard-client
├── /src
│   ├── /components
│   │   ├── OrderCard.js         # UI: Displays individual order details.
│   │   └── AlertSound.js        # UI: Audio trigger when Slack Time <= 1 min.
│   │
│   ├── /datastructures
│   │   └── MinHeap.js           # THE ALGORITHM. Sorts orders by urgency.
│   │
│   ├── /hooks
│   │   └── useSocket.js         # Custom Hook to listen for order updates.
│   │
│   └── /pages
│       └── Dashboard.js         # Main View. Visualizes the Min-Heap.
│
└── public/
    └── alert.mp3                # Audio file for alerts.
```

---

## 5. Implementation Roadmap

### Phase 1: Core Infrastructure

**Backend:**
- Set up Node.js server, MongoDB connection, and basic Order schema.

**Mobile:**
- Set up React Native project and build the SocketService (Transmitter).

**Connectivity:**
- Verify phone can connect to laptop via Local IP (192.168.x.x).

### Phase 2: The "Beacon" (Client Side)

- Implement LocationService.js using expo-location.
- Implement TrackingScreen.js to trigger the service.
- **Test:** Verify server receives console logs of GPS coordinates when you walk around.

### Phase 3: The "Brain" (Server Side)

- Implement pollingEngine.js on the backend.
- Connect to Google Maps Distance Matrix API.
- Write logic to update Order.googleETA in the database.

### Phase 4: The "Control Tower" (Dashboard)

- Build the React Dashboard.
- Implement the MinHeap class in JavaScript.
- Connect dashboard to Socket.io to receive live updates.

---

## 6. Infrastructure & Deployment

### Environment Variables

- **MONGO_URI:** Database connection string.
- **MAPS_KEY:** Critical Security. Restrict this key in Google Cloud Console to only allow requests from your server IP.
- **PORT:** Default 3001.

### Security Note

**HTTPS is Mandatory:** In production, you must use HTTPS. Browsers/OS will block Geolocation access on insecure HTTP connections.

**Git Ignore:** Ensure .env and google-services.json are added to .gitignore to prevent leaking keys.

---

## 7. Key Algorithms & Code Patterns

### Adaptive Polling Logic (pollingEngine.js)

```javascript
function calculatePollingInterval(distanceInKm) {
  if (distanceInKm > 5) {
    return 5 * 60 * 1000; // 5 minutes
  } else if (distanceInKm > 1) {
    return 60 * 1000; // 1 minute
  } else {
    return 30 * 1000; // 30 seconds
  }
}
```

### Throttling Logic

```javascript
const MIN_DISTANCE_THRESHOLD = 100; // meters

function shouldUpdateLocation(currentLoc, previousLoc) {
  const distance = haversineDistance(currentLoc, previousLoc);
  return distance >= MIN_DISTANCE_THRESHOLD;
}
```

### Min-Heap Implementation (MinHeap.js)

```javascript
class MinHeap {
  constructor() {
    this.heap = [];
  }

  insert(order) {
    this.heap.push(order);
    this.bubbleUp(this.heap.length - 1);
  }

  extractMin() {
    const min = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this.bubbleDown(0);
    }
    return min;
  }

  bubbleUp(index) {
    const element = this.heap[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];
      if (element.slackTime >= parent.slackTime) break;
      this.heap[index] = parent;
      index = parentIndex;
    }
    this.heap[index] = element;
  }

  bubbleDown(index) {
    const length = this.heap.length;
    const element = this.heap[index];
    while (true) {
      let childIndex = null;
      const leftChildIndex = 2 * index + 1;
      const rightChildIndex = 2 * index + 2;

      if (leftChildIndex < length) {
        if (this.heap[leftChildIndex].slackTime < element.slackTime) {
          childIndex = leftChildIndex;
        }
      }

      if (rightChildIndex < length) {
        if (
          (childIndex === null && this.heap[rightChildIndex].slackTime < element.slackTime) ||
          (childIndex !== null && this.heap[rightChildIndex].slackTime < this.heap[leftChildIndex].slackTime)
        ) {
          childIndex = rightChildIndex;
        }
      }

      if (childIndex === null) break;
      this.heap[index] = this.heap[childIndex];
      index = childIndex;
    }
    this.heap[index] = element;
  }
}
```

---

## 8. Data Models

### Order Schema (Order.js)

```javascript
const orderSchema = new mongoose.Schema({
  orderId: String,
  customerId: String,
  shopId: String,
  items: [{ name: String, quantity: Number }],
  status: {
    type: String,
    enum: ['pending', 'tracking', 'preparing', 'ready', 'completed'],
    default: 'pending'
  },
  customerLocation: {
    latitude: Number,
    longitude: Number,
    timestamp: Date
  },
  googleETA: Number, // in minutes
  prepTime: Number, // in minutes (kitchen preparation time)
  slackTime: Number, // = googleETA - prepTime
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### Shop Schema (Shop.js)

```javascript
const shopSchema = new mongoose.Schema({
  shopId: String,
  name: String,
  location: {
    latitude: Number,
    longitude: Number
  },
  averagePrepTime: Number, // in minutes
  createdAt: { type: Date, default: Date.now }
});
```

---

## 9. WebSocket Events

### Client → Server

- **`location:update`** - Emits user's current GPS coordinates.
  ```javascript
  socket.emit('location:update', {
    orderId: '12345',
    latitude: 40.7128,
    longitude: -74.0060,
    timestamp: Date.now()
  });
  ```

### Server → Client

- **`order:eta-updated`** - Pushes new ETA to dashboard.
  ```javascript
  socket.emit('order:eta-updated', {
    orderId: '12345',
    googleETA: 8,
    slackTime: 5
  });
  ```

- **`order:start-prep`** - Triggers "Start Preparing" alert.
  ```javascript
  socket.emit('order:start-prep', {
    orderId: '12345',
    customerName: 'John Doe'
  });
  ```

---

## 10. Testing Strategy

### Unit Tests

- Test Adaptive Polling logic with various distances.
- Test Throttling with mock GPS updates.
- Test Min-Heap insertion, extraction, and bubble operations.

### Integration Tests

- Test end-to-end flow: Order creation → Tracking → Preparation alert.
- Verify WebSocket communication between mobile, server, and dashboard.

### Load Testing

- Simulate 100+ concurrent orders tracking simultaneously.
- Verify Google Maps API calls are cost-optimized.

---

## 11. Monitoring & Analytics

### Metrics to Track

- **Average Slack Time:** Should be > 2 minutes for safety margin.
- **API Call Count:** Monitor to optimize Adaptive Polling intervals.
- **User Engagement:** Track how many customers use the tracking feature.
- **Order Accuracy:** Percentage of orders prepared exactly on time (±1 minute).

### Logging

- Log all location updates for debugging.
- Log ETA calculations for accuracy audits.
- Log kitchen preparation times to refine estimates.

---

## 12. Future Enhancements

- **Machine Learning:** Predict ETA using historical traffic patterns.
- **Multiple Delivery Methods:** Support in-store pickup, delivery, curbside pickup.
- **Customer Notifications:** Push notifications when order is ready.
- **Analytics Dashboard:** KPIs for shop owners (efficiency, customer satisfaction).
- **Barcode Scanning:** Quick handoff process at the counter.
- **Real-Time Traffic Integration:** Adjust ETA based on live traffic conditions.

---

## 13. Quick Start Guide

### Prerequisites

- Node.js v16+
- MongoDB Atlas account
- Google Maps API key
- React Native / Expo CLI
- React 18+

### Setup Steps

1. **Clone repositories:**
   ```bash
   git clone <backend-repo>
   git clone <mobile-repo>
   git clone <dashboard-repo>
   ```

2. **Backend setup:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Add your credentials to .env
   npm start
   ```

3. **Mobile setup:**
   ```bash
   cd mobile-client
   npm install
   npx expo start
   ```

4. **Dashboard setup:**
   ```bash
   cd dashboard-client
   npm install
   npm start
   ```

5. **Test connectivity:**
   - Verify backend is running on `http://localhost:3001`
   - Connect mobile app to server via local IP
   - Open dashboard and verify WebSocket connection

---

## 14. Troubleshooting

| Issue | Solution |
|-------|----------|
| Mobile can't connect to backend | Ensure both devices are on the same WiFi. Use your machine's IP (not localhost). |
| GPS not triggering | Check location permissions in `app.json`. Ensure `expo-location` is installed. |
| Dashboard not updating | Verify Socket.io connection in browser DevTools. Check server console for errors. |
| High Google Maps API costs | Review Adaptive Polling intervals. Increase throttling threshold to 150 meters. |
| Min-Heap sorting incorrect | Verify `slackTime` is calculated correctly. Debug heap operations in browser console. |

---

## 15. Conclusion

This JIT Logistics System represents a modern approach to food delivery optimization. By combining real-time GPS tracking, intelligent polling, and smart data structures, we create a seamless experience that ensures food is prepared exactly when the customer arrives—no waiting, maximum freshness.

The system is designed to be scalable, cost-efficient, and maintainable. Follow the implementation roadmap, test thoroughly at each phase, and monitor key metrics to ensure continuous improvement.

**Good luck with your implementation!**