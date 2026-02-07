// backend/services/mapsService.js
const { Client } = require("@googlemaps/google-maps-services-js");

const client = new Client({});

const getLiveETA = async (originLat, originLng, destLat, destLng) => {
  try {
    const response = await client.distancematrix({
      params: {
        origins: [{ lat: originLat, lng: originLng }],
        destinations: [{ lat: destLat, lng: destLng }],
        key: process.env.GOOGLE_MAPS_KEY,
        mode: 'driving', // 'driving' considers traffic
        departure_time: 'now' // 'now' considers live traffic conditions
      },
      timeout: 1000 // 1 second timeout
    });

    if (response.data.status === 'OK') {
      const element = response.data.rows[0].elements[0];
      if (element.status === 'OK') {
        // Return duration in seconds (e.g., 540 seconds = 9 mins)
        // element.duration_in_traffic.value is the gold standard
        return element.duration_in_traffic ? element.duration_in_traffic.value : element.duration.value;
      }
    }
    return null;
  } catch (error) {
    console.error('Google Maps API Error:', error.message);
    return null;
  }
};

module.exports = { getLiveETA };