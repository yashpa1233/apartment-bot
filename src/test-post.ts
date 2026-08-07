import { initBrowser } from './scraper';
import { analyzePost } from './ai';
import { getConfig } from './db';

async function testPost() {
  const url = 'https://www.facebook.com/share/p/1D6Mbe2BwN/';
  
  console.log('מתחיל דפדפן...');
  const { context, close } = await initBrowser();
  const page = await context.newPage();
  
  console.log(`מנווט ל- ${url}...`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  
  // Extract text
  const text = await page.evaluate(() => {
    // Try to get the main article text
    const article = document.querySelector('div[role="article"]');
    return article ? (article as HTMLElement).innerText : document.body.innerText;
  });
  
  console.log('=== טקסט הפוסט שנמצא ===');
  console.log(text.substring(0, 500) + '...');
  
  const config = await getConfig();
  console.log('=== מנתח באמצעות AI ===');
  const result = await analyzePost(text, config);
  
  console.log('תוצאה:', JSON.stringify(result, null, 2));
  
  await close();
}

testPost().catch(console.error);
