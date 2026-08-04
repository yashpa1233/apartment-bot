import { getConfig, getSeenPosts, addSeenPost } from './db';
import { initBrowser, scrapeGroup } from './scraper';
import { analyzePost } from './ai';
import { sendNotification, sendSummary } from './telegram';

const GROUPS = [
  '647901439404148',
  '1424244737803677',
  '1870209196564360',
  '253957624766723'
];

async function main() {
  console.log('מתחיל ריצת סריקה...');
  const config = await getConfig();
  const seenPosts = await getSeenPosts();
  
  const { context, close } = await initBrowser();
  const page = await context.newPage();

  let totalNewPosts = 0;
  let totalMatches = 0;

  for (const groupId of GROUPS) {
    try {
      const posts = await scrapeGroup(groupId, page);
      
      for (const post of posts) {
        if (seenPosts.includes(post.id)) {
          // עברנו כבר על הפוסט הזה
          continue;
        }

        totalNewPosts++;
        console.log(`מנתח פוסט חדש: ${post.id}`);
        const analysis = await analyzePost(post.text, config);
        
        if (analysis.isMatch) {
          console.log(`נמצאה התאמה! הפוסט נשלח לטלגרם: ${post.url}`);
          await sendNotification(post.url, analysis);
          totalMatches++;
        } else {
          console.log(`אין התאמה (${analysis.reason}).`);
        }

        // מוסיפים למאגר כדי לא לסרוק שוב, גם אם לא מתאים, כדי לחסוך קריאות ל-AI
        await addSeenPost(post.id);
        
        // השהייה קטנה בין קריאות ל-API למניעת חסימות
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`שגיאה בסריקת קבוצה ${groupId}:`, error);
    }
  }

  await close();
  
  // נשלח סיכום של הריצה לטלגרם כדי לדעת שהבוט פעיל
  await sendSummary(totalNewPosts, totalMatches);
  
  console.log('הסריקה הסתיימה בהצלחה.');
}

main().catch(console.error);
