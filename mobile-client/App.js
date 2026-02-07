import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import TrackingScreen from './src/screens/TrackingScreen';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      {/* For now, we just show the Tracking Screen directly */}
      <TrackingScreen />
    </SafeAreaView>
  );
}