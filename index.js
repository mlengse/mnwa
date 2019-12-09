require('dotenv').config()

const Core = require('./core')
const config = require('./config')

const wa = new Core(config)
;(async()=>{
  try{
    const client = await wa.init()
    let unread = await client.getAllChats(true)
    console.log(unread)
  }catch(e){
    console.error(e)
  }
})()