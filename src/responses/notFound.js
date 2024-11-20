const _ = require('lodash');
const MESSAGE = require('../config/message');

const ok = async (req, res, body, config) => {
    const data = body;
    body = {
        code: _.get(config, 'code', MESSAGE.message.ERROR.code),
        status: false,
        message: _.get(config, 'message', MESSAGE.message.ERROR.message),
        data,
    };

    return res.status(MESSAGE.message.ERROR.status).send(body);
};
module.exports = ok;
