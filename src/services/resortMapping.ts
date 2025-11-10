import type { Resort } from '../types/index.js';

/**
 * Resort mapping system to link bergfex names to internal resort data
 * This provides static resort information and maps scraped names to our database
 */

export interface ResortMapping {
  bergfexName: string;
  internalId: string;
  resort: Resort;
}

// Static resort database - in production this would come from database
// Based on Swiss ski resorts with drive times from Dietikon
const RESORT_DATABASE: ResortMapping[] = [
  // High-priority resorts with accurate coordinates
  {
    bergfexName: "Engelberg Titlis",
    internalId: "engelberg-titlis",
    resort: {
      id: "engelberg-titlis",
      name: "Engelberg Titlis",
      bergfexId: "engelberg-titlis",
      coordinates: { lat: 46.8217, lng: 8.4017 },
      seasonStatus: "OPEN",
      priority: 10,
      difficulty: "mixed",
      hasPark: true,
      hasNightRiding: false
    }
  },
  {
    bergfexName: "Zermatt",
    internalId: "zermatt",
    resort: {
      id: "zermatt",
      name: "Zermatt",
      bergfexId: "zermatt",
      coordinates: { lat: 46.0244, lng: 7.7486 },
      seasonStatus: "OPEN",
      priority: 10,
      difficulty: "advanced",
      hasPark: true,
      hasNightRiding: false
    }
  },
  {
    bergfexName: "Saas-Fee",
    internalId: "saas-fee",
    resort: {
      id: "saas-fee",
      name: "Saas-Fee",
      bergfexId: "saas-fee",
      coordinates: { lat: 46.1080, lng: 7.9276 },
      seasonStatus: "OPEN",
      priority: 9,
      difficulty: "mixed",
      hasPark: true,
      hasNightRiding: false
    }
  },
  {
    bergfexName: "Davos Klosters Parsenn",
    internalId: "davos-parsenn",
    resort: {
      id: "davos-parsenn",
      name: "Davos Parsenn",
      bergfexId: "davos-klosters-parsenn",
      coordinates: { lat: 46.7974, lng: 9.8209 },
      seasonStatus: "OPEN",
      priority: 8,
      difficulty: "mixed",
      hasPark: true,
      hasNightRiding: false
    }
  },
  {
    bergfexName: "Glacier 3000 - Les Diablerets",
    internalId: "glacier-3000",
    resort: {
      id: "glacier-3000",
      name: "Glacier 3000",
      bergfexId: "glacier-3000-les-diablerets",
      coordinates: { lat: 46.3317, lng: 7.2044 },
      seasonStatus: "OPEN",
      priority: 8,
      difficulty: "mixed",
      hasPark: true,
      hasNightRiding: false
    }
  },
  {
    bergfexName: "Arosa Lenzerheide",
    internalId: "arosa-lenzerheide",
    resort: {
      id: "arosa-lenzerheide",
      name: "Arosa Lenzerheide",
      bergfexId: "arosa-lenzerheide",
      coordinates: { lat: 46.7824, lng: 9.6849 },
      seasonStatus: "OPEN",
      priority: 7,
      difficulty: "mixed",
      hasPark: true,
      hasNightRiding: false
    }
  },
  {
    bergfexName: "Andermatt - Gemsstock",
    internalId: "andermatt",
    resort: {
      id: "andermatt",
      name: "Andermatt",
      bergfexId: "andermatt-gemsstock",
      coordinates: { lat: 46.6356, lng: 8.5939 },
      seasonStatus: "OPEN",
      priority: 7,
      difficulty: "advanced",
      hasPark: true,
      hasNightRiding: false
    }
  },
  {
    bergfexName: "Gstaad",
    internalId: "gstaad",
    resort: {
      id: "gstaad",
      name: "Gstaad",
      bergfexId: "gstaad",
      coordinates: { lat: 46.4700, lng: 7.2831 },
      seasonStatus: "OPEN",
      priority: 6,
      difficulty: "mixed",
      hasPark: false,
      hasNightRiding: false
    }
  },

  // Add major resorts from the scraped data with estimated coordinates
  {
    bergfexName: "Survih - Samedan",
    internalId: "survih-samedan",
    resort: {
      id: "survih-samedan",
      name: "Survih Samedan",
      bergfexId: "survih-samedan",
      coordinates: { lat: 46.5339, lng: 9.8717 }, // Estimated coordinates
      seasonStatus: "OPEN",
      priority: 6,
      difficulty: "mixed",
      hasPark: false,
      hasNightRiding: false
    }
  },
  {
    bergfexName: "Lauchernalp - Lötschental",
    internalId: "lauchernalp-loetschental",
    resort: {
      id: "lauchernalp-loetschental",
      name: "Lauchernalp Lötschental",
      bergfexId: "lauchernalp-loetschental",
      coordinates: { lat: 46.4167, lng: 7.7667 }, // Estimated coordinates
      seasonStatus: "OPEN",
      priority: 5,
      difficulty: "mixed",
      hasPark: false,
      hasNightRiding: false
    }
  },
  {
    bergfexName: "Sörenberg",
    internalId: "soerenberg",
    resort: {
      id: "soerenberg",
      name: "Sörenberg",
      bergfexId: "soerenberg",
      coordinates: { lat: 46.8333, lng: 8.0333 }, // Estimated coordinates
      seasonStatus: "OPEN",
      priority: 5,
      difficulty: "mixed",
      hasPark: false,
      hasNightRiding: false
    }
  },
  {
    bergfexName: "Davos Schatzalp - Strela",
    internalId: "davos-schatzalp-strela",
    resort: {
      id: "davos-schatzalp-strela",
      name: "Davos Schatzalp Strela",
      bergfexId: "davos-schatzalp-strela",
      coordinates: { lat: 46.8000, lng: 9.8167 }, // Estimated coordinates
      seasonStatus: "OPEN",
      priority: 5,
      difficulty: "mixed",
      hasPark: false,
      hasNightRiding: false
    }
  },
  {
    bergfexName: "Davos Rinerhorn",
    internalId: "davos-rinerhorn",
    resort: {
      id: "davos-rinerhorn",
      name: "Davos Rinerhorn",
      bergfexId: "davos-rinerhorn",
      coordinates: { lat: 46.8167, lng: 9.8333 }, // Estimated coordinates
      seasonStatus: "OPEN",
      priority: 5,
      difficulty: "mixed",
      hasPark: false,
      hasNightRiding: false
    }
  },

  // Closed resorts
  {
    bergfexName: "Hoch-Ybrig",
    internalId: "hoch-ybrig",
    resort: {
      id: "hoch-ybrig",
      name: "Hoch-Ybrig",
      bergfexId: "hoch-ybrig",
      coordinates: { lat: 47.0139, lng: 8.8581 },
      seasonStatus: "CLOSED",
      openingDate: new Date("2025-12-07"),
      priority: 5,
      difficulty: "beginner",
      hasPark: false,
      hasNightRiding: false
    }
  },
  {
    bergfexName: "Flumserberg",
    internalId: "flumserberg",
    resort: {
      id: "flumserberg",
      name: "Flumserberg",
      bergfexId: "flumserberg",
      coordinates: { lat: 47.0867, lng: 9.3344 },
      seasonStatus: "CLOSED",
      openingDate: new Date("2025-12-15"),
      priority: 4,
      difficulty: "beginner",
      hasPark: false,
      hasNightRiding: false
    }
  }
];

