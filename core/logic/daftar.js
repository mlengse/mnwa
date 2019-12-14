const Libur = require('../db/liburnas')
const { connect } = require('../db/_mysqlconn')
const { 
  cariFunc
} = require('../db/_cari')

module.exports = class Daftar extends Libur {
  constructor(config){
    super(config)
    this.connect = connect
    this.cariFunc = cariFunc
  }

  async data_kunj(tgl){
    return await this.connect(`SELECT * FROM visits WHERE DATE(tanggal) = '${tgl}'`)
  }

  async getTerdaftar(tgl, rm) {
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

  async daftarSimpus(tgl, rm) {
    let dial = ''
    this.spinner.start('daftar simpus')
    if(!this.pages){
      this.browser = await this.pptr.launch(this.config.pptrOpt);
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
        console.log(`${new Date()} ${dialog.type()}`)
        if(dial !== '') console.log(`${new Date()} ${dial}`)
        if(dialog.type() === 'alert'){
          await dialog.dismiss()
        } else {
          await dialog.accept()
        }
    
      })

    }

	
		await this.simpusPage.goto(this.config.SIMPUS_URL, {
			waitUntil: 'networkidle0'
		})
		let notLogin = await this.simpusPage.$('#UserUsername')
		if(notLogin) {
			await this.simpusPage.type('#UserUsername', this.config.SIMPUS_USER)
			await this.simpusPage.type('#UserPassword', this.config.SIMPUS_PWD)
			await this.simpusPage.click('input[type="submit"][value="LOGIN"]')
		}

		await this.simpusPage.goto(`${this.config.SIMPUS_URL}visits/add_registrasi`, {
			waitUntil: 'networkidle0'
		})
		
		await this.simpusPage.evaluate(tgl=> document.getElementById('tglDaftar').setAttribute('value', tgl), tgl)
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

		await this.simpusPage.click(`input.cb-unit-id[value='${idPoli}']`)

		await this.simpusPage.select('select#kdpoli', bpjsPoliId)

		console.log('will search')

		await this.simpusPage.type('#patient_id', rm.id)

		console.log('type id patient done')

		await this.simpusPage.click('#searchidbtn')

		let ada
		while(!ada){
			ada = await this.simpusPage.evaluate(id => {
				let el = document.querySelector(`td.radio_selector > input[value="${id}"]`)
				if(el) {
					el.click()
					return true
				}
				return false
			}, rm.id)
		}

		let cariBtn
		while(!cariBtn){
			cariBtn = await this.simpusPage.evaluate(() => {
				let btnArr = document.querySelectorAll('button.btn.btn-success')
				for(let btn of btnArr){
					if(btn.textContent.includes('PILIH')){
						btn.click()
						return true
					}
				}
				return false
			})
		}

		if(rm.no_kartu && rm.no_kartu.length == 13){
			console.log(`${new Date()} no kartu ${rm.no_kartu}`)
			let verified
			let inputed 
			while(!inputed || inputed.length !== 13) {
				inputed = await this.simpusPage.evaluate(()=> document.getElementById('noks').value)
			}

			let clicked = await this.simpusPage.evaluate(()=>{
				let a = document.getElementById('verifikasi_bpjs')
				if(a){
					a.click()
					return true
				}
				return false
			})
			console.log(clicked)
			if(clicked){
				while(!verified){
					verified = await this.simpusPage.evaluate(()=>{
						let resp = document.getElementById('online_verification').value
						return resp
					})

					if(verified === 'NOT OK') {
						await this.simpusPage.evaluate(() => document.getElementById('sbmt').click())
						verified = false
					}					

					if(dial) {
						verified = true
					}
				}				

				if(dial) {
					terdaftar += `${dial}\n`
				}

			}
			
		}
		let verTL
		let verJK
		while(!verTL || !verJK ){
			verJK = await this.simpusPage.evaluate(() => document.getElementById('sex').value)
			verTL = await this.simpusPage.evaluate(() => document.getElementById('tgllahir').value)
		}

		let verJP = await this.simpusPage.evaluate(()=> document.getElementById('typepatient').value)
		if(!verJP.includes('0')) {
			await this.simpusPage.select('#jenispasien', '01')
		} 
		
		await this.simpusPage.evaluate(()=> document.getElementById('sbmt').click())

		let ajax = ''
		lanjut = false
		let save2 = false
		while(!lanjut){
	
			let terdaf = await this.getTerdaftar(tgl, rm)
			if(terdaf !== ''){
				lanjut = true
				
			} 

			let ljtel = await this.simpusPage.evaluate(()=> document.getElementById('lanjut'))

			if(ljtel && !save2){
				console.log(`${new Date()} ${lanjut}`)
				await this.simpusPage.evaluate(() => document.getElementById('lanjut').click())
				save2 = true
			}

			if(dial && dial.includes('BPJS tidak dapat dilanjutkan')) {
				terdaftar += dial
				lanjut = true
			}

			if(dial && dial.includes('berhasil')) {
				lanjut = true
			}

			let display = await this.simpusPage.evaluate(()=>document.getElementById('loading1').style.display)
			if(display === 'none'){
				await this.simpusPage.evaluate(()=> document.getElementById('sbmt').click())
			} 

			let ajaxel = await this.simpusPage.evaluate(()=>document.getElementById('ajaxMsg'))
			if(ajaxel) {
				ajax = await this.simpusPage.evaluate(()=>document.getElementById('ajaxMsg').innerText)
				console.log(`${new Date()} ajax msg ${ajax}`)
				lanjut = true
			}

    }	
    
		// await browser.close()
    
    terdaftar += await this.getTerdaftar(tgl, rm)

    this.spinner.succeed()
    
    if(terdaftar !== ''){
			return terdaftar
		} else {
			return 'Maaf, ada kesalahan sistem, pendaftaran gagal. \nMohon ulangi beberapa saat lagi.'
		}

  }

  async daftar(hari, dddd, tgl, poli, rm){
    rm.nama = rm.nama.trim()
    let result = ''
  
    let terdaftar = await this.getTerdaftar(tgl, rm)


    if(terdaftar !== ''){
      result = terdaftar
    } else {
      // console.log(`${hari} ${dddd} ${tgl} ${poli} ${rm}`)
      result = await this.daftarSimpus(tgl, rm)
    }

    if(hari === 'hariini'){
      hari = 'hari ini'
    }
    
    if(result.includes('atas nama')) {
      return `${result}, ${hari}, ${dddd}, ${tgl} di poli tujuan ${poli.toUpperCase()}. \nSilahkan konfirmasi dengan loket pd hari kunjungan untuk mendapatkan nomor antrian poli tujuan.\n`
    }

    return `${result}`

  }

  async daftarApi({ chatArr, result}) {
    this.spinner.start('daftar')
    let hari = chatArr.shift()
    hari = hari.toLowerCase().replace(' ', '')
    let tgl
    let dddd
    switch(hari){
      case 'sekarang':
      case 'hariini':
        tgl = this.moment().add(0, 'd')
        let jam = tgl.format('H')
        if(jam >= 8) {
          // console.log(`${new Date()} request masuk jam: ${jam}`)
          result = 'Pendaftaran via whatsapp untuk hari ini ditutup pukul 08.00\n'
          return result
        }
        break
      case 'besok':
      case 'besuk':
        tgl = this.moment().add(1, 'd')
        break
      case 'lusa':
        tgl = this.moment().add(2, 'd')
        break
      default:
        return 'Hari periksa tidak sesuai referensi sistem.\nGunakan #sekarang, #hariini, #besok, #besuk atau #lusa.'
    }
    if(!result){
      let tgll = tgl.format('YYYY-MM-DD')
      dddd = tgl.format('dddd')

      if (tgl.weekday() == 6) {
        result = `Pelayanan rawat jalan ${tgl.format('dddd, D-M-YYYY')} tutup.\n`
        return result
      } else {
        let isMasuk = await this.libur(tgll)

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

            if(poli === 'imunisasi' && tgl.weekday() !== 1 ) {
              return `poli imunisasi hanya buka hari Selasa.\n`
            }

            if(poli === 'rujukan') {
              poli = 'umum'
            }

            let res = await this.cariFunc(chatArr)
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

            let umurArr = this.moment(rm[0].tgl_lahir).fromNow().split(' ').slice(0, 2)
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

            let tgld = tgl.format('DD-MM-YYYY')

            return await this.daftar(hari, dddd, tgld, poli, rm[0])

          } else {
            return `Parameter ketiga adalah nama poli.\nNama poli tidak sesuai referensi sistem.\nGunakan: ${poliArr.map(e=>`#${e},`).join(' ')}.`
          }
        }

      }

    }
  }
}
