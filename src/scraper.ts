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
  
  // נגלול למטה מספר פעמים כדי לטעון עוד פוסטים (המטרה היא להגיע לפחות ל-5 כפי שביקשת)
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('PageDown');
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(1500);
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
      if (postId && text) {
        results.push({ id: postId, url: postUrl, text });
      }
    }
    
    return results;
  }, groupId);

  console.log(`Found ${posts.length} posts in group ${groupId}`);
  return posts;
}
