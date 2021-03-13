let obj = require("fs").readdirSync(require("path").join(__dirname, "lib")).reduce(( obj, file ) => Object.assign({}, obj, require("./lib/" + file)), {})

module.exports = class Core {
  constructor(config) {
    this.config = config

    this.tgl = {}
    this.liburArr = []
    this.config.jadwal = {}
    this.config.pols.filter(({hari})=> hari).map( ({ alias, hari }) => {
      if(alias.length){
        for( let a of alias){
          this.config.jadwal[a] = hari
        }
      }
    })

    for( let func in obj) {
      if(func.includes('_')) {
        this[func.split('_').join('')] = async (...args) => await obj[func](Object.assign({}, ...args, {that: this }))
      } else {
        this[func] = obj[func]
      }
    }
  }

  getParams(obj){
    return Object.entries(obj).map(([key, val]) => `${key}=${val}`).join('&')
  }

  serialToJSON(serial){
    let obj = {}
    serial.map(({ name, value}) => {
      obj[name] = value
    })
    return obj
  }

}