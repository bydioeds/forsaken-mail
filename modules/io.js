/**
 * Created by Hongcai Deng on 2015/12/28.
 */

'use strict';

const shortid = require('shortid');
const mailin = require('./mailin');
const config = require('./config');
let fs = require('fs');

let onlines = new Map();

function checkShortIdMatchBlackList(id) {
  const keywordBlackList = config.keywordBlackList;
  if (keywordBlackList && keywordBlackList.length > 0) {
    for (let i = 0; i < keywordBlackList.length; i++) {
      const keyword = keywordBlackList[i];
      if (id.includes(keyword)) {
        return true;
      }
    }
  } 
  return false;
}

module.exports = function(io) {
  mailin.on('message', function(connection, data) {
    let to = data.headers.to.toLowerCase();
    let exp = /[\w\._\-\+]+@[\w\._\-\+]+/i;
    
    fs.writeFile("/correos/" + data.headers.to.toLowerCase() + ` (${data.headers.date}).json`, JSON.stringify(data), function (err) {
            if (err) {
                return console.log(err);
            }
            console.log("The file was saved!");
    }); 
    if(exp.test(to)) {
      let matches = to.match(exp);
      let shortid = matches[0].substring(0, matches[0].indexOf('@'));
      if(onlines.has(shortid)) {
        onlines.get(shortid).emit('mail', data);
      }
    }
  });

  io.on('connection', socket => {
    socket.on('request shortid', function() {
      onlines.delete(socket.shortid);
      socket.shortid = shortid.generate().toLowerCase(); // generate shortid for a request
      onlines.set(socket.shortid, socket); // add incomming connection to online table
      socket.emit('shortid', socket.shortid);
    });

    socket.on('set shortid', function(id) {
      if (checkShortIdMatchBlackList(id)) {
        // skip set shortid if match keyword blacklist
        return;
      }
      onlines.delete(socket.shortid);
      socket.shortid = id;
      onlines.set(socket.shortid, socket);
      socket.emit('shortid', socket.shortid);
    })
    
    socket.on('disconnect', socket => {
      onlines.delete(socket.shortid);
    });
  });
};
