import axios from 'axios';
import { DataStorageService } from './dataStorage.js';
import type { DriveTime } from '../types/index.js';
import type { ResortMapping } from './resortMapping.js';

// Hedingen coordinates (user's home location)
const HEDINGEN_COORDS = { lat: 47.2981, lng: 8.4483 };

// Google Maps API configuration
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

/**
 * Drive time calculation service
 * Uses Google Maps Routes API for accurate drive times
 * Falls back to estimated calculations if API unavailable
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
function estimateDriveTime(distanceKm: number, resortId?: string): number {
  // Swiss driving assumptions:
  // - Highway: ~100 km/h average (including traffic)
  // - Mountain roads: ~60 km/h average
  // - Valley routes (like Lötschental): ~40 km/h average due to passes and narrow roads
  // - Add 10 minutes for city/traffic delays

  let speedKmh = 80; // Default mixed highway/mountain speed
  let baseDelay = 15;

  // Special handling for challenging valley routes
  const challengingRoutes = [
    'lauchernalp-loetschental', // Requires Gampel/Lötschental pass
    'saas-fee', // Requires mountain passes
    'zermatt', // Requires mountain passes
    'obergoms-goms', // Requires Furka pass
    'realp' // Requires Furka pass
  ];

  if (challengingRoutes.includes(resortId || '')) {
    speedKmh = 45; // Even slower for valley routes with passes
    baseDelay = 45; // More time for mountain passes and difficult access
  } else if (distanceKm <= 50) {
    speedKmh = 100; // Mostly highway
    baseDelay = 10;
  } else if (distanceKm > 150) {
    speedKmh = 60; // Long mountain drives
    baseDelay = 20;
  }

  // Calculate time based on distance and speed
  const driveTimeHours = distanceKm / speedKmh;
  const driveTimeMinutes = driveTimeHours * 60;
  const estimated = Math.round(driveTimeMinutes + baseDelay);

  console.log(`   Drive estimate: ${distanceKm.toFixed(1)}km @ ${speedKmh}km/h → ${estimated}min ${challengingRoutes.includes(resortId || '') ? '(challenging route)' : ''}`);
  return estimated;
}

/**
 * Get drive time estimate for a resort (with Google Maps API when available)
 */
export async function getDriveEstimate(resort: ResortMapping): Promise<DriveEstimate> {
  // Check for cached result first
  const cached = DataStorageService.getDriveTime(resort.internalId);
  if (cached) {
    let route = "A4 → A2";
    if (resort.resort.coordinates.lng < 8.0) {
      route = "A4 → A9 → Valais";
    } else if (resort.resort.coordinates.lat > 47.0) {
      route = "A4 → A3 → Eastern Switzerland";
    }

    console.log(`   📋 Cache hit for ${resort.internalId}: ${cached.driveTimeMinutes}min`);
    return {
      resortId: resort.internalId,
      distanceKm: cached.distanceKm,
      driveTimeMinutes: cached.driveTimeMinutes,
      route
    };
  }

  // Try Google Maps API
  console.log(`   🌐 Calling Google Maps API for ${resort.internalId}...`);
  const googleResult = await callGoogleMapsAPI(
    HEDINGEN_COORDS.lat,
    HEDINGEN_COORDS.lng,
    resort.resort.coordinates.lat,
    resort.resort.coordinates.lng
  );

  if (googleResult) {
    console.log(`   ✅ Google Maps success for ${resort.internalId}: ${googleResult.distanceKm}km, ${googleResult.durationMinutes}min`);
    // Cache successful API result
    const driveTimeData: DriveTime = {
      resortId: resort.internalId,
      origin: 'Hedingen',
      driveTimeMinutes: googleResult.durationMinutes,
      distanceKm: googleResult.distanceKm,
      cachedAt: new Date()
    };
    DataStorageService.storeDriveTime(driveTimeData);

    // Simple route description based on location
    let route = "A4 → A2";
    if (resort.resort.coordinates.lng < 8.0) {
      route = "A4 → A9 → Valais";
    } else if (resort.resort.coordinates.lat > 47.0) {
      route = "A4 → A3 → Eastern Switzerland";
    }

    return {
      resortId: resort.internalId,
      distanceKm: googleResult.distanceKm,
      driveTimeMinutes: googleResult.durationMinutes,
      route
    };
  }

  // Fallback to estimated calculations and cache the result
  console.log(`   📐 Using estimated calculation for ${resort.internalId} (API failed)`);
  const distance = calculateDistance(
    HEDINGEN_COORDS.lat,
    HEDINGEN_COORDS.lng,
    resort.resort.coordinates.lat,
    resort.resort.coordinates.lng
  );

  const driveTime = estimateDriveTime(distance, resort.internalId);
  console.log(`   📊 Estimated: ${Math.round(distance * 10) / 10}km, ${driveTime}min`);

  // Cache the estimated result
  const estimateData: DriveTime = {
    resortId: resort.internalId,
    origin: 'Hedingen',
    driveTimeMinutes: driveTime,
    distanceKm: Math.round(distance * 10) / 10,
    cachedAt: new Date()
  };
  DataStorageService.storeDriveTime(estimateData);

  // Simple route description
  let route = "A4 → A2";
  if (resort.resort.coordinates.lng < 8.0) {
    route = "A4 → A9 → Valais";
  } else if (resort.resort.coordinates.lat > 47.0) {
    route = "A4 → A3 → Eastern Switzerland";
  }

  return {
    resortId: resort.internalId,
    distanceKm: Math.round(distance * 10) / 10,
    driveTimeMinutes: driveTime,
    route
  };
}

/**
 * Get drive estimates for multiple resorts
 */
