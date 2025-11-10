// Bun's built-in SQLite database
import { Database } from "bun:sqlite";
const db = new Database('iceking.db');

// Keep mockDb for backward compatibility with existing code
export const mockDb = {
  resorts: [] as any[],
  conditions: [] as any[],
  driveTimes: [] as any[],
  scores: [] as any[]
};

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS drive_times (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resort_id TEXT NOT NULL,
    origin TEXT NOT NULL DEFAULT 'Hedingen',
    drive_time_minutes INTEGER NOT NULL,
    distance_km REAL NOT NULL,
    cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resort_id, origin)
  );

  CREATE TABLE IF NOT EXISTS resort_conditions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resort_id TEXT NOT NULL,
    mountain_depth INTEGER,
    valley_depth INTEGER,
    new_snow INTEGER,
    lifts_open INTEGER,
    lifts_total INTEGER,
    last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resort_id)
  );

  CREATE INDEX IF NOT EXISTS idx_drive_times_resort_origin ON drive_times(resort_id, origin);
  CREATE INDEX IF NOT EXISTS idx_conditions_resort ON resort_conditions(resort_id);
`);

// Prepared statements for drive times
export const driveTimeStatements = {
  insertOrUpdate: db.prepare(`
    INSERT OR REPLACE INTO drive_times (resort_id, origin, drive_time_minutes, distance_km, cached_at)
    VALUES (?, ?, ?, ?, ?)
  `),
  getByResortAndOrigin: db.prepare(`
    SELECT * FROM drive_times WHERE resort_id = ? AND origin = ?
  `),
  getAll: db.prepare(`
    SELECT * FROM drive_times ORDER BY cached_at DESC
  `),
  deleteOld: db.prepare(`
    DELETE FROM drive_times WHERE cached_at < datetime('now', '-1 year')
  `)
};

// Prepared statements for conditions
export const conditionStatements = {
  insertOrUpdate: db.prepare(`
    INSERT OR REPLACE INTO resort_conditions (resort_id, mountain_depth, valley_depth, new_snow, lifts_open, lifts_total, last_update)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  getByResort: db.prepare(`
    SELECT * FROM resort_conditions WHERE resort_id = ?
  `),
  getAllLatest: db.prepare(`
    SELECT * FROM resort_conditions ORDER BY last_update DESC
  `)
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
