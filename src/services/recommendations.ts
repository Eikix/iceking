import { calculateScore, type ScoreResult } from './scoring.js';
import { DataStorageService } from './dataStorage.js';
import { getOpenResorts, getPriorityResorts, type ResortMapping } from './resortMapping.js';
import { filterByDriveTime, sortByDriveTime, getDriveEstimate } from './driveTimes.js';
import type { ResortRecommendation } from '../types/index.js';

/**
 * Recommendation service that combines scraped data with scoring algorithm
 * to provide personalized snowboarding recommendations
 */

/**
 * Format resort names from IDs (e.g., "survih-samedan" -> "Survih Samedan")
 */
function formatResortName(resortId: string): string {
  return resortId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .replace(' L ', ' Lö') // Fix "Lötschental"
    .replace(' L Tschental', ' Lötschental'); // Fix "Lötschental"
}

export interface RecommendationOptions {
  maxDriveTime?: number; // minutes (default: 90)
  minScore?: number;     // minimum score threshold (default: 10)
  limit?: number;        // max recommendations (default: 5)
  includeClosed?: boolean; // show closed resorts (default: false)
}

export interface RecommendationResult {
  recommendations: ResortRecommendation[];
  summary: {
    totalConsidered: number;
    filteredByDrive: number;
    filteredByScore: number;
    finalCount: number;
  };
}

/**
 * Generate top snowboarding recommendations
 */
export function getRecommendations(options: RecommendationOptions = {}): RecommendationResult {
  const {
    maxDriveTime = 90,
    minScore = 10,
    limit = 5,
    includeClosed = false
  } = options;

  console.log(`🎯 Generating recommendations (maxDrive: ${maxDriveTime}min, minScore: ${minScore}, limit: ${limit})`);

  // Get ALL resorts with stored conditions
  const conditionsMap = DataStorageService.getAllLatestConditions();
  const totalConsidered = conditionsMap.size;

  console.log(`📊 Found ${totalConsidered} resorts with stored conditions`);

  // Create resort objects for all resorts with conditions
  let resorts: ResortMapping[] = Array.from(conditionsMap.keys()).map(resortId => {
    // Check if we have a mapping for this resort
    const existingMapping = getPriorityResorts().find(r => r.internalId === resortId);

    if (existingMapping) {
      return existingMapping;
    }

    // Create a mock mapping for unmapped resorts
    const displayName = formatResortName(resortId);
    return {
      internalId: resortId,
      bergfexName: displayName,
      resort: {
        id: resortId,
        name: displayName,
        bergfexId: resortId,
        coordinates: { lat: 46.8, lng: 8.2 }, // Default Swiss coordinates
        seasonStatus: "OPEN" as const,
        priority: 3,
        difficulty: "mixed" as const,
        hasPark: false,
        hasNightRiding: false
      }
    };
  });

  // Filter by drive time (calculate on-demand for new resorts)
  console.log(`🚗 Calculating drive times for ${resorts.length} resorts...`);
  const resortsWithinDriveTime = resorts.filter(resort => {
    const estimate = getDriveEstimate(resort);
    const withinTime = estimate.driveTimeMinutes <= maxDriveTime;
    console.log(`   ${resort.resort.name}: ${estimate.driveTimeMinutes}min (${withinTime ? '✅' : '❌'})`);
    return withinTime;
  });
  resorts = resortsWithinDriveTime;
  const filteredByDrive = resorts.length;

  // Calculate scores and create recommendations
  const scoredRecommendations: ResortRecommendation[] = [];

  for (const resort of resorts) {
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

    // Calculate score
    const score = calculateScore(resortWithConditions);

    // Get drive time
    const driveEstimate = getDriveEstimate(resort);

    const recommendation: ResortRecommendation = {
      resort: resortWithConditions,
      score: score,
      driveTime: driveEstimate.driveTimeMinutes,
      distance: driveEstimate.distanceKm
    };

    scoredRecommendations.push(recommendation);
  }

  // Filter by minimum score
  const filteredByScore = scoredRecommendations.filter(rec => rec.score.score >= minScore);

  // Sort by score (highest first)
  const sorted = filteredByScore.sort((a, b) => b.score.score - a.score.score);

  // Limit results
  const final = sorted.slice(0, limit);

  return {
    recommendations: final,
    summary: {
      totalConsidered,
      filteredByDrive,
      filteredByScore: filteredByScore.length,
      finalCount: final.length
    }
  };
}

