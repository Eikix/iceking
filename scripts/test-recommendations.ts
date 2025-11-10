import { getRecommendations, formatRecommendations } from '../src/services/recommendations.js';

/**
 * Test script to verify the recommendation system works
 */
async function testRecommendations(): Promise<void> {
  console.log('🧪 Testing IceKing recommendation system...\n');

  try {
    // Test basic recommendations
    console.log('Testing basic recommendations (max 90min drive, min score 1, top 5)...');
    const result = getRecommendations({
      maxDriveTime: 90,
      minScore: 1, // Lower threshold for testing
      limit: 5
    });

    console.log(`Found ${result.recommendations.length} recommendations`);
    console.log(`Considered: ${result.summary.totalConsidered} resorts`);
    console.log(`Filtered by drive time: ${result.summary.filteredByDrive}`);
    console.log(`Filtered by score: ${result.summary.filteredByScore}\n`);

    // Show formatted recommendations
    const formatted = formatRecommendations(result);
    console.log('📋 Formatted Recommendations:');
    console.log('=' .repeat(50));
    console.log(formatted);
    console.log('=' .repeat(50));

    // Test individual resort details
    if (result.recommendations.length > 0) {
      console.log('\n🏂 Testing individual resort details...');
      const firstResort = result.recommendations[0];

      console.log(`Testing details for: ${firstResort.resort.name}`);
      console.log(`Score: ${firstResort.score.score}/100 (${firstResort.score.status})`);
      console.log(`Drive: ${firstResort.driveTime}min (${firstResort.distance}km)`);
      console.log(`Snow: ${firstResort.resort.mountainDepth || 'N/A'}cm mountain`);
      console.log(`Lifts: ${firstResort.resort.liftsOpen || '?'}/${firstResort.resort.liftsTotal || '?'} open`);
    }

    console.log('\n✅ Recommendation system test completed successfully!');
    console.log('\n🚀 IceKing is ready! Next steps:');
    console.log('1. Get a Telegram bot token from @BotFather');
    console.log('2. Set TELEGRAM_BOT_TOKEN in .env file');
    console.log('3. Run: bun run dev');
    console.log('4. Test commands: /start, /recs, /scrape, /stats');

  } catch (error) {
    console.error('❌ Recommendation test failed:', error);
  }
}

// Run the test
testRecommendations().catch(console.error);
