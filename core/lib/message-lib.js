exports._processUnstructured = async ({that, messageBody}) => {
  let formattedText, poli, hari, noBPJS, nik, norm
  messageBody = messageBody.toLowerCase()
  let rawArr = messageBody.match(/\b\w+/g)
  let formattedArr = []
  if(rawArr) {
    if(rawArr.length){
      if (rawArr.indexOf('daftarin') > -1) {
        formattedArr.push('daftar')
      }
      if (rawArr.indexOf('daftar') > -1) {
        formattedArr.push('daftar')
      }
    }
    if (formattedArr.indexOf('daftar') > -1) {
      for (let day of that.config.days) {
        if (messageBody.includes(day)) {
          hari = `${day}`
          break
        }
      }
      if (hari) {
        formattedArr.push(hari)
      }
      for (let pol of that.config.polArr) {
        if (messageBody.includes(pol)) {
          poli = `${pol}`
          break
        }
      }
      if (poli) {
        formattedArr.push(poli)
      }
    }
    if(Array.isArray(rawArr)) rawArr.map(params => {
      if (params.match(new RegExp(that.config.RM_REGEX))) {
        formattedArr.push(params)
        norm = params
      } else if (params.match(new RegExp(that.config.BPJS_REGEX))) {
        formattedArr.push(params)
        noBPJS = params
      } else if (params.match(new RegExp(that.config.NIK_REGEX))) {
        formattedArr.push(params)
        nik = params
      }
    })
    rawArr = rawArr.join(' ').split(formattedArr[formattedArr.length - 1])
    if (rawArr.length > 1) {
      formattedArr.push(rawArr[rawArr.length - 1].trim())
    }
    if(formattedArr.length) {
      formattedText = `#${formattedArr.join('#')}`
    }
    if ((formattedArr[0] === 'cari' && formattedArr.length > 1) || (formattedArr[0] === 'daftar' && formattedArr.length > 3)) {
      formattedArr.shift()
    }
    if(!poli && !hari && (!noBPJS || !nik || !norm)) {
      return null
    }
    return formattedText
  }
}

exports._processTag = async ({that, messageBody}) => {
  let contentArr = []
  let formattedText
  while (messageBody.includes('##')) {
    messageBody = messageBody.split('##').join('#')
  }
  if(messageBody && messageBody.charAt(0) == '#') {
    if (messageBody.includes('alamat')) {
      messageBody = messageBody.split('alamat').join('#')
    }
    if (messageBody.includes('.')) {
      messageBody = messageBody.split('.').join('')
    }
    contentArr = messageBody.split('#').map(e => e.trim())
    contentArr.shift()
    let firstWord = contentArr.shift()
    if(firstWord){
      firstWord = firstWord.split(' ').join('')
    }
    if(!that.config.keywords.filter(e => firstWord === e).length){
      formattedText = await that.processUnstructured({messageBody})
    } else {
      formattedText = messageBody
    }
  // } else {
    // formattedText = await that.processUnstructured({messageBody})
  }
  return formattedText
}

exports._handleMessage = async ({that, message}) => {
  that.spinner.start('handling message')
  let msg = Object.assign({}, message, {
    time: that.getLongFormat(message.t),
    grup: message.isGroupMsg ? message.chat.name : undefined,
    pengirim: message.sender.name || message.sender.pushname || message.sender.shortName || message.sender.formattedName || message.sender.id.user,
    jenis: message.broadcast ? 'status' : 'chat',
    isi: message.type === 'chat' ? message.body : `${message.type} | ${message.mimetype}`,
    quote: message.quotedMsg ? message.quotedMsg.type === 'chat' ? message.quotedMsg.body : `${message.quotedMsg.type} | ${message.quotedMsg.mimetype}` : undefined,
    // str: JSON.stringify(message)
  })
  let reply = {
    reply: false,
    to: undefined,
    msg: undefined
  }
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
        to: message.chat.id || message.from,
        tag: await that.processTag({messageBody})
      }
    }
  }
  msg = JSON.parse(JSON.stringify(Object.assign({}, msg, reply)))
  // that.spinner.succeed()
  if(msg.tag) {
    // console.log(msg)
    msg = await that.generateReply({msg})
  // } else {
    // that.spinner.start(JSON.stringify(msg))
  }
  return msg
}

