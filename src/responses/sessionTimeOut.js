const _ = require('lodash');
const MESSAGE = require('../config/message');

const sessionTimeOut = (req, res, body, config) => {
    const data = body;
    body = {
        code: _.get(config, 'code', MESSAGE.message.SESSION_TIME_OUT.code),
        status: false,
        message: _.get(config, 'message', MESSAGE.message.SESSION_TIME_OUT.message),
        data,
    };
    return res.status(MESSAGE.message.SESSION_TIME_OUT.status).send(body);
};
module.exports = sessionTimeOut;
