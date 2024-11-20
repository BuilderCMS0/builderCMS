const _ = require('lodash');
const MESSAGE = require('../config/message');

const ok = (res, body, config) => {
    const data = body;
    // eslint-disable-next-line no-param-reassign
    body = {
        code: _.get(config, 'code', MESSAGE.message.ERROR.code),
        status: true,
        message: _.get(config, 'message', MESSAGE.message.ERROR.message),
        data,
    };
    return res.status(MESSAGE.message.ERROR.status).send(body);
};
module.exports = ok;
