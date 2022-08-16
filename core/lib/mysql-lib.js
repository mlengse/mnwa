const mysql = require('mysql')
const {
	MYSQL_HOST,
	MYSQL_USER,
	MYSQL_PWD,
	MYSQL_DB,
	RM_REGEX,
	BPJS_REGEX,
	NIK_REGEX
} = require('../../config')

// let connection = false

// exports.getConnection = () => {
// 	connection = mysql.createConnection({
// 		// connectionLimit: 10,
// 		host: MYSQL_HOST,
// 		user: MYSQL_USER,
// 		password: MYSQL_PWD,
// 		database: MYSQL_DB
// 	})

// 	return connection
// }

exports.connect = async query => {
  // if(!connection){
		// connection = this.getConnection()
	// }
		const connection = mysql.createConnection({
			// connectionLimit: 10,
			host: MYSQL_HOST,
			user: MYSQL_USER,
			password: MYSQL_PWD,
			database: MYSQL_DB
		})

		connection.connect()

		let returnedResults = await new Promise( resolve => {
			connection.query(query, (err, results, fields) => {
				err ? console.error(`${new Date()} ${query} error: ${JSON.stringify(err.stack)}`) : null;
				resolve(results)
				// returnedResults = results
				// console.log(returnedResults)
			})
		})


		// queryStream
		// 	.on('error', function(err) {
		// 		console.error(`${new Date()} ${query} error: ${JSON.stringify(err.stack)}`);
		// 		// Handle error, an 'end' event will be emitted after this as well
		// 	})
			// .on('fields', function(fields) {
			// 	// the field packets for the rows to follow
			// })
			// .on('result', function(row) {
			// 	// Pausing the connnection is useful if your processing involves I/O
			// 	connection.pause();

			// 	processRow(row, function() {
			// 		connection.resume();
			// 	});
			// })
			// .on('end', function() {
			// 	connection.end()
			// 	// all rows have been received
			// });

		// console.log(returnedResults)
		
		connection.end()

		// connection = false

		return returnedResults

		// resolve(returnedResults)

	// })
}

