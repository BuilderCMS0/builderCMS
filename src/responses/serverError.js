const _ = require('lodash');
const MESSAGE = require('../config/message');

const ok = (req, res, body, config) => {
    const data = body;
    // eslint-disable-next-line no-param-reassign
    body = {
        code: _.get(config, 'code', MESSAGE.message.SERVER_ERROR.code),
        status: false,
        message: _.get(config, 'message', MESSAGE.message.SERVER_ERROR.message),
        data,
    };
    return res.status(MESSAGE.message.SERVER_ERROR.status).send(body);
};
module.exports = ok;
