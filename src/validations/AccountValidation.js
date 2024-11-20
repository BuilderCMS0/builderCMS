const Joi = require('joi');
const { objectId } = require('./CustomValidation');

const createAccount = {
    body: Joi.object().keys({
        date: Joi.string().optional(),
        fileId: Joi.string().custom(objectId).optional(),
        partyId: Joi.string().custom(objectId).optional(),
        transactionType: Joi.number().required().valid(1, 2).optional(), // 1: DEBIT, 2: CREDIT
        paymentMode: Joi.number().required().valid(1, 2, 3).optional(), // 1: CHAQUE, 2: CASH, 3: ETRANSAFER
        type: Joi.number().required().valid(1, 2).optional(), // 1: CASH, 2: BANK
        payment: Joi.number().required(),
        bank_name: Joi.string().optional(),
        account_number: Joi.string().optional(),
        cheque_number: Joi.string().optional(),
        cheque_date: Joi.string().optional(),
        narration: Joi.string().optional()
    }),
};

const getAccounts = {
    body: Joi.object().keys({
        filter: Joi.optional(),
        sort: Joi.optional(),
        page: Joi.number().allow(''),
        limit: Joi.number().allow(''),
        search: Joi.object().allow(''),
    }),
};

const getAccount = {
    params: Joi.object().keys({
        accountId: Joi.string().custom(objectId),
    }),
};

const updateAccount = {
    params: Joi.object().keys({
        accountId: Joi.required().custom(objectId),
    }),
    body: Joi.object()
        .keys({
            date: Joi.string(),
            fileId: Joi.string().custom(objectId).optional(),
            partyId: Joi.string().custom(objectId),
            transactionType: Joi.number().valid(1, 2),
            paymentMode: Joi.number().valid(1, 2, 3),
            type: Joi.number().valid(1, 2),
            payment: Joi.number(),
            bank_name: Joi.string(),
            account_number: Joi.string(),
            cheque_number: Joi.string(),
            cheque_date: Joi.string(),
            narration: Joi.string()
        })
        .min(1),
};

const deleteAccount = {
    body: Joi.object().keys({
        accountIdArray: Joi.array().required()
    }),
};

const getLedgerReport = {
    body: Joi.object().keys({
        filter: Joi.object().required(),
        page: Joi.number().allow(''),
        limit: Joi.number().allow(''),
    }),
};

const getAccountSum = {
    body: Joi.object().keys({
        filter: Joi.object().required(),
    }),
};

const getDashboardReport = {
    body: Joi.object().keys({
        fileId: Joi.string().required().custom(objectId),
        filter: Joi.number().required(),
    }),
};

const getDashboardSumReport = {
    body: Joi.object().keys({
        fileId: Joi.string().required().custom(objectId),
    }),
};

const getDownloadData = {
    body: Joi.object().keys({
        data: Joi.array().required(),
        columns: Joi.array().required(),
    }),
};

module.exports = {
    createAccount,
    getAccounts,
    getAccount,
    updateAccount,
    deleteAccount,
    getLedgerReport,
    getAccountSum,
    getDashboardReport,
    getDashboardSumReport,
    getDownloadData
};
