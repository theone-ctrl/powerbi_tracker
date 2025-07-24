require('dotenv').config();
const db = require('../services/db');
const fs = require('fs');

// Create table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS idea_insights_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT UNIQUE NOT NULL,
    tags TEXT,
    insights TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();


// Function to insert or update cache
function cacheIdeaInsights(query, tagsObj, insightsObj, totalIdeas) {
  const stmt = db.prepare(`
    INSERT INTO idea_insights_cache (query, tags, insights, total_ideas)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(query) DO UPDATE SET
      tags = excluded.tags,
      insights = excluded.insights,
      last_updated = CURRENT_TIMESTAMP,
      total_ideas = excluded.total_ideas
  `);

  stmt.run(
    query,
    JSON.stringify(tagsObj),
    JSON.stringify(insightsObj),
    totalIdeas
  );
}


const batchPrompt = `The following text contains multiple Power BI idea descriptions combined in a single string. Break them down and summarize each idea individually. For each idea, extract its core purpose or value, without dwelling on technical details or long explanations. Do not cut words. Be concise, but ensure clarity:\n\n`;
const finalPrompt = `You are an expert product analyst for Power BI user feedback.

Given the following list of summarized user ideas, extract deep insights in the following JSON format:

{
  "tags": {
    "Performance": {
      "count": 3,
      "examples": ["Faster loading time needed", "Dashboards lag on refresh", ...]
    },
    "Sharing": {
      "count": 2,
      "examples": ["Easier team-level access control", ...]
    },
    ...
  },
  "insights": {
    "userPainPoints": ["Slow performance on large reports", "Complex access management", ...],
    "userNeeds": ["Speed and responsiveness", "Simplified collaboration", ...],
    "missingFeatures": ["Bulk export of bookmarks", "Custom role-based sharing logic", ...],
    "recommendedSolutions": ["Optimize backend query cache", "Add team-level permission settings", ...]
  }
}

Only use themes that appear multiple times. Be concise, do not repeat similar phrases. Avoid generic or vague tags.
`;

async function summarizeInBatches(ideas, limit = 15000 , query = '') {
  const summaries = [];
  let currentText = '';

  for (const idea of ideas || []) {
    const desc = idea.description || '';
    if ((currentText + desc).length > limit && desc !== '') {
      console.log('🔄 Block Summary started..');
      fs.writeFileSync('./mileStone.json', JSON.stringify(3, null, 2));
      const summary = await summarizeBlock(currentText, batchPrompt);
      summaries.push(summary);
      currentText = '';
    }
    currentText += desc + '\n\n';
  }

  console.log('🔄 Final Summary Started..');
  fs.writeFileSync('./mileStone.json', JSON.stringify(4, null, 2));
  let finalSummary = '';
  if (currentText.trim()) {
    finalSummary = await summarizeBlock(currentText, finalPrompt, process.env.summary_model);
  }
  console.log('🔄 Final Summary Finshed..');
  fs.writeFileSync('./mileStone.json', JSON.stringify(5, null, 2));
  finalSummary = JSON.parse(finalSummary);
  finalSummary.total_ideas = ideas.length;
  finalSummary.query = query;
  cacheIdeaInsights(query,finalSummary.tags, finalSummary.insights,ideas.length);
  console.log('🔄 Summary cached in DB');
  return finalSummary;
}

async function summarizeBlock(text, prompt, model = process.env.batch_model) {

  const { OpenAI } = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: model,
    messages: [{
      role: 'user',
      content: `${prompt}\n\n${text}`
    }],
    temperature: 0.3
  });

  let content = response.choices[0].message.content.trim();

  try {
    // Try to parse the response as JSON
    return content;
  } catch (e) {
    // If parsing fails, return a default JSON object
    return {
      painPoints: '',
      needs: '',
      missing: '',
      solutions: ''
    };
  }
}

module.exports = { summarizeInBatches };
