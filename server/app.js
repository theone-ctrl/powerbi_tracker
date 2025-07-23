const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const config = require('../config.json'); // adjust if path is incorrect
scrapeIdeasSummary = require('../scraper/summary');
const { summarizeInBatches } = require('../services/summarizer');

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
app.get('/search', (req, res) => {
  res.render('search', { finalSummary: '' });
});

// --- Search Handler (POST triggers scrape, dedup, summarize) ---
app.post('/search', async (req, res) => {
  const query = req.body.query;
  if (!query || !query.trim()) {
    return res.render('search', { finalSummary : null });
  }
  console.log('🔄 Gathering Ideas');
  const rawIdeas = await scrapeIdeasSummary(query);
  console.log('🔄 Filtering Duplicates');
  const uniqueIdeas = deduplicate(rawIdeas);
  console.log('🔄 Starting summarization process...');
  const summarizedIdeas = await summarizeInBatches(uniqueIdeas, 15000);
  console.log('🔄 Final report summary generated');
  res.render('search', { finalSummary: summarizedIdeas, query: query });
});

// --- Utility: Remove duplicate ideas based on URL ---
function deduplicate(ideas) {
  return ideas;
}

// --- Start Server ---
app.listen(3000, () => {
  console.log('Server started: http://localhost:3000');
});
