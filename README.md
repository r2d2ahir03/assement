# BeyondChats Article Enhancer

Monorepo containing:
- `backend-laravel/` - Laravel REST API + scraper (Phase 1)
- `node-llm/` - NodeJS script to fetch latest article, compare top Google results, call an LLM, and update the article (Phase 2)
- `frontend-react/` - React app to display original and updated articles (Phase 3)
	- Tip: install the React DevTools browser extension for a better dev experience: https://reactjs.org/link/react-devtools

See the README files inside each folder for detailed setup steps.

---

Partial implementation included: Phase 1 (Laravel) scaffolding and scraper command implemented. Phase 2 & 3 project scaffolds are included with example scripts and instructions.

Notes:
- You will need PHP, Composer, Node.js, and npm/yarn installed.
- LLM and SERP API keys should be set in env files (see project READMEs).
