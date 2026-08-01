import { chromium } from 'playwright';
import path from 'path';

async function login() {
  console.log('פותח דפדפן להתחברות...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('אנא התחבר לפייסבוק בחלון שקפץ. לאחר ההתחברות, חזור לכאן ולחץ Enter.');
  await page.goto('https://www.facebook.com/');

  // Wait for the user to press enter in the console
  await new Promise((resolve) => {
    process.stdin.once('data', () => resolve(true));
  });

  const statePath = path.join(__dirname, '..', 'state.json');
  await context.storageState({ path: statePath });
  console.log(`העוגיות נשמרו בהצלחה בקובץ: ${statePath}`);

  await browser.close();
  process.exit(0);
}

login().catch(console.error);
