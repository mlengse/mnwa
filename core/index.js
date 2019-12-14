const Util = require('./util')

module.exports = class Core extends Util {

  constructor(config){
    super(config)
  }

  async handleMessage(message) {

    this.spinner.start('handling message')
    
    let msg = {
      time: this.time(message.t),
      grup: message.isGroupMsg ? message.chat.name : undefined,
      pengirim: message.sender.name || message.sender.pushname || message.sender.shortName || message.sender.formattedName || message.sender.id.user,
      jenis: message.broadcast ? 'status' : 'chat',
      isi: message.type === 'chat' ? message.body : `${message.type} | ${message.mimetype}`,
      quote: message.quotedMsg ? message.quotedMsg.type === 'chat' ? message.quotedMsg.body : `${message.quotedMsg.type} | ${message.quotedMsg.mimetype}` : undefined,
      // str: JSON.stringify(message)
    }

    let reply = {
      reply: false,
      to: undefined,
      msg: undefined
    }

    if(message.type === 'chat' && !message.isGroupMsg && !message.isMMS && !message.isMedia && message.chatId !== 'status@broadcast') {

      let messageBody = message.body
      let containsPandawa = messageBody && messageBody.toLowerCase().includes('pandawa')

      if(containsPandawa){
        reply = {
          reply: true,
          to: message.chat.id || message.from,
          msg: 'Harap mengganti kata pandawa dengan nama pasien.'
        }
      } else {
        reply = {
          to: message.chat.id || message.from,
          tag: this.processTag(messageBody)
        }
      }
    }

    msg = JSON.parse(JSON.stringify(Object.assign({}, msg, reply)))

    this.spinner.succeed()

    if(msg.tag) {
      msg = await this.generateReply(msg)
    }

    console.log(msg)

    // this.spinner.info(JSON.stringify(msg, null, 2))
  }

  async generateReply(msg) {
    this.spinner.start('generate reply')
    let chatArr = msg.tag.split('#')
    chatArr.shift()
    let api = chatArr.shift()
    let result = ''
    switch(api){
      case 'tes':
        result = 'ok\n'
        break
      case 'cek':
        if(!chatArr.length) {
          result = 'ok\n'
          break
        } else {
          result = await this.cekApi({ chatArr, result })
          break
        }
      case 'cari':
        result = await this.cariApi({ chatArr })
        break
      case 'datfar':
      case 'daftar':
        result = await this.daftarApi({ chatArr, result })
        break
    }

    this.spinner.succeed()

    if(result) {
      this.spinner.start(`send wa`)
      await this.client.sendText( msg.to, result)
      this.spinner.succeed()
    }

    
    return Object.assign(msg, {
      reply: true,
      msg: result
    })

  }

}