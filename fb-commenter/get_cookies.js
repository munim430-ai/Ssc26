import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function getCookies() {
  console.log('Attempting to connect to your running Chrome browser on port 9222...');
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();
    if (contexts.length === 0) {
      console.error('Error: No active browser contexts found. Make sure Chrome is open and active.');
      process.exit(1);
    }

    // Retrieve cookies for facebook.com
    const cookies = await contexts[0].cookies(['https://www.facebook.com', 'https://facebook.com']);
    
    if (cookies.length === 0) {
      console.error('Error: No Facebook cookies found. Make sure you are logged into Facebook (and switched to your Page profile) in Chrome.');
      process.exit(1);
    }

    const cookiesPath = path.resolve('cookies.json');
    fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
    console.log(`\n[Success] Extracted ${cookies.length} Facebook cookies and saved them to cookies.json!`);
    
    console.log('Closing the debugger connection...');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('\n[Error] Could not connect to Chrome on port 9222.');
    console.log('\nTo resolve this:');
    console.log('1. Close all active Chrome windows completely.');
    console.log('2. Open Chrome with remote debugging enabled from the command line/Run dialog (Win + R):');
    console.log('   chrome.exe --remote-debugging-port=9222');
    console.log('3. Open Facebook and log in (make sure you are switched to your Facebook Page profile).');
    console.log('4. Run this script again.');
    process.exit(1);
  }
}

getCookies();