export async function getDriveEstimates(resorts: ResortMapping[]): Promise<DriveEstimate[]> {
  const estimates = await Promise.all(resorts.map(resort => getDriveEstimate(resort)));
  return estimates;
}

/**
 * Filter resorts by maximum drive time
 */
export async function filterByDriveTime(resorts: ResortMapping[], maxMinutes: number): Promise<ResortMapping[]> {
  const estimates = await getDriveEstimates(resorts);
  return resorts.filter((resort, index) => estimates[index].driveTimeMinutes <= maxMinutes);
}

/**
 * Sort resorts by drive time (closest first)
 */
export async function sortByDriveTime(resorts: ResortMapping[]): Promise<ResortMapping[]> {
  const estimates = await getDriveEstimates(resorts);
  return [...resorts].sort((a, b) => {
    const indexA = resorts.indexOf(a);
    const indexB = resorts.indexOf(b);
    const timeA = estimates[indexA].driveTimeMinutes;
    const timeB = estimates[indexB].driveTimeMinutes;
    return timeA - timeB;
  });
}

/**
 * Convert DriveEstimate to DriveTime database format
 */
export function estimateToDriveTime(estimate: DriveEstimate): DriveTime {
  return {
    resortId: estimate.resortId,
    origin: "Hedingen",
    driveTimeMinutes: estimate.driveTimeMinutes,
    distanceKm: estimate.distanceKm,
    cachedAt: new Date()
  };
}

/**
 * Google Maps Routes API response interface
 */
interface GoogleMapsRoutesResponse {
  status?: string;
  routes: Array<{
    distanceMeters: number;
    duration: string; // ISO 8601 duration like "PT1H30M"
    polyline?: {
      encodedPolyline: string;
    };
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * Call Google Routes API to get real drive time
 */
async function callGoogleMapsAPI(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<{ distanceKm: number; durationMinutes: number } | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not found, falling back to estimated calculations');
    return null;
  }

  try {
    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: originLat,
            longitude: originLng
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: destLat,
            longitude: destLng
          }
        }
      },
      travelMode: 'DRIVE',
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false
      },
      languageCode: 'en-US',
      units: 'METRIC'
    };

    const response = await axios.post<GoogleMapsRoutesResponse>(
      ROUTES_API_URL,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration'
        }
      }
    );

    if (!response.data.routes || response.data.routes.length === 0) {
      console.error('Google Routes API error: No routes found');
      if (response.data.error) {
        console.error('API Error:', response.data.error.message);
      }
      return null;
    }

    const route = response.data.routes[0];

    // Parse duration - can be ISO 8601 format (PT1H30M45S) or just seconds (23062s)
    let totalMinutes: number;

    if (route.duration.startsWith('PT')) {
      // ISO 8601 duration format: PT1H30M45S
      const durationMatch = route.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!durationMatch) {
        console.error('Invalid ISO 8601 duration format:', route.duration);
        return null;
      }

      const hours = parseInt(durationMatch[1] || '0');
      const minutes = parseInt(durationMatch[2] || '0');
      const seconds = parseInt(durationMatch[3] || '0');

      totalMinutes = hours * 60 + minutes + Math.round(seconds / 60);
    } else if (route.duration.endsWith('s')) {
      // Seconds format: 23062s
      const seconds = parseInt(route.duration.replace('s', ''));
      totalMinutes = Math.round(seconds / 60);
    } else {
      console.error('Unknown duration format:', route.duration);
      return null;
    }

    // Convert meters to km
    const distanceKm = Math.round((route.distanceMeters / 1000) * 10) / 10;

    console.log(`   🚗 Google Routes API: ${distanceKm}km, ${totalMinutes}min`);

    return { distanceKm, durationMinutes: totalMinutes };
  } catch (error: any) {
    console.error('Google Routes API call failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      if (error.response.status === 403) {
        console.error('❌ Routes API not enabled for this API key.');
        console.error('   Please enable the Routes API: https://console.cloud.google.com/apis/library/routes-backend.googleapis.com');
        console.error('   Make sure billing is enabled for your Google Cloud project.');
      } else if (error.response.data?.error?.message) {
        console.error('API Error:', error.response.data.error.message);
      }
    }
    return null;
  }
}

/**
 * Calculate real drive time using Google Maps API with fallback to estimates
 */
export async function calculateRealDriveTime(resortId: string, origin: string = "Hedingen"): Promise<DriveTime | null> {
  // Find the resort mapping
  const { getPriorityResorts } = await import('./resortMapping.js');
  const resort = getPriorityResorts().find(r => r.internalId === resortId);

  if (!resort) {
    console.error(`Resort not found: ${resortId}`);
    return null;
  }

  const originCoords = origin === "Hedingen" ? HEDINGEN_COORDS : { lat: 47.2981, lng: 8.4483 }; // Default to Hedingen

  // Try Google Maps API first
  const googleResult = await callGoogleMapsAPI(
    originCoords.lat,
    originCoords.lng,
    resort.resort.coordinates.lat,
    resort.resort.coordinates.lng
  );

  if (googleResult) {
    return {
      resortId,
      origin,
      driveTimeMinutes: googleResult.durationMinutes,
      distanceKm: googleResult.distanceKm,
      cachedAt: new Date()
    };
  }

  // Fallback to estimated calculations
  console.log(`   📐 Falling back to estimated calculation for ${resortId}`);
  const estimate = getDriveEstimate(resort);
  return {
    resortId,
    origin,
    driveTimeMinutes: estimate.driveTimeMinutes,
    distanceKm: estimate.distanceKm,
    cachedAt: new Date()
  };
}
