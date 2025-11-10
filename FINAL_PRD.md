# **Final Product Requirements Document (PRD)**

**IceKing – Personalized Swiss Snowboard Advisor**

*For weekday shredders in Hedingen, Switzerland*

---

## **Executive Summary**

IceKing is a Telegram bot that delivers **real-time, hyper-localized snowboarding recommendations** for weekday riders in the greater Zurich area. By combining snow depth, lift status, drive time, operating hours, and season dates into a single actionable score, IceKing helps snowboarders make data-driven decisions about where to ride after work.

### **Key Innovations**
- **Critical Fix**: Pre-filters closed resorts to prevent recommending places that aren't open
- **Beginner-Friendly**: Explains why resorts are recommended with contextual guidance
- **Hybrid Interface**: Fast command-based queries for power users, natural language support for casual users
- **Comprehensive Data**: Scrapes operating hours, season dates, and real-time conditions from multiple sources

### **Core Value Proposition**
> *"In under 10 seconds, tell me the top 3 places to snowboard after work — with fresh snow, open lifts, under 180 minutes from Hedingen, and beginner-friendly explanations."*

---

## **1. Product Overview**

### **Name**
**IceKing**

### **Tagline**
"Your personal snowboarding co-pilot – know where to ride before you leave the office."

### **Vision**
Deliver **real-time, hyper-localized snowboarding recommendations** for weekday riders in the greater Zurich area by combining snow depth, lift status, drive time, and snow quality into a single, actionable score.

### **Mission**
Empower Swiss snowboarders with accurate, timely information so they can make the most of their limited weekday riding time without driving to closed or poor-condition resorts.

---

## **2. Target Users & Problems**

| Persona | Description |
|-------|-------------|
| **Primary User** | Weekday snowboarder in Hedingen. Works 9–5. Wants quick sessions (≤180 min drive). Prioritizes snow quality, open lifts, and minimal crowds. Uses Telegram. Age 25-45, intermediate skill level. |
| **Secondary Users** | Commuters in ZH, AG, SZ. Ride 1–3x/week. Value time efficiency. Want data-driven decisions. |

### **User Problems & Needs**

| Problem | Need |
|--------|------|
| No single source shows **real-time snow + drive time** | Unified dashboard with personalized recs |
| Weekday snow reports are scattered or outdated | Fresh data **updated daily by 5 PM CET** |
| Hard to know if a resort is *worth the drive* | **Actionable score** (0–100) combining snow, lifts, distance |
| Don't want to scrape websites manually | **Automated bot** (Telegram / Web) |
| **Can't tell if resorts are closed for season** | **Pre-filter closed resorts** with opening dates |
| **As a beginner, need context about recommendations** | **Explanations** of why resorts score what they do |

---

## **3. Key Features**

| Priority | Feature | Description |
|--------|--------|-----------|
| **P1** | **Daily Snow Report Scraping** | Auto-scrape `bergfex.com/schneewerte/` daily at 4:30 PM CET |
| **P1** | **Operating Hours & Season Dates** | Scrape resort pages for operating hours, season start/end dates |
| **P1** | **Closed Resort Pre-Filtering** | Separate closed resorts from open ones, show opening dates |
| **P1** | **Drive Time Calculation** | Google Distance Matrix API from **Hedingen, CH** to each resort |
| **P1** | **Enhanced Snowboard Score Engine** | Revised formula with closed status handling and weekday bonuses |
| **P1** | **Top 5 Recommendations** | Filter: **drive ≤180 min**, sort by score, separate open/closed |
| **P1** | **Telegram Bot Interface** | `/recs` → formatted message with emoji, drive time, snow, lifts, explanations |
| **P2** | **wepowder.com Quality Bonus** | Scrape or API pull for powder/freestyle ratings (0–10) |
| **P2** | **Push Alerts** | Telegram alert if **score ≥75 AND new snow ≥10 cm** |
| **P2** | **Natural Language Queries** | LLM-powered interface for "where should I go?" type questions |
| **P2** | **Web Dashboard (later)** | Simple Next.js page: map + table + refresh button |
| **P3** | **User Preferences** | Save favorite resorts, max drive time, board style (park vs. pow) |
| **P3** | **Historical Trends** | 7-day snow depth chart per resort |

