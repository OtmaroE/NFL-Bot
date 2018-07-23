const mongooseConnection = require('../dbConnection');
const interactiveMessage = {
  "text": "Bellow you can find your links!",
  "response_type": "ephemeral",
  "attachments": [
      {
          "text": "Choose a link to delete",
          "fallback": "If you could read this message, you'd be choosing something fun to do right now.",
          "color": "#3AA3E3",
          "attachment_type": "default",
          "callback_id": "link_delete",
          "actions": [
                {
                  "name": "games_list",
                  "text": "Pick a link...",
                  "type": "select",
                  "options": []
                }
              ]
            }
          ]
        }
const jsonResponse = {
  "attachments": [
      {
          "fallback": "Choose a link to delete",
          "callback_id": "delete_confirm",
          "actions": [
              {
                  "type": "button",
                  "name": "yes",
                  "text": "Yes, delete",
                  "style": "primary",
                  "value": "User ID||URL"
              },
              {
                  "type": "button",
                  "name": "no",
                  "text": "No, hold up!",
                  "style": "danger"
                }
              ]
            }
          ]
        }
module.exports = function(controller) {
  const simpleUrlRegex = /\<(([A-Za-z]{3,9}:(?:\/\/)?(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)(?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))(\S*\>)((\ \[\w*\])*)/
  const channelParseRegex = /\<\#(.{9})\|/;
  const userIdAndSpamParseRegex = /\<\@(.{9})\> (this|about) (.*)/;
  const likesAndTagsRegEx = /^links with \+(\d*)( about (.*))?/;
  const tagsRequestRegEx = /(\w*)(\ or\ (\w*))?/;
  
  controller.hears('^delete my links', 'direct_message, direct_mention', (bot, message) => {
    const userRequestingDelete = `<@${message.user}>`;
    const currentChannel = `<#${message.channel}>`;
    mongooseConnection.Records.find({
      user: userRequestingDelete,
      channel: currentChannel
    }, (err, docs) => {
      for (let link of docs) {
        interactiveMessage.attachments[0].actions[0].options.push({"text": link.url, value: link.url});
      }
      bot.reply(message, interactiveMessage);
    })
  });
  
  controller.on('interactive_message_callback', (bot, message) => {
    if(message.callback_id === 'link_delete'){ 
      const userRequestingDelete = `<@${message.user}>`;
      const urlToDelete = message.text;
      jsonResponse.text = `Deleting: ${urlToDelete} from ${userRequestingDelete}.\nAre you sure?`
      // attaching (user || url) so next callback can parse it
      jsonResponse.attachments[0].actions[0].value = `${message.user}||${urlToDelete}`
      bot.replyInteractive(message, jsonResponse);
    }
    if(message.callback_id === 'delete_confirm') {
      if(message.actions[0].name === 'yes') {
        const infoPayload = message.text;
        const urlToDelete = infoPayload.split('||')[1].replace('\'','');
        const userRequestingDelete = `<@${infoPayload.split('||')[0].replace('\'','')}>`;
        const currentChannel = `<#${message.channel}>`;
        mongooseConnection.Records.deleteOne({
          user: userRequestingDelete,
          url: urlToDelete,
          channel: currentChannel
        },
        (error) => {
          if(error) return console.log(error);
            bot.replyInteractive(message, 'Alright, deleted!');
        })
      }
      if(message.actions[0].name === 'no') {
        bot.replyInteractive(message, 'No probs, nothing deleted');
      }
      
    }
  })
  controller.hears('^links from this week', 'direct_mention', (bot, message) => {
    const userChannel = `<#${message.channel}>`;
    const untilDate = new Date();
    const fromDate = new Date(untilDate.getDate() - 7);
    sendLinksAtDateSpam(fromDate, untilDate, userChannel, bot, message);
  });
  
  controller.hears('^links from this month', 'direct_mention', (bot, message) => {
    const userChannel = `<#${message.channel}>`;
    const untilDate = new Date();
    const fromDate = new Date(untilDate.getDate() - 30);
    sendLinksAtDateSpam(fromDate, untilDate, userChannel, bot, message);
  });
  
  controller.hears('^links from .*', 'direct_message', (bot, message) => {
    const userId = `<@${message.user}>`;
    const messageToParse = message.text;
    const channelRequestId = channelParseRegex.exec(messageToParse)[1];
    if(channelRequestId)
    mongooseConnection.Records.find({
      channel: `<#${channelRequestId}>`,
      user: userId
    })
    .then((linkList) => {
      bot.reply(message, `These are your links:\n`);
      let linkListResponse = '';
      for (let link of linkList) {
        linkListResponse += `:earth_americas: URL: ${link.url}tUser: ${userId}\n\t\t:cyclone:Tags: \`${link.tags.toString()}\`\n`;
      }
      bot.reply(message, linkListResponse);
    })
  });
  
  controller.hears(/^links shared by (.*)/, 'direct_mention', (bot, message) => {
    const messageToParse = message.text;
    const currentChannel = `<#${message.channel}>`;
    let parsedRequest = userIdAndSpamParseRegex.exec(messageToParse);
    if(parsedRequest[2]) {
      let requestedUser = '';
      switch (parsedRequest[2]) {
        case 'this':
          requestedUser = parsedRequest[1];
          const timeSpamRequest = parsedRequest[3];
          const untilDate = new Date();
          switch (timeSpamRequest) {
            case 'week': 
              sendLinksAtDateSpam(new Date(untilDate.getDate() - 7), untilDate, currentChannel, bot, message, `<@${requestedUser}>`);
              break;
            case 'month':
              sendLinksAtDateSpam(new Date(untilDate.getDate() - 30), untilDate, currentChannel, bot, message, `<@${requestedUser}>`);
            default: break;
          }
          break;
        case 'about':
          requestedUser = parsedRequest[1];
          const tagsToParse = parsedRequest[3];
          const tagsParsed = tagsRequestRegEx.exec(tagsToParse);
          const firstTag = tagsParsed[1];
          const secondTag = tagsParsed[3];
          const searchCriteria = { 
            channel: currentChannel,
            user: `<@${requestedUser}>`
          };
          if(firstTag) searchCriteria.tags = firstTag;
          if(secondTag) searchCriteria.tags = {'$in': [firstTag, secondTag]};
          if(searchCriteria.tags)
          mongooseConnection.Records.find(searchCriteria)
          .then((recordList) => {
            let response = '';
            for (let record of recordList) {
              response += `:earth_americas: URL: ${record.url}\tUser: ${record.user}\n\t\t:cyclone:Tags: \`${record.tags.toString()}\`\n`;
            }
            bot.reply(message, response);
          });
          break;
        default: break;
      }
    }
  });
  
  controller.hears(/^links with \+(.*)/, 'direct_mention, direct_message', (bot, message) => {
    const requestedChannel = `<#${message.channel}>`;
    const messageToParse = message.text;
    const parsedMessage = likesAndTagsRegEx.exec(messageToParse);
    let likeCount, tagsToParse, parsedTags, firstTag, secondTag;
    
    if(parsedMessage) {
      likeCount = parsedMessage[1];
      tagsToParse = parsedMessage[3];
      if(tagsToParse)
      parsedTags = tagsRequestRegEx.exec(tagsToParse);
      if(parsedTags){
        firstTag = parsedTags[1];
        secondTag = parsedTags[3];
      }
    }
    const searchCriteria = { channel: requestedChannel };
    if(likeCount) searchCriteria.likesCount = Number(likeCount);
    if(firstTag) searchCriteria.tags = firstTag;
    if(secondTag) searchCriteria.tags = {'$in': [firstTag, secondTag]};
    if(searchCriteria.likesCount)
    mongooseConnection.Records.find(searchCriteria)
    .then((recordList) => {
        let response = '';
        for (let record of recordList) {
          response += `:earth_americas: URL: ${record.url}\tUser: ${record.user}\n\t\t:cyclone:Tags: \`${record.tags.toString()}\`\n`;
        }
        bot.reply(message, response);
    });
  });

  controller.hears('(.*)\m', 'direct_message, direct_mention, ambient', (bot, message) => {
    let receivedMessage = message.text;
    const username = `<@${message.user}>`;
    const userChannel = `<#${message.channel}>`;
    const ts = message.ts;
    insertUniqueLinks(receivedMessage, username, ts, userChannel, bot, message);
  });
   
  controller.on('reaction_added' , (bot, message) => {
    const username = `<@${message.user}>`;
    const reactionType = message.reaction;
    const messageLiked = message.raw_message.event.item;
    if(reactionType.startsWith('+1')){
      mongooseConnection.Likes.create({
        ts: messageLiked.ts,
        username: username,
        created: new Date()
      })
      .then((newLike) => {
        updateLikesCount(newLike.ts);
      })
      .catch((err) => {
        console.log(err);
      });
    }
  });

  controller.on('reaction_removed', (bot, message) => {
    if(message.reaction.startsWith('+1')){
      const username = `<@${message.user}>`;
      const tsItemToRemove = message.item.ts;
      mongooseConnection.Likes.deleteOne({
        username: username,
        ts: tsItemToRemove
      })
      .then((data) => {
         updateLikesCount(tsItemToRemove);
      });
    }
  });
  
  function updateLikesCount(likedRecordTs){
    // console.log('entered', likedRecordTs);
    mongooseConnection.Likes.count({ ts: likedRecordTs }, (err, likesCount) => {
      if(err) return console.log('fail');
      // console.log('we are not that bad:', likesCount, likedRecordTs)
      mongooseConnection.Records.findOneAndUpdate(
        { ts: likedRecordTs },
        { likesCount: likesCount },
        (err) => {
          if(err) console.log('sad'. err);
          console.log('Updated!');
        }
      )
    })
  }
  function sendLinksAtDateSpam(fromDate, untilDate, userChannel, bot, message, user) {
    const username = user ? user : `<@${message.user}>`;
    let searchCriteria = {
      channel: userChannel,
      created: { $gte: fromDate, $lte: untilDate },
    }
    if(user) searchCriteria.user = user;
    mongooseConnection.Records.find(searchCriteria)
    .then((linkList) => {
      // console.log(linkList);
      let linkListResponse = '';
      for (let linkRecord of linkList) {
        linkListResponse += `:earth_americas: URL: ${linkRecord.url}\tUser: ${linkRecord.user}\n\t\t:cyclone: Tags: \`${linkRecord.tags.toString()}\`\n`
      }
      bot.reply(message, linkListResponse);
    })
  }
  function insertUniqueLinks(receivedMessage, username, ts, userChannel, bot, message) {
    let foundUrlFromRegex = '';
    let urlFound = '';
    let tags = '';
    if (foundUrlFromRegex = simpleUrlRegex.exec(receivedMessage)) {
      urlFound = foundUrlFromRegex[1];
      // foundUrlFromRegex[0] should be like: <http://www.google.com|www.google.com> [ta g1] [tag2] [tag3]
      tags = foundUrlFromRegex[0].split('[');
      tags.shift();
      tags = tags.map((element) => element.split(']')[0]);
      receivedMessage = receivedMessage.replace(foundUrlFromRegex[0], '');
      const findUrl = new Promise((resolve, reject) => {
        mongooseConnection.Records.find({
        user: username,
        channel: userChannel,
        url: urlFound
        }, (err, record) => {
          if(err) reject('Mongoose Broke');
          resolve(record);
        })
      });
      findUrl
      .then((recordFound) => {
        if(recordFound[0]) throw ('The link already Exists');
        return mongooseConnection.Records.create({
          user: username,
          channel: userChannel,
          url: urlFound,
          tags: tags,
          created: new Date(),
          ts: ts,
          likesCount: 0
        });
      })
      .then((insertedData) => {
        insertUniqueLinks(receivedMessage, username, ts, userChannel, bot, message);
      })
      .catch((error) => {
        console.log(error);
      })
    }
  }
};
