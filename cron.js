const cron = require('node-cron');
const config = require('./config.json');
const scrapeIdeas = require('./scraper/scrape');

console.log(`Scheduling scraping every ${config.scrape_interval_hours} hours...`);

cron.schedule(`0 */${config.scrape_interval_hours} * * *`, async () => {
  console.log('Running scheduled scrape...');
  await scrapeIdeas();
});
