const moment = require('moment')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('./db.json')

module.exports = class Libur {
  constructor(config){
    this.config = config
    this.moment = moment
    this.moment.locale('id')
    this.db = low(adapter)
    // Set some defaults (required if your JSON file is empty)
    this.db.defaults({ liburnas: [] }).write()
  }

  addLiburnas(obj){
    return this.db.get('liburnas').push(obj).write()
  }

  getLiburnasByThn(tahun) {
    return this.db.get('liburnas').filter({ tahun }).value()
  }

  libur(tgl){
    let thn = moment(tgl, 'YYYY-MM-DD').format('YYYY')
    let liburArr = this.getLiburnasByThn(thn)
    liburArr = liburArr.map(tgl=>moment(tgl, 'D MMMM YYYY').format('YYYY-MM-DD'))
    if(liburArr.indexOf(tgl) === -1){
      return true		
    }
    return false
  
  }
}

