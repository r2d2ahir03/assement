require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const fs = require('fs');
const path = require('path');

const BASE = 'https://beyondchats.com/blogs/';
const LIMIT = parseInt(process.argv[2] || process.env.LIMIT || '5', 10);
const OUTPUT_DIR = path.resolve(__dirname, 'output');
const LARAVEL_BASE = process.env.LARAVEL_API_BASE;

async function fetchHtml(url) {
  const res = await axios.get(url, {headers: {'User-Agent': 'Mozilla/5.0 (compatible; Scraper/1.0)'}});
  return res.data;
}

async function findLastPageUrl() {
  const html = await fetchHtml(BASE);
  const $ = cheerio.load(html);
  // try rel="last"
  const lastRel = $('a[rel="last"]').attr('href');
  if (lastRel) return toAbs(lastRel);

  // fallback: find pagination links and pick largest number
  let maxHref = null;
  let maxNum = 0;
  $('.pagination a').each((i, el) => {
    const href = $(el).attr('href');
    const txt = $(el).text().trim();
    const n = parseInt(txt, 10);
    if (!isNaN(n) && n > maxNum) {
      maxNum = n; maxHref = href;
    }
  });
  if (maxHref) return toAbs(maxHref);

  // fallback to base
  return BASE;
}

function toAbs(href) {
  if (!href) return href;
  if (href.startsWith('http')) return href;
  return 'https://beyondchats.com' + (href.startsWith('/') ? href : '/' + href);
}

async function collectArticleLinks(listingUrl) {
  const html = await fetchHtml(listingUrl);
  const $ = cheerio.load(html);
  const links = new Set();

  // 1) anchors that include /blog/ or /blogs/
  $('a[href]').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (!href) return;
    if ((/\/blog\//.test(href) || /\/blogs?\//.test(href) || /\/post\//.test(href) || /\/articles?\//.test(href)) && text.length > 5) {
      links.add(toAbs(href));
    }
  });

  // 2) anchors inside article/post cards
  $('article, .post, .post-card, .card, .blog-card').each((i, el) => {
    const a = $(el).find('a[href]').first();
    if (a && a.attr('href')) links.add(toAbs(a.attr('href')));
  });

  // 3) fallback: pick anchors with long text that are not navigation
  $('a[href]').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (!href) return;
    if (text.length > 30 && !/\.(png|jpg|svg|css|js)$/i.test(href) && !href.includes('#')) links.add(toAbs(href));
  });

  const arr = Array.from(links).filter(Boolean);
  return arr.slice(0, LIMIT);
}

async function extractArticle(url) {
  const html = await fetchHtml(url);
  // try Readability
  try {
    const dom = new JSDOM(html, {url});
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (article && article.content) {
      return {title: article.title || '', body: article.content, text: article.textContent || ''};
    }
  } catch (e) {}

  // fallback: heuristics
  const $ = cheerio.load(html);
  const title = $('h1').first().text().trim();
  let content = '';
  const selectors = ['article', '.post-content', '.entry-content', '.article-content', '#content'];
  for (const sel of selectors) {
    const node = $(sel);
    if (node.length) { content = node.html(); break; }
  }
  if (!content) content = $('p').map((i, p) => $(p).html()).get().join('\n\n');
  const text = cheerio.load(content).text();
  return {title, body: content, text: text.trim()};
}

async function saveJson(filename, data) {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, {recursive: true});
  const file = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  return file;
}

async function postToLaravel(article) {
  if (!LARAVEL_BASE) throw new Error('LARAVEL_API_BASE not set');
  const url = LARAVEL_BASE.replace(/\/$/, '') + '/articles';
  const payload = {
    title: article.title,
    body: article.body,
    excerpt: (article.text || '').substring(0, 200),
    source_url: article.source_url,
  };
  const res = await axios.post(url, payload, {headers: {'Content-Type': 'application/json'}});
  return res.data;
}

async function main() {
  console.log('Finding last page...');
  const last = await findLastPageUrl();
  console.log('Last page URL:', last);
  const links = await collectArticleLinks(last);
  console.log('Found links:', links.length);

  const results = [];
  for (const link of links) {
    console.log('Scraping', link);
    try {
      const data = await extractArticle(link);
      const item = {
        title: data.title || 'Untitled',
        slug: (data.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        excerpt: (data.text || '').substring(0, 200),
        body: data.body,
        source_url: link,
        published_at: null,
        scraped_at: new Date().toISOString()
      };
      results.push(item);
    } catch (e) {
      console.error('Error scraping', link, e.message || e);
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = await saveJson(`beyondchats-${timestamp}.json`, results);
  await saveJson('latest.json', results);
  console.log('Saved', file);

  // try to POST to Laravel if configured
  const posted = [];
  if (LARAVEL_BASE) {
    console.log('Attempting to POST to Laravel API at', LARAVEL_BASE);
    for (const a of results) {
      try {
        const r = await postToLaravel(a);
        posted.push(r);
        console.log('Posted article ID:', r.id || '(no id)');
      } catch (e) {
        console.warn('Failed to post to Laravel:', e.message || e);
      }
    }
    if (posted.length) await saveJson('posted.json', posted);
  } else {
    console.log('LARAVEL_API_BASE not set; skipping POST.');
  }

  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
