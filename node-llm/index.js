require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const axiosRetry = require('axios-retry');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const { Command } = require('commander');

const LARAVEL_BASE = process.env.LARAVEL_API_BASE || 'http://localhost:8000/api';
const SERP_API_KEY = process.env.SERP_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';

const program = new Command();
program.option('--dry-run', 'Do not publish changes, just log the output');
program.parse(process.argv);
const options = program.opts();

async function fetchLatestArticle() {
  // Try to fetch a small page and pick the first returned article
  const res = await axios.get(`${LARAVEL_BASE}/articles`, {params: {per_page: 5}}).catch(e => { throw e; });
  const articles = res.data.data || res.data;
  if (!articles || (Array.isArray(articles) && articles.length === 0)) throw new Error('No articles found');
  return Array.isArray(articles) ? articles[0] : articles;
}

async function googleSearch(title) {
  if (process.env.USE_MOCKS === '1') {
    // Return two local mock pages
    return {
      organic_results: [
        {link: `http://localhost:${process.env.MOCK_PORT || 4001}/mock/page1`},
        {link: `http://localhost:${process.env.MOCK_PORT || 4001}/mock/page2`}
      ]
    };
  }

  if (!SERP_API_KEY) throw new Error('SERP_API_KEY not set');
  const url = 'https://serpapi.com/search.json';
  const res = await axios.get(url, {
    params: {engine: 'google', q: title, api_key: SERP_API_KEY}
  });
  return res.data;
}

function pickTopTwoSearchLinks(searchData) {
  const links = [];
  if (searchData && searchData.organic_results) {
    for (const r of searchData.organic_results) {
      if (r.link && !r.link.includes('beyondchats.com')) {
        links.push(r.link);
      }
      if (links.length >= 2) break;
    }
  }
  return links;
}

async function scrapeArticleMainContent(url) {
  const res = await axios.get(url, {timeout: 20000, headers: {'User-Agent': 'Mozilla/5.0 (compatible; ArticleScraper/1.0)'}});
  const html = res.data;

  // Try to use Readability via JSDOM for robust main-content extraction
  try {
    const dom = new JSDOM(html, {url});
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (article && article.textContent && article.content) {
      return {url, title: article.title || '', content: article.content, text: article.textContent};
    }
  } catch (e) {
    // fallback to cheerio below
  }

  // Fallback: cheerio heuristics
  const $ = cheerio.load(html);
  let content = '';
  const selectors = ['article', '.post-content', '.entry-content', '.article-content', '#content'];
  for (const sel of selectors) {
    if ($(sel).length) {
      content = $(sel).html();
      break;
    }
  }
  if (!content) {
    content = $('p').map((i, el) => $(el).html()).get().join('\n\n');
  }
  const text = cheerio.load(content).text();
  return {url, title: '', content, text: text.trim()};
}

async function rewriteArticleWithLLM(originalArticle, externalArticles) {
  if (process.env.USE_MOCKS === '1') {
    // Simple mock rewrite: combine excerpts and add references
    const refs = externalArticles.map(a => `<li><a href="${a.url}">${a.url}</a></li>`).join('');
    const combined = `<h1>${originalArticle.title}</h1><p>Updated to match tone of top search results.</p>${externalArticles.map(a=>`<h2>Reference snippet</h2><p>${(a.text||'').substring(0,150)}</p>`).join('')}<h3>References</h3><ul>${refs}</ul>`;
    return combined;
  }

  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  // Build a careful prompt asking for HTML-formatted body
  const referencesList = externalArticles.map(a => `- ${a.url}`).join('\n');
  const sampleRefs = externalArticles.map(a => `Title: ${a.title || 'N/A'}\nURL: ${a.url}\nExcerpt: ${a.text ? a.text.substring(0, 300) : ''}`).join('\n\n');

  const system = `You are an expert content editor and writer. Given an original article and a set of reference articles from other sites, rewrite the original article to improve structure, clarity, and formatting so it follows the tone and structure of the reference articles while preserving facts. Keep headings and paragraphs, prefer HTML formatting for headings, paragraphs, and lists. At the end, add a "References" section listing the source URLs.`;

  const user = `Original Title: ${originalArticle.title}\n\nOriginal Body (may contain HTML):\n${originalArticle.body}\n\nReference articles (title/url/excerpt):\n${sampleRefs}\n\nPlease return the full updated article body in HTML. Append a 'References' section at the bottom listing each reference URL.`;

  const payload = {
    model: LLM_MODEL,
    messages: [
      {role: 'system', content: system},
      {role: 'user', content: user}
    ],
    max_tokens: 2000,
    temperature: 0.7
  };

  const res = await axios.post('https://api.openai.com/v1/chat/completions', payload, {headers: {Authorization: `Bearer ${OPENAI_API_KEY}`}});
  const newBody = res.data.choices?.[0]?.message?.content || res.data.choices?.[0]?.text || '';
  return newBody;
}

async function publishUpdatedArticle(articleId, updatedTitle, updatedBody) {
  if (options.dryRun) {
    console.log('Dry run: would update article', articleId);
    return {id: articleId, title: updatedTitle};
  }

  const res = await axios.put(`${LARAVEL_BASE}/articles/${articleId}`, {
    title: updatedTitle,
    body: updatedBody,
  });
  return res.data;
}

(async () => {
  try {
    // Configure axios retry for network robustness
    axiosRetry(axios, {retries: 3, retryDelay: axiosRetry.exponentialDelay});

    console.log('Fetching latest article from Laravel...');
    const article = await fetchLatestArticle();
    console.log('Latest article:', article.title);

    console.log('Searching Google for title...');
    const search = await googleSearch(article.title);
    const topLinks = pickTopTwoSearchLinks(search);
    console.log('Top links:', topLinks);

    const scraped = [];
    for (const link of topLinks) {
      console.log('Scraping:', link);
      const s = await scrapeArticleMainContent(link);
      scraped.push(s);
      // polite pause between remote scrapes
      await new Promise(r => setTimeout(r, 1200));
    }

    console.log('Calling LLM to rewrite article...');
    const newBody = await rewriteArticleWithLLM(article, scraped);
    const bodyWithRefs = (newBody || '') + '\n\nReferences:\n' + scraped.map(s => s.url).join('\n');
    console.log(options.dryRun ? 'Dry run — not publishing.' : 'Publishing updated article...');
    const updated = await publishUpdatedArticle(article.id, article.title, bodyWithRefs);
    console.log('Article updated:', updated.id || updated);
  } catch (err) {
    console.error('Error:', err.message || err);
  }
})();