// Create lookup maps for fast access
const nameToMapping = new Map<string, ResortMapping>();
const idToMapping = new Map<string, ResortMapping>();

// Initialize maps
RESORT_DATABASE.forEach(mapping => {
  nameToMapping.set(mapping.bergfexName.toLowerCase(), mapping);
  idToMapping.set(mapping.internalId, mapping);
});

/**
 * Find resort by bergfex name (fuzzy matching)
 */
export function findResortByBergfexName(bergfexName: string): ResortMapping | null {
  // Exact match first
  const exact = nameToMapping.get(bergfexName.toLowerCase());
  if (exact) return exact;

  // Fuzzy matching for common variations
  const normalized = bergfexName.toLowerCase().trim();

  // Try partial matches
  for (const [name, mapping] of nameToMapping) {
    if (normalized.includes(name) || name.includes(normalized)) {
      return mapping;
    }
  }

  return null;
}

/**
 * Find resort by internal ID
 */
export function findResortById(internalId: string): ResortMapping | null {
  return idToMapping.get(internalId) || null;
}

/**
 * Get all resorts
 */
export function getAllResorts(): ResortMapping[] {
  return RESORT_DATABASE;
}

/**
 * Get priority resorts (for quick recommendations)
 */
export function getPriorityResorts(): ResortMapping[] {
  return RESORT_DATABASE.filter(r => r.resort.priority >= 6);
}

/**
 * Get open resorts only
 */
export function getOpenResorts(): ResortMapping[] {
  return RESORT_DATABASE.filter(r => r.resort.seasonStatus === "OPEN");
}
