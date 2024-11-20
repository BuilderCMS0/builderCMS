const Joi = require('joi');
const { objectId } = require('./CustomValidation');

const createFile = {
    body: Joi.object().keys({
        name: Joi.string().required(),
        house: Joi.number().required(),
    }),
};

const getFiles = {
    body: Joi.object().keys({
        filter: Joi.optional(),
        sort: Joi.optional(),
        search: Joi.object().allow(''),
    }),
};

const getFile = {
    params: Joi.object().keys({
        fileId: Joi.string().custom(objectId),
    }),
};

const updateFile = {
    params: Joi.object().keys({
        fileId: Joi.required().custom(objectId),
    }),
    body: Joi.object()
        .keys({
            name: Joi.string(),
            house: Joi.number(),
        })
        .min(1),
};

const changeSelectedFile = {
    body: Joi.object().keys({
        fileId: Joi.required().custom(objectId),
    }),
};


const deleteFile = {
    body: Joi.object().keys({
        fileId: Joi.required().custom(objectId),
    }),
};

module.exports = {
    createFile,
    getFiles,
    getFile,
    updateFile,
    deleteFile,
    changeSelectedFile
};
