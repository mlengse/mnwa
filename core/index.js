const Util = require('./util')

module.exports = class Core extends Util {

  constructor(config){
    super(config)
  }

  async handleMessage(message) {
    // console.log('-------------')
    
    let msg = {
      time: this.time(message.t),
      grup: message.isGroupMsg ? message.chat.name : undefined,
      pengirim: message.sender.name || message.sender.pushname || message.sender.shortName || message.sender.formattedName || message.sender.id.user,
      jenis: message.broadcast ? 'status' : 'chat',
      isi: message.type === 'chat' ? message.body : `${message.type} | ${message.mimetype}`,
      quote: message.quotedMsg ? message.quotedMsg.type === 'chat' ? message.quotedMsg.body : `${message.quotedMsg.type} | ${message.quotedMsg.mimetype}` : undefined,
      // str: JSON.stringify(message)
    }

    let reply = {
      reply: false,
      to: undefined,
      msg: undefined
    }

    // console.log(JSON.parse(JSON.stringify(msg)))


    if(message.type === 'chat' && !message.isGroupMsg && !message.isMMS && !message.isMedia && message.chatId !== 'status@broadcast') {

      let messageBody = message.body
      let containsPandawa = messageBody && messageBody.toLowerCase().includes('pandawa')

      if(containsPandawa){
        reply = {
          reply: true,
          to: message.chat.id || message.from,
          msg: 'Harap mengganti kata pandawa dengan nama pasien.'
        }
      } else {
        reply = {
          reply: false,
          to: message.chat.id || message.from,
          msg: 'processing message',
          tag: this.processTag(messageBody)
      }
        // await generateReply(client, {
        //   user: message.from,
        //   content: text
        // })
      }
    }

    msg = JSON.parse(JSON.stringify(Object.assign({}, msg, reply)))

    if(msg.tag) {
      msg = await this.generateReply(msg)
    }
    console.log(msg)
  }

  async generateReply(msg) {
    let chatArr = msg.tag.split('#')
    chatArr.shift()
    let api = chatArr.shift()
    let result = ''
    switch(api){
      case 'tes':
        result = 'ok\n'
        return Object.assign({}, msg, {
          msg: result
        })
      case 'cek':
        if(!chatArr.length) {
          result = 'ok\n'
          return Object.assign({}, msg, {
            msg: result
          })
        } else {
          result = await this.cekApi({ chatArr, result })
        }
        break
      case 'cari':
  
        let res = await cariFunc(chatArr)
  
        result = res.result
        let resultArr = res.resultArr
  
        if(resultArr.length < 20) {
          result += `Ditemukan ${resultArr.length} hasil${resultArr.length ? ':' : '.'}\n`
  
          for (let res of resultArr){
          result += `(${resultArr.indexOf(res) + 1}) `
            for (let prop in res){
              if(prop == 'sex_id'){
                (res[prop] == '1') ? result += `Laki-laki | ` : result += `Perempuan | `
              } else if(prop == 'village_id'){
                let village = config.village
                for( let v of village){
                  if(res[prop] === v.id){
                    result += `${v.des} | `
                  }
                }
              } else if(prop == 'orchard_id') {
                result += `RW: ${res[prop].slice(-2)} | `
              } else if(prop == 'tgl_lahir') {
                result += `lahir: ${moment(res[prop]).locale('id').format('dddd, LL')} | `
                let umur = moment(res[prop]).locale('id').fromNow().split(' ').slice(0, 2).join(' ')
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
      case 'datfar':
      case 'daftar':
        let hari = chatArr.shift()
        hari = hari.toLowerCase().replace(' ', '')
        let tgl
        let dddd
        switch(hari){
          case 'sekarang':
          case 'hariini':
            tgl = moment().add(0, 'd')
            let jam = tgl.format('H')
            if(jam >= 8) {
              console.log(`${new Date()} request masuk jam: ${jam}`)
              result = 'Pendaftaran via whatsapp untuk hari ini ditutup pukul 08.00\n'
              return result
            }
            break
  
          case 'besok':
          case 'besuk':
            tgl = moment().add(1, 'd')
  //					let jam = tgl.format('H')
  //					if(jam >= 21) {
  //						console.log(`${new Date()} request masuk jam: ${jam}`)
  //						result = 'Pendaftaran via whatsapp untuk besok ditutup pukul 21.00\n'
  //						return result
  //					}
            break
          case 'lusa':
            tgl = moment().add(2, 'd')
            break
          default:
            result = 'Hari periksa tidak sesuai referensi sistem.\nGunakan #sekarang, #hariini, #besok, #besuk atau #lusa.'
            // result = 'Hari periksa tidak sesuai referensi sistem.\nGunakan #besok, #besuk atau #lusa.'
            return result + '\n'
        }
        if(!result){
          tgll = tgl.format('YYYY-MM-DD')
          dddd = tgl.format('dddd')
  
          if (tgl.weekday() == 6) {
            result = `Pelayanan rawat jalan ${tgl.format('dddd, D-M-YYYY')} tutup.\n`
            return result
          } else {
            let isMasuk = await libur(tgll)
  
            if(!isMasuk) {
              return `Pelayanan rawat jalan ${tgl.format('dddd, D-M-YYYY')} tutup.\n`
            } else {
              let poli = chatArr.shift().toLowerCase()
              if(poli.includes('poli')) {
                poli = poli.split('poli').join('')
              }
              poli = poli.trim()
              let ada = poliArr.filter(e => e == poli)
              if(ada.length){
  
                if(poli === 'tht' && tgl.weekday() !== 1 && tgl.weekday() !== 3) {
                  return `poli tht hanya buka hari Selasa dan Kamis.\n`
                }
  
                if(poli === 'fisioterapi' && tgl.weekday() !== 4) {
                  return `poli fisioterapi, hanya bisa daftar via WA untuk jadwal hari Jum'at.\n`
                }
  
                if(poli === 'imunisasi' && tgl.weekday() !== 1 ) {
                  return `poli imunisasi hanya buka hari Selasa.\n`
                }
  /*
                if(poli === 'imunisasi' && tgl.weekday() !== 3 && tgl.weekday() !== 0) {
                  return `poli imunisasi hanya buka hari Senin dan Kamis.\n`
                }
  */
                if(poli === 'rujukan') {
                  poli = 'umum'
                }
  
                let res = await cariFunc(chatArr)
                let rm = res.resultArr
  
  
                if(rm.length > 1) {
                  let nama = [...new Set(rm.map(e=>e.nama))]
                  let jk = [...new Set(rm.map(e=>e.sex_id))]
                  let tglLhr = [...new Set(rm.map(e=>e.tgl_lahir))]
                  if(nama.length !== 1 && jk.length !== 1 && tglLhr.length !== 1){
                    return 'Ditemukan lebih dari 1 rekam medis, mohon perbaiki parameter pencarian.\n'
                  }
                  rm = rm.splice(rm.length-1, 1)
                } else if (!rm.length) {
                  return `Tidak ditemukan rekam medis berdasarkan parameter tersebut.\n`
                } 
  
                let umurArr = moment(rm[0].tgl_lahir).locale('id').fromNow().split(' ').slice(0, 2)
                let umur = umurArr[0]
                if(umur == 'setahun'){
                  umur = '1'
                } else if (umurArr[1] !== 'tahun') {
                  umur = '1'
                }
  
                if((poli === 'mtbs'  && umur > 5)) {
                  return `poli ${poli} hanya melayani balita kurang dari 5 tahun.\n`
                } else if (poli === 'imunisasi' && umur > 6 ) {
                  return `poli ${poli} hanya melayani balita kurang dari 6 tahun.\n`
                } else if(poli === 'lansia' && umur < 60) {
                  return `poli lansia hanya melayani pasien lanjut usia 60 tahun ke atas.\n`
                } else if(poli==='kia' && umur <= 5) {
                  return `untuk pemeriksaan balita mohon ganti poli ke mtbs atau imunisasi.\n`								
                }
  
                //console.log(`${new Date()} ${JSON.stringify(rm[0])}`)
                
                tgld = tgl.format('DD-MM-YYYY')
  
                //console.log(`daftar ${hari} ${dddd} ${tgld} ${poli} ${rm[0]}`)
                
                result = await daftar(hari, dddd, tgld, poli, rm[0])
  
                result += `\nMohon kesediaannya untuk dapat mengisi form kepuasan pelanggan berikut:\n ${process.env.FORM_LINK}`
                
                return result + '\n'
  
              } else {
                result = `Parameter ketiga adalah nama poli.\nNama poli tidak sesuai referensi sistem.\nGunakan: ${poliArr.map(e=>`#${e},`).join(' ')}.`
                return result + '\n'
              }
            }
  
          }
  
        }
        break
    }
    
    // console.log(`${new Date()} replying ${newChatText.user} ${newChatText.content}`)
    // newChatText.reply = await reply(newChatText.content)
    // let nc = newChatText
    // delete nc.selector
    // nc = JSON.stringify(nc)

    // await this.client.sendText( newChatText.user, newChatText.reply)

    // console.log(`${new Date()} ${newChatText.reply}`)
  
  }


}