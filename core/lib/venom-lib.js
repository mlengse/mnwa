const wa = require('venom-bot');

exports._init = async ({ that }) => {
  that.spinner.start('config things')
  await Promise.all([
    that.getVillages(),
    that.getUnits()
  ])
  that.spinner.succeed()
  // that.spinner.start('Initializing whatsapp');

  that.client = await wa.create()
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
    console.log('State changed: ', state);
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
      time = setTimeout(() => {
        that.client.close();
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

  return that.client
}