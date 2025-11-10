import { scrapeAllBergfexConditions } from '../src/scrapers/bergfex.js';

/**
 * Test script to verify the bergfex scraper works with real data
 */
async function testScraper(): Promise<void> {
  console.log('🧪 Testing bergfex scraper...\n');

  try {
    const results = await scrapeAllBergfexConditions();

    if (results.length === 0) {
      console.log('❌ No data scraped');
      return;
    }

    console.log(`\n📊 Scraped ${results.length} resorts\n`);

    // Show summary statistics
    const withValleyDepth = results.filter(r => r.valleyDepth !== null).length;
    const withMountainDepth = results.filter(r => r.mountainDepth !== null).length;
    const withNewSnow = results.filter(r => r.newSnow !== null).length;
    const withLifts = results.filter(r => r.liftsOpen !== null).length;

    console.log('📈 Data Completeness:');
    console.log(`- Resorts with valley depth: ${withValleyDepth}/${results.length} (${Math.round(withValleyDepth/results.length*100)}%)`);
    console.log(`- Resorts with mountain depth: ${withMountainDepth}/${results.length} (${Math.round(withMountainDepth/results.length*100)}%)`);
    console.log(`- Resorts with new snow: ${withNewSnow}/${results.length} (${Math.round(withNewSnow/results.length*100)}%)`);
    console.log(`- Resorts with lift data: ${withLifts}/${results.length} (${Math.round(withLifts/results.length*100)}%)`);
    console.log();

    // Show top 5 resorts by mountain depth
    console.log('🏔️ Top 5 resorts by mountain snow depth:');
    const sortedByDepth = results
      .filter(r => r.mountainDepth !== null)
      .sort((a, b) => (b.mountainDepth || 0) - (a.mountainDepth || 0))
      .slice(0, 5);

    sortedByDepth.forEach((resort, i) => {
      console.log(`${i + 1}. ${resort.name}: ${resort.mountainDepth}cm`);
    });
    console.log();

    // Show resorts with most lifts open
    console.log('🚡 Resorts with most lifts operating:');
    const sortedByLifts = results
      .filter(r => r.liftsOpen !== null && r.liftsTotal !== null)
      .sort((a, b) => (b.liftsOpen || 0) - (a.liftsOpen || 0))
      .slice(0, 5);

    sortedByLifts.forEach((resort, i) => {
      console.log(`${i + 1}. ${resort.name}: ${resort.liftsOpen}/${resort.liftsTotal} lifts`);
    });
    console.log();

    // Show sample data for a few resorts
    console.log('📋 Sample resort data:');
    const samples = results.slice(0, 3);
    samples.forEach((resort, i) => {
      console.log(`${i + 1}. ${resort.name}`);
      console.log(`   ID: ${resort.resortId}`);
      console.log(`   Valley: ${resort.valleyDepth || 'N/A'}cm`);
      console.log(`   Mountain: ${resort.mountainDepth || 'N/A'}cm`);
      console.log(`   New snow: ${resort.newSnow || 'N/A'}cm`);
      console.log(`   Lifts: ${resort.liftsOpen || '?'}/${resort.liftsTotal || '?'} open`);
      console.log(`   Last update: ${resort.lastUpdate?.toLocaleString() || 'N/A'}`);
      console.log();
    });

    console.log('✅ Scraper test completed successfully!');

  } catch (error) {
    console.error('❌ Scraper test failed:', error);
  }
}

// Run the test
testScraper().catch(console.error);
