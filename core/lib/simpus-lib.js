exports._daftarApi = async ({ that, chatArr, result}) => {
  let hari = chatArr.shift()
  hari = hari.toLowerCase().split(' ').join('')
  that.spinner.start(`daftarApi ${hari}`)
  // console.log(hari)
  let tgl = that.getTglHariIni()
  let dddd
  switch(hari){
    case 'sekarang':
    case 'hari ini':
    case 'hariini':
      if(that.config.DAFTAR_HARI_INI  && that.config.PUSKESMAS !== 'Pajang') {
        let jam = that.getJamBy(tgl)
        if(that.config.PUSKESMAS !== 'Jayengan'){
          if(jam >= 8) {
            result = 'Pendaftaran via whatsapp untuk hari ini ditutup pukul 08.00\n'
            return result
          }
        } else {
          if(jam >= 10) {
            result = 'Pendaftaran via whatsapp untuk hari ini ditutup pukul 10.00\n'
            return result
          }
        }
      }
      break
    case 'besok':
    case 'besuk':
      tgl = that.getTglBesokBy(tgl)
      if(!that.config.DAFTAR_HARI_INI){
        let jam = that.getJamBy(tgl)
        if(jam >= 21 && that.config.PUSKESMAS === 'Pajang') {
          result = 'Pendaftaran via whatsapp untuk besok ditutup pukul 21.00\n'
          return result
        }
      }
      break
    case 'lusa':
      tgl = that.getTglLusaBy(tgl)
      break
    default:
      return `Hari periksa tidak sesuai referensi sistem.\nGunakan ${that.config.DAFTAR_HARI_INI ? '#sekarang, #hariini,': ''} #besok, #besuk atau #lusa.`
  }

  if(!result){
    let tgll = that.getFormat3(tgl)
    dddd = that.getHariBy(tgl)

    if (that.isMinggu(tgl)) {
      result = `Pelayanan rawat jalan ${that.getFormat5(tgl)} tutup.\n`
      return result
    } else {
      let isMasuk = await that.libur({tgl: tgll})

      if(!isMasuk) {
        return `Pelayanan rawat jalan ${that.getFormat5(tgl)} tutup.\n`
      } else {
        let poli = chatArr.shift().toLowerCase()
        if(poli.includes('poli')) {
          poli = poli.split('poli').join('')
        }
        poli = poli.trim()
        let ada = that.config.polArr.filter(e => e == poli)
        if(ada.length){

          if(that.config.jadwal[poli] && Array.isArray(that.config.jadwal[poli]) && that.config.jadwal[poli].indexOf(tgl.weekday()) === -1 ){
            return `poli ${poli} hanya buka hari ${that.config.jadwal[poli].map(e => that.getHari(e))}`
          }

          if(poli === 'rujukan') {
            poli = 'umum'
          }

          let res = await that.cariFunc({chatArr})
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

          let umurArr = that.getUmurArr(rm[0].tgl_lahir)
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
            console.log("daftar kia", poli, umur, umurArr)
            return `untuk pemeriksaan balita mohon ganti poli ke mtbs atau imunisasi.\n`								
          }

          let tgld = that.getFormat6(tgl)

          that.spinner.start(dddd, tgld, poli)

          return await that.daftar({hari, dddd, tgl: tgld, poli, rm: rm[0]})

        } else {
          return `Parameter ketiga adalah nama poli.\nNama poli tidak sesuai referensi sistem.\nGunakan: ${that.config.polArr.map(e=>`#${e},`).join(' ')}.`
        }
      }

    }

  }
}

exports._daftar = async ({that, hari, dddd, tgl, poli, rm}) => {

  that.spinner.start(`daftar ${hari}, ${dddd}, ${tgl}, ${poli}, ${JSON.stringify(rm)}`)
  rm.nama = rm.nama.trim()
  let result = ''

  let terdaftar = await that.getTerdaftar({tgl, rm})
  if(terdaftar !== ''){
    result = terdaftar
  } else {
    result = await that.daftarSimpus({tgl, poli, rm})
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
    let plnama = that.config.pols.filter( e => JSON.stringify(e).toLowerCase().includes(poli.toLowerCase())).map(({ unit }) => unit )[0]
    result = `${result}, ${hari}, ${dddd}, ${tgl} di poli tujuan ${plnama} untuk pelayanan ${poli.toUpperCase()}. \nSilahkan konfirmasi dengan loket pd hari kunjungan sebelum jam ${dddd === 'Jumat' || dddd === 'Sabtu' ? `10.00` : `11.00`} untuk mendapatkan nomor antrian poli tujuan.\n`
  }

  return Object.assign({}, res, {
    msg: result
  })

}