---

## **4. Technical Architecture**

### **Query Interface: Hybrid Approach**
- **Commands** for fast, predictable queries (`/recs`, `/closed`, `/tips`)
- **LLM Integration** for natural language ("where should I go tomorrow?")
- **Smart Routing**: Detect commands vs natural language queries

### **Data Structure: SQLite Database**
- **Resorts Table**: Static resort metadata, operating hours, season dates
- **Conditions Table**: Time-series scraped data (snow depth, lifts, etc.)
- **Drive Times Table**: Cached Google API results
- **Scores Table**: Calculated recommendations with status and reasoning

### **Architecture Benefits**
- **Performance**: SQLite for fast queries, in-memory caching for common data
- **Scalability**: Handles 100+ resorts, years of historical data
- **Reliability**: ACID compliance, easy backups
- **Flexibility**: SQL queries for complex filtering and sorting

---

## **5. Data Sources**

| Source | Data | Update Frequency | Method |
|-------|------|------------------|--------|
| `bergfex.com/schneewerte/` | Valley/Mountain depth, new snow, lifts, last update | Daily (site updates ~noon) | HTML scraping (Cheerio) |
| `bergfex.com` (resort pages) | Operating hours, season dates, daily status | Daily | HTML scraping - extract from operating hours modal |
| `wepowder.com` | Powder quality, freestyle rating, snow forecast | Daily | Scrape or RSS/JSON if available |
| Google Distance Matrix API | Drive time & distance | On-demand (cached 24h) | REST API |
| **OpenWeatherMap / MeteoSwiss** | **3-day forecast, current weather** | Every 6h | API (for /forecast command) |
| Static Resort DB | Lat/lng, priority, alternate names | One-time + manual updates | JSON |

---

## **6. Scoring Engine**

### **Revised Scoring Formula**
```typescript
function calculateScore(resort: Resort): ScoreResult {
  // Pre-filter: Closed for season
  if (resort.seasonStatus === 'CLOSED') {
    return {
      score: 0,
      status: 'CLOSED',
      openingDate: resort.openingDate,
      reason: `Closed until ${resort.openingDate}`
    };
  }

  // Pre-filter: Closed today (but season is open)
  if (resort.liftsOpen === 0 && !resort.isOperatingToday) {
    return {
      score: 0,
      status: 'CLOSED_TODAY',
      reason: 'Closed today (check operating hours)'
    };
  }

  // Calculate score only for open resorts
  const baseScore =
    0.4 * normalizeSnowDepth(resort.mountainDepth) +
    3 * resort.newSnow +
    0.2 * (resort.liftsOpen / resort.liftsTotal) * 100 +
    0.1 * resort.qualityBonus;

  // Penalty for very few lifts open
  const liftPenalty = resort.liftsOpen < 2 ? 20 : 0;

  // Bonus for weekday (less crowded)
  const weekdayBonus = isWeekday() ? 5 : 0;

  const finalScore = Math.max(0, Math.min(100, baseScore - liftPenalty + weekdayBonus));

  return {
    score: finalScore,
    status: 'OPEN',
    reason: generateReason(resort, finalScore)
  };
}
```

### **Score Interpretation**
• **80-100**: Excellent conditions, go now!
• **60-79**: Good conditions, worth the drive
• **40-59**: Decent, but check details
• **20-39**: Marginal, only if desperate
• **0-19**: Not recommended (or closed)

---

## **7. Telegram Bot Interface**

### **Command Structure**
```
/start - Welcome message + quick tutorial
/recs - Top recommendations (current behavior, improved)
/recs [resort] - Details for specific resort
/closed - All closed resorts with opening dates
/opening-soon - Resorts opening in next 7 days
/forecast - 3-day snow forecast
/explain [resort] - Why this resort scored what it did
/alert [resort] - Set alert for opening/powder
/alerts - Manage your alerts
/tips - Beginner tips & what to look for
/help - Full command list
```

