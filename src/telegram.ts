import { Telegraf } from 'telegraf';
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
