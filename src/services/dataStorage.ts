import { driveTimeStatements, conditionStatements, mockDb } from '../database/index.js';
import type { Conditions, DriveTime } from '../types/index.js';
import type { ScrapedResortData, ResortMetadata } from '../scrapers/bergfex.js';
import { findResortByBergfexName } from './resortMapping.js';
import { estimateToDriveTime, getDriveEstimate } from './driveTimes.js';

/**
 * Data storage service for managing scraped data (using mock database for now)
 */

export class DataStorageService {
  /**
   * Store scraped bergfex conditions in database
   * Now stores ALL scraped resorts, not just mapped ones
   */
  static storeBergfexConditions(scrapedData: ScrapedResortData[]): void {
    console.log(`Storing ${scrapedData.length} scraped conditions...`);
    let stored = 0;

    for (const item of scrapedData) {
      // Try to find matching resort in our mapping
      const resortMapping = findResortByBergfexName(item.name);
      const resortId = resortMapping?.internalId || item.resortId;

      // Insert conditions using mock database
      try {
        statements.insertConditions.run({
          resort_id: resortId,
          mountain_depth: item.mountainDepth,
          valley_depth: item.valleyDepth,
          new_snow: item.newSnow,
          lifts_open: item.liftsOpen,
          lifts_total: item.liftsTotal,
          last_update: item.lastUpdate
        });

        stored++;
        if (resortMapping) {
          console.log(`✅ Stored conditions for ${item.name} (${resortId}) - mapped`);
        } else {
          console.log(`✅ Stored conditions for ${item.name} (${resortId}) - new resort`);
        }
      } catch (error) {
        console.error(`❌ Failed to store conditions for ${item.name}:`, error);
      }
    }

    console.log(`📊 Stored ${stored} out of ${scrapedData.length} scraped resorts`);
  }

  /**
   * Get latest conditions for a specific resort
   */
  static getLatestConditions(resortId: string): Conditions | null {
    try {
      const row = statements.getLatestConditions.get(resortId);
      if (!row) return null;

      return {
        resortId,
        scrapedAt: new Date(row.scraped_at),
        mountainDepth: row.mountain_depth,
        valleyDepth: row.valley_depth,
        newSnow: row.new_snow,
        liftsOpen: row.lifts_open,
        liftsTotal: row.lifts_total,
        lastUpdate: row.last_update ? new Date(row.last_update) : new Date()
      };
    } catch (error) {
      console.error(`Error getting conditions for ${resortId}:`, error);
      return null;
    }
  }

  /**
   * Get all latest conditions for ALL resorts (not just mapped ones)
   */
  static getAllLatestConditions(): Map<string, Conditions> {
    const conditions = new Map<string, Conditions>();

    try {
      // Get ALL stored conditions from mock database
      // In a real database, we'd do: SELECT * FROM conditions ORDER BY scraped_at DESC
      // For mock DB, iterate through all stored conditions
      const allStoredConditions = mockDb.conditions;

      // Group by resort_id and get the latest for each
      const latestByResort = new Map<string, any>();
      for (const condition of allStoredConditions) {
        const existing = latestByResort.get(condition.resort_id);
        if (!existing || new Date(condition.scraped_at) > new Date(existing.scraped_at)) {
          latestByResort.set(condition.resort_id, condition);
        }
      }

      // Convert to Conditions format
      for (const [resortId, condition] of latestByResort) {
        const formattedCondition: Conditions = {
          resortId,
          scrapedAt: new Date(condition.scraped_at),
          mountainDepth: condition.mountain_depth,
          valleyDepth: condition.valley_depth,
          newSnow: condition.new_snow,
          liftsOpen: condition.lifts_open,
          liftsTotal: condition.lifts_total,
          lastUpdate: condition.last_update ? new Date(condition.last_update) : new Date()
        };
        conditions.set(resortId, formattedCondition);
      }
    } catch (error) {
      console.error('Error getting all conditions:', error);
    }

    return conditions;
  }

  /**
   * Store or update drive time data
   */
  static storeDriveTime(driveTime: DriveTime): void {
    try {
      driveTimeStatements.insertOrUpdate.run(
        driveTime.resortId,
        driveTime.origin,
        driveTime.driveTimeMinutes,
        driveTime.distanceKm,
        driveTime.cachedAt.toISOString()
      );
    } catch (error) {
      console.error(`Error storing drive time for ${driveTime.resortId}:`, error);
    }
  }

