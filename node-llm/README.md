# Node LLM updater (Phase 2)

This project fetches the newest article from the Laravel API, searches Google for its title (via SerpAPI), scrapes the first two relevant external articles, asks an LLM to rewrite the original article to better match the top results, cites the references, and updates the article via the Laravel API.

Setup

1. Install dependencies: npm install
2. Create `.env` with the values in `.env.example` (SERP_API_KEY, OPENAI_API_KEY, LARAVEL_API_BASE)
3. Run the script: `node index.js`

Notes
- You must get a SerpAPI key (https://serpapi.com/) or modify the search implementation to use another search provider.
- This repository includes a simple implementation with instructions and placeholders for the LLM API call (OpenAI).

Usage

- Install dependencies: `npm install`
- Dry run (do everything but don't publish to Laravel API): `npm run dry` or `node index.js --dry-run`
- Real run (publishes updated article): `npm start` or `node index.js`

Notes
- The script uses SerpAPI for searching Google (set `SERP_API_KEY` in `.env`). If you don't have SerpAPI, adapt `googleSearch` to another provider.
- The script uses OpenAI chat completions by default; set `OPENAI_API_KEY` and `LLM_MODEL` in `.env`.
- The content extraction uses Readability (via JSDOM). It's more robust than only using cheerio but not perfect on all sites.
