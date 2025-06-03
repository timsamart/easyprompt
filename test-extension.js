const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testExtension() {
  let browser;
  
  try {
    console.log('🚀 Starting browser (headless mode for WSL)...');
    browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode for better compatibility
      defaultViewport: {
        width: 1200,
        height: 800
      },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Listen for console messages and errors
    const consoleLogs = [];
    const errors = [];
    
    page.on('console', msg => {
      const logEntry = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(logEntry);
      console.log('📄 Console:', logEntry);
    });
    
    page.on('pageerror', error => {
      const errorMsg = error.toString();
      errors.push(errorMsg);
      console.error('❌ Page Error:', errorMsg);
    });

    // Track failed requests
    const failedRequests = [];
    page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        failure: request.failure()?.errorText || 'Unknown error'
      });
    });

    // Create screenshots directory
    const screenshotsDir = './screenshots';
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }

    console.log('📁 Loading panel.html...');
    const panelPath = path.resolve(__dirname, 'panel.html');
    await page.goto(`file://${panelPath}`, { waitUntil: 'networkidle0' });

    // Wait for page to load
    await delay(3000);

    console.log('📸 Taking initial screenshot...');
    await page.screenshot({
      path: './screenshots/01-initial-load.png',
      fullPage: true
    });

    // Check if Feather icons loaded
    console.log('🔍 Checking Feather icons...');
    const featherLoaded = await page.evaluate(() => {
      return typeof feather !== 'undefined';
    });
    console.log('📦 Feather library loaded:', featherLoaded);

    // Force initialize Feather icons if loaded
    if (featherLoaded) {
      console.log('🎨 Initializing Feather icons...');
      await page.evaluate(() => {
        if (typeof feather !== 'undefined') {
          feather.replace();
        }
      });
      await delay(1000);
    }

    // Check for Feather icon elements
    const iconElements = await page.$$eval('[data-feather]', elements => {
      return elements.map(el => ({
        tag: el.tagName,
        icon: el.getAttribute('data-feather'),
        hasContent: el.innerHTML.trim().length > 0,
        visible: el.offsetParent !== null,
        computedDisplay: window.getComputedStyle(el).display
      }));
    });
    
    console.log('🎨 Found icon elements:', iconElements.length);
    iconElements.forEach((icon, i) => {
      console.log(`   ${i+1}. ${icon.tag} [data-feather="${icon.icon}"] - Content: ${icon.hasContent}, Visible: ${icon.visible}, Display: ${icon.computedDisplay}`);
    });

    // Mock Chrome APIs and add sample data
    console.log('💾 Mocking Chrome APIs and adding sample data...');
    await page.evaluate(() => {
      // Mock chrome.storage for testing
      window.chrome = {
        storage: {
          local: {
            get: (keys, callback) => {
              const data = {
                prompts: [
                  {
                    id: 'test-1',
                    title: 'Sample Prompt 1',
                    content: 'This is a test prompt content that demonstrates how the card layout works with proper text wrapping and truncation.'
                  },
                  {
                    id: 'test-2', 
                    title: 'Sample Prompt 2',
                    content: 'Another test prompt with some longer content to see how the description truncation works in the card view. This should demonstrate the layout.'
                  },
                  {
                    id: 'test-3',
                    title: 'Long Title Test Prompt',
                    content: 'A third prompt to test the grid layout with multiple cards.'
                  }
                ],
                chains: [
                  {
                    id: 'chain-1',
                    title: 'Test Chain',
                    steps: ['test-1', 'test-2']
                  },
                  {
                    id: 'chain-2',
                    title: 'Multi-Step Chain Example',
                    steps: ['test-1', 'test-2', 'test-3']
                  }
                ]
              };
              if (typeof callback === 'function') {
                setTimeout(() => callback(data), 100);
              }
              return Promise.resolve(data);
            },
            set: (data, callback) => {
              if (callback) callback();
              return Promise.resolve();
            }
          }
        },
        tabs: {
          query: () => Promise.resolve([{id: 1}]),
          sendMessage: () => Promise.resolve({success: true})
        }
      };

      // Mock Storage class methods
      if (window.Storage) {
        window.Storage.getPrompts = () => Promise.resolve([
          {
            id: 'test-1',
            title: 'Sample Prompt 1',
            content: 'This is a test prompt content that demonstrates how the card layout works with proper text wrapping and truncation.'
          },
          {
            id: 'test-2', 
            title: 'Sample Prompt 2',
            content: 'Another test prompt with some longer content to see how the description truncation works in the card view. This should demonstrate the layout.'
          },
          {
            id: 'test-3',
            title: 'Long Title Test Prompt',
            content: 'A third prompt to test the grid layout with multiple cards.'
          }
        ]);

        window.Storage.getChains = () => Promise.resolve([
          {
            id: 'chain-1',
            title: 'Test Chain',
            steps: ['test-1', 'test-2']
          },
          {
            id: 'chain-2',
            title: 'Multi-Step Chain Example',
            steps: ['test-1', 'test-2', 'test-3']
          }
        ]);
      }
    });

    await delay(2000);
    
    console.log('📸 Taking screenshot with sample data...');
    await page.screenshot({
      path: './screenshots/02-with-sample-data.png',
      fullPage: true
    });

    // Test clicking add prompt button
    console.log('🖱️ Testing Add Prompt button...');
    try {
      const addPromptBtn = await page.$('#add-prompt-btn');
      if (addPromptBtn) {
        await addPromptBtn.click();
        await delay(500);
        
        await page.screenshot({
          path: './screenshots/03-add-prompt-dialog.png',
          fullPage: true
        });

        // Close dialog
        const closeBtn = await page.$('.close-btn');
        if (closeBtn) {
          await closeBtn.click();
          await delay(500);
        }
      }
    } catch (e) {
      console.log('⚠️ Could not test Add Prompt button:', e.message);
    }

    // Test search functionality
    console.log('🔍 Testing search...');
    try {
      const searchInput = await page.$('#search-input');
      if (searchInput) {
        await searchInput.type('sample');
        await delay(1000); // Wait for debounced search
        
        await page.screenshot({
          path: './screenshots/04-search-results.png',
          fullPage: true
        });
        
        // Clear search
        await searchInput.click({ clickCount: 3 });
        await searchInput.press('Backspace');
        await delay(500);
      }
    } catch (e) {
      console.log('⚠️ Could not test search:', e.message);
    }

    // Check CSS styles and layout
    console.log('🎨 Checking CSS and layout...');
    const layoutInfo = await page.evaluate(() => {
      const container = document.querySelector('.cards-grid');
      const cards = document.querySelectorAll('.card');
      const header = document.querySelector('header');
      const searchContainer = document.querySelector('#search-container');
      
      return {
        containerExists: !!container,
        cardCount: cards.length,
        headerHeight: header ? header.offsetHeight : 0,
        containerDisplay: container ? window.getComputedStyle(container).display : 'none',
        gridColumns: container ? window.getComputedStyle(container).gridTemplateColumns : 'none',
        searchExists: !!searchContainer,
        bodyBackgroundColor: window.getComputedStyle(document.body).backgroundColor,
        headerBackgroundColor: header ? window.getComputedStyle(header).background : 'none'
      };
    });
    
    console.log('📐 Layout info:', layoutInfo);

    // Test responsive behavior
    console.log('📱 Testing responsive design...');
    await page.setViewport({ width: 480, height: 800 });
    await delay(500);
    
    await page.screenshot({
      path: './screenshots/05-mobile-view.png',
      fullPage: true
    });

    // Back to desktop view
    await page.setViewport({ width: 1200, height: 800 });
    await delay(500);

    console.log('📸 Taking final screenshot...');
    await page.screenshot({
      path: './screenshots/06-final-state.png',
      fullPage: true
    });

    // Test icon rendering in detail
    const iconRenderingInfo = await page.evaluate(() => {
      const icons = Array.from(document.querySelectorAll('[data-feather]'));
      return icons.map(icon => {
        const rect = icon.getBoundingClientRect();
        const styles = window.getComputedStyle(icon);
        return {
          icon: icon.getAttribute('data-feather'),
          innerHTML: icon.innerHTML,
          width: rect.width,
          height: rect.height,
          color: styles.color,
          fontSize: styles.fontSize,
          display: styles.display,
          visibility: styles.visibility
        };
      });
    });

    console.log('🎨 Icon rendering details:');
    iconRenderingInfo.forEach((icon, i) => {
      console.log(`   ${i+1}. ${icon.icon}: ${icon.width}x${icon.height}px, innerHTML: "${icon.innerHTML.substring(0,50)}${icon.innerHTML.length > 50 ? '...' : ''}"`);
    });

    // Generate comprehensive test report
    const report = {
      timestamp: new Date().toISOString(),
      environment: 'WSL',
      featherLoaded,
      iconElementsFound: iconElements.length,
      iconElements,
      iconRenderingInfo,
      layoutInfo,
      consoleLogs,
      errors,
      failedRequests
    };

    fs.writeFileSync('./screenshots/test-report.json', JSON.stringify(report, null, 2));

    // Generate summary report
    const summary = {
      timestamp: new Date().toISOString(),
      status: errors.length === 0 ? 'SUCCESS' : 'PARTIAL',
      featherLibraryLoaded: featherLoaded,
      iconsFound: iconElements.length,
      cardsDisplayed: layoutInfo.cardCount,
      layoutWorking: layoutInfo.containerExists && layoutInfo.containerDisplay === 'grid',
      errorsCount: errors.length,
      failedRequestsCount: failedRequests.length,
      screenshots: [
        '01-initial-load.png',
        '02-with-sample-data.png',
        '03-add-prompt-dialog.png',
        '04-search-results.png',
        '05-mobile-view.png',
        '06-final-state.png'
      ]
    };

    fs.writeFileSync('./screenshots/summary.json', JSON.stringify(summary, null, 2));

    console.log('\n📋 Test Summary:');
    console.log('================');
    console.log(`✅ Feather library loaded: ${featherLoaded}`);
    console.log(`🎨 Icon elements found: ${iconElements.length}`);
    console.log(`📦 Cards container exists: ${layoutInfo.containerExists}`);
    console.log(`📱 Cards displayed: ${layoutInfo.cardCount}`);
    console.log(`🎯 Grid layout working: ${layoutInfo.containerDisplay === 'grid'}`);
    console.log(`❌ JavaScript errors: ${errors.length}`);
    console.log(`🚫 Failed requests: ${failedRequests.length}`);
    console.log('\n📁 Screenshots saved to ./screenshots/');
    console.log('📄 Full report saved to ./screenshots/test-report.json');
    console.log('📄 Summary saved to ./screenshots/summary.json');

    if (errors.length > 0) {
      console.log('\n❌ Errors found:');
      errors.forEach((error, i) => console.log(`   ${i+1}. ${error}`));
    }

    if (failedRequests.length > 0) {
      console.log('\n🚫 Failed requests:');
      failedRequests.forEach((req, i) => console.log(`   ${i+1}. ${req.url} - ${req.failure}`));
    }

    console.log('\n✅ Test completed successfully!');
    await browser.close();

  } catch (error) {
    console.error('💥 Test failed:', error);
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testExtension().catch(console.error); 