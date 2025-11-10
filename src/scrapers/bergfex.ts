import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Conditions } from '../types/index.js';

export interface ScrapedResortData {
  name: string;
  resortId: string;
  valleyDepth: number | null;
  mountainDepth: number | null;
  newSnow: number | null;
  liftsOpen: number | null;
  liftsTotal: number | null;
  lastUpdate: Date | null;
  rawData: {
    rowHtml: string;
    parsedAt: Date;
  };
}

/**
 * Scrape all snow conditions from bergfex.com
 * Returns all available resort data from the main table
 */
export async function scrapeAllBergfexConditions(): Promise<ScrapedResortData[]> {
  try {
    const url = 'https://www.bergfex.com/schweiz/schneewerte/';
    console.log(`🌐 Scraping bergfex: ${url}`);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IceKing/1.0)'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const results: ScrapedResortData[] = [];

    // Find the main snow conditions table
    const table = $('table.snow, table').first();
    if (!table.length) {
      console.warn('No snow conditions table found');
      return results;
    }

    // Parse each table row (skip header row)
    const rows = table.find('tbody tr');
    console.log(`📋 Found ${rows.length} resort rows to parse`);

    rows.each((index, row) => {
      try {
        const $row = $(row);
        const cells = $row.find('td');

        if (cells.length < 6) {
          console.warn(`Row ${index + 1}: Insufficient cells (${cells.length})`);
          return; // continue to next row
        }

        // Extract data from each column (based on discovered structure)
        const resortName = $(cells[0]).text().trim();
        const valleyText = $(cells[1]).text().trim();
        const mountainText = $(cells[2]).text().trim();
        const newSnowText = $(cells[3]).text().trim();
        const liftsText = $(cells[4]).text().trim();
        const dateText = $(cells[5]).text().trim();

        if (!resortName) {
          console.warn(`Row ${index + 1}: No resort name found`);
          return;
        }

        // Parse snow depths (handle "-" as null)
        const valleyDepth = parseSnowDepth(valleyText);
        const mountainDepth = parseSnowDepth(mountainText);
        const newSnow = parseSnowDepth(newSnowText);

        // Parse lift status
        const [liftsOpen, liftsTotal] = parseLifts(liftsText);

        // Parse date
        const lastUpdate = parseBergfexDate(dateText);

        // Create resort ID from name (simplified mapping)
        const resortId = createResortId(resortName);

        const result: ScrapedResortData = {
          name: resortName,
          resortId,
          valleyDepth,
          mountainDepth,
          newSnow,
          liftsOpen,
          liftsTotal,
          lastUpdate,
          rawData: {
            rowHtml: $row.html() || '',
            parsedAt: new Date()
          }
        };

        results.push(result);
        console.log(`✅ Parsed: ${resortName} (${valleyDepth || 0}cm/${mountainDepth || 0}cm, ${liftsOpen || 0}/${liftsTotal || 0} lifts)`);

      } catch (rowError) {
        console.error(`❌ Error parsing row ${index + 1}:`, rowError);
      }
    });

    console.log(`🎯 Successfully parsed ${results.length} resorts from bergfex`);
    return results;

  } catch (error) {
    console.error(`❌ Error scraping bergfex:`, error);
    return [];
  }
}

/**
 * Scrape conditions for a specific resort by name
 * @deprecated Use scrapeAllBergfexConditions() and filter by name instead
 */
export async function scrapeBergfexConditions(resortId: string): Promise<Conditions | null> {
  const allData = await scrapeAllBergfexConditions();
  const resortData = allData.find(r => r.resortId === resortId);

  if (!resortData) return null;

  return {
    resortId: resortData.resortId,
    scrapedAt: resortData.rawData.parsedAt,
    mountainDepth: resortData.mountainDepth || 0,
    valleyDepth: resortData.valleyDepth || 0,
    newSnow: resortData.newSnow || 0,
    liftsOpen: resortData.liftsOpen || 0,
    liftsTotal: resortData.liftsTotal || 0,
    lastUpdate: resortData.lastUpdate || new Date()
  };
}

// Helper functions

/**
 * Parse snow depth from text (e.g., "83 cm" or "-")
 */
function parseSnowDepth(text: string): number | null {
  if (!text || text === '-' || text.trim() === '') {
    return null;
  }

  const match = text.match(/(\d+)/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Parse lift status from text (e.g., "1/13" or "8/23" or "")
 */
function parseLifts(text: string): [number | null, number | null] {
  if (!text || text.trim() === '') {
    return [null, null];
  }

  const match = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (match && match[1] && match[2]) {
    const liftsOpen = parseInt(match[1], 10);
    const liftsTotal = parseInt(match[2], 10);
    return [liftsOpen, liftsTotal];
  }

  // Handle single number (maybe just operating lifts)
  const singleMatch = text.match(/(\d+)/);
  if (singleMatch && singleMatch[1]) {
    return [parseInt(singleMatch[1], 10), null];
  }

  return [null, null];
}

/**
 * Parse bergfex date formats into Date objects
 */
function parseBergfexDate(text: string): Date | null {
  if (!text || text.trim() === '') {
    return null;
  }

  const now = new Date();
  const lowerText = text.toLowerCase();

  // Handle "Today, HH:MM" format
  if (lowerText.includes('today')) {
    const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch && timeMatch[1] && timeMatch[2]) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const date = new Date(now);
      date.setHours(hours, minutes, 0, 0);
      return date;
    }
    return now;
  }

  // Handle "Yesterday, HH:MM" format
  if (lowerText.includes('yesterday')) {
    const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch && timeMatch[1] && timeMatch[2]) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const date = new Date(now);
      date.setDate(date.getDate() - 1);
      date.setHours(hours, minutes, 0, 0);
      return date;
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  // Handle absolute dates like "11/02/2025" (DD/MM/YYYY)
  const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dateMatch && dateMatch[1] && dateMatch[2] && dateMatch[3]) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1; // JS months are 0-based
    const year = parseInt(dateMatch[3], 10);
    return new Date(year, month, day);
  }

  // Handle "Tue, 04.11." format (day, DD.MM.)
  const shortDateMatch = text.match(/(\d{1,2})\.(\d{1,2})\./);
  if (shortDateMatch && shortDateMatch[1] && shortDateMatch[2]) {
    const day = parseInt(shortDateMatch[1], 10);
    const month = parseInt(shortDateMatch[2], 10) - 1;
    const year = now.getFullYear(); // Assume current year
    return new Date(year, month, day);
  }

  // If we can't parse it, return current date as fallback
  console.warn(`Could not parse date: "${text}"`);
  return now;
}

/**
 * Create a simplified resort ID from resort name
 * This is a basic implementation - in production you'd want proper mapping
 */
function createResortId(resortName: string): string {
  return resortName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
