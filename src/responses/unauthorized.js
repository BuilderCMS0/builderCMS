const _ = require('lodash');
const MESSAGE = require('../config/message');

const unauthorized = (req, res, body, config) => {
    const data = body;
    // eslint-disable-next-line no-param-reassign
    body = {
        code: _.get(config, 'code', MESSAGE.message.UNAUTHORIZED.code),
        status: false,
        message: _.get(config, 'message', MESSAGE.message.UNAUTHORIZED.message),
        data,
    };
    return res.status(MESSAGE.message.UNAUTHORIZED.status).send(body);
};
module.exports = unauthorized;
