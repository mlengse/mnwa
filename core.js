const pptr = require('puppeteer-core')
const ora = require('ora');
const qrcode = require('qrcode-terminal')
const { from, merge } = require('rxjs')
const { take } = require('rxjs/operators')
const path = require('path')
const { Whatsapp } = require('./api/whatsapp')
const spinner = ora({
  stream: process.stdout
});

module.exports = class Core {
  constructor(config){
    this.config = config
  }

  async close(){
    await this.browser.close()
  }

  async init(){
    spinner.start('Initializing whatsapp');

    this.browser = await pptr.launch(this.config.pptrOpt);
    this.pages = await this.browser.pages()
    this.page = this.pages[0]

    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');

    await this.page.setRequestInterception(true);
    
    this.page.on('request', (request) => {
      request.continue();
    });
  
    await this.page.goto('https://web.whatsapp.com')
  
    spinner.succeed();

    spinner.start('Authenticating');

    const authenticated = await this.isAuthenticated();
  
    // If not authenticated, show QR and wait for scan
    if (authenticated) {
      spinner.succeed();
    } else {
      spinner.info('Authenticate to continue');
      await this.retrieveQR();
  
      // Wait til inside chat
      await this.isInsideChat().toPromise();
      spinner.succeed();
    }
  
    spinner.start('Injecting api');
    
    await this.page.addScriptTag({
      path: require.resolve(path.join(__dirname, './lib', 'wapi.js'))
    });
    await this.page.addScriptTag({
      path: require.resolve(path.join(__dirname, './lib', 'middleware.js'))
    });
  
    
    spinner.succeed();
  
    spinner.succeed('Whatsapp is ready');
  
    this.client = new Whatsapp(this.page);

    return this.client
  }

  isAuthenticated() {
    return merge(this.needsToScan(), this.isInsideChat())
      .pipe(take(1))
      .toPromise();
  };
  
  needsToScan() {
    return from(
      this.page
        .waitForSelector('body > div > div > .landing-wrapper', {
          timeout: 0
        })
        .then(() => false)
    );
  };
  
  isInsideChat() {
    return from(
      this.page
        .waitForFunction(
          `
          document.getElementsByClassName('app')[0] &&
          document.getElementsByClassName('app')[0].attributes &&
          !!document.getElementsByClassName('app')[0].attributes.tabindex
          `,
          {
            timeout: 0
          }
        )
        .then(() => true)
    );
  };
  
  async retrieveQR() {
    spinner.start('Loading QR');
    await this.page.waitFor(5000)
    await this.page.screenshot({path: 'buddy-screenshot.png'});
    await this.page.waitForSelector("img[alt='Scan me!']", { timeout: 0 });
    const qrImage = await this.page.evaluate(
      `document.querySelector("img[alt='Scan me!']").parentElement.getAttribute("data-ref")`
    );
    spinner.succeed();
    qrcode.generate(qrImage, {
      small: true
    });
  
    return true;
  }

}