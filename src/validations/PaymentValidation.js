const Joi = require('joi');
const { objectId } = require('./CustomValidation');

const createPayment = {
  body: Joi.object().keys({
    partyId: Joi.string().required().custom(objectId),
    fileId: Joi.string().required().custom(objectId),
    reminderDate: Joi.string().allow(''),
    transactionType: Joi.number().valid(1, 2).required(),
    paymentMode: Joi.number().allow(''),
    payment: Joi.number().required(),
    collectingDate: Joi.string().allow(''),
    emiType: Joi.number().allow(null),
    isPaid: Joi.boolean(),
    isExtra: Joi.boolean(),
    toThirdStaff: Joi.string().custom(objectId),
    narration: Joi.string().allow(''),
    bank_name: Joi.string().allow(''),
    account_number: Joi.string().allow(''),
    cheque_number: Joi.string().allow(''),
    cheque_date: Joi.string().allow(''),
  }),
};

const getPayments = {
  body: Joi.object().keys({
    filter: Joi.allow(''),
    page: Joi.number().allow(''),
    limit: Joi.number().allow(''),
    sort: Joi.allow(''),
    search: Joi.object().allow(''),
  }),
};

const getPayment = {
  params: Joi.object().keys({
    paymentId: Joi.string().custom(objectId),
  }),
};

const updatePayment = {
  params: Joi.object().keys({
    paymentId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      partyId: Joi.string().required().custom(objectId),
      fileId: Joi.string().required().custom(objectId),
      reminderDate: Joi.string().allow(''),
      transactionType: Joi.number().valid(1, 2).required(),
      paymentMode: Joi.number().allow(''),
      payment: Joi.number().required(),
      collectingDate: Joi.string().allow(''),
      emiType: Joi.number().allow(null),
      isPaid: Joi.boolean().required(),
      isExtra: Joi.boolean(),
      toThirdStaff: Joi.string().custom(objectId),
      narration: Joi.string().allow(''),
      bank_name: Joi.string().allow(''),
      account_number: Joi.string().allow(''),
      cheque_number: Joi.string().allow(''),
      cheque_date: Joi.string().allow(''),
    })
    .min(1),
};

const deletePayment = {
  body: Joi.object().keys({
    partyId: Joi.string().required().custom(objectId),
    paymentIdArray: Joi.array().required(),
  }),
};

module.exports = {
  createPayment,
  getPayments,
  getPayment,
  updatePayment,
  deletePayment,
};
