exports._saveContact = async ({ that, name, number }) => {
  that.spinner.succeed(`will save as name: ${name}, number: ${number}`)
}

exports._addContact = async( { that, contact, msg }) => {
  if(!contact) {
    contact = msg.sender || msg.contact
  } 
  if(contact && contact.isMyContact){
    that.spinner.succeed(`contact is saved as name: ${contact.name}`)
  } else {
    if(contact.pushname){
      let number
      if(contact.id) {
        if(contact.id.user){
          number = contact.id.user
        } else if(contact.id.includes('@')){
          number = contact.id.split('@')[0]
        }
      }

      number && await that.saveContact({ 
        name: contact.pushname,
        number
      })
      
    } else {
      console.log(contact)
    }
  }
}