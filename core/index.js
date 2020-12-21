const path = require('path')
const qrcode = require('qrcode-terminal')
const { from, merge } = require('rxjs')
const { take } = require('rxjs/operators')
const moment = require('moment')
const FileSync = require('lowdb/adapters/FileSync')
const pptr = require('puppeteer-core')
const db = require('lowdb')(new FileSync('./db.json'))
const spinner = require('ora')({
  stream: process.stdout
});
const { connect } = require('./db/_mysqlconn')
const { cariFunc } = require('./db/_cari')
const { Whatsapp } = require('./api/whatsapp')
const _cekDaftar = require('./db/_cekDaftar')
const { waitOpt } = require('../config')
moment.locale('id')
db.defaults({ liburnas: [] }).write()    

module.exports = class Core {

  constructor(config){
    this.config = config
    this.config.jadwal = {}
    this.config.pols.filter(({hari})=> hari).map( ({ alias, hari }) => {
      if(alias.length){
        for( let a of alias){
          this.config.jadwal[a] = hari
        }
      }
    })
  }

  time(s) {
    return moment(s * 1e3).format('LLLL')
  }

  processUnstructured(messageBody) {
    let formattedText
    let poli
    messageBody = messageBody.toLowerCase()
    let rawArr = messageBody.match(/\b\w+/g)
    let formattedArr = []
    if(rawArr.length){
      if (rawArr.indexOf('daftarin') > -1) {
        formattedArr.push('daftar')
      }
      if (rawArr.indexOf('daftar') > -1) {
        formattedArr.push('daftar')
      }
    }
    if (formattedArr.indexOf('daftar') > -1) {
      let hari
      for (let day of this.config.days) {
        if (messageBody.includes(day)) {
          hari = `${day}`
          break
        }
      }
      if (hari) {
        formattedArr.push(hari)
      }
      for (let pol of this.config.polArr) {
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
      if (params.match(new RegExp(this.config.RM_REGEX))) {
        formattedArr.push(params)
      } else if (params.match(new RegExp(this.config.BPJS_REGEX))) {
        formattedArr.push(params)
      } else if (params.match(new RegExp(this.config.NIK_REGEX))) {
        formattedArr.push(params)
      }
    })
    rawArr = rawArr.join(' ').split(formattedArr[formattedArr.length - 1])
    if (rawArr.length > 1) {
      formattedArr.push(rawArr[rawArr.length - 1].trim())
    }
    formattedText = `#${formattedArr.join('#')}`
    if ((formattedArr[0] === 'cari' && formattedArr.length > 1) || (formattedArr[0] === 'daftar' && formattedArr.length > 3)) {
      formattedArr.shift()
    }
    return formattedText
  }

  processTag(messageBody) {
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
      if(!this.config.keywords.filter(e => firstWord === e).length){
        formattedText = this.processUnstructured(messageBody)
      } else {
        formattedText = messageBody
      }
    } else {
      formattedText = this.processUnstructured(messageBody)
    }
    return formattedText
  }

  async handleMessage(message) {
    spinner.start('handling message')
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
          tag: this.processTag(messageBody)
        }
      }
    }
    msg = JSON.parse(JSON.stringify(Object.assign({}, msg, reply)))
    spinner.succeed()
    if(msg.tag) {
      msg = await this.generateReply(msg)
    } else {
      spinner.start(JSON.stringify(msg))
    }
    return msg
  }

  async generateReply(msg) {
    spinner.start('generate reply')
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
          result = await this.cekApi({ chatArr, result })
          break
        }
      case 'cari':
        result = await this.cariApi({ chatArr })
        break
      case 'datfar':
      case 'daftar':
        result = await this.daftarApi({ chatArr, result })
        break
    }
    spinner.succeed()
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
        result += `\nMohon kesediaannya untuk dapat mengisi form kepuasan pelanggan berikut:\n ${process.env.FORM_LINK}`
      }
      if(process.env.ESO_LINK) {
        result += `\n\nEfek samping dan alergi obat serta pertanyaan/konseling farmasi dapat disampaikan melalui form berikut:\n ${process.env.ESO_LINK}`
      }
      spinner.start(`send wa`)
      await this.client.sendText( msg.to, result)
      spinner.succeed()
    }
    return Object.assign(msg, all, {
      reply: true,
      msg: result
    })
  }

  async close(){
    await this.browser.close()
  }

  isAuthenticated() {
    return merge(this.needsToScan(), this.isInsideChat())
      .pipe(take(1))
      .toPromise();
  };
  
  needsToScan() {
    return from(
      this.page
        .waitForSelector('body > div > div > .landing-wrapper', {
          timeout: 0
        })
        .then(() => false)
    );
  };
  
  isInsideChat() {
    return from(
      this.page
        .waitForFunction(
          `(
            document.getElementsByClassName('app')[0] 
            && document.getElementsByClassName('app')[0].attributes 
            && !!document.getElementsByClassName('app')[0].attributes.tabindex
            ) 
            || (
              document.getElementsByClassName('two')[0] 
              && document.getElementsByClassName('two')[0].attributes 
              && !!document.getElementsByClassName('two')[0].attributes.tabindex
              )
              `,
          { timeout: 0 }
        )
        .then(() => true)
    );
  };
  
  async retrieveQR() {
    spinner.start('Loading QR');
    // await this.page.waitFor(5000)
    // await this.page.screenshot({path: 'buddy-screenshot.png'});
    await this.page.waitForSelector("canvas[aria-label='Scan me!']", { timeout: 0 });
    const qrImage = await this.page.evaluate(
      `document.querySelector("canvas[aria-label='Scan me!']").parentElement.getAttribute("data-ref")`
    );
    spinner.succeed();
    qrcode.generate(qrImage, {
      small: true
    });
  
    return true;
  }

  async getUnreadMessagesInChat(unread){
    spinner.start(`get unread messages in chat`);
    // console.log(unread)

    let messages = []
    messages = await this.page.evaluate( id => {
      return WAPI.getAllMessagesInChat(id)
      // return WAPI.getUnreadMessagesInChat(id, false, false)
    }, unread.id)
    // console.log(messages)

    // while(!messages || !messages.length || messages.length < unread.unreadCount) {
    //   messages = await this.page.evaluate( id => {
    //     return WAPI.getAllMessagesInChat(id)
    //   }, unread.id)
    //   console.log(messages.length, unread.unreadCount)
    // }

    // while( messages.length > unread.unreadCount){
    //   messages.shift()
    //   console.log(messages.length, unread.unreadCount)
    // }

    // spinner.succeed(messages.length, unread.unreadCount)

    return messages

  }

  async init(){
    spinner.start('config things')
    await Promise.all([
      this.getVillages(),
      this.getUnits()
    ])
    spinner.succeed()
    spinner.start('Initializing whatsapp');

    this.browser = await pptr.launch(this.config.pptrOpt);
    this.pages = await this.browser.pages()
    this.page = this.pages[0]

    // await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');

    // await this.page.setRequestInterception(true);
    
    // this.page.on('request', (request) => {
    //   request.continue();
    // });
  
    await this.page.goto('https://web.whatsapp.com', this.config.waitOpt)
  
    spinner.succeed();

    spinner.start('Authenticating');

    const authenticated = await this.isAuthenticated();
  
    // If not authenticated, show QR and wait for scan
    if (authenticated) {
      spinner.succeed();
    } else {
      spinner.info('Authenticate to continue');
      await this.retrieveQR();
  
      // Wait til inside chat
      await this.isInsideChat().toPromise();
      spinner.succeed();
    }
  
    spinner.start('Injecting api');
    
    await this.page.addScriptTag({
      path: require.resolve(path.join(__dirname, './lib', 'wapi.js'))
    });
    await this.page.addScriptTag({
      path: require.resolve(path.join(__dirname, './lib', 'middleware.js'))
    });
  
    
    spinner.succeed();
  
    spinner.succeed('Whatsapp is ready');
  
    this.client = new Whatsapp(this.page);

    return this.client
  }

  async cekDaftar(tgl){
    spinner.start(`cekDaftar ${tgl}`)
    return await _cekDaftar(tgl, this.config.unit)
  }

  async getVillages(){
    this.config.village = await connect('SELECT `id`, `desa` FROM `villages`')
  } 

  async getUnits() {
    let units = await connect('SELECT * FROM units')
    // let uns = units.map(({unit})=> unit)
    this.config.pols = this.config.pols.map(e => {
      for( let b of e.alias) {
        for(let u of units){
          if(u.unit.toLowerCase().includes(b)){
            return Object.assign({}, e, u)
          // } else {
          //   return Object.assign({}, e, {
          //     id: '01'
          //   })
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
      if(id !== undefined ) {
        this.config.unit[id] = unit
      }
    })

    this.config.polArr = [...new Set(this.config.polArr)]

    // console.log(this.config.pols)
    // console.log(this.config.unit)
    // console.log(this.config.polArr)
  }

  async cekApi({chatArr, result }) {
    let hari = chatArr.shift()
    hari = hari.toLowerCase().replace(' ', '')
    spinner.start(`cekApi ${hari}`)
    //console.log(hari)
    let tgl
    switch(hari){
      case 'sekarang':
      case 'hari ini':
      case 'hariini':
        if(this.config.DAFTAR_HARI_INI) {
          tgl = moment()//.add(0, 'd')
        } else {
          return 'ok'
        }
        break
      case 'besok':
      case 'besuk':
        tgl = moment().add(1, 'd')
        break
      case 'lusa':
        tgl = moment().add(2, 'd')
        break
      default:
        result = `Hari periksa tidak sesuai referensi sistem.\nGunakan ${process.env.DAFTAR_HARI_INI ? '#sekarang, #hariini, ': ''}#besok, #besuk atau #lusa.`
        return result + '\n'
    }
    if(!result){
      let tgll = tgl.format('YYYY-MM-DD')
      //console.log (moment(tgl).weekday() ) 
      if (moment(tgl).weekday() == 6) {
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
    let { result, resultArr } = await cariFunc(chatArr)
  
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

  async simpusGoto(url){
    await this.simpusPage.goto(url, this.config.waitOpt)
    if (!!await this.simpusPage.$('#UserUsername')) {
      await this.simpusPage.evaluate(async body => await fetch('/j-care/', {
        method: 'POST',
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",                                                                                                
        },
        body
      }), this.getParams({
        _method: 'POST',
        'data[User][username]': this.config.SIMPUS_USER, 
        'data[User][password]': this.config.SIMPUS_PWD         
      }))
      await this.simpusPage.goto(url, this.config.waitOpt)
    }
  }

  async simpusClose() {
    if(this.simpusPage) {
      await this.simpusPage.close()
      this.pages = await this.browser.pages()
      this.simpusPage = undefined
    }
  }

  async initSimpus() {
    if(!this.pages){
      this.browser = await pptr.launch(this.config.pptrOpt);
      this.pages = await this.browser.pages()
    }
    if(!this.simpusPage) {
      if(!this.pages[1]){
        await this.browser.newPage()
        this.pages = await this.browser.pages()
      } 
      this.simpusPage = this.pages[1]
      this.simpusPage.on('dialog', async dialog => {
        dial = `${dialog.message()}\n`
        spinner.start(`${new Date()} ${dialog.type()}`)
        if(dial !== '') spinner.start(`${new Date()} ${dial}`)
        if(dialog.type() === 'alert'){
          await dialog.dismiss()
        } else {
          await dialog.accept()
        }
    
      })

      await this.simpusGoto(`${this.config.SIMPUS_BASE_URL}/j-care/visits/add_registrasi`)
    }

  }

  async getVerBPJS({ noks, tglDaftar }){
    spinner.start('getVerBPJS')
    return await this.simpusPage.evaluate(async({ noks, tglDaftar, kdpoli })=> {
      let jsonData = await $.getJSON('/j-care/bpjs/apis/verifikasi/noka/' + noks + '/' + tglDaftar + '/' + kdpoli)
      $('#online_verification').val(jsonData.status);
      $("#keterangan").val( jsonData.ketAktif );
      if(jsonData.status == 'OK') {
        $('#online_verification').css('color', 'green');
        $("#ppk").val("1");
        $("#kartu").val("1");
        $("#aktif").val("1");
      }
      if($('#nik').val() == '' && jsonData.noKTP && jsonData.noKTP.length == 16){
        $('#nik').val(jsonData.noKTP);
      }
      if(jsonData.kdProviderPst && jsonData.kdProviderPst.kdProvider ) {
        $("#kdProviderPst").val(jsonData.kdProviderPst.kdProvider);
      }
      $("#jenis_pasien_bpjs").val(document.forms["Reg"]["data[Visit][typepatient_id]"].options[document.forms["Reg"]["data[Visit][typepatient_id]"].selectedIndex].getAttribute("bpjs"));
      return jsonData
    }, {
      noks,
      kdpoli: '001',
      tglDaftar
    })

  }

  async getDataPasien({id, tglDaftar}) {
    spinner.start('getDataPasien')
    let ne = await this.simpusPage.evaluate(async pid =>{
      let data = await $.get( '/j-care/patients/getdata/' + pid)
      let item = $.parseJSON(data);
      $("#namapasien").val(item.nama);
      $("#patient_id").val(pid);
      $("#nik").val(item.nik);
      $("#noks").val(item.no_kartu);
      $("#nama_kk").val(item.nama_kk);
      $("#no_hp").val(item.no_hp);
      $("#tgllahir").val(item.tgl_lahir);
      $("#umur").val(item.umur);
      $("#bulan").val(item.bulan);
      $("#hari").val(item.hari);
      $("#jeniskunjungan, #visit").val(item.jeniskunjungan);
      $("#jk, #sex").val(item.sex_id);
      $("#education, #pdk").val(item.education_id);
      $("#pekerjaan, #job").val(item.work_id);
      $("#alamat").val(item.alamat);
      $("#desa, #village").val(item.village_id);
      $("#dusun, #orchard").val(item.orchard_id);
      $("#jenispasien, #typepatient").val(item.typepatient_id);
      $("#penyandang_cacat").val(item.penyandang_cacat);
      $("#goldar option[data-goldar='"+ item.goldar +"']").attr("selected","selected").trigger('change');
      $('#last_visit').html("<a href='#' onclick='return false' class='button' style='color:green;font-weight: bold;'>last visit : "+item.last_visit+"</a>");
      return item
    }, id)

    // spinner.start(`${JSON.stringify(ne)}`)

    if(ne.no_kartu) {
      return Object.assign({}, ne, await this.getVerBPJS({
        noks:ne.no_kartu,
        tglDaftar
      }))
    }
    return ne
  }

  async simpanPendaftaran( { dataDaftar, tglDaftar} ) {
    let data = this.getParams(dataDaftar)
    spinner.start(`simpanPendaftaran ${tglDaftar} ${JSON.stringify(dataDaftar)}`)
    return await this.simpusPage.evaluate( ({ obj, data, tglDaftar }) => {
      let jenispasienbpjs = obj['data[Visit][jenis_pasien_bpjs]']
      let ppk = obj['data[Visit][ppk_cocok]']
      let kartu = obj.kartu
      let aktif = obj.aktif
      let onlinever = $("#online_verification").val();
      let nokartu = obj['data[Visit][no_kartu]']
      let nik = obj['data[Visit][nik]']
      let alert = ''
    
      $("#jenis_pasien_bpjs").val(jenispasienbpjs);
    
      if(jenispasienbpjs == "1") {
        if(onlinever == "GANDA") {
          alert += "Pasien sudah terdaftar hari ini. Pasien BPJS hanya bisa didaftarkan satu kali dalam sehari.\n "
        } else if(onlinever == "DATA TIDAK DITEMUKAN") {
          alert += "Data pasien tidak ditemukan di database BPJS. Periksa kembali no kartu yang diisikan, lalu ulang proses verifikasi.\n "
        } else {
          if(nik || nokartu.length > 0 && onlinever.length > 0) {
            if(!(ppk == "1" && kartu == "1" && aktif == "1")) {
              if(ppk == "0") {
                alert += "Pasien terdaftar di PPK lain.\n ";
              }
              if(kartu == "0") {
                alert += "Masa berlaku kartu BPJS pasien telah berakhir.\n ";
              }
              if(aktif == "0") {
                alert += "ada masalah dengan pembayaran iuran (status pasien non-aktif). Layanan sebagai peserta BPJS tidak dapat dilanjutkan.\n ";
              }
            }
          } else {
            alert += "No KS/JPS harus diisi, lalu diverifikasi.\n ";
          }
        }
      }

      // let item = await $.ajax({
      //   type:'post',
      //   url:'/j-care/visits/print_kartu',
      //   data
      // })
      
      // if(typeof item === 'string'){
      //   item = JSON.parse(item)
      // }
   
      // // let item = eval("(" + request.responseText + ")");
      let incumObj = false
      // let re = false
      // let send = false

      // if(item && item.err === 'OK'){
      //   if(item.ubah === 'FALSE'){
      //     item.ubah = 'TRUE'
      //     send = true
      //   }
      //   if(item.incum === 'TRUE') {
      //     let tglSkrg = $("#tglSkrg").val();
      //     if(tglDaftar !== tglSkrg) {
      //       send = true
      //     } else {
      //       send = false
      //       incumObj = 'PERHATIAN! PASIEN TERSEBUT SUDAH PERNAH BERKUNJUNG PADA HARI INI'
      //       alert += incumObj
      //     }
      //   }
      // } 

      // if(send) {
      let item = false

      // try {
        // re = await new Promise( resolve => 
        
      $.ajax({
        async: true,
        type: 'post',
        url: '/j-care/visits/save_visit/1',
        complete: request => {
          item = eval("(" + request.responseText + ")");
          // resolve(item)
        },
        data
      })
  
      // } catch(e){
      //   re = e
      // }
      // }

      return Object.assign({}, {
        alert: alert === '' ? undefined : alert,
        item: item? item: undefined,
        // request,
        // re: JSON.parse(JSON.stringify(re)),//: re? re: undefined,
        incum: incumObj ? incumObj : undefined
      })
      // return a
    }, {obj: dataDaftar, data, tglDaftar} );

    // console.log(re)

    // return re
  }

  async getDataPendaftaran({ poli, tglDaftar }) {
    let pol = {}
    pol[`data[Visit][unit_id][${poli}]`] = poli
    return Object.assign({}, this.serialToJSON( await this.simpusPage.evaluate(() => $('form:first').serializeArray())), {
      'data[Visit][ppk_cocok]': '1',
      kartu: '1',
      aktif: '1',
      'data[Visit][tanggal]': tglDaftar,
      'data[Visit][t]': tglDaftar,
    }, pol)
  }

  async daftarSimpus(tgl, poli, rm) {
    // let dial = ''
    spinner.start('daftar simpus')
		poli = poli.toLowerCase()
		let idPoli
		let bpjsPoliId
		this.config.pols.map( ( pol ) => {
			if( pol.alias && Array.isArray(pol.alias) && pol.alias.indexOf(poli) > -1 ) {
				idPoli = pol.id
				bpjsPoliId = pol.bpjs_id
			} 
		})
		if(!idPoli) {
			idPoli = '01'
		}
		if(!bpjsPoliId){
			bpjsPoliId = '001'
    }

    await this.initSimpus()
    
		await this.simpusPage.evaluate(tgl=> document.getElementById('tglDaftar').setAttribute('value', tgl), tgl)
		await this.simpusPage.click(`input.cb-unit-id[value='${idPoli}']`)
		await this.simpusPage.select('select#kdpoli', bpjsPoliId)
    await this.simpusPage.type('#patient_id', rm.id)
    
    let ne = await this.getDataPasien({id: rm.id, tglDaftar: tgl})

    // spinner.start(`${JSON.stringify(ne)}`)
    let dataDaftar = await this.getDataPendaftaran({poli: idPoli, tglDaftar: tgl})

    spinner.start(`${JSON.stringify(Object.assign({}, ne, dataDaftar))}`)

    let res = await this.simpanPendaftaran({dataDaftar, tglDaftar: tgl})

    // spinner.start(`${JSON.stringify(res)}`)

    let msg = await this.getTerdaftar(tgl, rm)

    let count = 0

    // spinner.succeed()
    while(msg == '' || count < 10 ){
      msg = await this.getTerdaftar(tgl, rm)
      count++
    }

    if(msg == ''){
      msg = 'Maaf, ada kesalahan sistem, pendaftaran gagal. \nMohon ulangi beberapa saat lagi.'
    }

    if(res.alert) {
      msg += res.alert
    }

    await this.simpusClose()

    return {
      dataDaftar: Object.assign({}, ne, dataDaftar),
      res,
      msg
    }
	}
	
  async data_kunj(tgl){
    // spinner.start(`data_kunj ${tgl}`)
    return await connect(`SELECT * FROM visits WHERE DATE(tanggal) = '${tgl}'`)
  }

  async getTerdaftar(tgl, rm) {

    // spinner.start(`start getTerdaftar ${rm.id}`)
    let terdaft = ''

		let res = await this.data_kunj(tgl.split('-').reverse().join('-'))

		if(res.length) for(let [i, r] of res.entries()) {
			let kun = {
				dateTime: r.tanggal,
				rm: r.patient_id,
				nik: r.nik,
				nama: r.nama,
				jk: r.sex_id == 1 ? 'L' : 'P',
				alamat: r.alamat,
				poli: this.config.unit[r.unit_id]
			}
			let kunnama = kun.nama.split(' ').join('')
			let rmnama = rm.nama.split(' ').join('')
			if(kun.rm.includes(rm.id.toUpperCase()), kunnama.includes(rmnama)){
				terdaft += `rekam medis ${rm.id.toUpperCase()} atas nama ${kun.nama} sudah terdaftar dgn no urut ${i+1}`
				return terdaft
			}
		}
		
		return terdaft

  }

  async daftar(hari, dddd, tgl, poli, rm){

    spinner.start(`daftar ${hari}, ${dddd}, ${tgl}, ${poli}, ${JSON.stringify(rm)}`)
    rm.nama = rm.nama.trim()
    let result = ''
  
    let terdaftar = await this.getTerdaftar(tgl, rm)
    if(terdaftar !== ''){
      result = terdaftar
    } else {
      result = await this.daftarSimpus(tgl, poli, rm)
    }

    if(hari === 'hariini'){
      hari = 'hari ini'
    }

    let res = {}

    if(typeof result !== 'string') {
      res = Object.assign({}, result)
      result = result.msg
    }
    
    if(result.includes('atas nama')) {
      let plnama = this.config.pols.filter( e => JSON.stringify(e).toLowerCase().includes(poli.toLowerCase())).map(({ unit }) => unit )[0]
      result = `${result}, ${hari}, ${dddd}, ${tgl} di poli tujuan ${plnama} untuk pelayanan ${poli.toUpperCase()}. \nSilahkan konfirmasi dengan loket pd hari kunjungan sebelum jam ${dddd === 'Jumat' || dddd === 'Sabtu' ? `10.00` : `11.00`} untuk mendapatkan nomor antrian poli tujuan.\n`
    }

    return Object.assign({}, res, {
      msg: result
    })

  }

  async daftarApi({ chatArr, result}) {
    let hari = chatArr.shift()
    hari = hari.toLowerCase().split(' ').join('')
    spinner.start(`daftarApi ${hari}`)
    // console.log(hari)
    let tgl = moment()
    let dddd
    switch(hari){
      case 'sekarang':
      case 'hari ini':
      case 'hariini':
        if(this.config.DAFTAR_HARI_INI  && this.config.PUSKESMAS !== 'Pajang') {
          // tgl = moment().add(0, 'd')
          let jam = tgl.format('H')
          if(this.config.PUSKESMAS !== 'Jayengan'){
            if(jam >= 8) {
              // console.log(`${new Date()} request masuk jam: ${jam}`)
              result = 'Pendaftaran via whatsapp untuk hari ini ditutup pukul 08.00\n'
              return result
            }
          } else {
            if(jam >= 10) {
              // console.log(`${new Date()} request masuk jam: ${jam}`)
              result = 'Pendaftaran via whatsapp untuk hari ini ditutup pukul 10.00\n'
              return result
            }
          }
        }
        break
      case 'besok':
      case 'besuk':
        tgl = tgl.add(1, 'd')
        if(!this.config.DAFTAR_HARI_INI){
          let jam = tgl.format('H')
          if(jam >= 21 && this.config.PUSKESMAS === 'Pajang') {
            // console.log(`${new Date()} request masuk jam: ${jam}`)
            result = 'Pendaftaran via whatsapp untuk besok ditutup pukul 21.00\n'
            return result
          }
        }
        break
      case 'lusa':
        tgl = tgl.add(2, 'd')
        break
      default:
        return `Hari periksa tidak sesuai referensi sistem.\nGunakan ${this.config.DAFTAR_HARI_INI ? '#sekarang, #hariini,': ''} #besok, #besuk atau #lusa.`
    }

    if(!result){
      let tgll = tgl.format('YYYY-MM-DD')
      dddd = tgl.format('dddd')

      // console.log(tgll, dddd)

      if (tgl.weekday() == 6) {
        result = `Pelayanan rawat jalan ${tgl.format('dddd, D-M-YYYY')} tutup.\n`
        return result
      } else {
        let isMasuk = await this.libur(tgll)

        // console.log(isMasuk)

        if(!isMasuk) {
          return `Pelayanan rawat jalan ${tgl.format('dddd, D-M-YYYY')} tutup.\n`
        } else {
          let poli = chatArr.shift().toLowerCase()
          if(poli.includes('poli')) {
            poli = poli.split('poli').join('')
          }
          poli = poli.trim()
          let ada = this.config.polArr.filter(e => e == poli)
          if(ada.length){

            if(this.config.jadwal[poli] && Array.isArray(this.config.jadwal[poli]) && this.config.jadwal[poli].indexOf(tgl.weekday()) === -1 ){
              return `poli ${poli} hanya buka hari ${this.config.jadwal[poli].map(e => moment( e, 'e').format('dddd').join(', '))}`
            }

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

            let umurArr = moment(rm[0].tgl_lahir).fromNow().split(' ').slice(0, 2)
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
            } else if(poli==='kb') {
              if(umur <= 6) {
                return `untuk pemeriksaan balita mohon ganti poli ke mtbs atau imunisasi.\n`								
              } else if(umur <= 15){
                return `usia terdaftar kurang dari 15 tahun, mohon cek kembali nama poli.\n`								
              }
            } else if(poli==='kia' && umur <= 5) {
              return `untuk pemeriksaan balita mohon ganti poli ke mtbs atau imunisasi.\n`								
            }

            let tgld = tgl.format('DD-MM-YYYY')

            spinner.start(dddd, tgld, poli)

            return await this.daftar(hari, dddd, tgld, poli, rm[0])

          } else {
            return `Parameter ketiga adalah nama poli.\nNama poli tidak sesuai referensi sistem.\nGunakan: ${this.config.polArr.map(e=>`#${e},`).join(' ')}.`
          }
        }

      }

    }
  }

  addLiburnas(obj){
    return db.get('liburnas').push(obj).write()
  }

  async scrapeLiburnas(tahun) {
    spinner.start(`scrape libur nasional tahun ${tahun}`)
    if(!tahun){
      tahun = moment().format('YYYY')
    }
    if(!this.pages){
      this.browser = await pptr.launch(this.config.pptrOpt);
      this.pages = await this.browser.pages()
    }

    if(!this.liburPage) {
      while(!this.pages[2]){
        await this.browser.newPage()
        this.pages = await this.browser.pages()
      } 
      this.liburPage = this.pages[2]
    }

    await this.liburPage.goto(`${this.config.LIBURNAS_URL}-${tahun}/`, this.config.waitOpt)

    let liburArr = await this.liburPage.evaluate(()=>{
			let libArr = []
			$($('.row.row-eq-height.libnas-content').html()).map((id, e)=>{
				let ket = $(e).find('strong > a').text()
				let lib = $(e).find('time.libnas-calendar-holiday-datemonth').text()
				if(lib.indexOf('-') > -1) {
					let libRange = lib.split('-')
					let start = Number(libRange[0].trim())
					let endArr = libRange[1].trim().split(' ')
					let tahun = endArr[2]
					let bulan = endArr[1]
					let end = Number(endArr[0])
					for (let i = start; i <= end; i++) {
						libArr.push({
							date: [i, bulan, tahun].join(' '),
							ket: ket,
							tahun: tahun
						})
					}
				} else if(lib){		
					libArr.push({
						date: lib,
						ket: ket,
						tahun: lib.split(' ')[2]
					})
				}
			})
			return libArr
    })

    if(this.liburPage) {
      await this.liburPage.close()
      this.pages = await this.browser.pages()
      this.liburPage = undefined
    }

    liburArr = liburArr.map(e => Object.assign({}, e, {
      id: moment(e.date, 'D MMMM YYYY').format('YYYYMMDD')
    }))

    for (let l of liburArr) {
      this.addLiburnas(l)
    }

    spinner.succeed(`${liburArr.length} hari libur nasional`)

    return liburArr

  }

  async getLiburnasByThn(tahun) {
    let liburArr = db.get('liburnas').filter({ tahun }).value()
    if(liburArr && Array.isArray(liburArr) && liburArr.length){
      return liburArr
    } 
    return await this.scrapeLiburnas(tahun)
  }

  async libur(tgl){
    let liburArr = (await this.getLiburnasByThn(moment(tgl, 'YYYY-MM-DD').format('YYYY'))).map(tgl=>moment(tgl, 'D MMMM YYYY').format('YYYY-MM-DD'))
    if(liburArr.indexOf(tgl) === -1){
      return true		
    }
    return false
  }

}
