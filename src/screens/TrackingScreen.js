import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, Alert } from 'react-native';
import locationService from '../services/LocationService';
import socketService from '../services/SocketService';

const TrackingScreen = () => {
  // 1. UI State
  const [status, setStatus] = useState('IDLE'); // IDLE, TRACKING, PREPARING, READY
  const [eta, setEta] = useState(null);
  
  // Hardcoded Order ID for testing (later this comes from navigation)
  const ORDER_ID = 'order_12345';

  // 2. Setup Listeners on Mount
  useEffect(() => {
    // Listen for "Kitchen Updates" from the server
    socketService.on('prep_started', () => {
      setStatus('PREPARING');
      Alert.alert('Good News!', 'The kitchen has started your order!');
    });

    socketService.on('order_ready', () => {
      setStatus('READY');
      Alert.alert('Done!', 'Your food is ready for pickup.');
      handleStop(); // Stop GPS to save battery
    });

    // Cleanup listeners when leaving the screen
    return () => {
      socketService.off('prep_started');
      socketService.off('order_ready');
    };
  }, []);

  // 3. Button Handlers
  const handleStart = async () => {
    setStatus('TRACKING');
    try {
      // This turns on the GPS and Socket
      await locationService.startTracking(ORDER_ID);
    } catch (error) {
      Alert.alert('Error', 'Could not start tracking. Check permissions.');
      setStatus('IDLE');
    }
  };

  const handleStop = () => {
    locationService.stopTracking();
    setStatus('IDLE');
    setEta(null);
  };

  // 4. Render UI
  return (
    <View style={styles.container}>
      <Text style={styles.title}>JIT Logistics</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>Order Status:</Text>
        <Text style={styles.status}>{status}</Text>
        
        {eta && <Text style={styles.eta}>ETA: {eta} mins</Text>}
      </View>

      <View style={styles.buttonContainer}>
        {status === 'IDLE' ? (
          <Button title="Start Driving" onPress={handleStart} />
        ) : (
          <Button title="Stop / Arrived" onPress={handleStop} color="red" />
        )}
      </View>

      {status === 'TRACKING' && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>Streaming Location...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 10, marginBottom: 20, elevation: 3 },
  label: { fontSize: 16, color: '#666' },
  status: { fontSize: 32, fontWeight: 'bold', color: '#333', marginVertical: 10 },
  buttonContainer: { marginBottom: 20 },
  loader: { alignItems: 'center', marginTop: 20 },
});

export default TrackingScreen;