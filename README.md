# IceKing 🏔️

**Your personal snowboarding co-pilot – know where to ride before you leave the office.**

IceKing is a Telegram bot that delivers real-time, hyper-localized snowboarding recommendations for weekday riders in the greater Zurich area. By combining snow depth, lift status, drive time, operating hours, and season dates into a single actionable score, IceKing helps snowboarders make data-driven decisions about where to ride after work.

## Features

- 🏂 **Real-time snow data** scraped from bergfex.com
- 🚗 **Drive time calculations** from Dietikon using Google Maps API
- 📊 **Smart scoring algorithm** combining snow quality, lift status, and distance
- 🤖 **Telegram bot interface** with easy commands
- 📅 **Season awareness** - knows when resorts are closed
- 🎯 **Beginner-friendly** explanations and recommendations

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (JavaScript runtime)
- Telegram Bot Token from [@BotFather](https://t.me/botfather)

### Installation

1. **Clone and install dependencies:**
   ```bash
   bun install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your bot token:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
   GOOGLE_API_KEY=your_google_api_key  # Optional, for drive times
   ```

3. **Start the bot:**
   ```bash
   bun run dev
   ```

### Telegram Setup

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow the instructions
3. Copy the bot token to your `.env` file
4. Start a chat with your bot and send `/start`

## Commands

- `/start` - Welcome message and quick tutorial
- `/recs` - Get today's top snowboarding recommendations
- `/closed` - Show resorts that are closed for season
- `/help` - Show all available commands

## Project Structure

```
src/
├── database/          # SQLite database setup and queries
├── scrapers/          # Web scraping for bergfex.com and other sources
├── services/          # Business logic (scoring, recommendations)
├── types/            # TypeScript type definitions
├── utils/            # Helper functions
└── index.ts          # Main bot entry point
```

## Development

### Available Scripts

- `bun run dev` - Start development server
- `bun run start` - Start production server
- `bun run build` - Build for production
- `bun run type-check` - Run TypeScript type checking

### Database

The project uses SQLite with the following tables:
- `resorts` - Static resort information
- `conditions` - Scraped snow conditions (time series)
- `drive_times` - Cached drive time calculations
- `scores` - Calculated recommendation scores

### Scraping

Data sources:
- **bergfex.com/schneewerte/** - Snow depth, new snow, lift status
- **bergfex.com** (resort pages) - Operating hours, season dates
- **Google Distance Matrix API** - Drive times from Dietikon

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `bun run type-check` to ensure TypeScript is happy
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

*Let the mountains call. IceKing answers.*
