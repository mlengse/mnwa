require("fix-esm").register();

const wa = require('venom-bot');
const fs = require('fs')
const TOKEN_DIR = "./tokens";
const TOKEN_PATH = TOKEN_DIR + "/wa-session.data.json";

exports._init = async ({ that }) => {

  console.log('mulai')

  that.client = await wa.create(
  process.env.PUSKESMAS.toLowerCase(),
  undefined,
  (statusSession, session) => {
    that.spinner.succeed(`${statusSession ? `${statusSession}`:'noStatus'} ${session ? `${session}`: 'noSession'}`);
  },
  {
    multidevice: true,
    headless: 'new',
    puppeteerOptions: {
      ignoreDefaultArgs: ['--disable-extensions']
    },
    // folderNameToken: 'tokens',
    // mkdirFolderToken: './',
    // createPathFileToken: true,
    // headless: 'new',
    disableWelcome: true,
    disableSpins: true,
    // updatesLog: true,
    // useChrome: true,
  },
  (browser, waPage) => {
    if(browser.process && browser.process() && browser.process().pid){
      that.spinner.succeed('Browser PID:', browser.process().pid);
    }
    that.waPage = waPage
    // waPage.evaluate( () => { 
    //   window.Store.checkNumber.queryExist = function(e) { 
    //     if (e.endsWith('@c.us')) { 
    //       const spl = e.split('@'); 
    //       const server = spl[1]; 
    //       const user = spl[0]; 
    //       return { 
    //         status: 200, 
    //         jid: { 
    //           server: server, 
    //           user: user, 
    //           _serialized: e 
    //         } 
    //       } 
    //     } 
    //   } 
    // });
  })

  
  
  that.client.onStateChange((state) => {
    that.spinner.succeed(`State changed: ${state}`);
    if ('CONFLICT'.includes(state)) {
      that.client.useHere();
    }
    if ('UNPAIRED'.includes(state)) {
      that.spinner.succeed('logout');
    }
  });

  let time = 0;
  that.client.onStreamChange((state) => {
    that.spinner.succeed(`State Connection Stream: ${state}`);
    clearTimeout(time);
    if (state === 'DISCONNECTED' || state === 'SYNCING') {
      time = setTimeout(async () => {
        that.client.close();
        await that.init()
      }, 80000);
    }
  });

  return that.client
}
