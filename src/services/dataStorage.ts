import { statements, mockDb } from '../database/index.js';
import type { Conditions, DriveTime } from '../types/index.js';
import type { ScrapedResortData } from '../scrapers/bergfex.js';
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
      statements.insertOrUpdateDriveTime.run({
        resort_id: driveTime.resortId,
        origin: driveTime.origin,
        drive_time_minutes: driveTime.driveTimeMinutes,
        distance_km: driveTime.distanceKm
      });
    } catch (error) {
      console.error(`Error storing drive time for ${driveTime.resortId}:`, error);
    }
  }

  /**
   * Get drive time for a resort
   */
  static getDriveTime(resortId: string, origin: string = "Dietikon"): DriveTime | null {
    try {
      const row = statements.getDriveTime.get(resortId, origin);
      if (!row) return null;

      return {
        resortId,
        origin,
        driveTimeMinutes: row.drive_time_minutes,
        distanceKm: row.distance_km,
        cachedAt: new Date(row.cached_at)
      };
    } catch (error) {
      console.error(`Error getting drive time for ${resortId}:`, error);
      return null;
    }
  }

  /**
   * Initialize drive time estimates for all resorts
   */
  static initializeDriveTimes(): void {
    console.log('Initializing drive time estimates...');

    const { getAllResorts } = require('./resortMapping.js');
    const resorts = getAllResorts();

    for (const resort of resorts) {
      const estimate = getDriveEstimate(resort);
      const driveTime = estimateToDriveTime(estimate);
      this.storeDriveTime(driveTime);
    }

    console.log(`✅ Initialized drive times for ${resorts.length} resorts`);
  }

  /**
   * Clear all stored data (for testing/reset)
   */
  static clearAllData(): void {
    mockDb.conditions.length = 0;
    mockDb.driveTimes.length = 0;
    console.log('✅ Cleared all stored data from mock database');
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
      driveTimes: mockDb.driveTimes.length,
      scores: 0 // Not implemented yet
    };
  }
}
