import { calculateScore } from '../src/services/scoring.js';
import { getAllResorts } from '../src/services/resortMapping.js';
import { DataStorageService } from '../src/services/dataStorage.js';

/**
 * Debug script to check scoring algorithm
 */
async function debugScoring(): Promise<void> {
  console.log('🔍 Debugging IceKing scoring algorithm...\n');

  try {
    const resorts = getAllResorts();
    console.log(`Found ${resorts.length} resorts in mapping`);

    const conditionsMap = DataStorageService.getAllLatestConditions();
    console.log(`Found conditions for ${conditionsMap.size} resorts\n`);

    console.log('📊 Scoring Analysis:');
    console.log('=' .repeat(60));

    for (const resort of resorts) {
      if (resort.resort.seasonStatus !== 'OPEN') {
        console.log(`${resort.resort.name}: CLOSED (${resort.resort.seasonStatus})`);
        continue;
      }

      const conditions = conditionsMap.get(resort.internalId);

      // Merge conditions into resort data
      const resortWithConditions: any = {
        ...resort.resort,
        mountainDepth: conditions?.mountainDepth || 0,
        valleyDepth: conditions?.valleyDepth || 0,
        newSnow: conditions?.newSnow || 0,
        liftsOpen: conditions?.liftsOpen || 0,
        liftsTotal: conditions?.liftsTotal || 0,
        lastUpdate: conditions?.lastUpdate
      };

      const score = calculateScore(resortWithConditions);

      console.log(`${resort.resort.name}:`);
      console.log(`  Status: ${score.status}`);
      console.log(`  Score: ${score.score}/100`);
      console.log(`  Reason: ${score.reason}`);
      console.log(`  Data: ${resortWithConditions.mountainDepth}cm mountain, ${resortWithConditions.liftsOpen}/${resortWithConditions.liftsTotal} lifts`);
      console.log();
    }

    console.log('✅ Scoring debug completed');

  } catch (error) {
    console.error('❌ Scoring debug failed:', error);
  }
}

// Run the debug
debugScoring().catch(console.error);
