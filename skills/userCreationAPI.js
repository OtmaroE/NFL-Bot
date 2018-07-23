const axios = require('axios');
const { APIURL } = process.env;

function userCreationRequest(userInfo) {
  return axios.post(APIURL, userInfo);
}
module.exports = function(controller) {
  
  controller.hears('create account (.*)', 'direct_message', function(bot, message) {
    const slackId = message.user;
    const password = message.text.split('password:')[1];
    const getUserInfo = new Promise(function(resolve, reject) {
       bot.api.users.info({user: message.user}, (error, response) => {
        if(error) reject('Could not get user info');
         // slack api uses name as the username wtf!
        let { name, profile: { email } } = response.user;
        resolve([name, email]);
      });
    });
    const getChannelList = new Promise(function(resolve, reject) {
      bot.api.users.conversations({user: message.user}, (error, response) => {
        if(error) reject('Could not get users\'s channel info');
        const channelsInfoArray = response.channels;
        const channelsIdArray = channelsInfoArray.map((element) => element.id);
        console.log(channelsIdArray);
        resolve(channelsIdArray);
      })
    })
    Promise.all([getUserInfo, getChannelList])
    .then(([[username, email], channelsIdArray]) => {
      // insertUserOnDb(username, slackId, password);
      // return email message
      const userInfo = {};
      userInfo.username = username;
      userInfo.password = password;
      userInfo.slackId = slackId;
      userInfo.email = email;
      userInfo.emailVerified = false;
      userInfo.role = 'user';
      userInfo.channels = channelsIdArray;
      bot.reply(message, 'Creating user account...');
      const request = userCreationRequest(userInfo)
      .then((apiResponse) => {
        bot.reply(message, 'Account succesfully created!');
        bot.reply(message, 'Please check your email to confirm your account');
        console.log(apiResponse.data);
      })
      .catch((err) => {
        bot.reply(message, 'Error: Your account already exists!');
        // console.log(err);
      })
      //bot.reply(message, `Username: ${username}\nSlackId: ${slackId}\nPassword: ${password}\nEmail: ${email}`);
    })
    .catch((error)=> {
      console.log(error);
    })
  });
}