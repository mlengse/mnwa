const Core = require('./core')
const config = require('./config')
const { schedule } = require('node-cron')
const bot = new Core(config)

schedule('30 12 1 * *', async() => {
  try {
    // await bot.scrapeLiburnas()
  }catch(e){
    console.error(`${new Date}, scrapeLiburnas`)
    console.error(e)
  }
})
;(async()=>{
  try{

    const client = await bot.init()

    bot.spinner.start('config things')
    await Promise.all([
      bot.getVillages(),
      bot.getUnits()
    ])
    bot.spinner.succeed('config things')
    
    client.onMessage( async message => {
      bot.spinner.succeed(`${message.type} from: ${message.sender.pushname || message.sender.shortName || message.sender.name || message.sender.id}`)

      if(message.type === 'chat'){
        if(message.id.includes('status@broadcast')){
          bot.spinner.info(`new status from: ${message.sender.pushname || message.sender.shortName || message.sender.name || message.sender.id}: ${bot.processText(message.body || message.content)}`)
        } else {
          bot.spinner.succeed('-----------------')
          let msg = await bot.handleMessage({message})
          bot.spinner.succeed(`new message from: ${message.sender.pushname || message.sender.shortName || message.sender.name || message.sender.id}: ${bot.processText(message.body || message.content)}`)
          if(msg.reply && msg.msg && msg.msg.length){
            process.env.API_KEY && await bot.addContact({ msg: Object.assign({}, msg, message) })
            bot.spinner.succeed(`${msg.time} send to: ${message.sender.pushname || message.sender.shortName || message.sender.name || message.sender.id} balas: ${msg.msg.split('\n').join(' ')}`)
          } else {
            bot.spinner.succeed(`${msg.time} need manual reply`)
          }
        } 
      } else if (message.isMedia === true || message.type !== "chat"){
        bot.spinner.succeed(`${message.type} from: ${message.sender.pushname || message.sender.shortName || message.sender.name || message.sender.id}`)
      } else {
        bot.spinner.fail(`${new Date()} ${JSON.stringify(message)}`)
      }
    })

    const subscriber = await bot.getSubscriber()
    if( subscriber ){
      subscriber.on('message', async (channel, message) => {
        if(channel === 'simpus') {
          let event = (JSON.parse(message)).simpus
          if( event.type === 'INSERT' && event.table === 'visits' ) {
            let timestamp = bot.getTglDaftar(event.timestamp)
            let tglDaftar = bot.getTglDaftar(event.row.tanggal)

            bot.spinner.start(`event.row.tanggal ${event.row.tanggal}`)
            bot.spinner.start(`tglDaftar ${tglDaftar}`)
            bot.spinner.start(`timestamp ${timestamp}`)

            if(tglDaftar === timestamp){
              let chat
              try{
                let patient = await bot.getPatient({event})
                if(patient && patient.no_hp && patient.no_hp.match(/^(08)([0-9]){9,12}$/)) {
                  patient.no_hp = `62${patient.no_hp.substr(1)}`
                  let name = patient.nama
                  let text = `Terima kasih atas kunjungan ${name} ke Puskesmas ${process.env.PUSKESMAS}.`

                  if(process.env.FORM_LINK) {
                    text += `\n\nMohon kesediaannya untuk dapat mengisi link di bawah. \nLink berisi form kepuasan pelanggan, efek samping/alergi obat, pertanyaan/konseling farmasi dan skrining riwayat kesehatan.\n\n${process.env.FORM_LINK}\n\nSemoga selalu sehat, bugar dan produktif.`
                  }

                  let from = `${patient.no_hp}@c.us`
                  bot.spinner.succeed(`on new simpus registration ${from}`)

                  // chat = await bot.page.evaluate(()=>{
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
              

                  chat = await client.checkNumberStatus(from)
                  .then((result) => {
                      bot.spinner.succeed(`checkNumberStatus ${JSON.stringify(result)}`); //return object success
                  }).catch((erro) => {
                      bot.spinner.fail(`checkNumberStatus ${JSON.stringify(erro)}`); //return object error
                  });
  
                  // if(chat && (chat.canReceiveMessage || chat.numberExists)) {
                    try{
                      
                      process.env.API_KEY && await bot.addContact({ contact: {
                        from,
                        chat,
                        patient
                      }})
                      bot.spinner.start(`sendText ${from} ${text}`)
                      await client.sendText( from, text)
                      .then((result) => {
                        bot.spinner.succeed(`${tglDaftar} jam ${bot.getJam(event.timestamp)} send text result ${JSON.stringify(result)}`)
                      })
                      .catch((erro) => {
                        bot.spinner.fail(`${new Date}, error send message ${JSON.stringify(erro.stack)}`); 
                      });
                    }catch (e){
                      bot.spinner.fail(`${tglDaftar} jam ${bot.getJam(event.timestamp)} send text to: ${from}, contact not saved ${JSON.stringify(e.stack)}`)
                    }
                  // } else {
                    // bot.spinner.fail(`${tglDaftar} jam ${bot.getJam(event.timestamp)} ${from} doesn't exists ${JSON.stringify(chat)}`)
                  // }
                } else {
                  bot.spinner.succeed(`!no_hp ${patient.no_hp}`)
                }
              } catch (err) {
                bot.spinner.fail(`subscriber on message ${tglDaftar} jam ${bot.getJam(event.timestamp)} send text error ${JSON.stringify(err.stack)} ${JSON.stringify(chat)}`)
              }
            }
          }
        }
      });
      subscriber.subscribe('simpus');
    }

  }catch(e){
    console.error(`${new Date}, all`)
    console.error(e)
  }
})()