exports._cariApi = async ({ that, chatArr }) => {
  // console.log(chatArr)
  let { result, resultArr } = await that.cariFunc({chatArr})

  // let result = res.result
  // let resultArr = res.resultArr

  if(resultArr.length < 20) {
    result += `Ditemukan ${resultArr.length} hasil${resultArr.length ? ':' : '.'}\n`

    for (let res of resultArr){
    result += `(${resultArr.indexOf(res) + 1}) `
      for (let prop in res){
        if(prop == 'sex_id'  && res[prop]){
          (res[prop] == '1') ? result += `Laki-laki | ` : result += `Perempuan | `
        } else if(prop == 'village_id'  && res[prop]){
          let village = that.config.village 
          for( let v of village){
            if(res[prop] === v.id){
              result += `${v.desa} | `
            }
          }
        } else if(prop == 'orchard_id' && res[prop]) {
          result += `RW: ${res[prop].slice(-2)} | `
        } else if(prop == 'tgl_lahir' && res[prop]) {
          result += `lahir: ${that.getTglLahir(res[prop])} | `
          let umur = that.getUmur(res[prop])
          if(umur == 'setahun yang'){
            umur = '1 tahun'
          }
          result += `${umur} | `
        } else  if(res[prop]){
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

exports._getTerdaftar = async ({that, tgl, rm}) => {

  let terdaft = ''

  let res = await that.dataKunj({
    tgl: tgl.split('-').reverse().join('-')
  })

  if(res.length) for(let [i, r] of res.entries()) {
    let kun = {
      dateTime: r.tanggal,
      rm: r.patient_id,
      nik: r.nik,
      nama: r.nama,
      jk: r.sex_id == 1 ? 'L' : 'P',
      alamat: r.alamat,
      poli: that.config.unit[r.unit_id]
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

exports._daftarSimpus = async ({that, tgl, poli, rm}) => {
  that.spinner.start('daftar simpus')
  poli = poli.toLowerCase()
  let idPoli
  let bpjsPoliId
  that.config.pols.map( ( pol ) => {
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

  await that.initSimpus()
  
  await that.simpusPage.evaluate(tgl=> document.getElementById('tglDaftar').setAttribute('value', tgl), tgl)
  await that.simpusPage.click(`input.cb-unit-id[value='${idPoli}']`)
  await that.simpusPage.select('select#kdpoli', bpjsPoliId)
  await that.simpusPage.type('#patient_id', rm.id)
  
  let ne = await that.getDataPasien({id: rm.id, tglDaftar: tgl})

  let dataDaftar = await that.getDataPendaftaran({poli: idPoli, tglDaftar: tgl})

  that.spinner.start(`${JSON.stringify(Object.assign({}, ne, dataDaftar))}`)

  let res = await that.simpanPendaftaran({dataDaftar, tglDaftar: tgl})

  let msg = await that.getTerdaftar({tgl, rm})

  let count = 0

  while(msg == '' || count < 10 ){
    msg = await that.getTerdaftar({tgl, rm})
    count++
  }

  if(msg == ''){
    msg = 'Maaf, ada kesalahan sistem, pendaftaran gagal. \nMohon ulangi beberapa saat lagi.'
  }

  if(res.alert) {
    msg += res.alert
  }

  await that.simpusClose()

  return {
    // dataDaftar: Object.assign({}, ne, dataDaftar),
    res,
    msg
  }
}

exports._simpanPendaftaran = async ( { that, dataDaftar, tglDaftar} ) => {
  let data = that.getParams(dataDaftar)
  that.spinner.start(`simpanPendaftaran ${tglDaftar} ${JSON.stringify(dataDaftar)}`)
  return await that.simpusPage.evaluate( ({ obj, data }) => {
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
        if(nik || nokartu && nokartu.length > 0 && onlinever && onlinever.length > 0) {
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

    let incumObj = false
    let item = false

    $.ajax({
      async: true,
      type: 'post',
      url: '/j-care/visits/save_visit/1',
      complete: request => {
        item = eval("(" + request.responseText + ")");
      },
      data
    })

    return Object.assign({}, {
      alert: alert === '' ? undefined : alert,
      item: item? item: undefined,
      incum: incumObj ? incumObj : undefined
    })
  }, {obj: dataDaftar, data} );

}

exports._getDataPendaftaran = async ({ that, poli, tglDaftar }) => {
  let pol = {}
  pol[`data[Visit][unit_id][${poli}]`] = poli
  return Object.assign({}, that.serialToJSON( await that.simpusPage.evaluate(() => $('form:first').serializeArray())), {
    'data[Visit][ppk_cocok]': '1',
    kartu: '1',
    aktif: '1',
    'data[Visit][tanggal]': tglDaftar,
    'data[Visit][t]': tglDaftar,
  }, pol)
}

exports._getDataPasien =  async ({that, id, tglDaftar}) => {
  that.spinner.start('getDataPasien')
  let ne = await that.simpusPage.evaluate(async pid =>{
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

  if(ne.no_kartu) {
    return Object.assign({}, ne, await that.getVerBPJS({
      noks:ne.no_kartu,
      tglDaftar
    }))
  }
  return ne
}

exports._getVerBPJS =  async ({ that, noks, tglDaftar }) => {
  that.spinner.start('getVerBPJS')
  return await that.simpusPage.evaluate(async({ noks, tglDaftar, kdpoli })=> {
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

exports._simpusClose = async ({ that }) => {
  if(that.simpusPage) {
    await that.simpusPage.close()
    that.pages = await that.browser.pages()
    that.simpusPage = undefined
  }
}
