require('dotenv').config()

const {
  MYSQL_HOST,
	MYSQL_USER,
	MYSQL_PWD,
	MYSQL_DB,
  USER_DATA_PATH,
  RM_REGEX,
  CHROME_PATH
} = process.env

const keywords = ['tes', 'cek', 'cari', 'daftar']

let days = ['besok', 'besuk', 'lusa']

if(process.env.DAFTAR_HARI_INI) {
  days = [...days, 'sekarang', 'hariini', 'hari ini']
}

const pols = [ {
  alias: ['umum', 'lansia', 'rujukan'], 
}, {
  alias: ['gigi'],
},{
  alias: ['kia', 'bumil'],
  hari: process.env.KIA || undefined
},{
  alias: ['mtbs'],
  hari: process.env.MTBS || undefined,
  unit: 'KIA'
},{
  alias: ['gizi'],
  hari: process.env.GIZI || undefined
}, {
  alias: ['kesling'],
  hari: process.env.KESLING || undefined
}, {
  alias: ['tb'],
  hari: process.env.TB || undefined
}, {
  alias: ['kb'],
  hari: process.env.KB || undefined
}, {
  alias: ['imunisasi'],
  hari: process.env.IMUNISASI || [1]
}]

const waitOpt = {
  waitUntil: 'networkidle2'
}

let pptrOpt = {}
if(process.platform === 'win32' || CHROME_PATH ) {
  pptrOpt = {
    headless: 'new',
    ignoreDefaultArgs: ['--disable-extensions'],

    // headless: false,
    executablePath: `${CHROME_PATH}`, 
    // userDataDir: `${USER_DATA_PATH}`,
    // args: [
    //   '--content-shell-hide-toolbar',
    //   '--hide',
    //   '--hide-scrollbars',
    //   '--window-position=0,0',
    //   '--window-size=0,0'
    // ]
  }
} else {
  pptrOpt = {
    headless: 'new',
    userDataDir: `${USER_DATA_PATH}`,
    ignoreDefaultArgs: ['--disable-extensions'],
    // args: [
    //   '--no-sandbox', 
    //   '--disable-setuid-sandbox', 
    // ]
  }
}

const mysqlConfig = {
  // connectionLimit: 10,
  host: MYSQL_HOST,
  user: MYSQL_USER,
  password: MYSQL_PWD,
  database: MYSQL_DB
}


// const pptrOpt = {
//   // headless: true,
//   headless: false,
//   userDataDir: USER_DATA_PATH,
//   // args: ['--no-sandbox', '--disable-setuid-sandbox', '--auto-open-devtools-for-tabs' ]
//   // args: [
//   //   // `--app=${whatsappUrl}`,
//   //   '--log-level=3', // fatal only
//   //   //'--start-maximized',
//   //   '--no-default-browser-check',
//   //   '--disable-site-isolation-trials',
//   //   '--no-experiments',
//   //   '--ignore-gpu-blacklist',
//   //   '--ignore-certificate-errors',
//   //   '--ignore-certificate-errors-spki-list',
//   //   '--disable-gpu',
//   //   '--disable-extensions',
//   //   '--disable-default-apps',
//   //   '--enable-features=NetworkService',
//     // '--disable-dev-shm-usage',
//     // '--disable-setuid-sandbox',
//     // '--no-sandbox',
//   //   // Extras
//   //   '--disable-webgl',
//   //   '--disable-threaded-animation',
//   //   '--disable-threaded-scrolling',
//   //   '--disable-in-process-stack-traces',
//   //   '--disable-histogram-customizer',
//   //   '--disable-gl-extensions',
//   //   '--disable-composited-antialiasing',
//   //   '--disable-canvas-aa',
//   //   '--disable-3d-apis',
//   //   '--disable-accelerated-2d-canvas',
//   //   '--disable-accelerated-jpeg-decoding',
//   //   '--disable-accelerated-mjpeg-decode',
//   //   '--disable-app-list-dismiss-on-blur',
//   //   '--disable-accelerated-video-decode'
//   // ]
// }



module.exports = Object.assign({}, 
  process.env, 
  {
    RM_REGEX: new RegExp(RM_REGEX),
    BPJS_REGEX: /^(0)([0-9]){0,12}$/,
    NIK_REGEX: /^(3)([0-9]){0,16}$/,
    days,
    pols,
    keywords,
    waitOpt,
    pptrOpt,
    mysqlConfig
  })
