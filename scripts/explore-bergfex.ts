import axios from 'axios';
import * as cheerio from 'cheerio';

interface ExplorationResult {
  url: string;
  timestamp: string;
  statusCode: number;
  contentLength: number;
  title?: string;
  tablesFound: number;
  potentialDataSelectors: string[];
  sampleData: any[];
  rawHtmlSnippet: string;
}

/**
 * Exploration script to understand bergfex.com data structure
 * This script scrapes the snow conditions page and analyzes what data is available
 */
async function exploreBergfex(): Promise<void> {
  const url = 'https://www.bergfex.com/schweiz/schneewerte/';
  console.log(`🗻 Exploring bergfex.com data structure...\n`);
  console.log(`URL: ${url}\n`);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IceKing-Explorer/1.0)'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Basic page info
    const title = $('title').text().trim();
    const tables = $('table');
    const potentialSelectors = [
      'table',
      '.snow-table',
      '.snow-conditions',
      '.resort-data',
      '[data-resort]',
      '.resort-row',
      '.conditions'
    ];

    console.log(`📊 Page Analysis:`);
    console.log(`- Status: ${response.status}`);
    console.log(`- Content Length: ${response.data.length} characters`);
    console.log(`- Title: ${title}`);
    console.log(`- Tables found: ${tables.length}`);
    console.log();

    // Look for potential data structures
    console.log(`🔍 Data Structure Discovery:`);

    // Check for common data selectors
    for (const selector of potentialSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`- ${selector}: ${elements.length} elements found`);
      }
    }
    console.log();

    // Analyze table structure (most likely data source)
    if (tables.length > 0) {
      console.log(`📋 Table Analysis:`);
      tables.each((i, table) => {
        const $table = $(table);
        const rows = $table.find('tr');
        const headers = $table.find('th');

        console.log(`Table ${i + 1}:`);
        console.log(`  - Rows: ${rows.length}`);
        console.log(`  - Header cells: ${headers.length}`);

        if (headers.length > 0) {
          const headerTexts = headers.map((_, th) => $(th).text().trim()).get();
          console.log(`  - Headers: ${headerTexts.join(' | ')}`);
        }

        // Sample first few data rows
        const dataRows = rows.slice(1, 4); // Skip header, show first 3 data rows
        if (dataRows.length > 0) {
          console.log(`  - Sample data rows:`);
          dataRows.each((_, row) => {
            const cells = $(row).find('td');
            const cellTexts = cells.map((_, td) => $(td).text().trim()).get();
            console.log(`    ${cellTexts.join(' | ')}`);
          });
        }
        console.log();
      });
    }

    // Look for resort-specific data
    console.log(`🏂 Resort Data Patterns:`);
    const resortSelectors = [
      'tr[data-resort]',
      '.resort-name',
      '[class*="resort"]',
      'a[href*="resort"]'
    ];

    for (const selector of resortSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`- ${selector}: ${elements.length} resorts found`);

        // Show first few resort names
        elements.slice(0, 5).each((i, el) => {
          const name = $(el).text().trim() || $(el).attr('data-resort') || $(el).attr('title');
          if (name) {
            console.log(`  ${i + 1}. ${name}`);
          }
        });
        console.log();
        break; // Found one, no need to check others
      }
    }

    // Look for snow data patterns
    console.log(`❄️ Snow Data Patterns:`);
    const snowSelectors = [
      '.snow-depth',
      '[class*="snow"]',
      '.depth',
      '.new-snow',
      '[data-depth]',
      '.mountain-depth',
      '.valley-depth'
    ];

    for (const selector of snowSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`- ${selector}: ${elements.length} snow data points`);

        // Show sample values
        const samples = elements.slice(0, 5).map((_, el) => $(el).text().trim()).get();
        console.log(`  Sample: ${samples.join(', ')}`);
        console.log();
        break;
      }
    }

    // Look for lift status
    console.log(`🚡 Lift Status Patterns:`);
    const liftSelectors = [
      '.lifts',
      '[class*="lift"]',
      '.lift-status',
      '.operating-lifts'
    ];

    for (const selector of liftSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`- ${selector}: ${elements.length} lift status points`);

        // Show sample values
        const samples = elements.slice(0, 5).map((_, el) => $(el).text().trim()).get();
        console.log(`  Sample: ${samples.join(', ')}`);
        console.log();
        break;
      }
    }

    // Raw HTML snippet for manual inspection
    console.log(`🔧 Raw HTML Snippet (first table):`);
    if (tables.length > 0) {
      const firstTableHtml = $(tables[0]).html()?.substring(0, 500) + '...';
      console.log(firstTableHtml);
      console.log();
    }

    // Summary and recommendations
    console.log(`📈 Summary & Recommendations:`);
    console.log(`- Data appears to be in table format`);
    console.log(`- Found ${tables.length} table(s) with resort data`);
    console.log(`- Each resort likely has: name, snow depths, new snow, lift status`);
    console.log(`- Consider scraping table rows systematically`);
    console.log(`- May need to handle pagination or filtering`);

  } catch (error) {
    console.error(`❌ Error exploring bergfex:`, error);
  }
}

// Run the exploration
exploreBergfex().catch(console.error);
