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
        // that.spinner.succeed(`---------------`)
        that.spinner.succeed(`on new send wa request ${nama} ${from}`)
      
        let chat = await that.client.checkNumberStatus(from);
        // let profile = await that.client.getNumberProfile(from);

        if(chat && (chat.canReceiveMessage || chat.numberExists)) {
          process.env.API_KEY && await that.addContact({ contact: {
            nama,
            from,
            chat,
            // profile,
          }})
      
          if(process.env.FORM_LINK) {
            text += `\n\nMohon kesediaannya untuk dapat mengisi link di bawah. \nLink berisi form kepuasan pelanggan, efek samping/alergi obat, pertanyaan/konseling farmasi dan skrining riwayat kesehatan.\n\n${process.env.FORM_LINK}\n\nSemoga selalu sehat, bugar dan produktif.`
          }

          // try{
            await that.client.sendText( from, text)
            .then((result) => {
              that.spinner.succeed(`${that.getTglDaftarHariIni()} send text result ${JSON.stringify(result)}`)
            })
            .catch((erro) => {
              console.error(`${new Date()}, subscriber send wa`)
              console.error('Error when sending: ', erro); //return object error
            });
          // }catch(e){


          //   console.error(e)
          //   console.error(chat)
          //   console.error(profile)
          //   console.error('error dari on Simpus Reg')
          // }
      
          // await that.client.sendText( from, text)
        } else {
          that.spinner.fail(`${that.getTglDaftarHariIni()} ${from} doesn't exists`)
        }
      
      }
    })
  
    subscriber.subscribe('sendwa')
  
  }

  return subscriber
}