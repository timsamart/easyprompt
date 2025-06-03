const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testSimple() {
  let browser;
  
  try {
    console.log('🚀 Testing simplified panel...');
    browser = await puppeteer.launch({
      headless: 'new',
      defaultViewport: { width: 1200, height: 800 },
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    
    const screenshotsDir = './screenshots';
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }

    console.log('📁 Loading test-panel-simple.html...');
    const testPath = path.resolve(__dirname, 'test-panel-simple.html');
    await page.goto(`file://${testPath}`, { waitUntil: 'networkidle0' });

    // Wait for everything to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('📸 Taking screenshot...');
    await page.screenshot({
      path: './screenshots/simple-test.png',
      fullPage: true
    });

    // Get debug info
    const debugInfo = await page.evaluate(() => {
      const debugEl = document.getElementById('debug');
      return debugEl ? debugEl.textContent : 'No debug info';
    });

    console.log('🔍 Debug info from page:');
    console.log(debugInfo);

    // Check Feather icons
    const iconCheck = await page.evaluate(() => {
      const featherLoaded = typeof feather !== 'undefined';
      const iconElements = document.querySelectorAll('[data-feather]');
      const svgElements = document.querySelectorAll('[data-feather] svg');
      
      return {
        featherLoaded,
        iconElementsCount: iconElements.length,
        svgElementsCount: svgElements.length,
        firstIconHTML: iconElements[0] ? iconElements[0].innerHTML : 'none',
        iconNames: Array.from(iconElements).map(el => el.getAttribute('data-feather'))
      };
    });

    console.log('🎨 Icon analysis:', iconCheck);

    // Check CSS
    const cssCheck = await page.evaluate(() => {
      const header = document.querySelector('header');
      const grid = document.querySelector('.cards-grid');
      const cards = document.querySelectorAll('.card');
      
      return {
        headerBackground: header ? window.getComputedStyle(header).background : 'none',
        gridDisplay: grid ? window.getComputedStyle(grid).display : 'none',
        cardCount: cards.length,
        cardStyles: Array.from(cards).map(card => ({
          background: window.getComputedStyle(card).background,
          borderRadius: window.getComputedStyle(card).borderRadius
        }))
      };
    });

    console.log('🎨 CSS analysis:', cssCheck);

    console.log('✅ Simple test completed!');
    await browser.close();

  } catch (error) {
    console.error('💥 Simple test failed:', error);
    if (browser) await browser.close();
  }
}

testSimple().catch(console.error); 