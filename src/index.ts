import { getConfig, getSeenPosts, addSeenPost, saveLastScannedLinks } from './db';
import { initBrowser, scrapeGroup } from './scraper';
import { analyzePost } from './ai';
import { sendNotification, sendSummary, startBot, stopBot } from './telegram';

const GROUPS = [
  '647901439404148',
  '1424244737803677',
  '1870209196564360',
  '253957624766723',
  'DIRARAMATGAN'
];

async function main() {
  console.log('מתחיל ריצת סריקה...');
  
  // דיבאג קטן לראות באיזה מפתח גיטהאב משתמש
  const key = process.env.GEMINI_API_KEY || '';
  console.log('API Key starts with:', key.substring(0, 5));
  
  // מתחילים להאזין לפקודות (יענה על הודעות שנשלחו אליו מאז הריצה הקודמת)
  startBot();

  const config = await getConfig();
  const seenPosts = await getSeenPosts();
  
  const { context, close } = await initBrowser();
  const page = await context.newPage();

  let totalNewPosts = 0;
  let totalMatches = 0;
  const currentScannedLinks: string[] = [];

  for (const groupId of GROUPS) {
    try {
      const posts = await scrapeGroup(groupId, page);
      
      for (const post of posts) {
        if (seenPosts.includes(post.id)) {
          // עברנו כבר על הפוסט הזה
          continue;
        }

        totalNewPosts++;
        currentScannedLinks.push(post.url);
        
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
        
        // השהייה של 10 שניות בין קריאות ל-API למניעת חסימות (הגבלה של 15 בקשות בדקה בחינם)
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    } catch (error) {
      console.error(`שגיאה בסריקת קבוצה ${groupId}:`, error);
    }
  }

  await close();
  
  // נשמור את הקישורים של הריצה הזו כדי שהבוט יוכל לענות על "מה סרקת?"
  if (currentScannedLinks.length > 0) {
    await saveLastScannedLinks(currentScannedLinks);
  }
  
  // נשלח סיכום של הריצה לטלגרם כדי לדעת שהבוט פעיל
  await sendSummary(totalNewPosts, totalMatches);
  
  // מכבים את ההאזנה לבוט לפני שמסיימים את הסקריפט
  stopBot();
  
  console.log('הסריקה הסתיימה בהצלחה.');
}

main().catch(console.error);
