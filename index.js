require('dotenv').config()

const Core = require('./core')
const config = require('./config')
const wa = new Core(config)
;(async()=>{
  try{
    const client = await wa.init()

		client.onMessage( async msg => {
			let ms = await handleMessage(msg)
			console.log(ms) 
		})

		let unreads = await client.getAllChats(true)

    for(let unread of unreads){

			let messages = await wa.getUnreadMessagesInChat(unread)

    	for(let message of messages){
				let ms = await wa.handleMessage(message)
				console.log(ms)
    	}
    	
    }

  }catch(e){
    console.error(e)
  }
})()