const redis = require('redis')

let subscriber = null
if(process.env.REDIS_HOST){
  subscriber = redis.createClient({
    host: process.env.REDIS_HOST
  })

}

exports._getSubscriber = async ({ that }) => {


  subscriber.on('message', async (topic, message) => {
    message = JSON.parse(message)
    if(topic === 'kontak'){
      message.daftResponse && console.log(message.daftResponse)
      message.kunjResponse && console.log(message.kunjResponse)
      message.mcuResponse && console.log(message.mcuResponse)
      let text, from
      if(message.Tlp_Peserta.match(/^(08)([0-9]){1,12}$/)){
        from = message.Tlp_Peserta
      }
      if(!from && message.noHP.match(/^(08)([0-9]){1,12}$/)){
        from = message.noHP
      }
      if(from) {
        from = `62${from.substr(1)}@c.us`
        text = `Terima kasih atas kepercayaan ${message.nama} terhadap pelayanan Puskesmas ${process.env.PUSKESMAS}.\n${process.env.FORM_LINK ? `Mohon kesediaannya untuk dapat mengisi form kepuasan pelanggan berikut:\n${process.env.FORM_LINK}\n`: ''} ${process.env.ESO_LINK ? `Efek samping dan alergi obat serta pertanyaan/konseling farmasi dapat disampaikan melalui form berikut:\n ${process.env.ESO_LINK}\n` : ''}`
        chat = await that.client.checkNumberStatus(from);
        let profile = await that.client.getNumberProfile(from);

        that.spinner.succeed(`---------------`)
        that.spinner.succeed(`on new kontak`)
        if(chat && chat.canReceiveMessage) {
          await that.addContact({ contact: {
            from,
            chat,
            profile,
          }})

          // await that.client.sendText( from, text)
          that.spinner.succeed(`${det.tglDaftar} send text to: ${from}, isi: ${text.split('\n').join(' ')}`)
        } else {
          that.spinner.succeed(`${det.tglDaftar} ${from} doesn't exists`)
        }
      }
    }
  })

  subscriber.subscribe('kontak')

  return subscriber
}