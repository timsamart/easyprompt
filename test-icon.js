const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox']});
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve('icon-test.html'));
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({path: './screenshots/icon-test.png'});
  const debug = await page.evaluate(() => document.getElementById('debug').textContent);
  console.log('DEBUG:', debug);
  await browser.close();
})(); 