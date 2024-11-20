const mongoose = require('mongoose');
const moment = require('moment');
const { TRANSACTION_CONSTANTS, TYPE_CONSTANTS, PAYMENT_MODE } = require('../config/constant');
const { convertObjectToEnum } = require('../utils/common');

const accountSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Files',
        default: null
    },
    date: {
        type: String,
        default: ''
    },
    partyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Party',
        default: null
    },
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        default: null
    },
    transactionType: {
        type: Number,
        enum: convertObjectToEnum(TRANSACTION_CONSTANTS),
        default: null
    },
    paymentMode: {
        type: Number,
        enum: convertObjectToEnum(PAYMENT_MODE),
        default: null
    },
    type: {
        type: Number,
        enum: convertObjectToEnum(TYPE_CONSTANTS),
        default: null
    },
    payment: {
        type: Number,
        required: true
    },
    bank_name: {
        type: String,
        default: null,
    },
    account_number: {
        type: String,
        default: null,
    },
    cheque_number: {
        type: String,
        default: null,
    },
    cheque_date: {
        type: String,
        default: null,
    },
    narration: {
        type: String,
        required: false,
        default: ''
    },
    createdAt: {
        type: Date,
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
}, {
    versionKey: false // set to false then it wont create in mongodb
});

accountSchema.pre('save', async function save(next) {
    const account = this;
    account.createdAt = moment().toISOString();
    return next();
});

module.exports = accountSchema;
