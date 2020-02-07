const moment = require('moment')
moment.locale('id')

const { connect } = require('./core/db/_mysqlconn')

const { 
  BPJS_REGEX,
} = require('./config')

module.exports = async event => {
  let after, res, re, all
  // let tglDaftar = moment(event.timestamp, 'x').format('DD-MM-YYYY')
  // let jam = moment(event.timestamp, 'x').format('H')

  if( event.row && event.row.patient_id) {
  // if( event.affectedRows.length && event.affectedRows[0].after && event.affectedRows[0].after.patient_id) {
    after = event.row

    try{
      res = await connect(`SELECT * FROM patients WHERE id = "${after.patient_id}"`)
      re = res[0]
      all = Object.assign({}, after, {
        visit_id: after.id
      }, re)

      if( all.no_hp && !all.no_hp.match(/^(08)([0-9]){1,12}$/) && after.no_kartu && after.no_kartu.match(BPJS_REGEX)) {
        re = null
        res = await connect(`SELECT * FROM bpjs_verifications WHERE no_bpjs = "${after.no_kartu}"`)
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

        // console.log(JSON.stringify(all))

      } else if(event.type === 'INSERT') {
        // console.log(`new event => type: ${event.type}, tgl: ${tglDaftar}, jam: ${jam}, tdk ada no hp`)
      }

    }catch(err) {
      console.error(`${new Date()} ${err}`)
    }
  }

  return all

}