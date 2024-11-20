const Joi = require('joi');
const { USER_TYPE } = require('../config/constant');
const { password } = require('./CustomValidation');

const register = {
    body: Joi.object().keys({
        email: Joi.string().required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        mobile: Joi.string().required(),
        password: Joi.string().required(),
    }),
};

const login = {
    body: Joi.object().keys({
        username: Joi.string().required(),
        password: Joi.string().required(),
    }),
};

const changePassword = {
    body: Joi.object().keys({
        password: Joi.string().required().custom(password),
        newPassword: Joi.string().required().custom(password),
    }),
};

const updateProfile = {
    body: Joi.object()
        .keys({
            firstName: Joi.string(),
            lastName: Joi.string(),
            email: Joi.optional().allow(''),
            mobile: Joi.optional().allow(''),
        })
        .min(1),
};

module.exports = {
    changePassword,
    register,
    login,
    updateProfile,
};
