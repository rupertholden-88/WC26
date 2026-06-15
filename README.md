# WC26 Morning Dashboard

FIFA World Cup 2026 morning dashboard — live standings, today/tomorrow fixtures with BBC/ITV badges, and ITV Sport YouTube highlights from the previous evening.

## Stack

- **Next.js 16** + **Tailwind CSS v4** + TypeScript
- **football-data.org** free API → standings + fixtures
- **YouTube Data API v3** free tier → ITV Sport highlights
- UK broadcaster lookup hardcoded from confirmed schedule
- Zero AI API costs

## Environment Variables

| Variable | Where to get it |
|---|---|
| `FOOTBALL_DATA_API_KEY` | Free signup at [football-data.org](https://www.football-data.org/client/register) |
| `YOUTUBE_API_KEY` | Free at [Google Cloud Console](https://console.cloud.google.com) → YouTube Data API v3 |

## Local Setup

```bash
npm install
cp .env.example .env.local
# Fill in your two API keys
npm run dev
```

## Deploy to Vercel

1. Push to GitHub
2. Import repo at vercel.com
3. Add both env vars in **Settings → Environment Variables**
4. Deploy
