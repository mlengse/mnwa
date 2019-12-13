const Message = require('./message')

module.exports = class Logic extends Message {
  constructor(config){
    super(config)
  }

  time(s) {
    return new Date(s * 1e3).toISOString()
  }

  processUnstructured(messageBody) {
    let formattedText
    messageBody = messageBody.toLowerCase()
    let rawArr = messageBody.match(/\b\w+/g)
  
    let formattedArr = []
  
    if(rawArr.length){
      if (rawArr.indexOf('daftarin') > -1) {
        formattedArr.push('daftar')
      }
    
      if (rawArr.indexOf('daftar') > -1) {
        formattedArr.push('daftar')
      }
    }
  
    if (formattedArr.indexOf('daftar') > -1) {
      let hari
      for (let day of this.days) {
        if (messageBody.includes(day)) {
          hari = `${day}`
          break
        }
      }
      if (hari) {
        formattedArr.push(hari)
      }
      let poli
  
      for (let pol of this.polArr) {
        if (messageBody.includes(pol)) {
          poli = `${pol}`
          break
        }
      }
  
      if (poli) {
        formattedArr.push(poli)
      }
    }
  
    if(Array.isArray(rawArr)) rawArr.map(params => {
      if (params.match(new RegExp(this.RM_REGEX))) {
        formattedArr.push(params)
      } else if (params.match(new RegExp(this.BPJS_REGEX))) {
        formattedArr.push(params)
      } else if (params.match(new RegExp(this.NIK_REGEX))) {
        formattedArr.push(params)
      }
    })
  
    rawArr = rawArr.join(' ').split(formattedArr[formattedArr.length - 1])
  
    if (rawArr.length > 1) {
      formattedArr.push(rawArr[rawArr.length - 1].trim())
    }
  
    formattedText = `#${formattedArr.join('#')}`
  
    if ((formattedArr[0] === 'cari' && formattedArr.length > 1) || (formattedArr[0] === 'daftar' && formattedArr.length > 3)) {
      formattedArr.shift()
    }
  
    return formattedText
  
  }

  processTag(messageBody) {

    let contentArr = []
    let formattedText
  
    let isTag = messageBody && messageBody.charAt(0) == '#' ? true : false
  
    if(isTag) {
      if (messageBody.includes('alamat')) {
        messageBody = messageBody.split('alamat').join('#')
      }
    
      if (messageBody.includes('.')) {
        messageBody = messageBody.split('.').join('')
      }
    
      while (messageBody.includes('##')) {
        messageBody = messageBody.split('##').join('#')
      }
    
      contentArr = messageBody.split('#')
      contentArr = contentArr.map(e => e.trim())
      contentArr.shift()
      
      let firstWord = contentArr.shift()
      
      if(firstWord){
        firstWord = firstWord.split(' ').join('')
      }
      
      let isKeyword = this.keywords.filter(e => firstWord === e)
      
      if(!isKeyword.length){
    
        formattedText = this.processUnstructured(messageBody)
    
      } else {
        formattedText = messageBody
      }
    
    } else {
  
      formattedText = this.processUnstructured(messageBody)
  
    }
  
  
    // console.log(formattedText)
  
    return formattedText
  
  }

}