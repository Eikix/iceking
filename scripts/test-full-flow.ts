import { scrapeAllBergfexConditions } from '../src/scrapers/bergfex.js';
import { DataStorageService } from '../src/services/dataStorage.js';
import { getRecommendations, formatRecommendations } from '../src/services/recommendations.js';

/**
 * Test the full flow: scrape -> store -> recommend
 */
async function testFullFlow(): Promise<void> {
  console.log('🔄 Testing IceKing Full Flow: Scrape → Store → Recommend\n');

  try {
    // Clear previous data for clean test
    console.log('🧹 Clearing previous data...');
    DataStorageService.clearAllData();
    // Step 1: Scrape data
    console.log('📥 Step 1: Scraping bergfex data...');
    const scrapedData = await scrapeAllBergfexConditions();
    console.log(`✅ Scraped ${scrapedData.length} resorts\n`);

    // Step 2: Store data
    console.log('💾 Step 2: Storing conditions...');
    DataStorageService.storeBergfexConditions(scrapedData);
    console.log();

    // Step 3: Generate recommendations
    console.log('🎯 Step 3: Generating recommendations...');
    const result = getRecommendations({
      maxDriveTime: 90,
      minScore: 1,
      limit: 5
    });

    console.log(`📊 Results: ${result.recommendations.length} recommendations`);
    console.log(`   Considered: ${result.summary.totalConsidered} resorts`);
    console.log(`   Within drive time: ${result.summary.filteredByDrive}`);
    console.log(`   Above score threshold: ${result.summary.filteredByScore}\n`);

    // Show formatted recommendations
    const formatted = formatRecommendations(result);
    console.log('🏂 TOP RECOMMENDATIONS:');
    console.log('=' .repeat(60));
    console.log(formatted);
    console.log('=' .repeat(60));

    // Show some stats
    const stats = DataStorageService.getStats();
    console.log('📈 Database Stats:');
    console.log(`   Resorts tracked: ${stats.resorts}`);
    console.log(`   Conditions stored: ${stats.conditions}`);
    console.log(`   Drive times cached: ${stats.driveTimes}`);

  } catch (error) {
    console.error('❌ Full flow test failed:', error);
  }
}

// Run the test
testFullFlow().catch(console.error);
