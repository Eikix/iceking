import axios from 'axios';
import * as cheerio from 'cheerio';

interface ResortMetadata {
  name: string;
  elevation: number | null;
  pistesKm: number | null;
  lifts: {
    operating: number | null;
    total: number | null;
  };
  snowDepth: number | null;
  price: string | null;
  resortId: string;
}

/**
 * Explore the main bergfex page to get comprehensive resort data
 */
async function exploreBergfexMain(): Promise<void> {
  const url = 'https://www.bergfex.com/schweiz/';
  console.log(`🗻 Exploring main bergfex page: ${url}\n`);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IceKing-Explorer/1.0)'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const resorts: ResortMetadata[] = [];

    // Find all tables and look for resort data
    console.log('🔍 Looking for tables and resort data...');

    const tables = $('table');
    console.log(`Found ${tables.length} tables on the page`);

    // Look for any elements containing resort-like data
    const allElements = $('*').filter((i, el) => {
      const text = $(el).text().trim();
      return text.length > 10 && (text.includes('km') || text.includes('/') || text.includes('cm') || text.includes('CHF'));
    });

    console.log(`Found ${allElements.length} elements with resort-like data`);

    // Try multiple approaches to find resort data
    let resortElements: any[] = [];

    // Approach 1: Look for elements containing specific resort data patterns
    const resortPatterns = [
      /(\w+.*)\s+\(\d+\.\d+\s*m\)/,  // Name (elevation)
      /Pistes:\s*\d+/,                // Pistes data
      /Lifts:\s*\d+\/\d+/,           // Lifts data
      /Snow:\s*\d+/,                 // Snow data
      /CHF\s+\d+,\d+/               // Price data
    ];

    $('*').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) {
        const matches = resortPatterns.filter(pattern => pattern.test(text));
        if (matches.length >= 2) { // Must match at least 2 patterns
          resortElements.push({ element: el, text, matches: matches.length });
        }
      }
    });

    // Approach 2: Look for divs or other containers with resort data
    const containers = $('.resort-item, .ski-resort, [class*="resort"], [data-resort]').filter((i, el) => {
      const text = $(el).text();
      return /\d+ km|\d+\/\d+|\d+ cm|CHF/.test(text);
    });

    console.log(`📋 Found ${resortElements.length} elements with resort patterns`);
    console.log(`📋 Found ${containers.length} resort containers`);

    // Use whichever approach found more data
    const dataSource = resortElements.length > containers.length ? resortElements : containers.toArray().map(el => ({ element: el, text: $(el).text() }));

    console.log(`📋 Using ${dataSource.length} data elements`);

    if (dataSource.length === 0) {
      // Debug: Show some sample content to understand the structure
      console.log('\n🔧 Debugging page structure...');

      // Show first few tables
      tables.slice(0, 2).each((i, table) => {
        console.log(`\nTable ${i + 1}:`);
        const rows = $(table).find('tr');
        console.log(`  - ${rows.length} rows`);
        if (rows.length > 0) {
          const firstRow = $(rows[0]);
          console.log(`  - First row: ${firstRow.text().substring(0, 100)}...`);
        }
      });

      // Look for specific resort names from the search results
      const saasFee = $('*').filter((i, el) => $(el).text().includes('Saas-Fee')).first();
      if (saasFee.length > 0) {
        console.log(`\nFound Saas-Fee element: ${saasFee.text().substring(0, 200)}...`);
      }

      // Show some of the elements with resort-like data
      console.log('\nSample resort-like elements:');
      allElements.slice(0, 5).each((i, el) => {
        console.log(`${i+1}. ${$(el).text().substring(0, 150)}...`);
      });
    }

    console.log();

    // Parse each data element
    dataSource.forEach((item, index) => {
      try {
        const text = item.text;

        // Parse the complex text format from search results
        // Format: "Saas-Fee Saas-Fee (3.600 m) 3.600 m Pistes: 150 km Lifts: 8/23 Snow: 175 cm Price: CHF 83,00"

        // Extract resort name (first part before elevation)
        const nameMatch = text.match(/^([^(\n]+)\s*\(/m);
        const resortName = nameMatch ? nameMatch[1].trim() : 'Unknown';

        // Extract elevation
        const elevationMatch = text.match(/(\d+(?:\.\d+)?)\s*m/);
        const elevation = elevationMatch ? parseFloat(elevationMatch[1]) : null;

        // Extract pistes
        const pistesMatch = text.match(/Pistes:\s*(\d+(?:\.\d+)?)\s*km/);
        const pistesKm = pistesMatch ? parseFloat(pistesMatch[1]) : null;

        // Extract lifts
        const liftsMatch = text.match(/Lifts:\s*(\d+)\/(\d+)/);
        const lifts = {
          operating: liftsMatch ? parseInt(liftsMatch[1]) : null,
          total: liftsMatch ? parseInt(liftsMatch[2]) : null
        };

        // Extract snow depth
        const snowMatch = text.match(/Snow:\s*(\d+)\s*cm/);
        const snowDepth = snowMatch ? parseInt(snowMatch[1]) : null;

        // Extract price
        const priceMatch = text.match(/Price:\s*([^,\n]+)/);
        const price = priceMatch ? priceMatch[1].trim() : null;

        // Skip if we don't have basic data
        if (!elevation && !pistesKm && !lifts.total && !snowDepth) {
          return;
        }

        const resort: ResortMetadata = {
          name: resortName,
          elevation,
          pistesKm,
          lifts,
          snowDepth,
          price,
          resortId: createResortId(resortName)
        };

        resorts.push(resort);

        console.log(`✅ ${resortName}: ${elevation}m, ${pistesKm}km pistes, ${lifts.operating}/${lifts.total} lifts, ${snowDepth}cm snow, ${price}`);

      } catch (error) {
        console.warn(`❌ Error parsing data element ${index}:`, error);
      }
    });

    console.log(`\n📊 Summary:`);
    console.log(`- Total resorts found: ${resorts.length}`);
    console.log(`- Resorts with elevation: ${resorts.filter(r => r.elevation).length}`);
    console.log(`- Resorts with piste data: ${resorts.filter(r => r.pistesKm).length}`);
    console.log(`- Resorts with lift data: ${resorts.filter(r => r.lifts.total).length}`);
    console.log(`- Resorts with snow data: ${resorts.filter(r => r.snowDepth).length}`);
    console.log(`- Resorts with price data: ${resorts.filter(r => r.price).length}`);

    // Show top resorts by different metrics
    console.log(`\n🏔️ Top 5 by Elevation:`);
    resorts
      .filter(r => r.elevation)
      .sort((a, b) => (b.elevation || 0) - (a.elevation || 0))
      .slice(0, 5)
      .forEach((r, i) => console.log(`${i+1}. ${r.name}: ${r.elevation}m`));

    console.log(`\n🎿 Top 5 by Piste Length:`);
    resorts
      .filter(r => r.pistesKm)
      .sort((a, b) => (b.pistesKm || 0) - (a.pistesKm || 0))
      .slice(0, 5)
      .forEach((r, i) => console.log(`${i+1}. ${r.name}: ${r.pistesKm}km`));

    console.log(`\n🚡 Top 5 by Lift Count:`);
    resorts
      .filter(r => r.lifts.total)
      .sort((a, b) => (b.lifts.total || 0) - (a.lifts.total || 0))
      .slice(0, 5)
      .forEach((r, i) => console.log(`${i+1}. ${r.name}: ${r.lifts.total} lifts`));

  } catch (error) {
    console.error(`❌ Error exploring bergfex main page:`, error);
  }
}

function createResortId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Run the exploration
exploreBergfexMain().catch(console.error);
