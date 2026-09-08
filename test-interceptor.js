const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('request', request => {
    if (request.url().includes('/api/chat')) {
      console.log('API CHAT POST DATA:', request.postData());
    }
  });
  await page.goto('http://localhost:3000/chat');
  await page.fill('input', 'Hello AI!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await browser.close();
})();
