require('dotenv').config()

const Core = require('./core')
const config = require('./config')

const wa = new Core(config)
;(async()=>{
  try{
    const client = await wa.init()
    let unreads = await client.getAllChats(true)
    for(let unread of unreads){
    	console.log(unread.contact.name || unread.contact.formattedName || unread.id.user)
    	let messages = []

    	while(!messages || !messages.length || messages.length < unread.unreadCount) {
    		messages = await wa.page.evaluate( id => {
	    		return WAPI.getAllMessagesInChat(id)
	    	}, unread.id)
    	}

    	while( messages.length > unread.unreadCount){
    		messages.shift()
    	}

    	for(let message of messages){
    		console.log( message.sender.name || message.sender.pushname || message.sender.formattedName || message.sender.id.user )

    		if(message.type === 'chat'){
    			console.log(message.body)
    		} else {
    			console.log(message.type, message.mimetype)
    		}
    	}
    	
    }
  }catch(e){
    console.error(e)
  }
})()