const { chromium } = require('playwright');
const config = require('../config.json');



async function scrapeIdeasSummary(query) {
  console.log(`[${new Date().toLocaleString()}] Starting scrape...`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = {};

      
  const url = `https://community.fabric.microsoft.com/t5/forums/searchpage/tab/message?advanced=false&allow_punctuation=false&filter=location&location=idea-board:fbc_ideas&q=${encodeURIComponent(query)}`;
  console.log(`🧭 Navigating to ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('div.MessageView', { timeout: 10000 });

  const ideaLinks = await page.$$eval('div.MessageSubject a', (links) => {
      return links.slice(0, config.top_n).map(a => ({
        href: a.href,
        title: a.innerText.trim()
      }));
   });

  if(ideaLinks.length === 0) {
    console.log(`🔍 No ideas found for query: ${query}`);
    return [];
  }

  results[query]  = []
   
  for (let idea of ideaLinks) {
    await page.goto(idea.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('div.lia-message-subject');

    const ideaDetails = await page.evaluate(() => {  
      const paragraphNodes = document.querySelectorAll('div.lia-message-body-content p');
      let description = '';
      for (const p of paragraphNodes) {
        description += p.textContent.trim() + ' ';
      }

      return {
        title: document.querySelector('div.lia-message-subject')?.innerText?.trim() || 'N/A',
        description: description.trim() || 'No description',
        votes: document.querySelector('span.MessageKudosCount')?.innerText?.trim() || '0',
        date: document.querySelector('span.DateTime span.local-date')?.innerText?.trim() || 'N/A',
        url: window.location.href
      };
  });

  results[query].push(ideaDetails);
}

console.log('🔄 Ideas Collected..');
return results[query];

  }  

module.exports = scrapeIdeasSummary;

// For standalone run:
if (require.main === module) {
  scrapeIdeasSummary();
}
