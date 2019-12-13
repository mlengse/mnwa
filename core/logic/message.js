const Libur = require('../db/liburnas')
const _cekDaftar = require('../db/_cekDaftar')

module.exports = class Message extends Libur {
  constructor(config) {
    super(config)
  }

  async cekDaftar(tgl){
    return await _cekDaftar(tgl, this.unit)
  }

  async cekApi({chatArr, result }) {
    let hari = chatArr.shift()
    hari = hari.toLowerCase().replace(' ', '')
    //console.log(hari)
    let tgl
    switch(hari){
      case 'sekarang':
      case 'hari ini':
      case 'hariini':
        tgl = this.moment().add(0, 'd')
        break
      case 'besok':
      case 'besuk':
        tgl = this.moment().add(1, 'd')
        break
      case 'lusa':
        tgl = this.moment().add(2, 'd')
        break
      default:
        result = 'Hari periksa tidak sesuai referensi sistem.\nGunakan #besok, #besuk atau #lusa.'
        return result + '\n'
    }
    if(!result){
      let tgll = tgl.format('YYYY-MM-DD')
      //console.log (moment(tgl).weekday() ) 
      if (this.moment(tgl).weekday() == 6) {
        result = `Pelayanan rawat jalan ${tgl.format('dddd, D-M-YYYY')} tutup.\n`
        return result + '\n'
      } else {
        let isMasuk = await this.libur(tgll)
        //console.log(isMasuk)
        if(!isMasuk) {
          return `Pelayanan rawat jalan ${tgl.format('dddd, D-M-YYYY')} tutup.\n`
        } else {
          result = await this.cekDaftar(tgl.format('DD-MM-YYYY'))
          return result + '\n'
        }
      }
    }

  }
}