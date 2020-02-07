const moment = require('moment')
moment.locale('id')

console.log(moment().add(0, 'd').format('ddd, DD-MM-YYYY'))

const config = require('./config')

let sekarang = moment().format('dddd')

console.log(sekarang)

let jadwal = {}

config.pols.filter(({hari})=> hari).map( ({ alias, hari }) => {
  if(alias.length){
    for( let a of alias){
      jadwal[a] = hari
    }
  }
})

console.log(jadwal)