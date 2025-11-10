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

      // Insert conditions using SQLite database
      try {
        conditionStatements.insertOrUpdate.run(
          resortId,
          item.mountainDepth,
          item.valleyDepth,
          item.newSnow,
          item.liftsOpen,
          item.liftsTotal,
          item.lastUpdate?.toISOString() || new Date().toISOString()
        );

        // Store season status if available
        if (item.seasonStatus) {
          // Update the resort metadata with season status
          const existing = mockDb.resorts.find(r => r.id === resortId);
          if (existing) {
            existing.seasonStatus = item.seasonStatus;
            console.log(`📊 Updated season status for ${item.name}: ${item.seasonStatus}`);
          }
        }

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
      const row = conditionStatements.getByResort.get(resortId);
      if (!row) return null;

      return {
        resortId,
        scrapedAt: new Date(row.last_update),
        mountainDepth: row.mountain_depth,
        valleyDepth: row.valley_depth,
        newSnow: row.new_snow,
        liftsOpen: row.lifts_open,
        liftsTotal: row.lifts_total,
        lastUpdate: new Date(row.last_update)
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
      // Get ALL stored conditions from SQLite database
      const allRows = conditionStatements.getAllLatest.all();

      // Group by resort_id and get the latest for each
      const latestByResort = new Map<string, any>();
      for (const row of allRows) {
        const existing = latestByResort.get(row.resort_id);
        if (!existing || new Date(row.last_update) > new Date(existing.last_update)) {
          latestByResort.set(row.resort_id, row);
        }
      }

      // Only include conditions that are less than 1 day old
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

      // Convert to Conditions format (only fresh data)
      for (const [resortId, row] of latestByResort) {
        const lastUpdate = new Date(row.last_update);
        if (lastUpdate >= oneDayAgo) {
          const formattedCondition: Conditions = {
            resortId,
            scrapedAt: lastUpdate,
            mountainDepth: row.mountain_depth,
            valleyDepth: row.valley_depth,
            newSnow: row.new_snow,
            liftsOpen: row.lifts_open,
            liftsTotal: row.lifts_total,
            lastUpdate: lastUpdate
          };
          conditions.set(resortId, formattedCondition);
        } else {
          console.log(`   📅 Condition expired for ${resortId}: ${lastUpdate.toISOString()}`);
        }
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
    try {
      // Clear SQLite tables
      const { db } = require('../database/index.js');
      db.exec('DELETE FROM drive_times');
      db.exec('DELETE FROM resort_conditions');

      // Clear in-memory mock data
      mockDb.conditions.length = 0;
      mockDb.resorts.length = 0;
      console.log('✅ Cleared all data from database');
    } catch (error) {
      console.error('❌ Failed to clear database:', error);
    }
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
   * Clean up expired cached data
   */
  static cleanupExpiredData(): void {
    try {
      // Clean up old drive times (> 1 year)
      driveTimeStatements.deleteOld.run();

      // Clean up old conditions (> 1 day)
      conditionStatements.deleteOld.run();

      console.log('✅ Cleaned up expired cached data');
    } catch (error) {
      console.error('❌ Failed to cleanup expired data:', error);
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