exports.pad = (n, width, z) => {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

exports.isIterable = object => object != null && typeof object[Symbol.iterator] === 'function'

exports._getVillages = async ({ that }) => {
	that.config.village = await this.connect('SELECT `id`, `desa` FROM `villages`')
}
exports._getUnits = async ({ that }) => {
  let units = await this.connect('SELECT * FROM units')
  that.config.pols = that.config.pols.map(e => {
    for( let b of e.alias) {
      for(let u of units){
        if(u.unit.toLowerCase().includes(b)){
          return Object.assign({}, e, u)
        }
      }
    }
    return e
  })

  that.config.polArr = []

  that.config.unit = {}

  that.config.pols.map(({ 
    alias, 
    id, 
    unit 
  }) => {
    if(alias && Array.isArray(alias) ){
      alias.map( e => that.config.polArr.push(e))
    }
    if(id !== undefined ) {
      that.config.unit[id] = unit
    }
  })

  that.config.polArr = [...new Set(that.config.polArr)]
}

exports._dataKunj = async ({ tgl }) => await this.connect(`SELECT * FROM visits WHERE DATE(tanggal) = '${tgl}'`)

exports.findQuery = Arr => {
	let query = 'SELECT `id`, `nama`, `tgl_lahir`, `sex_id`, `alamat`,  `orchard_id`, `village_id`, `nik`, `no_kartu`, `no_hp` FROM `patients`';
	let params = Arr.shift()
	if(params) {
		if(params.match(/^([0-9]*)$/) && params.length < 6){
			let oldParams = params
			params = this.pad(params, 6)
			console.log(`change parameter from ${oldParams} to ${params}`)
		}
		if(params.match(/^([^0-9]*)$/)) {
			query +=  ' WHERE ( `nama` LIKE "%' + params.trim() + '%")';
		} else if(params.match(RM_REGEX)) {
			query +=  ' WHERE (`id` LIKE "' + params + '%")';
		} else if(params.match(BPJS_REGEX)) {
			query +=  ' WHERE (`no_kartu` LIKE "' + params + '%")';
		} else if(params.match(NIK_REGEX)) {
			query +=  ' WHERE (`nik` LIKE "' + params + '%")';
		} 
	}

	while(Arr.length){
		params = Arr.shift()

		if(params) {
			if(params.match(/^([0-9]*)$/) && params.length < 6){
				let oldParams = params
				params = pad(params, 6)
				console.log(`change parameter from ${oldParams} to ${params}`)
			}

			if(params.match(RM_REGEX)) {
				query +=  ' AND (`id` LIKE "' + params + '%")';
			} else if(params.match(BPJS_REGEX)) {
				query +=  ' AND (`no_kartu` LIKE "' + params + '%")';
			} else if(params.match(NIK_REGEX)) {
				query +=  ' AND (`nik` LIKE "' + params + '%")';
			} else {
				if(query.includes('( `nama` LIKE')) {
					query +=  ' AND ( LOWER(`alamat`) LIKE LOWER("%' + params.trim().toLowerCase() + '%"))';
				} else {
					query +=  ' AND ( `nama` LIKE "%' + params.trim() + '%")';
				}
			}
		}
	}
	return query;
}

exports._cari = async ({ chatArr }) => {
	let chArr = []
	for(let eachChatArr of chatArr){
		if(eachChatArr.trim() !=='') {
			chArr.push(eachChatArr)
		}
	}

	let query = this.findQuery(chatArr)

	if(query !== 'SELECT `id`, `nama`, `tgl_lahir`, `sex_id`, `alamat`,  `orchard_id`, `village_id`, `nik`, `no_kartu`, `no_hp` FROM `patients`') {
		let res = await this.connect(query)
		if( Array.isArray(res) && res.length ){
			return res
		}
		return []
	} else {
		return []
	}

}

exports._cariFunc = async ({ chatArr, result} ) => {
	if(typeof result === 'undefined'){
		result = ''
	}
	let newParams = [...chatArr].map(e=> e.trim())

	let resultArr = await this._cari({chatArr})

	if(resultArr.length > 20){
		result += `Ditemukan ${resultArr.length} hasil${resultArr.length ? ':' : '.'}\n`
		result += `Mohon parameter pencarian dipersempit.\n`
		resultArr.length = 0
	}


	while(newParams.length && !resultArr.length) {
		let naParams = [...newParams]
		naParams = naParams.join('#')
		while(naParams.includes(' ')  && !resultArr.length) {
			naParams = naParams.split(' ')
			naParams.pop()
			naParams = naParams.join(' ')
			resultArr = await this._cari({
        chatArr: [...naParams.split('#')]
      })
			if(resultArr.length) {
				result += `mencoba\n#cari#${naParams}\n`
				result += `Ditemukan ${resultArr.length} hasil${resultArr.length ? ':' : '.'}\n`
			}
		}

		let nbParams = [...newParams]

		for ( let [id, noParams] of newParams.entries()) { 
			if(!noParams.match(RM_REGEX)) {
				while(noParams.length > 6 && !resultArr.length) {
					noParams = noParams.slice(0, -1)
					nbParams[id] = noParams
					resultArr = await this._cari({
            chatArr: [...nbParams]
          })
					if(resultArr.length) {
						result += `mencoba #cari#${nbParams.join('#')}\n`
						result += `Ditemukan ${resultArr.length} hasil${resultArr.length ? ':' : '.'}\n`
					}
				}
			}
		}
		
		let aParams = [...newParams]

		aParams.shift()
		while(aParams.length && !resultArr.length ) {
			for ( let [id, noParams] of aParams.entries()) {
				let cParams = [...aParams] 
				if(!noParams.match(RM_REGEX)) {
					while(noParams.length > 6 && !resultArr.length) {
						noParams = noParams.slice(0, -1)
						cParams[id] = noParams
						resultArr = await this._cari({
							chatArr: [...cParams]
						})
						if(resultArr.length) {
							result += `mencoba #cari#${cParams.join('#')}\n`
							result += `Ditemukan ${resultArr.length} hasil${resultArr.length ? ':' : '.'}\n`
						}
					}
				}
			}

			aParams.shift()
		}
		
		newParams.pop()
	}

	return {
		result,
		resultArr
	}

}

exports._cekDaftar = async ({ that, tgl }) => {

	that.spinner.start(`cek daftar ${tgl}`)
	let terdaft = ''
	let res = await this._dataKunj({tgl: tgl.split('-').reverse().join('-')})
	
	let daftArr=[]
	if (res.length) for(let i=0; i < res.length ; i++) {
	
		let r = res[i]
		let kun = {
			dateTime: r.tanggal,
			rm: r.patient_id,
			nik: r.nik,
			nama: r.nama,
			jk: r.sex_id == 1 ? 'L' : 'P',
			alamat: r.alamat,
			poli: that.config.unit[r.unit_id]
		}
	
		daftArr[daftArr.length] = `rekam medis ${kun.rm} atas nama ${kun.nama} sudah terdaftar${/* dgn no urut ${1+daftArr.length}*/''} di ${kun.poli}\n`
	
	}

	daftArr.length ? terdaft = daftArr.join('') : terdaft = `belum ada daftar kunjungan untuk tgl ${tgl}.\n`
	
	return terdaft
}

exports._getPatient = async ({event}) => {
  let after, res, re, all

  if( event.row && event.row.patient_id) {
    after = event.row

    try{
      res = await this.connect(`SELECT * FROM patients WHERE id = "${after.patient_id}"`)
      re = res[0]
      all = Object.assign({}, after, {
        visit_id: after.id
      }, re)

      if( all.no_hp && !all.no_hp.match(/^(08)([0-9]){1,12}$/) && after.no_kartu && after.no_kartu.match(BPJS_REGEX)) {
        re = null
        res = await this.connect(`SELECT * FROM bpjs_verifications WHERE no_bpjs = "${after.no_kartu}"`)
        if(res[0] && res[0].json_response && res[0].json_response.response) {
          re = JSON.parse(res[0].json_response.response)
          all = Object.assign({}, all, re)

          if(all.noHP && all.noHP.match(/^(08)([0-9]){1,12}$/)) {
            all.no_hp = all.noHP
          }

        }
      }

      if(all.no_hp && all.no_hp.match(/^(08)([0-9]){1,12}$/)) {
        for(let prop in all){
          if(all[prop] === '' || !all[prop]){
            delete all[prop]
          }
        }

      // } else if(event.type === 'INSERT') {
        // console.log(`new event => type: ${event.type}, tgl: ${tglDaftar}, jam: ${jam}, tdk ada no hp`)
      }

    }catch(err) {
      console.error(`${new Date()} ${err}`)
    }
  }

  return all

}