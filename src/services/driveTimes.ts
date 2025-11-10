import type { DriveTime } from '../types/index.js';
import type { ResortMapping } from './resortMapping.js';

// Dietikon coordinates (user's home location)
const DIETIKON_COORDS = { lat: 47.4056, lng: 8.4517 };

/**
 * Drive time calculation service
 * Currently uses mock calculations based on distance
 * TODO: Integrate with Google Distance Matrix API
 */

export interface DriveEstimate {
  resortId: string;
  distanceKm: number;
  driveTimeMinutes: number;
  route: string;
}

/**
 * Calculate Haversine distance between two coordinates
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng/2) * Math.sin(dLng/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Estimate drive time based on distance and typical Swiss road speeds
 * This is a simplified model - in production use Google Maps API
 */
function estimateDriveTime(distanceKm: number): number {
  // Swiss driving assumptions:
  // - Highway: ~100 km/h average (including traffic)
  // - Mountain roads: ~60 km/h average
  // - Add 10 minutes for city/traffic delays

  // For debugging: log the distance and estimated time
  const estimated = distanceKm <= 50
    ? Math.round((distanceKm / 100) * 60 + 10)  // Mostly highway
    : distanceKm <= 150
    ? Math.round((distanceKm / 80) * 60 + 15)  // Mix of highway and mountain roads
    : Math.round((distanceKm / 60) * 60 + 20); // Long mountain drives

  console.log(`   Drive estimate: ${distanceKm.toFixed(1)}km → ${estimated}min`);
  return estimated;
}

/**
 * Get drive time estimate for a resort
 */
export function getDriveEstimate(resort: ResortMapping): DriveEstimate {
  const distance = calculateDistance(
    DIETIKON_COORDS.lat,
    DIETIKON_COORDS.lng,
    resort.resort.coordinates.lat,
    resort.resort.coordinates.lng
  );

  const driveTime = estimateDriveTime(distance);

  // Simple route description
  let route = "A4 → A2";
  if (resort.resort.coordinates.lng < 8.0) {
    route = "A4 → A9 → Valais";
  } else if (resort.resort.coordinates.lat > 47.0) {
    route = "A4 → A3 → Eastern Switzerland";
  }

  return {
    resortId: resort.internalId,
    distanceKm: Math.round(distance * 10) / 10, // Round to 1 decimal
    driveTimeMinutes: driveTime,
    route
  };
}

/**
 * Get drive estimates for multiple resorts
 */
export function getDriveEstimates(resorts: ResortMapping[]): DriveEstimate[] {
  return resorts.map(resort => getDriveEstimate(resort));
}

/**
 * Filter resorts by maximum drive time
 */
export function filterByDriveTime(resorts: ResortMapping[], maxMinutes: number): ResortMapping[] {
  return resorts.filter(resort => {
    const estimate = getDriveEstimate(resort);
    return estimate.driveTimeMinutes <= maxMinutes;
  });
}

/**
 * Sort resorts by drive time (closest first)
 */
export function sortByDriveTime(resorts: ResortMapping[]): ResortMapping[] {
  return [...resorts].sort((a, b) => {
    const timeA = getDriveEstimate(a).driveTimeMinutes;
    const timeB = getDriveEstimate(b).driveTimeMinutes;
    return timeA - timeB;
  });
}

/**
 * Convert DriveEstimate to DriveTime database format
 */
export function estimateToDriveTime(estimate: DriveEstimate): DriveTime {
  return {
    resortId: estimate.resortId,
    origin: "Dietikon",
    driveTimeMinutes: estimate.driveTimeMinutes,
    distanceKm: estimate.distanceKm,
    cachedAt: new Date()
  };
}

/**
 * Mock function to simulate Google Distance Matrix API call
 * In production, replace with actual API integration
 */
export async function calculateRealDriveTime(resortId: string, origin: string = "Dietikon"): Promise<DriveTime | null> {
  // TODO: Implement Google Distance Matrix API integration
  // For now, return mock data

  console.log(`TODO: Implement Google Distance Matrix API for ${resortId} from ${origin}`);

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));

  return {
    resortId,
    origin,
    driveTimeMinutes: 60, // Mock: 1 hour
    distanceKm: 80,       // Mock: 80 km
    cachedAt: new Date()
  };
}
