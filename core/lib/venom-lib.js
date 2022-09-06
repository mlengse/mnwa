const wa = require('venom-bot');
const fs = require('fs')
const TOKEN_DIR = "./tokens";
const TOKEN_PATH = TOKEN_DIR + "/wa-session.data.json";

exports._init = async ({ that }) => {
  // let browserSessionToken = null
  // if (fs.existsSync(TOKEN_PATH)) {
  //   const savedTokenString = fs.readFileSync(TOKEN_PATH).toString();
  //   browserSessionToken = JSON.parse(savedTokenString);

  // }

  // that.spinner.start('Initializing whatsapp');

  that.client = await wa.create(
  process.env.PUSKESMAS.toLowerCase(),
  undefined,
  (statusSession, session) => {
    that.spinner.succeed(`Status Session: ${statusSession}`); //return isLogged || notLogged || browserClose || qrReadSuccess || qrReadFail || autocloseCalled || desconnectedMobile || deleteToken || chatsAvailable || deviceNotConnected || serverWssNotConnected || noOpenBrowser
    //Create session wss return "serverClose" case server for close
    session ? that.spinner.succeed(`Session name: ${session}`) : '';
  },
  {
    multidevice: true,
    // folderNameToken: 'tokens',
    // mkdirFolderToken: './',
    // createPathFileToken: true,
    disableWelcome: true,
    disableSpins: true,
    // headless: false,
    updatesLog: true,
    // useChrome: true,
  },
  // browserSessionToken,
  undefined
  // (browser, waPage) => {
  //   console.log('Browser PID:', browser.process().pid);
  //   waPage.screenshot({ path: 'screenshot.png' });
  // }
  )

  // that.spinner.succeed('dapet client')

  // let token = await that.client.getSessionTokenBrowser();

  // that.spinner.succeed('dapet token')

  // await fs.promises.mkdir(TOKEN_DIR, { recursive: true });
  // await fs.promises.writeFile(TOKEN_PATH, JSON.stringify(token));

  // return client;
  // function to detect conflits and change status
  // Force it to keep the current session
  // Possible state values:
  // CONFLICT
  // CONNECTED
  // DEPRECATED_VERSION
  // OPENING
  // PAIRING
  // PROXYBLOCK
  // SMB_TOS_BLOCK
  // TIMEOUT
  // TOS_BLOCK
  // UNLAUNCHED
  // UNPAIRED
  // UNPAIRED_IDLE
  that.client.onStateChange((state) => {
    // if(!state.includes('TIMEOUT') && !state.includes('CONNECTED')) {
      console.log('State changed: ', state);
    // }
    // force whatsapp take over
    if ('CONFLICT'.includes(state)) that.client.useHere();
    // detect disconnect on whatsapp
    if ('UNPAIRED'.includes(state)) console.log('logout');
  });

  // DISCONNECTED
  // SYNCING
  // RESUMING
  // CONNECTED
  let time = 0;
  that.client.onStreamChange((state) => {
    console.log('State Connection Stream: ' + state);
    clearTimeout(time);
    if (state === 'DISCONNECTED' || state === 'SYNCING') {
      time = setTimeout(async () => {
        that.client.close();
        await that.init()
      }, 80000);
    }
  });

  // function to detect incoming call
  that.client.onIncomingCall(async (call) => {
    console.log(call);
    that.client.sendText(call.peerJid, "Mohon maaf, tidak bisa menjawab telpon");
  });

  // jare nggo ngatasi Error: Evaluation failed: TypeError: Cannot read property 'filter' of undefined

  // client.onStreamChange((state) => {
  //   console.log('Connection status: ', state);
  //   clearTimeout(time);
  //   if(state === 'CONNECTED'){
  //    start(client);
  //   }
  //  //  DISCONNECTED when the mobile device is disconnected
  //   if (state === 'DISCONNECTED' || state === 'SYNCING') {
  //     time = setTimeout(() => {
  //       client.close();
  //      // process.exit(); //optional function if you work with only one session
  //     }, 80000);
  //   }
  // })


  that.spinner.succeed()

  return that.client
}