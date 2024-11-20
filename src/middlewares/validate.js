const Joi = require('joi');
// const httpStatus = require('http-status');
const pick = require('../utils/pick');
const MESSAGE = require('../config/message').message;
// const ApiError = require('../utils/ApiError');

const validate = (schema) => (req, res, next) => {
    const validSchema = pick(schema, ['params', 'query', 'body']);
    const object = pick(req, Object.keys(validSchema));
    if (object && object.body) {
        const result = validSchema.body.validate(object.body);
        if (result.error && result.error.details.length) {
            let errorMessage = result.error.details[0].message;
            errorMessage = errorMessage.replace(/["\|[\]\\]/g, '');
            return res.badRequest({}, { message: errorMessage });
        }
    }
    if (object && object.params) {
        const result = validSchema.params.validate(object.params);
        if (result.error && result.error.details.length) {
            let errorMessage = result.error.details[0].message;
            errorMessage = errorMessage.replace(/["\|[\]\\]/g, '');
            return res.badRequest({}, { message: errorMessage });
        }
    }
    if (object && object.query) {
        const result = validSchema.query.validate(object.query);
        if (result.error && result.error.details.length) {
            let errorMessage = result.error.details[0].message;
            errorMessage = errorMessage.replace(/["\|[\]\\]/g, '');
            return res.badRequest({}, { message: errorMessage });
        }
    }
    return next();
};

module.exports = validate;
