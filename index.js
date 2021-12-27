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
                      console.error(`${tglDaftar} jam ${bot.getJam(event.timestamp)} send text error: ${JSON.stringify(e)}`)
                      chat && console.error(chat)
                      // console.error(e)
                      // console.error(chat)
                      // console.error(profile)
                    }
                  } else {
                    bot.spinner.succeed(`${tglDaftar} jam ${bot.getJam(event.timestamp)} ${from} doesn't exists ${JSON.stringify(chat)}`)
                  }
                }
              } catch (err) {
                console.error(`${tglDaftar} jam ${bot.getJam(event.timestamp)} send text error: ${JSON.stringify(err)}`)
                chat && console.error(chat)
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
          bot.spinner.succeed('--------------')
          bot.spinner.succeed('chat with new message')
          bot.spinner.succeed(`chat: ${chat.name ? `${chat.name} |` : ''}${JSON.stringify(newMessage.sender)}`)
          bot.spinner.succeed(`isi: ${newMessage.type !== 'chat' ? newMessage.type : bot.processText(newMessage.body || newMessage.content)}`)
          if(newMessage.type === 'chat'){
            await bot.addContact({ msg: newMessage})
            let msg = await bot.handleMessage({message: newMessage})
            if(msg.reply && msg.msg.length){
              bot.spinner.succeed(`${msg.time} dari: ${msg.to.user} isi: ${msg.isi} balas: ${msg.msg.split('\n').join(' ')}`)
            } else {
              console.error(`${new Date()} ${JSON.stringify(msg)}`)
            }
      
          }
        }
      }
  
    }

    client.onMessage( async message => {
      if(message.type === 'chat'){
        bot.spinner.succeed('-----------------')
        bot.spinner.succeed(`on new message | name: ${message.sender.pushname || message.sender.shortName || message.sender.name || message.sender.id}`)
        bot.spinner.succeed(`content: ${bot.processText(message.body || message.content)}`)
        await bot.addContact({ msg: message})
        let msg = await bot.handleMessage({message})
        if(msg.reply && msg.msg.length){
          bot.spinner.succeed(`${msg.time} dari: ${msg.to} isi: ${msg.isi} balas: ${msg.msg.split('\n').join(' ')}`)
        } else {
          console.error(`${new Date()} ${JSON.stringify(msg)}`)
        }
      }
    })
  }catch(e){
    console.error(e)
  }
})()