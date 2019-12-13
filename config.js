const {
  CHROME_PATH,
  USER_DATA_PATH,
  RM_REGEX
} = process.env

const pols = [ {
  id: '01',
  alias: ['umum', 'lansia', 'rujukan'], 
  nama: 'BP. Umum',
  bpjs_id: '001'
}, {
  id: '02',
  alias: ['gigi'],
  nama: 'BP. Gigi',
  bpjs_id: '002'
},{
  id: '03',
  alias: ['kia', 'bumil', 'mtbs'],
  nama: 'KIA',
  bpjs_id: '003'
},{
  id: '04',
  nama: 'Laborat',
  bpjs_id: '004'
}, {
  id: '05',
  alias: ['gizi'],
  nama: 'Gizi'
}, {
  id: '06',
  alias: ['kesling'],
  nama: 'Kesling'
}, {
  id: '08',
  alias: ['tb'],
  nama: 'Poli TB'
}, {
  id: '09',
  alias: ['kb'],
  nama: 'KB',
  bpjs_id: '008'
}, {
  id: '10',
  nama: 'Pelayanan Sore'
}, {
  id: '11',
  alias: ['imunisasi'],
  nama: 'Imunisasi'
}]

const polArr = []

pols.map(({ alias }) => {
  if(alias && Array.isArray(alias) ){
    alias.map( e => polArr.push(e))
  }
})

module.exports = Object.assign({}, 
  process.env, 
  {
    RM_REGEX: new RegExp(RM_REGEX),
    BPJS_REGEX: /^(0)([0-9]){0,12}$/,
    NIK_REGEX: /^(3)([0-9]){0,16}$/,
    days: ['sekarang', 'hari ini', 'hariini', 'besok', 'besuk', 'lusa'],
    polArr,
    keywords: ['tes', 'cek', 'cari', 'daftar'],
    waitOpt: {
      waitUntil: 'networkidle2'
    },
    pptrOpt: {
      headless: true,
      // headless: false,
      executablePath: CHROME_PATH, 
      userDataDir: USER_DATA_PATH,
      // args: ['--no-sandbox', '--disable-setuid-sandbox', '--auto-open-devtools-for-tabs' ]
      args: [
        // `--app=${whatsappUrl}`,
        '--log-level=3', // fatal only
        //'--start-maximized',
        '--no-default-browser-check',
        '--disable-site-isolation-trials',
        '--no-experiments',
        '--ignore-gpu-blacklist',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-default-apps',
        '--enable-features=NetworkService',
        '--disable-setuid-sandbox',
        '--no-sandbox',
        // Extras
        '--disable-webgl',
        '--disable-threaded-animation',
        '--disable-threaded-scrolling',
        '--disable-in-process-stack-traces',
        '--disable-histogram-customizer',
        '--disable-gl-extensions',
        '--disable-composited-antialiasing',
        '--disable-canvas-aa',
        '--disable-3d-apis',
        '--disable-accelerated-2d-canvas',
        '--disable-accelerated-jpeg-decoding',
        '--disable-accelerated-mjpeg-decode',
        '--disable-app-list-dismiss-on-blur',
        '--disable-accelerated-video-decode'
      ]
    },
  })