// Core types for IceKing project

export interface Resort {
  id: string;
  name: string;
  bergfexId: string;
  coordinates: { lat: number; lng: number };

  // Season info
  seasonStatus: 'OPEN' | 'CLOSED' | 'CLOSING_SOON';
  openingDate?: Date;
  closingDate?: Date;
  operatingHours?: {
    weekdays?: string; // "08:30-16:15"
    weekends?: string;
    notes?: string;
  };

  // Current conditions (scraped)
  mountainDepth?: number;
  valleyDepth?: number;
  newSnow?: number;
  liftsOpen?: number;
  liftsTotal?: number;
  lastUpdate?: Date;

  // Metadata
  priority: number; // 1-10, for filtering
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
  hasPark: boolean;
  hasNightRiding: boolean;
}

export interface Conditions {
  id?: number;
  resortId: string;
  scrapedAt: Date;
  mountainDepth: number;
  valleyDepth: number;
  newSnow: number;
  liftsOpen: number;
  liftsTotal: number;
  lastUpdate: Date;
}

export interface DriveTime {
  id?: number;
  resortId: string;
  origin: string; // "Dietikon" or coordinates
  driveTimeMinutes: number;
  distanceKm: number;
  cachedAt: Date;
}

export interface ScoreResult {
  score: number;
  status: 'OPEN' | 'CLOSED' | 'CLOSED_TODAY';
  reason: string;
  openingDate?: Date;
}

export interface ResortRecommendation {
  resort: Resort;
  score: ScoreResult;
  driveTime: number;
  distance: number;
}
