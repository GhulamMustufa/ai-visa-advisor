const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/chat');
  await page.evaluate(() => window.localStorage.clear());
  await page.getByText("What are the requirements for Spain's Digital Nomad Visa?").first().click();
  await page.waitForTimeout(1000);
  console.log(await page.evaluate(() => document.body.innerText));
  await browser.close();
})();
