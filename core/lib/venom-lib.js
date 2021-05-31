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