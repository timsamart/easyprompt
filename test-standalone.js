const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox']});
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve('panel-standalone.html'));
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({path: './screenshots/standalone-demo.png', fullPage: true});
  
  const iconCheck = await page.evaluate(() => {
    return {
      featherLoaded: typeof feather !== 'undefined',
      iconElementsCount: document.querySelectorAll('[data-feather]').length,
      svgElementsCount: document.querySelectorAll('svg').length,
      cardCount: document.querySelectorAll('.card').length,
      promptCards: document.querySelectorAll('.prompt-card').length,
      chainCards: document.querySelectorAll('.chain-card').length,
      demoLoaded: document.body.textContent.includes('PromptHub Demo loaded')
    };
  });
  
  console.log('STANDALONE TEST RESULTS:');
  console.log('========================');
  console.log('✅ Feather loaded:', iconCheck.featherLoaded);
  console.log('🎨 Icon elements:', iconCheck.iconElementsCount);
  console.log('🖼️ SVG elements:', iconCheck.svgElementsCount);
  console.log('📱 Total cards:', iconCheck.cardCount);
  console.log('📝 Prompt cards:', iconCheck.promptCards);
  console.log('⛓️ Chain cards:', iconCheck.chainCards);
  console.log('🚀 Demo loaded:', iconCheck.demoLoaded);
  
  if (iconCheck.cardCount > 0 && iconCheck.svgElementsCount > 0) {
    console.log('\n🎉 SUCCESS! Interface is working properly!');
  } else {
    console.log('\n❌ Something is still not working correctly.');
  }
  
  await browser.close();
})(); 