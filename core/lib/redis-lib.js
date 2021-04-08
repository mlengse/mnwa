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
        that.spinner.succeed(`on new send wa request`)
      
        chat = await that.client.checkNumberStatus(from);
        let profile = await that.client.getNumberProfile(from);
      
        if(chat && chat.canReceiveMessage) {
          await that.addContact({ contact: {
            nama,
            from,
            chat,
            profile,
          }})
      
          text = `${text}\n${process.env.FORM_LINK ? `Mohon kesediaannya untuk dapat mengisi form kepuasan pelanggan berikut:\n${process.env.FORM_LINK}\n`: ''} ${process.env.ESO_LINK ? `Efek samping dan alergi obat serta pertanyaan/konseling farmasi dapat disampaikan melalui form berikut:\n ${process.env.ESO_LINK}\n` : ''}`
      
          await that.client.sendText( from, text)
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