const { chromium } = require('playwright');
const fs = require('fs');
const config = require('../config.json');
const path = './data/ideas.json';



async function scrapeIdeas() {
  console.log(`[${new Date().toLocaleString()}] Starting scrape...`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = {};

  for (const status of config.statuses) {
    
    const url = `https://community.fabric.microsoft.com/t5/Fabric-Ideas/idb-p/fbc_ideas/label-name/power%20bi/status-key/${status}/tab/most-kudoed`;
    console.log(`🧭 Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('div.MessageView', { timeout: 10000 });

    const ideaLinks = await page.$$eval('div.MessageSubject a', (links) => {
      return links.slice(0, config.top_n).map(a => ({
        href: a.href,
        title: a.innerText.trim()
      }));
    });

    results[status] = {};

    for (let idea of ideaLinks) {
      if (results[status][idea.href]) {
        console.log(`🔁 Skipping duplicate: ${idea.href}`);
        continue;
      }

      console.log(`🔍 [${status}] Scraping: ${idea.title}`);
      await page.goto(idea.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('div.lia-message-subject');

      const ideaDetails = await page.evaluate(() => {        
        return {
          title: document.querySelector('div.lia-message-subject')?.innerText?.trim() || 'N/A',
          description: document.querySelector('div.lia-message-body-content p')?.innerText?.trim() || 'No description',
          votes: document.querySelector('span.MessageKudosCount')?.innerText?.trim() || '0',
          date: document.querySelector('span.DateTime span.local-date')?.innerText?.trim() || 'N/A',
          url: window.location.href
        };
      });

      results[status][idea.href] = ideaDetails;
    }
  }

  await browser.close();
  // Save merged data
  fs.writeFileSync(path, JSON.stringify(results, null, 2));
  console.log(`[${new Date().toLocaleString()}] ✅ Scrape completed and saved to data/ideas.json`);
  
}
module.exports = scrapeIdeas;

// For standalone run:
if (require.main === module) {
  scrapeIdeas();
}
