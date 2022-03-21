const redis = require('redis')

let subscriber = null
if(process.env.REDIS_HOST){
  subscriber = redis.createClient({
    host: process.env.REDIS_HOST
  })

}

exports._getSubscriber = async ({ that }) => {

  if(subscriber) {
    subscriber.on('message', async (topic, message) => {
      let {
        nama,
        from,
        text
      } = JSON.parse(message)
      if(topic === 'sendwa'){
        that.spinner.succeed(`---------------`)
        that.spinner.succeed(`on new send wa request ${nama} ${from}`)
      
        let chat = await that.client.checkNumberStatus(from);
        let profile = await that.client.getNumberProfile(from);

        if(chat && (chat.canReceiveMessage || chat.numberExists)) {
          await that.addContact({ contact: {
            nama,
            from,
            chat,
            profile,
          }})
      
          if(process.env.FORM_LINK) {
            text += `\n\nMohon kesediaannya untuk dapat mengisi form kepuasan pelanggan berikut:\n ${process.env.FORM_LINK}`
          }
          if(process.env.ESO_LINK) {
            text += `\n\nEfek samping dan alergi obat serta pertanyaan/konseling farmasi dapat disampaikan melalui form berikut:\n ${process.env.ESO_LINK}`
          }
          if(process.env.KESSAN_LINK) {
            text += `\n\nPeserta JKN dapat menyampaikan kesan dan pesan melalui form berikut:\n ${process.env.KESSAN_LINK}`
          }
          if(process.env.SCREENING_LINK) {
            text += `\n\nPeserta JKN dapat mengikuti skrining riwayat kesehatan melalui form berikut:\n ${process.env.SCREENING_LINK}`
          }                  // let from = `6287833597999@c.us`

      
          try{
            await that.client.sendText( from, text)
          }catch(e){
            console.error(e)
            console.error(chat)
            console.error(profile)
            console.error('error dari on Simpus Reg')
          }
      
          // await that.client.sendText( from, text)
          that.spinner.succeed(`${that.getTglDaftarHariIni()} send text to: ${from}, isi: ${text.split('\n').join(' ')}`)
        } else {
          that.spinner.succeed(`${that.getTglDaftarHariIni()} ${from} doesn't exists`)
        }
      
      }
    })
  
    subscriber.subscribe('sendwa')
  
  }

  return subscriber
}