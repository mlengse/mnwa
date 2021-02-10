const Core = require('./core')
const config = require('./config')
const { schedule } = require('node-cron')
const wa = new Core(config)


const redis = require('redis')
const moment = require('moment')
const getPatient = require('./getPatient')
moment.locale('id')
let subscriber = null
if(process.env.REDIS_HOST){
  subscriber = redis.createClient({
    host: process.env.REDIS_HOST
  })
}

schedule('30 12 1 * *', async() => {
  try {
    await wa.scrapeLiburnas()
  }catch(e){
    console.error(e)
  }
})

;(async()=>{
  try{

    const client = await wa.init()

		client.onMessage( async message => {
      // console.log(message)
      let msg = await wa.handleMessage(message)
      console.log(msg)
    })

    if( subscriber ){
      subscriber.on('message', async (channel, message) => {
        if(channel === 'simpus') {
          let event = (JSON.parse(message)).simpus
    
            if( event.type === 'INSERT' && event.table === 'visits' ) {
        
              let tglDaftar = moment(event.timestamp, 'x').format('DD-MM-YYYY')
        
              if(tglDaftar === moment().format('DD-MM-YYYY')){//} && jam >= 8 ) {
        
                try{
                  // console.log(event)
                  let patient = await getPatient(event)
        
                  if(patient && patient.no_hp && patient.no_hp.match(/^(08)([0-9]){1,12}$/)) {
        
                    //send wa here
                    patient.no_hp = `62${patient.no_hp.substr(1)}`
        
                    let name = patient.nama
                    // console.log(`data pasien: ${JSON.stringify(patient)}`)
        
                    let text = `Terima kasih atas kunjungan ${name} ke Puskesmas ${process.env.PUSKESMAS}.\n${process.env.FORM_LINK ? `Mohon kesediaannya untuk dapat mengisi form kepuasan pelanggan berikut:\n${process.env.FORM_LINK}\n`: ''} ${process.env.ESO_LINK ? `Efek samping dan alergi obat serta pertanyaan/konseling farmasi dapat disampaikan melalui form berikut:\n ${process.env.ESO_LINK}\n` : ''}`
        
                    let from = `${patient.no_hp}@c.us`
        
                    await client.sendText( from, text)

                    console.log(`${tglDaftar} jam ${moment(event.timestamp, 'x').format('H')} send text to: ${from}, isi: ${text.split('\n').join(' ')}`)
                  }
        
                } catch (err) {
                  console.error(`${tglDaftar} jam ${moment(event.timestamp, 'x').format('H')} send text error: ${err}`)
                }
        
              }
        
            }
        
            // console.log(`channel: ${channel}, message: ${message}`);
        
        }
      });
    
      subscriber.subscribe('simpus');
    }

		let unreads = await client.getAllChats(true)

    for(let unread of unreads) if(!unread.isGroup) {

      let messages = await wa.getUnreadMessagesInChat(unread)
      
      let unreadCount = messages[0].chat.unreadCount

      while(messages.length > unreadCount) {
        messages.shift()
      }

    	for(let message of messages) {
        if(message && message.chat && message.chat.unreadCount) {
          // console.log(message.sender.pushname || message.sender.shortName || message.sender.name || message.sender.id)
          // console.log(message.body)
          // console.log(message.chat.unreadCount)
          let msg = await wa.handleMessage(message)
          // console.log(JSON.stringify(msg))
        }
      }
    	
    }



  }catch(e){
    console.error(e)
  }
})()