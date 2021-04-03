exports.pptr = require('puppeteer-core')

exports._simpusGoto =  async ({that, url}) => {
  await that.simpusPage.goto(url, that.config.waitOpt)
  if (!!await that.simpusPage.$('#UserUsername')) {
    await that.simpusPage.evaluate(async body => await fetch('/j-care/', {
      method: 'POST',
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",                                                                                                
      },
      body
    }), that.getParams({
      _method: 'POST',
      'data[User][username]': that.config.SIMPUS_USER, 
      'data[User][password]': that.config.SIMPUS_PWD         
    }))
    await that.simpusPage.goto(url, that.config.waitOpt)
  }
}

exports._initSimpus = async ({ that }) => {
  // console.log(that.config.pptrOpt)
  if(!that.pages){
    that.browser = await that.pptr.launch(that.config.pptrOpt);
    that.pages = await that.browser.pages()
  }
  if(!that.simpusPage) {
    if(!that.pages[1]){
      await that.browser.newPage()
      that.pages = await that.browser.pages()
    } 
    that.simpusPage = that.pages[1]
    that.simpusPage.on('dialog', async dialog => {
      dial = `${dialog.message()}\n`
      that.spinner.start(`${new Date()} ${dialog.type()}`)
      if(dial !== '') that.spinner.start(`${new Date()} ${dial}`)
      if(dialog.type() === 'alert'){
        await dialog.dismiss()
      } else {
        await dialog.accept()
      }
  
    })

    await that.simpusGoto({
      url: `${that.config.SIMPUS_BASE_URL}/j-care/visits/add_registrasi`
    })
  }

}