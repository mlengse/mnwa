const moment = require('moment')
moment.locale('id')

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