const ora = require('ora')

let textPersist

exports.spinner =(process.platform === 'win32' && !process.env.NODE_APP_INSTANCE) ? ora({
  stream: process.stdout
}): {
  start: text => {
    textPersist = text
    // console.log('start:', text)
  },
  stop: _ => '',
  succeed: text => {
    if(!text){
      text = textPersist
    }
    console.log('succeed:', text)
  },
  warn: text => console.info('warn:', text),
  info: text => console.info('info:', text),
  fail: text => {
    if(!text){
      text = textPersist
    }
    console.error('fail:', text)
  }
}

exports.processText = text => {
  let regex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g
  let nt = text.replace(regex, '').trim()
  if(nt === ''){
    nt = 'emoji'
  }
  return nt
}
