"use strict";

const
    config = require('config'),
    crypto = require('crypto'),
    request = require('request');

function Messenger() {
    const appSecret = (process.env.MESSENGER_APP_SECRET) ?
        process.env.MESSENGER_APP_SECRET :
        config.get('appSecret');

    const validationToken = (process.env.MESSENGER_VALIDATION_TOKEN) ?
        (process.env.MESSENGER_VALIDATION_TOKEN) :
        config.get('validationToken');

    const pageAccessToken = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
        (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
        config.get('pageAccessToken');

    const logApi = (process.env.LOG_API) ?
        (process.env.LOG_API) :
        config.get('logAPI');

    if (!(appSecret && validationToken && pageAccessToken)) {
        console.error("Missing config values");
        process.exit(1);
    }

    this.conf = {
        log: logApi || false,
        appSecret: appSecret,
        validationToken: validationToken,
        pageAccessToken: pageAccessToken,
        urlPrefix: 'https://graph.facebook.com/v2.6/'
    };
}

Messenger.prototype.log = function () {
    if (this.conf.log) {
        console.log.apply(this, arguments);
    }
};

Messenger.prototype.error = function () {
    if (this.conf.log) {
        console.error(arguments);
    }
};

Messenger.prototype.matchToken = function (token) {
    return this.conf.validationToken === token;
};

Messenger.prototype.verifySignature = function (signature, buf) {
    var ret = false;
    if (signature) {
        var elements = signature.split('=');
        var method = elements[0];
        var signatureHash = elements[1];
        var expectedHash = crypto.createHmac('sha1', this.conf.appSecret)
            .update(buf)
            .digest('hex');
        ret = (signatureHash == expectedHash);
    }
    return ret;
};

Messenger.prototype.callSendAPI = function (messageData) {
    var ptr = this;
    request({
        uri: this.conf.urlPrefix + 'me/messages',
        qs: {
            access_token: this.conf.pageAccessToken
        },
        method: 'POST',
        json: messageData

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            if (messageId) {
                ptr.log("Successfully sent message with id %s to recipient %s",
                    messageId, recipientId);
            } else {
                ptr.log("Successfully called Send API for recipient %s",
                    recipientId);
            }
        } else {
            ptr.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
        }
    });
};

Messenger.prototype.getUserProfile = function (userId, callback) {
    var ptr = this;
    request({
        uri: this.conf.urlPrefix + userId,
        qs: {
            access_token: this.conf.pageAccessToken,
            fields: 'first_name,last_name,profile_pic,locale,timezone,gender'
        },
        method: 'GET'
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(null, body)
        } else {
            ptr.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
            callback(error, null);
        }
    });
};

Messenger.prototype.getAccountLinkingEndpoint = function (token, callback) {
    var ptr = this;
    request({
        uri: this.conf.urlPrefix + "me",
        qs: {
            access_token: this.conf.pageAccessToken,
            fields: 'recipient',
            account_linking_token: token
        },
        method: 'GET'
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(null, body)
        } else {
            ptr.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
            callback(error, null);
        }
    });
};

Messenger.prototype.setThreadSettings = function (messageData, callback) {
    var ptr = this;
    request({
        uri: this.conf.urlPrefix + "me/thread_settings",
        qs: {
            access_token: this.conf.pageAccessToken
        },
        method: 'POST',
        json: messageData
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(null, body)
        } else {
            ptr.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
            callback(error, null);
        }
    });
};

Messenger.prototype.whitelistDomain = function (domain, add, callback) {
    var ptr = this;
    request({
        uri: this.conf.urlPrefix + "me/thread_settings",
        qs: {
            access_token: this.conf.pageAccessToken
        },
        method: 'POST',
        json: {
            setting_type: "domain_whitelisting",
            whitelisted_domains: [domain],
            domain_action_type: add ? "add" : "remove"
        }
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(null, body)
        } else {
            ptr.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
            callback(error, null);
        }
    });
};

Messenger.prototype.clearThreadSettings = function (callback) {
    var ptr = this;
    request({
        uri: this.conf.urlPrefix + "me/thread_settings",
        qs: {
            access_token: this.conf.pageAccessToken
        },
        method: 'DELETE',
        json: {
            setting_type: "call_to_actions",
            thread_state: "existing_thread"
        }
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(null, body)
        } else {
            ptr.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
            callback(error, null);
        }
    });
};

Messenger.prototype.sendImageMessage = function (recipientId, payload) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "image",
                payload: payload
            }
        }
    };

    callSendAPI(messageData);
};

Messenger.prototype.sendGifMessage = function (recipientId, payload) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "image",
                payload: payload
            }
        }
    };

    this.callSendAPI(messageData);
};

Messenger.prototype.sendAudioMessage = function (recipientId, payload) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "audio",
                payload: payload
            }
        }
    };

    this.callSendAPI(messageData);
};

Messenger.prototype.sendVideoMessage = function (recipientId, payload) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "video",
                payload: payload
            }
        }
    };

    this.callSendAPI(messageData);
};

Messenger.prototype.sendFileMessage = function (recipientId, payload) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "file",
                payload: payload
            }
        }
    };

    this.callSendAPI(messageData);
};

Messenger.prototype.sendTextMessage = function (recipientId, messageText, metadata) {
    var msg = {
        text: messageText
    };
    if (metadata) {
        msg.metadata = metadata;
    }
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: msg
    };

    this.callSendAPI(messageData);
};

Messenger.prototype.sendButtonMessage = function (recipientId, payload) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: payload
            }
        }
    };

    this.callSendAPI(messageData);
};

Messenger.prototype.sendGenericMessage = function (recipientId, elems) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: elems
                }
            }
        }
    };

    this.callSendAPI(messageData);
};

Messenger.prototype.sendTemplate = function (recipientId, payload) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: payload
            }
        }
    };

    this.callSendAPI(messageData);
};


Messenger.prototype.sendQuickReply = function (recipientId, msg) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: msg
    };

    this.callSendAPI(messageData);
};

Messenger.prototype.sendReadReceipt = function (recipientId) {
    console.log("Sending a read receipt to mark message as seen");

    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "mark_seen"
    };

    this.callSendAPI(messageData);
};

Messenger.prototype.sendTypingOn = function (recipientId) {
    console.log("Turning typing indicator on");

    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "typing_on"
    };

    this.callSendAPI(messageData);
};

Messenger.prototype.sendTypingOff = function (recipientId) {
    console.log("Turning typing indicator off");

    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "typing_off"
    };

    this.callSendAPI(messageData);
};

Messenger.prototype.sendAccountLinking = function (recipientId, payload) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: payload
            }
        }
    };

    this.callSendAPI(messageData);
};

module.exports.Messenger = Messenger;