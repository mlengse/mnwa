const wa = require('venom-bot');

exports._init = async ({ that }) => {
  that.spinner.start('config things')
  await Promise.all([
    that.getVillages(),
    that.getUnits()
  ])
  that.spinner.succeed()
  // that.spinner.start('Initializing whatsapp');

  that.client = await wa.create()

  return that.client
}