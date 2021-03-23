const redis = require('redis')

let subscriber = null
if(process.env.REDIS_HOST){
  subscriber = redis.createClient({
    host: process.env.REDIS_HOST
  })

  subscriber.subscribe('kontak')

  subscriber.on('message', (topic, message) => {
    if(topic === 'kontak'){
      console.log(JSON.parse(message))
    }
  })
}

exports.getSubscriber = () => subscriber