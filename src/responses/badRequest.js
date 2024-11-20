const _ = require('lodash');
const MESSAGE = require('../config/message');

const ok = async (req, res, body, config) => {
    const data = body;
    body = {
        code: _.get(config, 'code', MESSAGE.message.BAD_REQUEST.code),
        status: false,
        message: _.get(config, 'message', MESSAGE.message.BAD_REQUEST.message),
        statusCode: _.get(config, 'status', MESSAGE.message.BAD_REQUEST.status),
        data,
    };

    return res.status(body.statusCode).send(body);
};
module.exports = ok;
