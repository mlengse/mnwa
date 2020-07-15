const data_kunj = require('./_data_kunj')

module.exports = async(tgl, unit) => {
	console.log(unit)
		
	let terdaft = ''
	let res = await data_kunj(tgl.split('-').reverse().join('-'))
	
	let daftArr=[]
	if(res.length) for(let i=0; i < res.length ; i++) {
	
		let r = res[i]
		let kun = {
			dateTime: r.tanggal,
			rm: r.patient_id,
			nik: r.nik,
			nama: r.nama,
			jk: r.sex_id == 1 ? 'L' : 'P',
			alamat: r.alamat,
			poli: unit[r.unit_id]
		}
	
		daftArr[daftArr.length] = `rekam medis ${kun.rm} atas nama ${kun.nama} sudah terdaftar dgn no urut ${1+daftArr.length} di ${kun.poli}\n`
	
	}

	
	daftArr.length ? terdaft = daftArr.join('') : terdaft = `belum ada daftar kunjungan untuk tgl ${tgl}.\n`
	
	return terdaft
}