const mongooseConnection = require('../dbConnection');
const bcrypt = require('bcrypt');

const insertUserOnDb = (username, slackId, password) => {
  console.log('Username: ', username,'\nSlackId: ', slackId, '\nPassword: ', password);
  console.log('User has being inserted to the database!');
};

const encryptTest = (password) => {
  mongooseConnection.user.create({
    realm: 'Slack',
    username: 'simple',
    password: password,
    email: 'otmarojose@gmail.com',
    emailVerified: true,
    role: 'user'
  })
  .then((insertedRecord) => {
    console.log('Record was inserted!');
  })
}

const ecryptString = (string) => {
  bcrypt.hash(string, 10, function(err, hash) {
    return hash;
  });
};

module.exports = function(controller) {
  
  controller.hears('create account', 'direct_message', function(bot, message) {
    const slackId = message.user;
    const password = ecryptString(message.text.split('password:')[1]);
    const getUserInfo = new Promise(function(resolve, reject) {
       bot.api.users.info({user: message.user}, (error, response) => {
        if(error) reject('Could not get user info');
         // slack api uses name as the username wtf!
        let { name, profile: { email } } = response.user;
        resolve(name, email);
      });
    })
    getUserInfo
    .then((username, email) => {
      // insertUserOnDb(username, slackId, password);
      // return email message
      const passwordtest = ecryptString('password');
      encryptTest(passwordtest);
      bot.reply(message, 'Creating user account...');
      setTimeout(function(){bot.reply(message, `Username: ${username}\nSlackId: ${slackId}\nPassword: ${password}`)}, 3000);
    })
    .catch((error)=> {
      console.log(error);
    })
  });
}