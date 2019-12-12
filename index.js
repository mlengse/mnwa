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
			
			let msg = {
				time: time(message.t),
				grup: message.isGroupMsg ? message.chat.name : undefined,
				pengirim: message.sender.name || message.sender.pushname || message.sender.shortName || message.sender.formattedName || message.sender.id.user,
				jenis: message.broadcast ? 'status' : 'chat',
				isi: message.type === 'chat' ? message.body : `${message.type} | ${message.mimetype}`,
				quote: message.quotedMsg ? message.quotedMsg.type === 'chat' ? message.quotedMsg.body : `${message.quotedMsg.type} | ${message.quotedMsg.mimetype}` : undefined,
				// str: JSON.stringify(message)
			}

			console.log(JSON.parse(JSON.stringify(msg)))

    }

		client.onMessage( handleMessage )

		let unreads = await client.getAllChats(true)

    for(let unread of unreads){

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
    		await handleMessage(message)
    	}
    	
    }

  }catch(e){
    console.error(e)
  }
})()