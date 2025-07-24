// db.js
const Database = require('better-sqlite3');
const path = require('path');

// Open or create the SQLite DB file
const db = new Database(path.join(__dirname, 'summary.sqlite'));

// Create the cache table if it doesn't exist
db.prepare(`
  CREATE TABLE IF NOT EXISTS idea_insights_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT UNIQUE NOT NULL,
    tags TEXT,
    insights TEXT,
    total_ideas INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

module.exports = db;