  /**
   * Get drive time for a resort
   */
  static getDriveTime(resortId: string, origin: string = "Hedingen"): DriveTime | null {
    try {
      const row = driveTimeStatements.getByResortAndOrigin.get(resortId, origin) as any;
      if (!row) return null;

      const cachedAt = new Date(row.cached_at);
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago

      // Only return if cached within the last year
      if (cachedAt < oneYearAgo) {
        console.log(`   📅 Cache expired for ${resortId} (${cachedAt.toISOString()})`);
        return null;
      }

      return {
        resortId: row.resort_id,
        origin: row.origin,
        driveTimeMinutes: row.drive_time_minutes,
        distanceKm: row.distance_km,
        cachedAt: cachedAt
      };
    } catch (error) {
      console.error(`Error getting drive time for ${resortId}:`, error);
      return null;
    }
  }

  /**
   * Initialize persistent drive times - only populate if database is empty
   */
  static async initializePersistentDriveTimes(): Promise<void> {
    console.log('Checking persistent drive times...');

    // Check if we already have drive times in SQLite
    const existingCount = driveTimeStatements.getAll.all().length;
    if (existingCount > 0) {
      console.log(`✅ Found ${existingCount} cached drive times in database`);
      return;
    }

    console.log('📊 No drive times found, initializing from Google Maps API...');

    const { getAllResorts } = require('./resortMapping.js');
    const resorts = getAllResorts();

    // Process in batches to avoid overwhelming the API
    const batchSize = 3; // Smaller batches for initial population
    let processed = 0;

    for (let i = 0; i < resorts.length; i += batchSize) {
      const batch = resorts.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(resorts.length/batchSize)} (${batch.length} resorts)...`);

      // Process batch sequentially with delays
      for (const resort of batch) {
        try {
          const estimate = await getDriveEstimate(resort);
          processed++;
          console.log(`   ✅ ${resort.resort.name}: ${estimate.driveTimeMinutes}min (${estimate.distanceKm}km)`);

          // Add delay between API calls
          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
        } catch (error) {
          console.log(`   ❌ ${resort.resort.name}: Failed to get drive time`);
        }
      }

      // Longer delay between batches
      if (i + batchSize < resorts.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between batches
      }
    }

    console.log(`✅ Initialized persistent drive times for ${processed} resorts`);
  }

  /**
   * Initialize drive time estimates for all resorts (legacy method)
   */
  static async initializeDriveTimes(): Promise<void> {
    // This method is now just an alias for the persistent version
    return this.initializePersistentDriveTimes();
  }

  /**
   * Clear all stored data (for testing/reset)
   */
  static clearAllData(): void {
    // Only clear in-memory mock data, keep SQLite data persistent
    mockDb.conditions.length = 0;
    mockDb.resorts.length = 0;
    console.log('✅ Cleared in-memory data (SQLite data preserved)');
  }

  /**
   * Clear all drive times (for testing/reset of cached data)
   */
  static clearDriveTimes(): void {
    try {
      const db = require('../database/index.js').default || require('../database/index.js');
      db.exec('DELETE FROM drive_times');
      console.log('✅ Cleared all drive times from database');
    } catch (error) {
      console.error('❌ Failed to clear drive times:', error);
    }
  }

  /**
   * Store resort metadata from main bergfex page
   */
  static storeResortMetadata(metadata: ResortMetadata[]): void {
    console.log(`Storing metadata for ${metadata.length} resorts...`);

    // For now, we'll enhance our existing resort mappings
    // In a real implementation, this would be stored in a separate metadata table
    for (const meta of metadata) {
      // Find existing mapping and enhance it
      const existing = mockDb.resorts.find(r => r.id === meta.resortId);
      if (existing) {
        // Add metadata to existing resort
        existing.elevation = meta.elevation;
        existing.pistesKm = meta.pistesKm;
        existing.liftsTotal = meta.liftsTotal;
        existing.price = meta.price;
        console.log(`✅ Enhanced ${meta.name} with metadata`);
      }
    }
  }

  /**
   * Get resort metadata
   */
  static getResortMetadata(resortId: string): ResortMetadata | null {
    const resort = mockDb.resorts.find(r => r.id === resortId);
    if (!resort) return null;

    return {
      name: resort.name,
      elevation: resort.elevation || null,
      pistesKm: resort.pistesKm || null,
      liftsTotal: resort.liftsTotal || null,
      snowDepth: resort.snowDepth || null,
      price: resort.price || null,
      resortId: resort.id
    };
  }

  /**
   * Get database statistics
   */
  static getStats(): {
    resorts: number;
    conditions: number;
    driveTimes: number;
    scores: number;
  } {
    // Count actual stored data
    const conditionsMap = this.getAllLatestConditions();

    return {
      resorts: mockDb.resorts.length,
      conditions: conditionsMap.size, // Count unique resorts with conditions
      driveTimes: driveTimeStatements.getAll.all().length,
      scores: 0 // Not implemented yet
    };
  }
}

