import type { Resort } from '../types/index.js';

export interface ScoreResult {
  score: number;
  status: 'OPEN' | 'CLOSED' | 'CLOSED_TODAY';
  reason: string;
  openingDate?: Date;
}

export function calculateScore(resort: Resort): ScoreResult {
  // Pre-filter: Closed for season
  if (resort.seasonStatus === 'CLOSED') {
    return {
      score: 0,
      status: 'CLOSED',
      openingDate: resort.openingDate,
      reason: `Closed until ${resort.openingDate?.toDateString()}`
    };
  }

  // Pre-filter: Closed today (but season is open)
  if (resort.liftsOpen === 0 && !isOperatingToday(resort)) {
    return {
      score: 0,
      status: 'CLOSED_TODAY',
      reason: 'Closed today (check operating hours)'
    };
  }

  // Calculate score only for open resorts
  // Adjusted weights for early season conditions
  const snowScore = normalizeSnowDepth(resort.mountainDepth || 0) * 0.5; // 50% weight on snow
  const newSnowScore = Math.min((resort.newSnow || 0) * 5, 20); // Up to 20 points for new snow
  const liftScore = ((resort.liftsOpen || 0) / Math.max(resort.liftsTotal || 1, 1)) * 20; // 20% weight on lifts
  const qualityBonus = getQualityBonus(resort);

  const baseScore = snowScore + newSnowScore + liftScore + qualityBonus;

  // Reduced penalty for early season - be more lenient
  const liftPenalty = (resort.liftsOpen || 0) < 1 ? 10 : 0; // Reduced from 20

  // Bonus for weekday (less crowded)
  const weekdayBonus = isWeekday() ? 5 : 0;

  const finalScore = Math.max(0, Math.min(100, baseScore - liftPenalty + weekdayBonus));

  return {
    score: finalScore,
    status: 'OPEN',
    reason: generateReason(resort, finalScore)
  };
}

function normalizeSnowDepth(depth: number): number {
  // Normalize snow depth to 0-100 scale
  // 0-20cm = 0-20, 20-50cm = 20-60, 50-100cm = 60-90, 100cm+ = 90-100
  if (depth <= 20) return depth;
  if (depth <= 50) return 20 + (depth - 20) * (60 - 20) / (50 - 20);
  if (depth <= 100) return 60 + (depth - 50) * (90 - 60) / (50 - 100);
  return 90 + Math.min(10, (depth - 100) / 10); // Cap at 100
}

function getQualityBonus(resort: Resort): number {
  // Simple quality bonus based on resort features
  let bonus = 0;
  if (resort.hasPark) bonus += 5;
  if (resort.hasNightRiding) bonus += 3;
  if (resort.difficulty === 'mixed') bonus += 2;
  return bonus;
}

function isOperatingToday(resort: Resort): boolean {
  // Simple check - in production, this would check current time against operating hours
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (!resort.operatingHours) return true; // Assume open if no hours specified

  const hours = isWeekend ? resort.operatingHours?.weekends : resort.operatingHours?.weekdays;
  if (!hours) return true; // Assume open if no specific hours

  // Parse hours like "08:30-16:15"
  const timeRange = hours.split('-');
  if (timeRange.length !== 2) return true;

  const [openTime, closeTime] = timeRange;
  if (!openTime || !closeTime) return true;

  const currentTime = now.getHours() * 60 + now.getMinutes();
  const openMinutes = timeToMinutes(openTime);
  const closeMinutes = timeToMinutes(closeTime);

  return currentTime >= openMinutes && currentTime <= closeMinutes;
}

function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  const hours = Number(parts[0]) || 0;
  const minutes = Number(parts[1]) || 0;
  return hours * 60 + minutes;
}

function isWeekday(): boolean {
  const day = new Date().getDay();
  return day >= 1 && day <= 5; // Monday to Friday
}

function generateReason(resort: Resort, score: number): string {
  const snowDepth = resort.mountainDepth || 0;
  const liftsOpen = resort.liftsOpen || 0;
  const liftsTotal = resort.liftsTotal || 0;

  if (score >= 70) {
    return `Excellent early season conditions with ${snowDepth}cm of snow!`;
  } else if (score >= 50) {
    return `Good conditions with ${snowDepth}cm base - perfect for early season riding.`;
  } else if (score >= 30) {
    return `Decent conditions with ${snowDepth}cm snow. ${liftsOpen}/${liftsTotal} lifts operational.`;
  } else {
    return `Early season conditions with ${snowDepth}cm snow. Limited lift operations (${liftsOpen}/${liftsTotal}).`;
  }
}
