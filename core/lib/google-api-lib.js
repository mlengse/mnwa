const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/contacts'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
const loadCreds = async () => {
  return new Promise((resolve, reject) => {
    fs.readFile('credentials.json', (err, content) => {
      if (err) reject('Error loading client secret file:', err);
      resolve(JSON.parse(content))
      // Authorize a client with credentials, then call the Google Tasks API.
      // authorize(JSON.parse(content), listConnectionNames);
    });
    
  })
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
const authorize = async () => {
  const { 
    installed: {
      client_secret,
      client_id,
      redirect_uris
    } 
  } = await loadCreds()
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  // Check if we have previously stored a token.
  return await new Promise( resolve => {
    fs.readFile(TOKEN_PATH, async (err, token) => {
      if (err) {
        resolve( await getNewToken(oAuth2Client))
      };
      oAuth2Client.setCredentials(JSON.parse(token));
      resolve(oAuth2Client);
    });
  })
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
const getNewToken = async oAuth2Client => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return await new Promise ((resolve, reject) => {
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) reject('Error retrieving access token', err);
        oAuth2Client.setCredentials(token);
        // Store the token to disk for later program executions
        fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
          if (err) reject(err);
          console.log('Token stored to', TOKEN_PATH);
        });
        resolve(oAuth2Client);
      });
    });
  
  })
}

/**
 * Print the display name if available for 10 connections.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
const listConnectionNames = async () => {
  const auth = await authorize()
  const service = google.people({version: 'v1', auth});
  service.people.connections.list({
    resourceName: 'people/me',
    pageSize: 10,
    personFields: 'names,emailAddresses,phoneNumbers',
  }, (err, res) => {
    if (err) return console.error('The API returned an error: ' + err);
    const connections = res.data.connections;
    if (connections) {
      connections.forEach((person) => {
        person.names && person.names.length > 0 && console.log(person.names[0].displayName);
        person.emailAddresses && person.emailAddresses.length > 0 && console.log(person.emailAddresses[0].value);
        person.phoneNumbers && person.phoneNumbers.length > 0 && console.log(person.phoneNumbers[0].value);
        console.log('-------------')
      });
      console.log('Connections:', connections.length);
    } else {
      console.log('No connections found.');
    }
  });
}

// ;(async () => await listConnectionNames())()

exports._saveContact = async ({ that, name, number }) => {
  if(that.config.API_KEY){
    that.spinner.start(`will save as name: ${name}, number: ${number}`)
    const auth = await authorize()
    const service = google.people({version: 'v1', auth});
    const existsContact = await service.people.searchContacts({
      query: number,
      readMask: 'phoneNumbers'
    })
  
    if(!existsContact) {
      const {data: newContact} = await service.people.createContact({
        requestBody: {
          phoneNumbers: [{value: '0' + number.substring(2)}],
          names: [
            {
              displayName: name,
              familyName: name.split(' ')[1],
              givenName: name.split(' ')[0],
            },
          ],
        },
      });
      that.spinner.succeed(`Created Contact: ${newContact.phoneNumbers[0].value} | ${newContact.names[0].displayName} `);
    } else {
      that.spinner.fail(`Contact is exist: ${JSON.stringify(existsContact)}`)
    }
  }
}

exports._addContact = async( { that, contact, msg }) => {
  if(msg && msg.sender && msg.sender.isMyContact) {
    contact = Object.assign({}, contact, msg.sender)
  }
  if(msg && msg.chat && msg.chat.contact && msg.chat.contact.isMyContact) {
    contact = Object.assign({}, contact, msg.chat.contact)
  }

  if(contact && !contact.isMyContact) {
    if(contact.chat){
      contact = Object.assign({}, contact, contact.chat)
    }
    if(contact.profile !== '404'){
      contact = Object.assign({}, contact, contact.profile)
    }
    // contact = Object.assign({}, contact, contact.chat, contact.profile)
  }
   
  if(contact){
    if(contact.isMyContact){
      that.spinner.succeed(`contact is saved as name: ${contact.name}`)
    } else {
      let number
      let name
    
      if(!contact.pushname && contact.chat){
        contact = Object.assign({}, contact, contact.chat)
      }
      if(!contact.pushname && contact.profile !== '404'){
        contact = Object.assign({}, contact, contact.profile)
      }
      if(contact.pushname){
        name = contact.pushname
      }
      if(contact.nama){
        name = contact.nama
      }
      if(contact.patient && contact.patient.nama){
        name = contact.patient.nama + ' Pasien'
      }
      if(contact.patient && contact.patient.no_hp){
        number = contact.patient.number
      }
      if(contact.id) {
        if(contact.id.user){
          number = contact.id.user
        } else if(contact.id.includes('@')){
          number = contact.id.split('@')[0]
        }
      }
  
      if(!name && number){
        name = number+ ' wa'
      }
    
      if(name && number) {
        await that.saveContact({ 
          name,
          number
        })
      }
    
      (!name || !number) && console.log(contact)
          
    }
  } else {
    that.spinner.fail(`${Object.assign({}, contact, msg )}`)
  }

}