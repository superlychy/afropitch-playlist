const { chromium } = require('playwright');
const path = require('path');

const DIR = path.join(__dirname, 'screenshots');
const BASE = 'http://localhost:3000';

async function screenshot(page, name) {
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(DIR, `${name}.png`), fullPage: true });
  console.log(`  ✅ ${name}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // ========== PUBLIC PAGES (Desktop + Mobile) ==========
  console.log('📱 PUBLIC PAGES');
  
  const publicPages = [
    ['/', 'homepage-desktop'],
    ['/portal', 'portal-desktop'],
    ['/pricing', 'pricing-desktop'],
    ['/playlists', 'playlists-desktop'],
    ['/how-it-works', 'howitworks-desktop'],
    ['/submit', 'submit-desktop'],
    ['/signup/artist', 'signup-desktop'],
    ['/contact', 'contact-desktop'],
    ['/trust', 'trust-desktop'],
    ['/terms', 'terms-desktop'],
    ['/privacy', 'privacy-desktop'],
  ];

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  for (const [url, name] of publicPages) {
    try {
      const p = await desktop.newPage();
      await p.goto(BASE + url, { waitUntil: 'networkidle', timeout: 30000 });
      await screenshot(p, name);
      await p.close();
    } catch (e) { console.log(`  ⚠ ${name}: ${e.message.substring(0, 60)}`); }
  }

  // Mobile
  console.log('\n📱 MOBILE PAGES');
  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mobilePages = [
    ['/', 'homepage-mobile'],
    ['/portal', 'portal-mobile'],
    ['/submit', 'submit-mobile'],
    ['/playlists', 'playlists-mobile'],
    ['/pricing', 'pricing-mobile'],
  ];
  for (const [url, name] of mobilePages) {
    try {
      const p = await mobile.newPage();
      await p.goto(BASE + url, { waitUntil: 'networkidle', timeout: 30000 });
      await screenshot(p, name);
      await p.close();
    } catch (e) { console.log(`  ⚠ ${name}: ${e.message.substring(0, 60)}`); }
  }

  // ========== ARTIST DASHBOARD ==========
  console.log('\n🎨 ARTIST DASHBOARD');
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(BASE + '/portal', { waitUntil: 'networkidle', timeout: 30000 });
    await p.waitForTimeout(1000);
    
    // Click Artist Access tab, fill form, login
    await p.click('text=Artist Access');
    await p.fill('input[type="email"]', 'artist@test.com');
    await p.fill('input[type="password"]', 'TestArtist123!');
    await p.click('text=Log In');
    await p.waitForTimeout(5000);
    await screenshot(p, 'artist-dashboard-desktop');
    
    // Take mobile version too
    await p.close();
    await ctx.close();
    
    const mCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const mp = await mCtx.newPage();
    await mp.goto(BASE + '/portal', { waitUntil: 'networkidle', timeout: 30000 });
    await mp.waitForTimeout(1000);
    await mp.click('text=Artist Access');
    await mp.fill('input[type="email"]', 'artist@test.com');
    await mp.fill('input[type="password"]', 'TestArtist123!');
    await mp.click('text=Log In');
    await mp.waitForTimeout(5000);
    await screenshot(mp, 'artist-dashboard-mobile');
    await mp.close();
    await mCtx.close();
  } catch (e) { console.log(`  ⚠ Artist dashboard: ${e.message.substring(0, 80)}`); }

  // ========== ADMIN DASHBOARD (ALL 9+ TABS) ==========
  console.log('\n👑 ADMIN DASHBOARD - ALL TABS');
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    
    // Login as admin
    await p.goto(BASE + '/portal', { waitUntil: 'networkidle', timeout: 30000 });
    await p.waitForTimeout(1000);
    // Admin uses Curator Portal tab
    await p.click('text=Curator Portal');
    await p.fill('input[type="email"]', 'admin@test.com');
    await p.fill('input[type="password"]', 'TestAdmin123!');
    await p.click('text=Log In');
    await p.waitForTimeout(5000);
    await screenshot(p, 'admin-overview-desktop');
    
    // Now visit each tab by navigating to the admin page and setting the tab
    const tabs = ['overview', 'analytics', 'users', 'withdrawals', 'transactions', 'support', 'playlists', 'applications', 'inbox', 'broadcast'];
    
    for (const tab of tabs) {
      try {
        await p.evaluate((t) => {
          localStorage.setItem('admin_active_tab', t);
        }, tab);
        await p.goto(BASE + '/dashboard/admin', { waitUntil: 'networkidle', timeout: 30000 });
        await p.waitForTimeout(3000);
        await screenshot(p, `admin-${tab}-desktop`);
      } catch (e) { console.log(`  ⚠ admin-${tab}: ${e.message.substring(0, 60)}`); }
    }

    // Mobile admin
    console.log('\n👑 ADMIN MOBILE');
    await p.close();
    await ctx.close();
    
    const mCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const mp = await mCtx.newPage();
    await mp.goto(BASE + '/portal', { waitUntil: 'networkidle', timeout: 30000 });
    await mp.waitForTimeout(1000);
    await mp.click('text=Curator Portal');
    await mp.fill('input[type="email"]', 'admin@test.com');
    await mp.fill('input[type="password"]', 'TestAdmin123!');
    await mp.click('text=Log In');
    await mp.waitForTimeout(5000);
    await screenshot(mp, 'admin-overview-mobile');
    await mp.close();
    await mCtx.close();
    
  } catch (e) { console.log(`  ⚠ Admin dashboard: ${e.message.substring(0, 80)}`); }

  // ========== CURATOR DASHBOARD ==========
  console.log('\n🎵 CURATOR DASHBOARD');
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(BASE + '/dashboard/curator', { waitUntil: 'networkidle', timeout: 30000 });
    await p.waitForTimeout(3000);
    // May redirect to portal if not logged in as curator - that's fine
    await screenshot(p, 'curator-dashboard-desktop');
    await p.close();
    await ctx.close();
  } catch (e) { console.log(`  ⚠ Curator: ${e.message.substring(0, 60)}`); }

  await browser.close();
  console.log('\n✅ ALL SCREENSHOTS COMPLETE!');
})();
