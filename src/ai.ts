import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppConfig } from './db';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface AnalysisResult {
  isMatch: boolean;
  price?: number;
  rooms?: number;
  location?: string;
  contactDetails?: string;
  reason?: string;
}

export async function analyzePost(postText: string, config: AppConfig): Promise<AnalysisResult> {
  if (!process.env.GEMINI_API_KEY) {
    console.error('Missing GEMINI_API_KEY');
    return { isMatch: false, reason: 'Missing API Key' };
  }

  const prompt = `
אתה סוכן נדל"ן שתפקידו לנתח פוסטים של השכרת דירות בפייסבוק ולקבוע האם הדירה מתאימה לדרישות הלקוח.

טקסט הפוסט:
"""
${postText}
"""

דרישות הלקוח:
- ערים מבוקשות: ${config.cities.join(', ')}
- מחיר מקסימלי: ${config.maxPrice} שקלים. עם זאת, אם בפוסט לא מצוין מחיר כלל אך הדירה נראית מתאימה מבחינת שאר הפרמטרים, הדירה מתאימה ויש לאשר אותה (אל תפסול בגלל חוסר במחיר).
- דרישות חדרים: בין ${config.minRooms} ל-${config.maxRooms} חדרים
- הדירה חייבת להיות דירה שלמה למגורים של זוג (לא חדר בדירת שותפים ולא סאבלט קצר מועד). עם זאת, אם הפוסט מציע "דירת שותפים שמתפנה כולה" (כלומר הזוג יוכל לשכור את כל הדירה לעצמו ללא שותפים נוספים), הדירה מתאימה ויש לאשר אותה.
- מילות שלילה: ${config.excludeKeywords.join(', ')}. שים לב: אם המילים האלו מופיעות בפוסט, בדוק היטב את ההקשר. פסול את הדירה רק אם מחפשים שותף לדירה קיימת. אל תפסול אם ההקשר הוא שותפים שעוזבים ואפשר לשכור את כל הדירה.

אנא נתח את הפוסט והחזר את התשובה בפורמט JSON בלבד, בדיוק במבנה הבא (ללא טקסט נוסף לפני או אחרי):
{
  "isMatch": true/false,
  "price": מחיר הדירה במספרים (אם לא צוין, כתוב null),
  "rooms": מספר החדרים (אם לא צוין, כתוב null),
  "location": "האזור / עיר ושכונה",
  "contactDetails": "מספר טלפון או שם של בעל הנכס/מפרסם (אם אין בפוסט, כתוב null)",
  "reason": "הסבר קצר בעברית למה הדירה מתאימה או למה היא נפסלה"
}
`;

  const modelsToTry = [
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-2.5-flash'
  ];
  let result;
  let lastError;
  
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      result = await model.generateContent(prompt);
      break; // הצלחנו! נצא מהלולאה
    } catch (e: any) {
      console.warn(`Model ${modelName} failed with status ${e.status}, trying next...`);
      lastError = e;
      continue;
    }
  }

  if (!result) {
    console.error('All models failed. Last error:', lastError?.message);
    return { isMatch: false, reason: 'שגיאת מודל ב-AI' };
  }

  try {
    const text = result.response.text();
    // לנקות את הטקסט כדי להבטיח JSON תקין
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson) as AnalysisResult;
  } catch (error) {
    console.error('Error analyzing post with Gemini:', error);
    return { isMatch: false, reason: 'שגיאה בניתוח הפוסט' };
  }
}
