const getconn = require('./_mysqlconn')
const { pool } = getconn()
const {
	RM_REGEX,
	BPJS_REGEX,
	NIK_REGEX
} = require('../config')

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

module.exports = async (chatArr) => await new Promise ( resolve =>{
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
