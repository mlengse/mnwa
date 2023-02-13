const cp = require('child_process')
const ora = require('ora')
let textS = ''
let textI = ''
let spinner = (!process.env.NODE_APP_INSTANCE) ? ora({
  stream: process.stdout
}): {
  start: text => {
    if(textS === ''){
      textS = text
    } else {
      textS = `${textS} > ${text}`
    }
  },
  stop: _ => null,
  succeed: text => {
    textS = `${textS} > ${text}`
    console.log(`done: ${textS}`)
    textS = ''
  },
  warn: text => {
    textI = text
  },
  info: text => {
    textI = text
  },
  fail: text => {
    textI = `${textI} | ${text}`
    console.log(`error: ${textI}`)
    textI = ''
  },
}

const getSpinner = (inp) => {
  if(inp.includes('\n')){
    for(let [id,ins] of Object.entries(inp.split('\n'))){
      if(
        1+Number(id) !== inp.split('\n').length

        && ins[0] !== '✔'
        && ins[0] !== 'ℹ'
        && ins[0] !== '-'
        && (
          inp[0] === '✔'
          || inp[0] === 'ℹ'
          || inp[0] === '-'
        )
      ){
        ins = `${inp[0]} ${ins}`
      }
      getSpinner(ins)
    }
  } else {
    if(inp[0] === '✔'){
      spinner.succeed(inp.substring(1).trim())
    } else if(inp[0] === '-'){
      spinner.start(inp.substring(1).trim())
    } else if(inp[0] === 'ℹ'){
      spinner.info(inp.substring(1).trim())
    } else if(inp[0] === '✖'){
      spinner.fail(inp.substring(1).trim())
    } else if(inp.includes('process done')){
      spinner.stop()
      spinner.succeed(inp)
      process.exit(0)
    } else {
      spinner.start(inp)
    }
  }

}



module.exports = file => {
  console.log(`Starting app in xvfb`)

  const build = cp.exec(`xvfb-run -a --server-args="-screen 0 1280x800x24 -ac -nolisten tcp -dpi 96 +extension RANDR" node ${file}.js`, { 
    stdio: 'inherit', 
    windowsHide: true ,
    maxBuffer: 10486750,
  })

  // build.stdout.pipe(getSpinner)
  // build.stderr.pipe(console.error)

  build.stdout && build.stdout.on('data', getSpinner)
  build.stderr && build.stderr.on('data', console.error)

  build.on('close', (code) => {
    if (code !== 0) {
      spinner.stop()
      console.log(`Build process exited with code ${code}`)
    }

    if (build.stdin) {
      build.stdin.end()
    }
  })
}
