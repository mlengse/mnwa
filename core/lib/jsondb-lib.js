const FileSync = require('lowdb/adapters/FileSync')
const db = require('lowdb')(new FileSync('./db/db.json'))
db.defaults({ liburnas: [] }).write()    

exports.addLiburnas = obj => db.get('liburnas').push(obj).write()
exports.getLiburArr = tahun => db.get('liburnas').filter({ tahun }).value()
