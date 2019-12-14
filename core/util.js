const path = require('path')
const qrcode = require('qrcode-terminal')
const { from, merge } = require('rxjs')
const { take } = require('rxjs/operators')
const Logic = require('./logic')
const { Whatsapp } = require('./api/whatsapp')

module.exports = class Util extends Logic {
  constructor(config){
    super(config)
    this.qrcode = qrcode
    this.from = from
    this.merge = merge
    this.take = take
  }

  async close(){
    await this.browser.close()
  }

  isAuthenticated() {
    return this.merge(this.needsToScan(), this.isInsideChat())
      .pipe(this.take(1))
      .toPromise();
  };
  
  needsToScan() {
    return this.from(
      this.page
        .waitForSelector('body > div > div > .landing-wrapper', {
          timeout: 0
        })
        .then(() => false)
    );
  };
  
  isInsideChat() {
    return this.from(
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
    this.spinner.start('Loading QR');
    await this.page.waitFor(5000)
    await this.page.screenshot({path: 'buddy-screenshot.png'});
    await this.page.waitForSelector("img[alt='Scan me!']", { timeout: 0 });
    const qrImage = await this.page.evaluate(
      `document.querySelector("img[alt='Scan me!']").parentElement.getAttribute("data-ref")`
    );
    this.spinner.succeed();
    this.qrcode.generate(qrImage, {
      small: true
    });
  
    return true;
  }

  async getUnreadMessagesInChat(unread){
    this.spinner.start(`get unread messages in chat`);

    let messages = []

    while(!messages || !messages.length || messages.length < unread.unreadCount) {
      messages = await this.page.evaluate( id => {
        return WAPI.getAllMessagesInChat(id)
      }, unread.id)
    }

    while( messages.length > unread.unreadCount){
      messages.shift()
    }

    this.spinner.succeed()

    return messages

  }

  async init(){
    this.spinner.start('config things')
    await Promise.all([
      this.getVillages(),
      this.getUnits()
    ])
    this.spinner.succeed()
    this.spinner.start('Initializing whatsapp');

    this.browser = await this.pptr.launch(this.config.pptrOpt);
    this.pages = await this.browser.pages()
    this.page = this.pages[0]

    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');

    await this.page.setRequestInterception(true);
    
    this.page.on('request', (request) => {
      request.continue();
    });
  
    await this.page.goto('https://web.whatsapp.com', this.config.waitOpt)
  
    this.spinner.succeed();

    this.spinner.start('Authenticating');

    const authenticated = await this.isAuthenticated();
  
    // If not authenticated, show QR and wait for scan
    if (authenticated) {
      this.spinner.succeed();
    } else {
      this.spinner.info('Authenticate to continue');
      await this.retrieveQR();
  
      // Wait til inside chat
      await this.isInsideChat().toPromise();
      this.spinner.succeed();
    }
  
    this.spinner.start('Injecting api');
    
    await this.page.addScriptTag({
      path: require.resolve(path.join(__dirname, './lib', 'wapi.js'))
    });
    await this.page.addScriptTag({
      path: require.resolve(path.join(__dirname, './lib', 'middleware.js'))
    });
  
    
    this.spinner.succeed();
  
    this.spinner.succeed('Whatsapp is ready');
  
    this.client = new Whatsapp(this.page);

    return this.client
  }

}