/**
 * Get detailed information about a specific resort
 */
export function getResortDetails(resortId: string): ResortRecommendation | null {
  const resort = getPriorityResorts().find(r => r.internalId === resortId);
  if (!resort) return null;

  const conditions = DataStorageService.getLatestConditions(resortId);
  const driveEstimate = getDriveEstimate(resort);

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

  return {
    resort: resortWithConditions,
    score,
    driveTime: driveEstimate.driveTimeMinutes,
    distance: driveEstimate.distanceKm
  };
}

/**
 * Get resorts that are currently closed
 */
export function getClosedResorts(): ResortRecommendation[] {
  const allResorts = getPriorityResorts();
  const closedResorts = allResorts.filter(r => r.resort.seasonStatus === 'CLOSED');

  return closedResorts.map(resort => {
    const conditions = DataStorageService.getLatestConditions(resort.internalId);
    const driveEstimate = getDriveEstimate(resort);

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

    return {
      resort: resortWithConditions,
      score,
      driveTime: driveEstimate.driveTimeMinutes,
      distance: driveEstimate.distanceKm
    };
  });
}

/**
 * Format recommendation for display
 */
export function formatRecommendation(rec: ResortRecommendation): string {
  const { resort, score, driveTime, distance } = rec;

  let status = '';
  if (score.status === 'CLOSED') {
    status = `❌ CLOSED until ${resort.openingDate?.toLocaleDateString()}`;
  } else if (score.status === 'CLOSED_TODAY') {
    status = '❌ CLOSED today';
  } else {
    status = `✅ OPEN`;
  }

  const snowInfo = [];
  if (resort.mountainDepth && resort.mountainDepth > 0) {
    snowInfo.push(`${resort.mountainDepth}cm mountain`);
  }
  if (resort.valleyDepth && resort.valleyDepth > 0) {
    snowInfo.push(`${resort.valleyDepth}cm valley`);
  }
  if (resort.newSnow && resort.newSnow > 0) {
    snowInfo.push(`${resort.newSnow}cm new`);
  }

  const snowText = snowInfo.length > 0 ? snowInfo.join(' · ') : 'No snow data';

  const liftText = resort.liftsOpen && resort.liftsTotal
    ? `${resort.liftsOpen}/${resort.liftsTotal} lifts`
    : 'Lift status unknown';

  return `${resort.name}
${status} | Score: ${score.score}/100 | ⏱️ ${driveTime}min (${distance}km)
📊 ${snowText}
🚡 ${liftText}
💡 ${score.reason}`;
}

/**
 * Format multiple recommendations for Telegram
 */
export function formatRecommendations(result: RecommendationResult): string {
  const { recommendations, summary } = result;

  if (recommendations.length === 0) {
    return `❌ No good recommendations found

Considerations:
• ${summary.totalConsidered} resorts considered
• ${summary.filteredByDrive} within ${90}min drive
• ${summary.filteredByScore} with score ≥${20}

💡 Try adjusting your preferences or check back later for more snow!`;
  }

  const header = `🏔️ IceKing – Top ${recommendations.length} Recommendations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

  const recsText = recommendations
    .map((rec, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `🏅`;
      return `${medal} ${formatRecommendation(rec)}`;
    })
    .join('\n\n');

  const footer = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Score guide: 80-100=Excellent, 60-79=Good, 40-59=Decent, <40=Wait

📊 Stats: ${summary.finalCount} shown from ${summary.totalConsidered} considered`;

  return header + recsText + footer;
}
