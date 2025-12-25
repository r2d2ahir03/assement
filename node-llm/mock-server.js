const express = require('express');
const app = express();
const port = process.env.MOCK_PORT || 4001;

app.use(express.json());

// Simple CORS middleware to allow requests from the frontend during development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

const articles = [{
  id: 1,
  title: 'Sample Article for Testing',
  slug: 'sample-article-for-testing',
  excerpt: 'This is a mocked article used for testing the pipeline.',
  body: '<p>This is the original article body. It needs an update.</p>',
  source_url: 'https://beyondchats.com/blogs/sample',
  published_at: new Date().toISOString(),
  scraped_at: new Date().toISOString()
}];

let nextId = articles.length + 1;

app.get('/api/articles', (req, res) => {
  // Simple pagination mimic: return {data: articles}
  res.json({data: articles});
});

app.post('/api/articles', (req, res) => {
  const { title, body, excerpt, source_url, published_at } = req.body || {};
  if (!title || !body) {
    return res.status(422).json({message: 'Validation failed', errors: {title: 'required', body: 'required'}});
  }
  const a = {
    id: nextId++,
    title,
    slug: (title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    excerpt: excerpt || (body ? body.substring(0, 200) : ''),
    body,
    source_url: source_url || null,
    published_at: published_at || new Date().toISOString(),
    scraped_at: new Date().toISOString()
  };
  articles.push(a);
  res.status(201).json(a);
});

app.get('/mock/page1', (req, res) => {
  res.send(`<!doctype html><html><head><title>Mock Page One</title></head><body><article><h1>Mock Article One</h1><p>This is content from mock page one. It has useful examples and a certain tone.</p><p>More content here.</p></article></body></html>`);
});

app.get('/mock/page2', (req, res) => {
  res.send(`<!doctype html><html><head><title>Mock Page Two</title></head><body><article><h1>Mock Article Two</h1><p>This is content from mock page two. Complementary style and structure.</p><p>More useful content.</p></article></body></html>`);
});

app.put('/api/articles/:id', (req, res) => {
  // Echo back received payload for verification
  const id = req.params.id;
  const payload = Object.assign({id}, req.body);
  res.json(payload);
});

app.listen(port, () => console.log(`Mock server listening on http://localhost:${port}`));
