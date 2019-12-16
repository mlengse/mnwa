const Core = require('./core')
const config = require('./config')
const wa = new Core(config)
;(async()=>{
  try{

    const client = await wa.init()

		client.onMessage( async message => {
      let msg = await wa.handleMessage(message)
      console.log(msg)
    })

		let unreads = await client.getAllChats(true)

    for(let unread of unreads){

			let messages = await wa.getUnreadMessagesInChat(unread)

    	for(let message of messages){
        let msg = await wa.handleMessage(message)
        console.log(msg)
      }
    	
    }

  }catch(e){
    console.error(e)
  }
})()