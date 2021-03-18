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

    const subscriber = bot.getSubscriber()
    if( subscriber ){
      subscriber.on('message', async (channel, message) => {
        if(channel === 'simpus') {
          let event = (JSON.parse(message)).simpus
          if( event.type === 'INSERT' && event.table === 'visits' ) {
            let tglDaftar = bot.getTglDaftar(event.timestamp)
            if(tglDaftar === bot.getTglDaftarHariIni()){
              try{
                let patient = await bot.getPatient({event})
                if(patient && patient.no_hp && patient.no_hp.match(/^(08)([0-9]){1,12}$/)) {
                  patient.no_hp = `62${patient.no_hp.substr(1)}`
                  let name = patient.nama
                  let text = `Terima kasih atas kunjungan ${name} ke Puskesmas ${process.env.PUSKESMAS}.\n${process.env.FORM_LINK ? `Mohon kesediaannya untuk dapat mengisi form kepuasan pelanggan berikut:\n${process.env.FORM_LINK}\n`: ''} ${process.env.ESO_LINK ? `Efek samping dan alergi obat serta pertanyaan/konseling farmasi dapat disampaikan melalui form berikut:\n ${process.env.ESO_LINK}\n` : ''}`
                  // let from = `6287833597999@c.us`
                  let from = `${patient.no_hp}@c.us`
                  let chat = await client.checkNumberStatus(from);
                  let profile = await client.getNumberProfile(from);

                  bot.spinner.succeed(`---------------`)
                  bot.spinner.succeed(`on new simpus registration`)
                  await bot.addContact({ contact: {
                    from,
                    chat,
                    profile,
                    patient
                  }})

/*
1. cek nomer punya wa tdk
// Check if the number exists
const chat = await client.checkNumberStatus('000000000000@c.us');
// Retrieve a number profile / check if contact is a valid whatsapp number
const profile = await client.getNumberProfile('000000000000@c.us');

2. cek nomer masuk kontak tidak

3. save kontak dulu jika blm masuk
//pake google api
*/
                  if(chat) {
                    await client.sendText( from, text)
                    bot.spinner.succeed(`${tglDaftar} jam ${bot.getJam(event.timestamp)} send text to: ${from}, isi: ${text.split('\n').join(' ')}`)
                  } else {
                    bot.spinner.succeed(`${tglDaftar} jam ${bot.getJam(event.timestamp)} ${from} doesn't exists`)
                  }
                }
              } catch (err) {
                console.error(`${tglDaftar} jam ${bot.getJam(event.timestamp)} send text error: ${JSON.stringify(err)}`)
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
          bot.spinner.succeed(`chat: ${chat.name ? `${chat.name} |` : ''}${newMessage.sender.pushname || newMessage.sender.shortName || newMessage.sender.name || newMessage.sender.id}`)
          bot.spinner.succeed(`isi: ${newMessage.type !== 'chat' ? newMessage.type : bot.processText(newMessage.body || newMessage.content)}`)
          if(newMessage.type === 'chat'){
            await bot.addContact({ msg: newMessage})
            let msg = await bot.handleMessage({message: newMessage})
            if(msg.reply && msg.msg.length){
              console.log(msg)
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
          bot.spinner.succeed(`${msg.time} dari: ${msg.to} isi: ${msg.isi} balas: ${msg.msg}`)
        } else {
          console.log(msg)
        }
      }
    })
  }catch(e){
    console.error(e)
  }
})()