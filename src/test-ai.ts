import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function testKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("❌ לא נמצא GEMINI_API_KEY בקובץ .env שלך!");
    return;
  }
  
  if (!apiKey.startsWith('AIza') && !apiKey.startsWith('AQ.')) {
    console.log("❌ שים לב: המפתח לא נראה כמו הפורמטים המוכרים של גוגל.");
  } else {
    console.log("✅ המפתח נראה בפורמט תקין.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  console.log("מנסה למשוך את רשימת המודלים הזמינים עבור המפתח הזה...");
  
  try {
    // List all available models
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    if (data.error) {
      console.log(`❌ שגיאה מהשרת: ${data.error.code} - ${data.error.message}`);
      console.log("סטטוס:", data.error.status);
    } else if (data.models) {
      console.log("✅ המודלים הבאים זמינים בחשבון שלך:");
      const modelNames = data.models.map((m: any) => m.name).filter((n: string) => n.includes('gemini'));
      console.log(modelNames.join('\n'));
      
      if (modelNames.length === 0) {
         console.log("אזהרה: ה-API פעיל אבל אין מודלים של ג'ימיני זמינים!");
      }
    } else {
      console.log("תשובה לא צפויה:", data);
    }
  } catch (e: any) {
    console.log(`❌ נכשל בתקשורת: ${e.message}`);
  }
}

testKey();
