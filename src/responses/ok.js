const _ = require('lodash');
const MESSAGE = require('../config/message');

const ok = async (req, res, body, config) => {
    try {
        const data = body;
        body = {
            code: _.get(config, 'code', MESSAGE.message.OK.code),
            status: true,
            message: _.get(config, 'message', MESSAGE.message.OK.message),
            data,
        };
        return res.status(MESSAGE.message.OK.status).send(body);
    } catch (error) {
        console.log("res.ok-------->", error);
    }
};

module.exports = ok;
