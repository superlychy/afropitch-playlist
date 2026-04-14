const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  
  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });
  
  // Capture network errors
  page.on('requestfailed', request => {
    console.log('NETWORK ERROR:', request.url(), request.failure().errorText);
  });
  
  console.log('Loading portal...');
  await page.goto('https://afropitch.vercel.app/portal', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Fill login form
  console.log('Filling login form...');
  await page.fill('input[type="email"]', 'artist@test.com');
  await page.fill('input[type="password"]', 'TestArtist123!');
  await page.screenshot({ path: 'login-filled.png' });
  
  // Click login
  console.log('Clicking login...');
  const loginBtn = page.locator('button:has-text("Log In")');
  console.log('Login button found:', await loginBtn.count() > 0);
  
  await loginBtn.click();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'login-result.png' });
  
  // Check if we were redirected
  const url = page.url();
  console.log('Current URL:', url);
  
  // Check page content
  const content = await page.textContent('body');
  console.log('Has Dashboard:', content.includes('Dashboard'));
  console.log('Has error:', content.includes('error') || content.includes('Error'));
  
  await browser.close();
})();
