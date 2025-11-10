// Using in-memory database for now due to Bun compatibility issues
// TODO: Implement proper database persistence later
export interface MockDatabase {
  resorts: any[];
  conditions: any[];
  driveTimes: any[];
  scores: any[];
}

export const mockDb: MockDatabase = {
  resorts: [],
  conditions: [],
  driveTimes: [],
  scores: []
};

// Mock database operations
const db = {
  exec: (sql: string) => {
    console.log(`Mock DB exec: ${sql.substring(0, 50)}...`);
  },
  prepare: (sql: string) => ({
    run: (...args: any[]) => {
      console.log(`Mock DB run: ${sql.substring(0, 30)}... with args:`, args);
      return { lastInsertRowid: Date.now() };
    },
    get: (...args: any[]) => {
      console.log(`Mock DB get: ${sql.substring(0, 30)}... with args:`, args);
      return null; // Return null for now
    },
    all: (...args: any[]) => {
      console.log(`Mock DB all: ${sql.substring(0, 30)}... with args:`, args);
      return []; // Return empty array for now
    }
  })
};

// Initialize mock database with some sample data
mockDb.resorts = [
  {
    id: "engelberg-titlis",
    name: "Engelberg Titlis",
    bergfex_id: "engelberg-titlis",
    latitude: 46.8217,
    longitude: 8.4017,
    priority: 10,
    difficulty: "mixed",
    has_park: true,
    has_night_riding: false,
    season_status: "OPEN"
  },
  {
    id: "saas-fee",
    name: "Saas-Fee",
    bergfex_id: "saas-fee",
    latitude: 46.1080,
    longitude: 7.9276,
    priority: 9,
    difficulty: "mixed",
    has_park: true,
    has_night_riding: false,
    season_status: "OPEN"
  },
  {
    id: "zermatt",
    name: "Zermatt",
    bergfex_id: "zermatt",
    latitude: 46.0244,
    longitude: 7.7486,
    priority: 10,
    difficulty: "advanced",
    has_park: true,
    has_night_riding: false,
    season_status: "OPEN"
  }
];

// Mock drive times
mockDb.driveTimes = [
  { resort_id: "engelberg-titlis", origin: "Dietikon", drive_time_minutes: 72, distance_km: 68 },
  { resort_id: "saas-fee", origin: "Dietikon", drive_time_minutes: 125, distance_km: 145 },
  { resort_id: "zermatt", origin: "Dietikon", drive_time_minutes: 140, distance_km: 165 }
];

// Mock conditions (from our earlier scrape)
mockDb.conditions = [
  {
    resort_id: "engelberg-titlis",
    scraped_at: new Date(),
    mountain_depth: 83,
    valley_depth: null,
    new_snow: null,
    lifts_open: 1,
    lifts_total: 13,
    last_update: new Date()
  },
  {
    resort_id: "saas-fee",
    scraped_at: new Date(),
    mountain_depth: 175,
    valley_depth: 30,
    new_snow: null,
    lifts_open: 8,
    lifts_total: 23,
    last_update: new Date()
  },
  {
    resort_id: "zermatt",
    scraped_at: new Date(),
    mountain_depth: 150,
    valley_depth: null,
    new_snow: null,
    lifts_open: 1,
    lifts_total: 52,
    last_update: new Date()
  }
];

export default db;

// Mock prepared statements
export const statements = {
  getAllResorts: {
    all: () => mockDb.resorts
  },
  getLatestConditions: {
    get: (resortId: string) => mockDb.conditions.find(c => c.resort_id === resortId) || null
  },
  insertConditions: {
    run: (data: any) => {
      mockDb.conditions.push({
        ...data,
        id: Date.now(),
        scraped_at: new Date()
      });
    }
  },
  insertOrUpdateDriveTime: {
    run: (data: any) => {
      const existing = mockDb.driveTimes.findIndex(dt => dt.resort_id === data.resort_id && dt.origin === data.origin);
      if (existing >= 0) {
        mockDb.driveTimes[existing] = { ...data, cached_at: new Date() };
      } else {
        mockDb.driveTimes.push({ ...data, cached_at: new Date() });
      }
    }
  },
  getDriveTime: {
    get: (resortId: string, origin: string) => mockDb.driveTimes.find(dt => dt.resort_id === resortId && dt.origin === origin) || null
  }
};
