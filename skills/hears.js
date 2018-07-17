const Links = require('../dbConnection');
module.exports = function(controller) {
  // Positive result: <http://www.google.com|www.google.com>
  const urlRegex = new RegExp('^<(.*)\:\/\/(.*)\.(.*)\.(.*)\.(.*)>');
  const simpleUrlRegex = /\<http\:\/\/([A-Za-z]{3,9}:(?:\/\/)?(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+(?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*)?)\|(\1)\>/
  
  controller.hears('Show me around', 'direct_message, direct_mention', function(bot, message) {
    const helpString = `:drake: To add a link type: \`link <link>\`
:drake: To show all the links you have saved type: \`show links\`
:drake: To delete a link from your list type: \`unlink <link>\`
:drake: Have fun around!`;

    bot.reply(message, helpString);
  });
  
  controller.hears(['^link (.*)', '^link'], 'direct_message, direct_mention,', function(bot, message) {
    
    // message.match.input should be: link <http://www.google.com|www.google.com>
    const linkToSave = message.match.input.split(' ')[1];
    const userRequestingInsert = `<@${message.user}>`;
    const userChannel = `<#${message.channel}>`;
    
    if (!urlRegex.test(linkToSave))  
       return bot.reply(message, ' :warning: Please use correct format: `www.site.domain`');
    Links.find({
      user: userRequestingInsert,
      url: linkToSave
    })
    .then((link) => {
      if(link[0]) throw ('Link is already there, sorry :neutral_face:');
      return;
    })
    .then( () => {
      return Links.create({
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
  
  controller.hears('show links', 'direct_message, direct_mention', function(bot, message) {
    const userRequestingInfo = `<@${message.user}>`
    Links.find({ 
      user: userRequestingInfo 
    })
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
      Links.deleteOne({
      user: userRequestingDelete,
      url: linkToDelete
      },
        function (deleteError) {
        if(deleteError) reject(':cry: I think I got that wrong :( \n Nothing to delete!');
        resolve(':heavy_check_mark: Link has been deleted!');
      }
      )
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
  
  controller.hears('(.*)', 'direct_message, direct_mention, ambient', function(bot, message) {
    let receivedMessage = message.match[1];
    let foundUrl = '';
    let urlList = [];
    while(foundUrl = simpleUrlRegex.exec(receivedMessage)){
      console.log(receivedMessage);
      urlList.push(foundUrl[0]);
      receivedMessage = receivedMessage.replace(foundUrl[0], '');
    }
    urlList.length > 0 ? bot.reply(message, urlList.toString()) : bot.reply(message, 'no links');
  });

};
