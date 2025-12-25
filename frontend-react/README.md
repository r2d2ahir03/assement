# Frontend (React)

This is a simple React app (Vite) that fetches articles from the Laravel API and shows original and updated versions.

Quick setup:

1. From this folder: `npm install` or `yarn`
2. Copy `.env.example` to `.env` and set `VITE_API_BASE=http://localhost:8000/api`
3. Run `npm run dev`

Notes:
- The project is intentionally minimal: it lists articles and shows the article body and any updated body returned by the Laravel API.
