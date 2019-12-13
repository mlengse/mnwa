const ora = require('ora');
const qrcode = require('qrcode-terminal')
const { from, merge } = require('rxjs')
const { take } = require('rxjs/operators')
const Logic = require('./logic')

module.exports = class Util extends Logic {
  constructor(config){
    super(config)
    this.spinner = ora({
      stream: process.stdout
    });
    this.qrcode = qrcode
    this.from = from
    this.merge = merge
    this.take = take
  }

}