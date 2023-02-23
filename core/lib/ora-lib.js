const ora = require('ora')
exports.textS = ''
exports.textI = ''
exports.spinner =(!process.env.NODE_APP_INSTANCE) ? ora({
  stream: process.stdout
}): {
  start: text => {
    // let old = this.textS
    // if(this.textS === ''){
      this.textS = text
    // } else if(text){
    //   this.textS = `${this.textS} > ${text}`
    // }
    // if(this.textS !== old) {
    //   console.log(`start: ${this.textS}`)
    // }
  },
  stop: _ => {
    console.log(`stop: ${this.textS}`)
    this.textS = ''
  },
  succeed: text => {
    let old = this.textS
    if(this.textS && text){
      this.textS = `${this.textS} > ${text}`
    }
    if(this.textS !== old) {
      console.log(`done: ${this.textS}`)
    }
    this.textS = ''
  },
  warn: text => {
    this.textI = text
  },
  info: text => {
    this.textI = text
  },
  fail: text => {
    this.textI = `${this.textS} > ${this.textI} | ${text}`
    console.error(`error: ${this.textI}`)
    this.textI = ''
  },
}

exports.processText = text => {
  let regex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g
  let nt = text.replace(regex, '').trim()
  nt = nt.replace(/(\r\n|\n|\r)/gm, ". ").trim()
  if(nt === ''){
    nt = 'emoji'
  }
  return nt
}