### **Enhanced Output Example**
```
🏔️ IceKing – Mon, 10 Nov 2025, 5:00 PM

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ CLOSED FOR SEASON

1. Hoch-Ybrig
   📅 Opens: Dec 7, 2025 (in 28 days)
   📊 Current: 0 cm · All lifts closed
   💡 Set alert: /alert hoch-ybrig

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ TOP RECOMMENDATIONS

1. 🥇 Engelberg Titlis
   Score: 78/100 | ⏱️ 72 min drive

   📊 Conditions:
   • Base: 83 cm (mountain)
   • New snow: 0 cm
   • Lifts: 1/13 open (7.7%)
   • Operating: 08:30-16:15

   💡 Why recommended:
   Excellent base depth for early season. Limited lifts but enough for a good session. Great for intermediate riders looking to get back on the board.

   ⚠️ Note: Park not open yet, but great for cruising

   [📊 Details] [📍 Map] [🔔 Alert] [❓ Why?]

2. 🥈 Andermatt
   Score: 45/100 | ⏱️ 85 min drive
   ...
```

---

## **8. Database Schema**

```sql
-- Resorts (static/semi-static data)
CREATE TABLE resorts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    bergfex_id TEXT UNIQUE,
    latitude REAL,
    longitude REAL,
    priority INTEGER DEFAULT 5,
    difficulty TEXT, -- 'beginner', 'intermediate', 'advanced', 'mixed'
    has_park BOOLEAN DEFAULT FALSE,
    has_night_riding BOOLEAN DEFAULT FALSE,
    opening_date DATE,
    closing_date DATE,
    operating_hours_weekdays TEXT, -- "08:30-16:15"
    operating_hours_weekends TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conditions (scraped data - time series)
CREATE TABLE conditions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resort_id TEXT NOT NULL,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mountain_depth INTEGER, -- cm
    valley_depth INTEGER, -- cm
    new_snow INTEGER, -- cm
    lifts_open INTEGER,
    lifts_total INTEGER,
    last_update TIMESTAMP, -- from bergfex
    FOREIGN KEY (resort_id) REFERENCES resorts(id)
);

-- Drive times (cached)
CREATE TABLE drive_times (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resort_id TEXT NOT NULL,
    origin TEXT NOT NULL, -- "Dietikon" or coordinates
    drive_time_minutes INTEGER,
    distance_km REAL,
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resort_id) REFERENCES resorts(id),
    UNIQUE(resort_id, origin)
);

-- Scores (calculated, cached)
CREATE TABLE scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resort_id TEXT NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    score INTEGER, -- 0-100
    status TEXT, -- 'OPEN', 'CLOSED', 'CLOSED_TODAY'
    reason TEXT,
    FOREIGN KEY (resort_id) REFERENCES resorts(id)
);
```

---

## **9. Success Metrics**

| Metric | Target (3 Months) | Measurement |
|--------|------------------|-------------|
| Daily Active Users | ≥1 (primary) + 5 beta users | Bot usage logs |
| Recommendation Accuracy | ≥80% "I went and it was worth it" | User feedback |
| Bot Response Time | ≤8 seconds | Performance monitoring |
| Uptime | 99.9% (daily scrape) | Service monitoring |
| Alert Relevance | ≤1 false powder alert/week | User reports |
| **Closed resort accuracy** | **100% (no false positives)** | Manual verification |
| **Opening date accuracy** | **≥95%** | Compare to actual opening |
| **Beginner satisfaction** | **≥70% "helpful explanations"** | User feedback |

---

## **10. Non-Functional Requirements**

| Category | Requirement |
|--------|-------------|
| **Reliability** | Scrape fallback: use cached data if site down |
| **Performance** | Full run (scrape + score + respond) < 10s |
| **Scalability** | Support up to 100 resorts, 50 users |
| **Security** | API keys in `.env`, no PII stored |
| **Maintainability** | TypeScript + modular (scraper, scorer, bot) |
| **Deployability** | Run on Vercel, Railway, or Raspberry Pi |

### **Caching Strategy**
| Data Type | Cache Duration | Invalidation |
|-----------|---------------|--------------|
| Snow data | 6 hours | Daily scrape at 4:30 PM |
| Drive times | 24 hours | On-demand refresh |
| Operating hours | 7 days | Weekly scrape |
| Season dates | 30 days | Monthly manual check |

