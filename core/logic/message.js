const Daftar = require('./daftar')
const _cekDaftar = require('../db/_cekDaftar')

module.exports = class Message extends Daftar {
  constructor(config) {
    super(config)
  }

  async cekDaftar(tgl){
    return await _cekDaftar(tgl, this.config.unit)
  }

  async getVillages(){
    this.config.village = await this.connect('SELECT `id`, `desa` FROM `villages`')
  } 

  async getUnits() {
    let units = await this.connect('SELECT * FROM units')
    let uns = units.map(({unit})=> unit)
    this.config.pols = this.config.pols.map(e => {
      for( let b of e.alias) {
        for(let u of uns){
          if(u.toLowerCase().includes(b)){
            return Object.assign({}, e, units[uns.indexOf(u)])
          }
        }
      }
      return e
    })

    this.config.polArr = []

    this.config.unit = {}

    this.config.pols.map(({ alias, id, unit }) => {
      if(alias && Array.isArray(alias) ){
        alias.map( e => this.config.polArr.push(e))
      }
      this.config.unit[id] = unit
    })

    // console.log(this.config.pols)
    // console.log(this.config.unit)
    // console.log(this.config.polArr)
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

  async cariApi({ chatArr }){
    // console.log(chatArr)
    let { result, resultArr } = await this.cariFunc(chatArr)
  
    // let result = res.result
    // let resultArr = res.resultArr

    if(resultArr.length < 20) {
      result += `Ditemukan ${resultArr.length} hasil${resultArr.length ? ':' : '.'}\n`

      for (let res of resultArr){
      result += `(${resultArr.indexOf(res) + 1}) `
        for (let prop in res){
          if(prop == 'sex_id'){
            (res[prop] == '1') ? result += `Laki-laki | ` : result += `Perempuan | `
          } else if(prop == 'village_id'){
            // if(!this.config.village) {
            //   await this.getVillages()
            // }
            let village = this.config.village 
            for( let v of village){
              if(res[prop] === v.id){
                result += `${v.desa} | `
              }
            }
          } else if(prop == 'orchard_id') {
            result += `RW: ${res[prop].slice(-2)} | `
          } else if(prop == 'tgl_lahir') {
            result += `lahir: ${this.moment(res[prop]).locale('id').format('dddd, LL')} | `
            let umur = this.moment(res[prop]).locale('id').fromNow().split(' ').slice(0, 2).join(' ')
            if(umur == 'setahun yang'){
              umur = '1 tahun'
            }
            result += `${umur} | `
          } else {
            let a;
            let b = res[prop]
            switch(prop){
              case 'id':
                a = 'no rm';
                b = b.toUpperCase()
                break
              case 'no_kartu':
                a = 'no bpjs'
                break
              default:
                a = prop
                break
            }
            result += `${a}: ${b} | `
          }
        }
        result += '\n'
      }

    }
    return result
  }
}