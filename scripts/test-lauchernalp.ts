import { getAllResorts } from '../src/services/resortMapping.js';
import { getDriveEstimate } from '../src/services/driveTimes.js';

async function testLauchernalp() {
  console.log('🔍 Testing Lauchernalp drive time calculation...\n');

  const resorts = getAllResorts();
  const lauchernalp = resorts.find(r => r.internalId === 'lauchernalp-loetschental');

  if (!lauchernalp) {
    console.log('❌ Lauchernalp not found in resort database');
    return;
  }

  console.log('✅ Lauchernalp found:');
  console.log(`   Name: ${lauchernalp.resort.name}`);
  console.log(`   Coordinates: ${lauchernalp.resort.coordinates.lat}, ${lauchernalp.resort.coordinates.lng}`);
  console.log(`   Priority: ${lauchernalp.resort.priority}`);

  console.log('\n🚗 Calculating drive time from Hedingen...');
  const driveEstimate = await getDriveEstimate(lauchernalp);

  console.log(`\n📊 Results:`);
  console.log(`   Distance: ${driveEstimate.distanceKm} km`);
  console.log(`   Drive time: ${driveEstimate.driveTimeMinutes} minutes (${(driveEstimate.driveTimeMinutes / 60).toFixed(1)} hours)`);
  console.log(`   Route: ${driveEstimate.route}`);
}

testLauchernalp().catch(console.error);
