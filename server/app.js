const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const config = require('../config.json'); // adjust if path is incorrect
scrapeIdeasSummary = require('../scraper/summary');
const { summarizeInBatches } = require('../services/summarizer');
const db = require('../services/db');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// --- Home Route (Shows static ideas from ideas.json) ---
app.get('/', (req, res) => {
  const data = JSON.parse(fs.readFileSync('./data/ideas.json'));
  res.render('index', { data, statuses: config.statuses, statuses_label: config.statuses_labels });
});

// --- Search Page (GET shows empty form) ---
app.get('/search', async (req, res) => {
  try {
    // Fetch cached queries from the database
     const rows = db.prepare(`SELECT id,query FROM idea_insights_cache ORDER BY last_updated DESC`).all();
      res.render('search', {
        finalSummary: null,
        query: '',
        cachedQueries: rows.map(r => [r.id,r.query])
      });
  } catch (err) {
    console.error('Failed to load cached queries', err);
    res.render('search', { finalSummary: null, query: '', cachedQueries: [] });
  }
});

app.get('/load', (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, message: 'ID parameter is required.' });
  }

  try {
    const row = db.prepare(`
      SELECT id, query, tags, insights, total_ideas, last_updated
      FROM idea_insights_cache
      WHERE id = ?
    `).get(id);


    if (!row) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }



    const formatted = {
      ...row,
      tags: JSON.parse(row.tags || '[]'),
      insights: JSON.parse(row.insights || '[]'),
      total_ideas:row.total_ideas || 0,
      last_updated: row.last_updated ? new Date(row.last_updated).toLocaleString() : 'N/A'
    };

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('Error loading cached data by ID:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

app.get('/progress', async (req, res) => {
  let data = fs.readFileSync('./mileStone.json', 'utf8');
  data = res.json(JSON.parse(data));
  console.log(data)
  return data;
});


// --- Search Handler (POST triggers scrape, dedup, summarize) ---
app.post('/search', async (req, res) => {
  const query = req.body.query;
  if (!query || !query.trim()) {
    return res.render('search', { finalSummary : null , cachedQueries: []});
  }
  console.log('🔄 Gathering Ideas');
  fs.writeFileSync('./mileStone.json', JSON.stringify(0, null, 2));
  const rawIdeas = await scrapeIdeasSummary(query);
  if(rawIdeas.length === 0) {
    return res.render('search', { finalSummary: null, query: query, cachedQueries: [] , error: 'No ideas found for the given query.' });
  }
  console.log('🔄 Filtering Duplicates');
  fs.writeFileSync('./mileStone.json', JSON.stringify(1, null, 2));
  const uniqueIdeas = deduplicate(rawIdeas); //not did anything here
  console.log('🔄 Starting summarization process...');
  fs.writeFileSync('./mileStone.json', JSON.stringify(2, null, 2));
  const summarizedIdeas = await summarizeInBatches(uniqueIdeas, 15000 , query);
  console.log('🔄 Final report summary generated');
  let cachedQueries = [];
  try {
    // Fetch cached queries from the database
    const rows = await  db.prepare(`SELECT id,query FROM idea_insights_cache ORDER BY last_updated DESC`).all();
    cachedQueries = rows.map(r => [r.id,r.query])
  } catch (err) {
    console.error('Failed to load cached queries', err);
    cachedQueries = [];
  }
  res.render('search', { finalSummary: summarizedIdeas, cachedQueries:cachedQueries,  query: query });
});

// --- Utility: Remove duplicate ideas based on URL ---
function deduplicate(ideas) {
  return ideas;
}

// --- Start Server ---
app.listen(3000, () => {
  console.log('Server started: http://localhost:3000');
});
