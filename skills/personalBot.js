const mongooseConnection = require('../dbConnection');
module.exports = function(controller) {
  // Positive result: <http://www.google.com|www.google.com>
  const urlRegex = new RegExp('^<(.*)\:\/\/(.*)\.(.*)\.(.*)\.(.*)>');
  
  controller.hears('Show me around', 'direct_message, direct_mention', (bot, message) => {
    const helpString = `:drake: To add a link type: \`link <link>\`
:drake: To show all the links you have saved type: \`show links\`
:drake: To delete a link from your list type: \`unlink <link>\`
:drake: Have fun around!`;
    bot.reply(message, helpString);
  });
  
  controller.hears(['^link\ (.*)', '^link '], 'direct_message, direct_mention,', (bot, message) => {
    // message.match.input should be: link <http://www.google.com|www.google.com>
    const linkToSave = message.match.input.split(' ')[1];
    const userRequestingInsert = `<@${message.user}>`;
    const userChannel = `<#${message.channel}>`;
    if (!urlRegex.test(linkToSave))  
       return bot.reply(message, ' :warning: Please use correct format: `www.site.domain`');
    const findLinks = new Promise((resolve, reject) => {
      mongooseConnection.Links.find({
        user: userRequestingInsert,
        url: linkToSave
      }, (err, links) => {
        if(err) reject(err);
        resolve(links);
      });
    });
    findLinks
    .then((link) => {
      if(link[0]) throw ('Link is already there, sorry :neutral_face:');
      return mongooseConnection.Links.create({
        user: userRequestingInsert,
        channel: userChannel,
        url: linkToSave
      })
    })
    .then((newLink) => {
      bot.reply(message, `Link to save: ${linkToSave} \n User: ${userRequestingInsert} \n Channel: ${userChannel} `);  
    })
    .catch((addLinkError) => {
      bot.reply(message, addLinkError)
    })
    
  });
  
  controller.hears('show links', 'direct_message, direct_mention', (bot, message) => {
    const userRequestingInfo = `<@${message.user}>`;
    const getLinks = new Promise((resolve, reject) => {
      mongooseConnection.Links.find({ 
        user: userRequestingInfo 
      }, (err, links) => {
        if(err) reject(err);
        resolve(links);
      });
    })
    getLinks
    .then((linkList) => {
      if(!linkList[0]) throw ('No links yet buddy');
      const urls = linkList.map((dbEntry) => dbEntry.url);
      let urlsResponse = `:arrow_right: ${urls[0]}`;
      if(urls.length > 1) {
        urlsResponse = ':arrow_right: ';
        urlsResponse += urls.reduce((urltotal, url) => urltotal + `\n :arrow_right: ${url}`);
      }
      urlsResponse += `\nYou can delete any link by typing: \`unlink <link>\``;
      bot.reply(message, urlsResponse);
    })
    .catch((showLinkError) => {
      bot.reply(message, showLinkError);
    });
  });
  
  controller.hears(['^unlink (.*)', '^unlink'], 'direct_message, direct_mention', function(bot, message) {
    const userRequestingDelete = `<@${message.user}>`;
    const linkToDelete = message.match.input.split(' ')[1];

    const deletePromise = new Promise((resolve, reject) => {
      mongooseConnection.Links.deleteOne({
      user: userRequestingDelete,
      url: linkToDelete
      },
        function (deleteError) {
        if(deleteError) reject(':cry: I think I got that wrong :( \n Nothing to delete!');
        resolve(':heavy_check_mark: Link has been deleted!');
      })
    });
    deletePromise
    .then((promiseResponse) => {
      bot.reply(message, promiseResponse);
    })
    .catch((promiseFailed) => {
      bot.reply(message, promiseFailed);
    });
  });
  
  controller.hears('Do you love me?', 'direct_message, direct_mention', function(bot, message) {
    bot.reply(message, 'Of cource :heart: , how can\'t I?');
  });
  
  controller.hears('Tell me something sweet', 'direct_message, direct_mention', function(bot, message) {
    bot.reply(message, 'Just look at the mirror!');
  });
}