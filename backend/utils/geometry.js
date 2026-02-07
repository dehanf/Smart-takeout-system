// backend/utils/geometry.js

/**
 * Calculates the distance (in meters) between two GPS coordinates
 * using the Haversine formula.
 * @param {number} lat1 - Latitude of Point A
 * @param {number} lon1 - Longitude of Point A
 * @param {number} lat2 - Latitude of Point B
 * @param {number} lon2 - Longitude of Point B
 * @returns {number} Distance in meters
 */
const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Radius of the earth in meters
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in meters
};

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

module.exports = { getDistanceFromLatLonInMeters };