exports._generateReply = async ({that, msg}) => {
  that.spinner.start('generate reply')
  // console.log(msg)
  let chatArr = msg.tag.split('#')
  chatArr.shift()
  let api = chatArr.shift()
  let result = ''
  switch(api){
    case 'tes':
      result = 'ok\n'
      break
    case 'cek':
      if(!chatArr.length) {
        result = 'ok\n'
        break
      } else {
        result = await that.cekApi({ chatArr, result })
        break
      }
    case 'cari':
      result = await that.cariApi({ chatArr })
      break
    case 'datfar':
    case 'daftar':
      result = await that.daftarApi({ chatArr, result })
      break
  }
  
  that.spinner.succeed()
  let all = {}
  if(result) {
    if(typeof result !== 'string') {
      all = Object.assign({}, result)
      result = all.msg
    }
    // if(result.includes('pendaftaran gagal') && all.dataDaftar && all.dataDaftar.ketAktif && all.dataDaftar.ketAktif !== ''){
    //   result += `\n${all.dataDaftar.ketAktif}`
    // }

    if(process.env.FORM_LINK) {
      result += `\n\nMohon kesediaannya untuk dapat mengisi link di bawah. \nLink berisi form kepuasan pelanggan, efek samping/alergi obat, pertanyaan/konseling farmasi dan skrining riwayat kesehatan.\n\n${process.env.FORM_LINK}\n\nSemoga selalu sehat, bugar dan produktif.`
    }

    that.spinner.start(`send wa`)
    let sendTo
    if(typeof msg.to === 'string'){
      sendTo = msg.to
    } else {
      sendTo = msg.to._serialized
    }
    try{
      await that.client.sendText( sendTo, result)
    }catch(e){
      console.error(e)
      // that.spinner.fail(`contact not saved`)
    }

    that.spinner.succeed()
  }
  return Object.assign(msg, all, {
    reply: true,
    msg: result
  })
}

exports._cekApi = async ({that, chatArr, result }) => {
  let hari = chatArr.shift()
  hari = hari.toLowerCase().replace(' ', '')
  that.spinner.start(`cekApi ${hari}`)
  //console.log(hari)
  let tgl
  switch(hari){
    case 'sekarang':
    case 'hari ini':
    case 'hariini':
      if(that.config.DAFTAR_HARI_INI) {
        tgl = that.getTglHariIni()//.add(0, 'd')
      } else {
        return 'ok'
      }
      break
    case 'besok':
    case 'besuk':
      tgl = that.getTglBesok()
      break
    case 'lusa':
      tgl = that.getTglLusa()
      break
    default:
      result = `Hari periksa tidak sesuai referensi sistem.\nGunakan ${process.env.DAFTAR_HARI_INI ? '#sekarang, #hariini, ': ''}#besok, #besuk atau #lusa.`
      return result + '\n'
  }
  if(!result){
    let tgll = that.getFormat3(tgl)
    if (that.isMinggu(tgl)) {
      result = `Pelayanan rawat jalan ${that.getFormat4(tgl)} tutup.\n`
      return result + '\n'
    } else {
      let isMasuk = await that.libur({tgl: tgll})
      //console.log(isMasuk)
      if(!isMasuk) {
        return `Pelayanan rawat jalan ${that.getFormat5(tgl)} tutup.\n`
      } else {
        result = await that.cekDaftar({ tgl: that.getFormat6(tgl)})
        return result + '\n'
      }
    }
  }

}
