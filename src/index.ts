import { Bot } from "gramio";
import { getRecommendations, getResortDetails, getClosedResorts, formatRecommendations, formatRecommendation } from './services/recommendations.js';
import { DataStorageService } from './services/dataStorage.js';
import { scrapeAllBergfexConditions } from './scrapers/bergfex.js';

// Initialize the bot with token from environment variable
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || "");

// Initialize database on startup
DataStorageService.initializeDriveTimes();

// Commands
bot
    .command("start", (context) => {
        return context.send(
            "🏔️ *IceKing - Your Swiss Snowboard Advisor*\n\n" +
            "Get real-time snowboarding recommendations for weekday rides in the Zurich area.\n\n" +
            "Available commands:\n" +
            "/recs - Get today's top recommendations\n" +
            "/closed - Show resorts that are closed\n" +
            "/scrape - Update snow conditions\n" +
            "/stats - Show database statistics\n" +
            "/help - Show all commands"
        );
    })
    .command("recs", async (context) => {
        try {
            const result = getRecommendations({ maxDriveTime: 90, limit: 5 });
            const message = formatRecommendations(result);
            return context.send(message);
        } catch (error) {
            console.error("Error getting recommendations:", error);
            return context.send("❌ Sorry, couldn't get recommendations right now. Try again later!");
        }
    })
    .command("closed", async (context) => {
        try {
            const closed = getClosedResorts();
            if (closed.length === 0) {
                return context.send("✅ All tracked resorts are currently open!");
            }

            let message = "❌ CLOSED FOR SEASON\n\n";
            closed.forEach((rec, i) => {
                const opening = rec.resort.openingDate
                    ? `Opens: ${rec.resort.openingDate.toLocaleDateString()}`
                    : "Opening date unknown";
                message += `${i + 1}. ${rec.resort.name}\n📅 ${opening}\n\n`;
            });

            return context.send(message);
        } catch (error) {
            console.error("Error getting closed resorts:", error);
            return context.send("❌ Sorry, couldn't check closed resorts.");
        }
    })
    .command("scrape", async (context) => {
        try {
            await context.send("🌐 Scraping latest snow conditions...");

            const scrapedData = await scrapeAllBergfexConditions();
            DataStorageService.storeBergfexConditions(scrapedData);

            const stats = DataStorageService.getStats();
            return context.send(
                `✅ Snow conditions updated!\n\n` +
                `📊 Database Stats:\n` +
                `• Resorts: ${stats.resorts}\n` +
                `• Conditions: ${stats.conditions}\n` +
                `• Drive times: ${stats.driveTimes}\n\n` +
                `Use /recs to see updated recommendations!`
            );
        } catch (error) {
            console.error("Error scraping data:", error);
            return context.send("❌ Failed to update snow conditions. Try again later.");
        }
    })
    .command("stats", async (context) => {
        try {
            const stats = DataStorageService.getStats();
            return context.send(
                "📊 IceKing Database Stats\n\n" +
                `🏂 Resorts tracked: ${stats.resorts}\n` +
                `❄️ Snow conditions: ${stats.conditions}\n` +
                `🚗 Drive times cached: ${stats.driveTimes}\n` +
                `📈 Scores calculated: ${stats.scores}\n\n` +
                `Last updated: ${new Date().toLocaleString()}`
            );
        } catch (error) {
            console.error("Error getting stats:", error);
            return context.send("❌ Couldn't get database stats.");
        }
    })
    .command("help", (context) => {
        return context.send(
            "*🏔️ IceKing Commands:*\n\n" +
            "/recs - Get today's top snowboarding recommendations\n" +
            "/closed - Show resorts that are closed for season\n" +
            "/scrape - Update snow conditions from bergfex.com\n" +
            "/stats - Show database statistics\n" +
            "/help - Show this help message\n\n" +
            "*Tips:*\n" +
            "• Recommendations are filtered to ≤90min drive from Dietikon\n" +
            "• Scores consider snow depth, lift status, and distance\n" +
            "• Use /scrape regularly to get fresh data!"
        );
    });

// TODO: Add natural language resort queries later

// Error handling
bot.onError((error) => {
    console.error("Bot error:", error);
});

// Start the bot
bot.onStart(() => {
    console.log("🤖 IceKing bot started successfully!");
    console.log("Commands loaded: /start, /recs, /closed, /scrape, /stats, /help");

    // Show initial stats
    const stats = DataStorageService.getStats();
    console.log(`📊 Initial database: ${stats.resorts} resorts, ${stats.conditions} conditions, ${stats.driveTimes} drive times`);
});

bot.start();
