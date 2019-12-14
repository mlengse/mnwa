const {
  CHROME_PATH,
  USER_DATA_PATH,
  RM_REGEX,
} = process.env

const keywords = ['tes', 'cek', 'cari', 'daftar']

const days = ['sekarang', 'hari ini', 'hariini', 'besok', 'besuk', 'lusa']

const pols = [ {
  alias: ['umum', 'lansia', 'rujukan'], 
}, {
  alias: ['gigi'],
},{
  alias: ['kia', 'bumil', 'mtbs'],
}, {
  alias: ['gizi'],
}, {
  alias: ['kesling'],
}, {
  alias: ['tb'],
}, {
  alias: ['kb'],
}, {
  alias: ['imunisasi'],
}]

module.exports = Object.assign({}, 
  process.env, 
  {
    RM_REGEX: new RegExp(RM_REGEX),
    BPJS_REGEX: /^(0)([0-9]){0,12}$/,
    NIK_REGEX: /^(3)([0-9]){0,16}$/,
    days,
    pols,
    keywords,
    waitOpt: {
      waitUntil: 'networkidle2'
    },
    pptrOpt: {
      // headless: true,
      headless: false,
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