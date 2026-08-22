import { chromium, BrowserContext, Page } from 'playwright';
import path from 'path';

export interface FBPost {
  id: string;
  url: string;
  text: string;
}

export async function initBrowser(): Promise<{ context: BrowserContext; close: () => Promise<void> }> {
  const statePath = path.join(__dirname, '..', 'state.json');
  
  // Launch browser. If running on GitHub Actions or a server, headless should be true.
  const browser = await chromium.launch({ headless: true });
  
  let context: BrowserContext;
  try {
    // Try to load saved cookies
    context = await browser.newContext({ storageState: statePath });
    console.log('נטענו עוגיות ממשתמש הפייסבוק בהצלחה.');
  } catch (e) {
    console.log('לא נמצא קובץ עוגיות (state.json), הדפדפן יפתח כאנונימי (עלול להוביל לכישלון בסריקה בקבוצות סגורות).');
    context = await browser.newContext();
  }

  return {
    context,
    close: async () => {
      await browser.close();
    }
  };
}

export async function scrapeGroup(groupId: string, page: Page): Promise<FBPost[]> {
  // Using CHRONOLOGICAL sorting to get the newest posts
  const groupUrl = `https://www.facebook.com/groups/${groupId}?sorting_setting=CHRONOLOGICAL`;
  console.log(`Scraping group: ${groupUrl}`);
  
  await page.goto(groupUrl, { waitUntil: 'domcontentloaded' });
  
  // Wait a few seconds for the React app to render the feed
  await page.waitForTimeout(5000);
  
  // נגלול למטה דינמית כדי להבטיח לפחות 10 פוסטים כפי שביקשת
  let previousHeight = 0;
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('PageDown');
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(1500);
    
    const postCount = await page.evaluate(() => document.querySelectorAll('div[role="article"]').length);
    if (postCount >= 12) break; // We have enough posts
    
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);
    if (currentHeight === previousHeight && i > 5) break; // Hit the bottom
    previousHeight = currentHeight;
  }

  const posts = await page.evaluate((gid) => {
    const results: { id: string; url: string; text: string }[] = [];
    
    // Facebook uses role="article" for posts in the feed
    const articles = document.querySelectorAll('div[role="article"]');

    for (const article of articles) {
      const text = (article as HTMLElement).innerText;
      if (!text || text.length < 30) continue; // Skip if no text or too short

      // Find the post permalink URL
      const links = article.querySelectorAll('a');
      let postUrl = '';
      let postId = '';
      
      for (const link of links) {
        const href = link.getAttribute('href');
        if (href && (href.includes(`/groups/${gid}/posts/`) || href.includes(`/groups/${gid}/permalink/`))) {
          // Sometimes Facebook adds trailing query parameters. We want the clean URL.
          postUrl = href.split('?')[0]; 
          // Extract the post ID
          const match = postUrl.match(/\/(\d+)\/?$/);
          if (match) {
            postId = match[1];
          }
          break;
        }
      }

      // If we couldn't find a direct permalink with ID, we might need a fallback,
      // but for now we'll only collect posts we can uniquely identify.
      if (postId) {
        // מגבילים ל-1500 תווים כדי לא לשלוח שרשורי תגובות ארוכים שעולים הרבה כסף ב-API
        const fullText = (article as HTMLElement).innerText;
        results.push({
          id: postId,
          url: postUrl,
          text: fullText.length > 1500 ? fullText.substring(0, 1500) + '...' : fullText
        });
      }
    }
    
    return results;
  }, groupId);

  console.log(`Found ${posts.length} posts in group ${groupId}`);
  return posts;
}
