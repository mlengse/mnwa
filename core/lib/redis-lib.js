const redis = require('redis')


let subscriber = null
if(process.env.REDIS_HOST){
  subscriber = redis.createClient({
    host: process.env.REDIS_HOST
  })
}

exports.getSubscriber = () => subscriber