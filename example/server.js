'use strict';

const
  bodyParser = require('body-parser'),
  express = require('express');

var ignores = ['/some-url/to-ignore'];

var messengerapi = require('../node-facebook-messenger-api').messenger();
var messenger = new messengerapi.Messenger({});
var webhookHandler = require('../node-facebook-messenger-api').webhookHandler()(messenger, {
  receivedAuthentication : function(event) {
    console.log('receivedAuthentication', event);
  },
  handleMessage : function(event) {
    console.log('handleMessage', event);
    messenger.sendTextMessage(event.sender.id, JSON.stringify(event));
  },
  receivedDeliveryConfirmation : function(event) {
    console.log('receivedDeliveryConfirmation', event);
  },
  receivedPostback : function(event) {
    console.log('receivedPostback', event);
  },
  receivedMessageRead : function(event) {
    console.log('receivedMessageRead', event);
  },
  receivedAccountLink : function(event) {
    console.log('receivedAccountLink', event);
  }
}, ignores, express.Router());

var app = express();
app.set('port', process.env.PORT || 3000);
app.set('view engine', 'pug');
app.use(bodyParser.json({
  verify: webhookHandler.verifyRequestSignature.bind(webhookHandler)
}));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static('public'));

app.use('/fb', webhookHandler.router);
app.listen(app.get('port'), function () {
  console.log('Node app is running in http mode on port', app.get('port'));
});

