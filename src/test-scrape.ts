import { initBrowser, scrapeGroup } from './scraper';

async function test() {
  console.log('מתחיל דפדפן...');
  const { context, close } = await initBrowser();
  const page = await context.newPage();
  
  console.log('סורק קבוצה...');
  try {
    const posts = await scrapeGroup('DIRARAMATGAN', page);
    console.log(`נמצאו ${posts.length} פוסטים.`);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'debug.png', fullPage: true });
    console.log('נשמר צילום מסך ב- debug.png');
    
  } catch (e) {
    console.error('שגיאה:', e);
  }
  
  await close();
}

test().catch(console.error);
