const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const BASE = 'http://localhost:3000';

const pages = [
  { name: 'homepage', url: '/' },
  { name: 'portal', url: '/portal' },
  { name: 'pricing', url: '/pricing' },
  { name: 'playlists', url: '/playlists' },
  { name: 'how-it-works', url: '/how-it-works' },
  { name: 'submit', url: '/submit' },
  { name: 'signup-artist', url: '/signup/artist' },
  { name: 'contact', url: '/contact' },
  { name: 'trust', url: '/trust' },
  { name: 'terms', url: '/terms' },
  { name: 'privacy', url: '/privacy' },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  
  // Desktop viewport
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // Mobile viewport
  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 } });

  for (const page of pages) {
    console.log(`📸 ${page.name}...`);
    
    // Desktop
    try {
      const dPage = await desktop.newPage();
      await dPage.goto(BASE + page.url, { waitUntil: 'networkidle', timeout: 30000 });
      await dPage.waitForTimeout(2000);
      await dPage.screenshot({ path: path.join(SCREENSHOTS_DIR, `${page.name}-desktop.png`), fullPage: true });
      await dPage.close();
    } catch (e) {
      console.log(`  ⚠ Desktop failed: ${e.message.substring(0, 80)}`);
    }

    // Mobile
    try {
      const mPage = await mobile.newPage();
      await mPage.goto(BASE + page.url, { waitUntil: 'networkidle', timeout: 30000 });
      await mPage.waitForTimeout(2000);
      await mPage.screenshot({ path: path.join(SCREENSHOTS_DIR, `${page.name}-mobile.png`), fullPage: true });
      await mPage.close();
    } catch (e) {
      console.log(`  ⚠ Mobile failed: ${e.message.substring(0, 80)}`);
    }
  }

  // Login and take dashboard screenshots
  console.log('📸 Logging in as artist...');
  try {
    const dPage = await desktop.newPage();
    await dPage.goto(BASE + '/portal', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Try logging in with test account
    await dPage.fill('input[type="email"]', 'testartist@test.com');
    await dPage.fill('input[type="password"]', 'Test@1234');
    await dPage.click('button[type="submit"]');
    await dPage.waitForTimeout(5000);
    await dPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'artist-dashboard-desktop.png'), fullPage: true });
    await dPage.close();
  } catch (e) {
    console.log(`  ⚠ Artist dashboard failed: ${e.message.substring(0, 80)}`);
  }

  console.log('📸 Logging in as admin...');
  try {
    const dPage = await desktop.newPage();
    await dPage.goto(BASE + '/portal', { waitUntil: 'networkidle', timeout: 30000 });
    await dPage.fill('input[type="email"]', 'admin@afropitchplay.best');
    await dPage.fill('input[type="password"]', 'Admin@2025');
    await dPage.click('button[type="submit"]');
    await dPage.waitForTimeout(5000);
    
    // Navigate to each admin tab
    const tabs = ['overview', 'users', 'inbox'];
    for (const tab of tabs) {
      try {
        await dPage.evaluate((t) => localStorage.setItem('admin_active_tab', t), tab);
        await dPage.reload({ waitUntil: 'networkidle' });
        await dPage.waitForTimeout(2000);
        await dPage.screenshot({ path: path.join(SCREENSHOTS_DIR, `admin-${tab}-desktop.png`), fullPage: true });
      } catch (e) {
        console.log(`  ⚠ Admin tab ${tab} failed: ${e.message.substring(0, 80)}`);
      }
    }
    await dPage.close();
  } catch (e) {
    console.log(`  ⚠ Admin dashboard failed: ${e.message.substring(0, 80)}`);
  }

  await browser.close();
  console.log('✅ All screenshots taken!');
}

run().catch(console.error);
