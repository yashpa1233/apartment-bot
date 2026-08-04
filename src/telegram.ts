import { Telegraf } from 'telegraf';
import { getLastScannedLinks } from './db';
import dotenv from 'dotenv';
dotenv.config();

const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
const chatId = process.env.TELEGRAM_CHAT_ID || '';

const bot = new Telegraf(botToken);

export async function sendNotification(postUrl: string, analysis: any) {
  if (!botToken || !chatId) {
    console.warn('Telegram bot token or chat ID is missing. Cannot send notification.');
    return;
  }

  const message = `
🏠 מצאתי דירה שמתאימה לך!

📍 אזור/שכונה: ${analysis.location || 'לא צוין'}
💰 מחיר: ${analysis.price ? analysis.price + ' ₪' : 'לא צוין'}
🛏️ חדרים: ${analysis.rooms || 'לא צוין'}
📞 טלפון / פרטי התקשרות: ${analysis.contactDetails || 'לא צוין'}

📝 למה זה מתאים: 
${analysis.reason}

🔗 למעבר לפוסט המקורי:
${postUrl}
`;

  try {
    await bot.telegram.sendMessage(chatId, message);
    console.log(`Notification sent for post: ${postUrl}`);
  } catch (error) {
    console.error('Failed to send telegram message:', error);
  }
}

export async function sendSummary(totalPosts: number, matchedPosts: number) {
  if (!botToken || !chatId) return;

  const message = `
✅ סריקת הדירות הסתיימה בהצלחה!
סך הכל נסרקו בסיבוב הזה: ${totalPosts} פוסטים חדשים.
מתוכם נמצאו מתאימים להגדרות: ${matchedPosts} דירות.
`;

  try {
    await bot.telegram.sendMessage(chatId, message);
    console.log('Summary message sent.');
  } catch (error) {
    console.error('Failed to send summary message:', error);
  }
}

export function setupBotListeners() {
  if (!botToken) return;

  bot.hears('מה סרקת?', async (ctx) => {
    const links = await getLastScannedLinks();
    if (links.length === 0) {
      return ctx.reply('לא נסרקו דירות חדשות בריצה האחרונה, או שהמאגר ריק.');
    }
    
    const text = 'הנה הקישורים לפוסטים שסרקתי בריצה האחרונה:\n\n' + links.join('\n\n');
    
    // טלגרם מגביל הודעה ל-4096 תווים, לכן נבדוק את האורך
    if (text.length > 4000) {
      await ctx.replyWithDocument({ 
        source: Buffer.from(links.join('\n'), 'utf-8'), 
        filename: 'scanned_links.txt' 
      }, { caption: 'הקובץ מכיל את כל הקישורים שנסרקו' });
    } else {
      await ctx.reply(text, { disable_web_page_preview: true });
    }
  });
}

export function startBot() {
  if (!botToken) return;
  setupBotListeners();
  bot.launch();
  console.log('Telegram bot is listening for commands...');
}

export function stopBot() {
  if (!botToken) return;
  try {
    bot.stop('SIGINT');
  } catch(e) {}
}
