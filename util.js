const ora = require('ora');
const qrcode = require('qrcode-terminal')
const { from, merge } = require('rxjs')
const { take } = require('rxjs/operators')

module.exports = class Util {
  constructor(config){
    this.config = config
    this.spinner = ora({
      stream: process.stdout
    });
    this.qrcode = qrcode
    this.from = from
    this.merge = merge
    this.take = take
  }

  time(s) {
    return new Date(s * 1e3).toISOString()
  }

  async handleMessage(message) {
    // console.log('-------------')
    
    let msg = {
      time: this.time(message.t),
      grup: message.isGroupMsg ? message.chat.name : undefined,
      pengirim: message.sender.name || message.sender.pushname || message.sender.shortName || message.sender.formattedName || message.sender.id.user,
      jenis: message.broadcast ? 'status' : 'chat',
      isi: message.type === 'chat' ? message.body : `${message.type} | ${message.mimetype}`,
      quote: message.quotedMsg ? message.quotedMsg.type === 'chat' ? message.quotedMsg.body : `${message.quotedMsg.type} | ${message.quotedMsg.mimetype}` : undefined,
      // str: JSON.stringify(message)
    }

    return JSON.parse(JSON.stringify(msg))

  }


}