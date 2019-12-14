const getconn = require('./_mysqlconn')
const { pool } = getconn
const {
	RM_REGEX,
	BPJS_REGEX,
	NIK_REGEX
} = require('../../config')

const pad = (n, width, z) => {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

const findQuery = Arr => {
	//console.log(Arr)
	let query = 'SELECT `id`, `nama`, `tgl_lahir`, `sex_id`, `alamat`,  `orchard_id`, `village_id`, `nik`, `no_kartu`, `no_hp` FROM `patients`';

	let params = Arr.shift()

//	params = params.LowerCase()

	if(params) {
		if(params.match(/^([0-9]*)$/) && params.length < 6){
			let oldParams = params
			params = pad(params, 6)
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
		} //else if(params.match(/^(08)([0-9]){1,12}$/)) {
			//query +=  ' WHERE (`no_hp` LIKE "' + params + '%")';
		//} 
	
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
			//} else if(params.match(/^(08)([0-9]){1,12}$/)) {
			//	query +=  ' AND (`no_hp` LIKE "' + params + '%")';
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

	//console.log(query)

	return query;
}

const cari = async (chatArr) => await new Promise ( resolve =>{
	let chArr = []
	for(let eachChatArr of chatArr){
		if(eachChatArr.trim() !=='') {
			chArr.push(eachChatArr)
		}
	}

	let query = findQuery(chatArr)

	//console.log(query)

	if(query !== 'SELECT `id`, `nama`, `tgl_lahir`, `sex_id`, `alamat`,  `orchard_id`, `village_id`, `nik`, `no_kartu`, `no_hp` FROM `patients`') {
		pool.getConnection( (err, connection) => {
			err ? console.error(`${new Date()} error: ${err.stack}`) : '' //console.log(`connected id: ${connection.threadId}`);
			connection.query(query, (err, results, fields) => {
				let res = []
				err ? console.error(`${new Date()} error querying`) : ''

				for(let result of results) {
					for(let prop in result){
						if(result[prop] == '' || result[prop] == undefined) {
							delete result[prop]
						}
					}

					//console.log(result)

					if (res.length <= 100) {
						//if (result.id.match(RM_REGEX)) {
						res.push(JSON.parse(JSON.stringify(result)))
						//}
					} else {
						break
					}
				}

				connection.release()
				resolve(res)					
			})
		})
	
	} else {
		resolve([])
	}

})


const cariFunc = async (chatArr, result ) => {
	if(typeof result === 'undefined'){
		result = ''
	}
	let newParams = [...chatArr].map(e=> e.trim())

	let resultArr = await cari(chatArr)

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
			resultArr = await cari([...naParams.split('#')])
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
					resultArr = await cari([...nbParams])
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
						//console.log(cParams)
						resultArr = await cari([...cParams])
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

module.exports = {
 cariFunc,
 cari,
 findQuery,
 pad
}