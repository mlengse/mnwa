const Core = require('./core')
const config = require('./config')
const { schedule } = require('node-cron')
const bot = new Core(config)

schedule('30 12 1 * *', async() => {
  try {
    await bot.scrapeLiburnas()
  }catch(e){
    console.error(e)
  }
})

;(async()=>{
  try{

    const client = await bot.init()

    const subscriber = await bot.getSubscriber()
    if( subscriber ){
      subscriber.on('message', async (channel, message) => {
        if(channel === 'simpus') {
          let event = (JSON.parse(message)).simpus
          if( event.type === 'INSERT' && event.table === 'visits' ) {
            let tglDaftar = bot.getTglDaftar(event.timestamp)
            if(tglDaftar === bot.getTglDaftarHariIni()){
              let chat
              try{
                let patient = await bot.getPatient({event})
                if(patient && patient.no_hp && patient.no_hp.match(/^(08)([0-9]){1,12}$/)) {
                  patient.no_hp = `62${patient.no_hp.substr(1)}`
                  let name = patient.nama
                  let text = `Terima kasih atas kunjungan ${name} ke Puskesmas ${process.env.PUSKESMAS}.`
                  if(process.env.FORM_LINK) {
                    text += `\n\nMohon kesediaannya untuk dapat mengisi form kepuasan pelanggan berikut:\n ${process.env.FORM_LINK}`
                  }
                  if(process.env.ESO_LINK) {
                    text += `\n\nEfek samping dan alergi obat serta pertanyaan/konseling farmasi dapat disampaikan melalui form berikut:\n ${process.env.ESO_LINK}`
                  }
                  if(process.env.KESSAN_LINK) {
                    text += `\n\nPeserta JKN dapat menyampaikan kesan dan pesan melalui form berikut:\n ${process.env.KESSAN_LINK}`
                  }                  // let from = `6287833597999@c.us`
                  let from = `${patient.no_hp}@c.us`
                  chat = await client.checkNumberStatus(from);
                  let profile = await client.getNumberProfile(from);

                  bot.spinner.succeed(`---------------`)
                  bot.spinner.succeed(`on new simpus registration`)
                  if(chat && (chat.canReceiveMessage || chat.numberExists)) {
                    try{
                      await bot.addContact({ contact: {
                        from,
                        chat,
                        profile,
                        patient
                      }})
                    }catch (e){
                      bot.spinner.fail(`${tglDaftar} jam ${bot.getJam(event.timestamp)} send text to: ${from}, contact not saved`)
                    }

                    try{
                      await client.sendText( from, text)
                      bot.spinner.succeed(`${tglDaftar} jam ${bot.getJam(event.timestamp)} send text to: ${from}, isi: ${text.split('\n').join(' ')}`)
                    }catch(e){
                      chat && console.error(chat) && console.error(`${tglDaftar} jam ${bot.getJam(event.timestamp)} send text error: ${JSON.stringify(e)}`)
                    }
                  } else {
                    bot.spinner.succeed(`${tglDaftar} jam ${bot.getJam(event.timestamp)} ${from} doesn't exists ${JSON.stringify(chat)}`)
                  }
                }
              } catch (err) {
                chat && console.error(chat) && console.error(`${tglDaftar} jam ${bot.getJam(event.timestamp)} send text error: ${JSON.stringify(err)}`)
              }
            }
          }
        }
      });
      subscriber.subscribe('simpus');
    }

		let chatWithNewMsg = await client.getAllChatsNewMsg()
    if(chatWithNewMsg.length) {
      for(let chat of chatWithNewMsg){
        let messages = await client.getAllMessagesInChat(chat.id._serialized);
        while(messages.length < chat.unreadCount){
          messages = [ ...messages, ...(await client.loadEarlierMessages(chat.id._serialized))]
        }
        while(messages.length > chat.unreadCount){
          messages.shift()
        }
        for(let newMessage of messages) {
          if(newMessage.type === 'chat'){
            let msg = await bot.handleMessage({message: newMessage})
            bot.spinner.succeed('--------------')
            bot.spinner.succeed(`unread message from: ${newMessage.sender.pushname || newMessage.sender.shortName || newMessage.sender.name || newMessage.sender.displayName || newMessage.sender.formattedName || newMessage.sender.id}`)
            bot.spinner.succeed(`content: ${bot.processText(newMessage.body || newMessage.content)}`)
            if(msg.reply && msg.msg && msg.msg.length){
              await bot.addContact({ msg })
              bot.spinner.succeed(`${msg.time} send to: ${msg.to.user} balas: ${msg.msg.split('\n').join(' ')}`)
            } else {
              console.error(`${new Date()} need manual reply`)
              // console.error(`${new Date()} ${JSON.stringify(msg)}`)
            }
          } else if (newMessage.type === "e2e_notification" || newMessage.isMedia === true){
            bot.spinner.succeed(`${newMessage.type} from: ${newMessage.sender.pushname || newMessage.sender.shortName || newMessage.sender.name || newMessage.sender.displayName || newMessage.sender.formattedName || newMessage.sender.id}`)
          } else {
            console.error(`${new Date()} ${JSON.stringify(newMessage)}`)
          }
        }
      }
    }

    client.onMessage( async message => {
      bot.spinner.succeed('-----------------')
      if(message.type === 'chat'){
        if(message.id.includes('status@broadcast')){
          bot.spinner.info(`new status from: ${message.sender.pushname || message.sender.shortName || message.sender.name || message.sender.id}: ${bot.processText(message.body || message.content)}`)
        } else {
          let msg = await bot.handleMessage({message})
          bot.spinner.succeed(`new message from: ${message.sender.pushname || message.sender.shortName || message.sender.name || message.sender.id}`)
          bot.spinner.succeed(`content: ${bot.processText(message.body || message.content)}`)
          if(msg.reply && msg.msg && msg.msg.length){
            await bot.addContact({ msg })
            bot.spinner.succeed(`${msg.time} send to: ${msg.to.user} balas: ${msg.msg.split('\n').join(' ')}`)
          } else {
            console.error(`${new Date()} need manual reply`)
            // console.error(`${new Date()} ${JSON.stringify(msg)}`)
          }
        } 
      } else if (message.isMedia === true || message.type === "e2e_notification"){
        bot.spinner.succeed(`${message.type} from: ${message.sender.pushname || message.sender.shortName || message.sender.name || message.sender.id}`)
      } else {
        console.error(`${new Date()} ${JSON.stringify(message)}`)
      }
    })
  }catch(e){
    console.error(e)
  }
})()