---

## **11. Future Roadmap**

| Phase | Features |
|------|----------|
| **v1.0 (MVP)** | Core bot, bergfex scrape, operating hours, closed resort filtering, Telegram commands, top 5 recs |
| **v1.1** | wepowder quality, push alerts, natural language queries, beginner tips |
| **v2.0** | Web app, user accounts, preferences, historical trends |
| **v3.0** | Weather forecast integration, crowd estimates, advanced LLM features |

---

## **12. Risks & Mitigations**

| Risk | Mitigation |
|------|------------|
| bergfex changes HTML | Use resilient selectors + monitoring |
| Google API cost | Cache results 24h, limit to priority resorts |
| False powder alerts | Require ≥2 sources or webcam check |
| Legal (scraping) | Respect `robots.txt`, rate-limit, cache aggressively |
| **Closed resort confusion** | **Pre-filter + clear status indicators** |
| **LLM hallucinations** | **Use structured prompts, validate against database** |
| **Data accuracy** | **Cross-reference multiple sources, manual validation** |

---

## **13. Go/No-Go Criteria**

**Go** if:
- bergfex scrape works ≥3 consecutive days
- Google API key approved
- Telegram bot responds in <10s
- **Operating hours scraping successful**
- **Closed resort filtering working**

**No-Go** if:
- bergfex blocks IP after 48h
- No viable snow data source
- **Cannot reliably detect closed resorts**

---

## **14. Implementation Phases**

### **Phase 1 (MVP - Critical):**
1. ✅ Operating hours scraping
2. ✅ Closed resort pre-filtering
3. ✅ Improved `/recs` output with closed section
4. ✅ Basic `/closed` command
5. ✅ SQLite database setup
6. ✅ Command-based interface

### **Phase 2 (Week 2):**
7. ✅ `/explain` command
8. ✅ `/tips` command
9. ✅ Score interpretation guide
10. ✅ Better error messages

### **Phase 3 (Week 3-4):**
11. ✅ `/forecast` command
12. ✅ `/alert` system
13. ✅ Natural language interface
14. ✅ Inline keyboards for details

---

## **15. Tech Stack & Deployment**

**Tech Stack**: TypeScript (Node.js) or Rust (optional), SQLite, Telegram Bot API, Cheerio, Google Distance Matrix API

**Deployment**: Vercel, Railway, or Raspberry Pi

**Launch Goal**: **MVP by December 1, 2025**

**First Shred**: **First usable rec before first snow dump**

---

*Let the mountains call. IceKing answers.*

---

## **Appendices**

### **A. Discovery Workflow**
1. Scrape 5-10 resorts manually, save raw HTML
2. Analyze HTML structure in browser/VS Code
3. Build flexible parser with multiple fallbacks
4. Design SQLite schema based on discovered data
5. Validate parser accuracy (>95%)
6. Set up daily scraping job

### **B. Resort Database Schema (TypeScript)**
```typescript
interface Resort {
  id: string;
  name: string;
  bergfexId: string;
  coordinates: { lat: number; lng: number };

  // Season info
  seasonStatus: 'OPEN' | 'CLOSED' | 'CLOSING_SOON';
  openingDate?: Date;
  closingDate?: Date;
  operatingHours?: {
    weekdays?: string; // "08:30-16:15"
    weekends?: string;
    notes?: string;
  };

  // Current conditions (scraped)
  mountainDepth?: number;
  valleyDepth?: number;
  newSnow?: number;
  liftsOpen?: number;
  liftsTotal?: number;
  lastUpdate?: Date;

  // Metadata
  priority: number; // 1-10, for filtering
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
  hasPark: boolean;
  hasNightRiding: boolean;
}
```

### **C. Cost Analysis**
- Commands: $0/month
- LLM (Haiku): ~$0.0001 per query = $0.10 per 1000 queries
- LLM (Sonnet): ~$0.003 per query = $3 per 1000 queries
- If used 10x/day: ~$0.10/month (Haiku) or $1/month (Sonnet)
