require('dotenv').config()

const Core = require('./core')
const config = require('./config')
const time = s => new Date(s * 1e3).toISOString()
const wa = new Core(config)
;(async()=>{
  try{
    const client = await wa.init()

    const handleMessage = async message => {
    	console.log('-------------')

    	console.log('time:', time(message.t))
    	if(message.isGroupMsg) {
	    	console.log('grup:', message.chat.name)
    	}

  		console.log( 'pengirim: ', message.sender.name || message.sender.pushname || message.sender.shortName || message.sender.formattedName || message.sender.id.user )
  		// console.log( 'pengirim: ', JSON.stringify(message.sender) )

  		if(message.type === 'chat'){
  			console.log('isi:', message.body)
  		} else {
  			console.log('isi:', message.type, message.mimetype)
  		}
    }

    let [unreads, _] = await Promise.all([
    	client.getAllChats(true),
    	client.onMessage( handleMessage )
    ])

    for(let unread of unreads){
    	// if(unread.isGroup){
	    // 	console.log('grup: ', unread.contact.name || unread.contact.formattedName || unread.id.user)
    	// }
    	let messages = []

    	while(!messages || !messages.length || messages.length < unread.unreadCount) {
    		messages = await wa.page.evaluate( id => {
	    		return WAPI.getAllMessagesInChat(id)
	    	}, unread.id)
    	}

    	// console.log( messages.length, unread.unreadCount)
    	
    	// messages = messages.filter( e => e.isNewMsg )

    	// console.log( messages.length, unread.unreadCount)

    	while( messages.length > unread.unreadCount){
    		messages.shift()
    	}

    	for(let message of messages){
    		await handleMessage(message)
    	}
    	
    }

  }catch(e){
    console.error(e)
  }
})()