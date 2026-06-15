# WC26 Morning Dashboard

FIFA World Cup 2026 morning dashboard — live group standings, today/tomorrow fixtures with UK broadcaster (BBC/ITV), and ITV Sport YouTube highlights from the previous evening.

Built with Next.js 16, Tailwind CSS v4, React 19, and the Anthropic Claude API (with web search).

## Setup

```bash
npm install
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
npm run dev
```

## Deploy to Vercel

1. Push to GitHub
2. Import repo at vercel.com
3. Add `ANTHROPIC_API_KEY` environment variable in Vercel project settings
4. Deploy

The API key is kept server-side via a Next.js API route — never exposed to the browser.
