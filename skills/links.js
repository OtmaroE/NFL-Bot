const mongooseConnection = require('../dbConnection');
module.exports = function(controller) {
  // Positive result: <http://www.google.com|www.google.com>
  const urlRegex = new RegExp('^<(.*)\:\/\/(.*)\.(.*)\.(.*)\.(.*)>');
  const simpleUrlRegex = /(\<http\:\/\/([A-Za-z]{3,9}:(?:\/\/)?(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:.*\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+(?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*)?)\|(\2)\>)((\ \[\w*\])*)/
  // /((\<.*\:\/\/.*\..*\..*\..*>))((\ \[\w*\])*)/
  // /(\<http\:\/\/([A-Za-z]{3,9}:(?:\/\/)?(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:.*\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+(?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*)?)\|(\2)\>)((\ \[\w*\])*)/
  const channelParseRegex = /\<\#(.{9})\|/;
  const userIdAndSpamParseRegex = /\<\@(.{9})\> this (\w*)/;
  controller.hears('Show me around', 'direct_message, direct_mention', function(bot, message) {
    const helpString = `:drake: To add a link type: \`link <link>\`
:drake: To show all the links you have saved type: \`show links\`
:drake: To delete a link from your list type: \`unlink <link>\`
:drake: Have fun around!`;

    bot.reply(message, helpString);
  });
  
  controller.hears(['^link\ (.*)', '^link '], 'direct_message, direct_mention,', function(bot, message) {
    
    // message.match.input should be: link <http://www.google.com|www.google.com>
    const linkToSave = message.match.input.split(' ')[1];
    const userRequestingInsert = `<@${message.user}>`;
    const userChannel = `<#${message.channel}>`;
    
    if (!urlRegex.test(linkToSave))  
       return bot.reply(message, ' :warning: Please use correct format: `www.site.domain`');
    mongooseConnection.Links.find({
      user: userRequestingInsert,
      url: linkToSave
    })
    .then((link) => {
      if(link[0]) throw ('Link is already there, sorry :neutral_face:');
      return;
    })
    .then( () => {
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
  
  controller.hears('show links', 'direct_message, direct_mention', function(bot, message) {
    const userRequestingInfo = `<@${message.user}>`
    mongooseConnection.Links.find({ 
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
  
  controller.hears('links from this week', 'direct_mention', function(bot, message) {
    const userChannel = `<#${message.channel}>`;
    const untilDate = new Date();
    const fromDate = new Date(untilDate.getDate() - 7);
    sendLinksAtDateSpam(fromDate, untilDate, userChannel, bot, message);
  });
  
  controller.hears('links from this month', 'direct_mention', function(bot, message) {
    const userChannel = `<#${message.channel}>`;
    const untilDate = new Date();
    const fromDate = new Date(untilDate.getDate() - 30);
    sendLinksAtDateSpam(fromDate, untilDate, userChannel, bot, message);
  });
  
  controller.hears('^links from .*', 'direct_message', function(bot, message) {
    const username = `<@${message.user}>`;
    const messageToParse = message.text;
    const channelRequestId = channelParseRegex.exec(messageToParse)[1];
    if(channelRequestId)
    mongooseConnection.Records.find({
      channel: `<#${channelRequestId}>`,
      user: username
    })
    .then((linkList) => {
      bot.reply(message, `These are your links:\n`);
      let linkListResponse = '';
      for (let link of linkList) {
        linkListResponse += `:earth_americas: URL: ${link.url}tUser: <@${message.user}>\n\t\t:cyclone:Tags: \`${link.tags.toString()}\`\n`;
      }
      bot.reply(message, linkListResponse);
    })
  });
  
  controller.hears('^links shared by (.*) this (.*)', 'direct_mention', function(bot, message) {
    const messageToParse = message.text;
    console.log(messageToParse);
    const currentChannel = `<#${message.channel}>`;
    const parsedRequest = userIdAndSpamParseRegex.exec(messageToParse);
    console.log(parsedRequest);
    const requestedUser = parsedRequest[1];
    const timeSpamRequest = parsedRequest[2];
    console.log(requestedUser, timeSpamRequest);
    bot.reply(message, `Findind messages:\nUser: <@${requestedUser}>\nChannel: ${currentChannel}\nSpam: this ${timeSpamRequest}`);
  });
  
  controller.hears('(.*)', 'direct_message, direct_mention, ambient', function(bot, message) {
    let receivedMessage = message.match[1];
    const username = `<@${message.user}>`;
    const userChannel = `<#${message.channel}>`;
    const ts = message.ts;
    insertUniqueLinks(receivedMessage, username, ts, userChannel, bot, message);
  });
  
  controller.on('reaction_added' , function(bot, message) {
    const username = `<@${message.user}>`;
    const reactionType = message.reaction;
    const messageLiked = message.raw_message.event.item;
    console.log(reactionType);
    console.log(messageLiked);
    if(reactionType === '+1'){
      mongooseConnection.Likes.create({
        ts: messageLiked.ts,
        username: username,
        created: new Date()
      })
    }
  });
  function sendLinksAtDateSpam(fromDate, untilDate, userChannel, bot, message) {
    mongooseConnection.Records.find({
      channel: userChannel,
      created: { $gte: fromDate, $lte: untilDate }
    })
    .then((linkList) => {
      let linkListResponse = '';
      for (let linkRecord of linkList) {
        linkListResponse += `:earth_americas: URL: ${linkRecord.url}\tUser: <@${message.user}>\n\t\t:cyclone: Tags: \`${linkRecord.tags.toString()}\`\n`
      }
      bot.reply(message, linkListResponse);
    })
  }
  function insertUniqueLinks(receivedMessage, username, ts, userChannel, bot, message) {
    let foundUrl = '';
    let urlFound = '';
    let tags = '';
    
    if (foundUrl = simpleUrlRegex.exec(receivedMessage)) {
      urlFound = foundUrl[1];
      // foundUrl[0] should be like: <http://www.google.com|www.google.com> [ta g1] [tag2] [tag3]
      tags = foundUrl[0].split('[');
      tags.shift();
      tags = tags.map((element) => element.split(']')[0]);
      receivedMessage = receivedMessage.replace(foundUrl[0], '');
      const findUrl = new Promise((resolve, reject) => {
        mongooseConnection.Records.find({
        user: username,
        channel: userChannel,
        url: urlFound
        }, (err, record) => {
          if(err) reject('Mongoose Broke');
          resolve(record);
        })
      })
      .then((recordFound) => {
        if(recordFound[0]) throw ('The link already Exists');
        return
      })
      .then(() => {
        return mongooseConnection.Records.create({
          user: username,
          channel: userChannel,
          url: urlFound,
          tags: tags,
          created: new Date(),
          ts: ts
        })
      })
      .then((insertedData) => {
        // bot.reply(message, `${insertedData.url}\nTags: ${insertedData.tags.toString()}\nBy: ${insertedData.user}\nAt:${insertedData.channel}`);
        bot.reply(message, `Capture link: ${insertedData.url}`);
        // See if there are links + tags left on the string
        insertUniqueLinks(receivedMessage, username, ts, userChannel, bot, message);
      })
      .catch((error) => {
        console.log(error);
      })
    }
    // no links left, we just exit.
  }
};
