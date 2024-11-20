const mongoose = require('mongoose');
const moment = require('moment');
const { PAYMENT_STATUS, TRANSACTION_CONSTANTS, PAYMENT_MODE, EMI_TYPE } = require('../config/constant');
const { convertObjectToEnum } = require('../utils/common');

const paymentSchema = mongoose.Schema({
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
    partyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Party',
        default: null
    },
    reminderDate: { 
        type: String,  
        default: ''
    },
    transactionType: { 
        type: Number, 
        enum: convertObjectToEnum(TRANSACTION_CONSTANTS), 
        default: null // debit incoming money
    },
    paymentMode: { 
        type: Number, 
        enum: convertObjectToEnum(PAYMENT_MODE),
        default: null
    },
    emiType: { 
        type: Number, 
        enum: convertObjectToEnum(EMI_TYPE),
        default: null
    },
    payment: { 
        type: Number, 
        required: true 
    },
    collectingDate: { 
        type: String, 
        required: false 
    },
    createdAt: { 
        type: Date, 
        default: '' 
    },
    narration: { 
        type: String, 
        required: false,
        default: ''
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
    status: {
        type: Number,
        enum: convertObjectToEnum(PAYMENT_STATUS),
        default: PAYMENT_STATUS.PENDING
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    isManually: {
        type: Boolean,
        default: false
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

paymentSchema.pre('save', async function save(next) {
    const payment = this;
    payment.createdAt = moment().toISOString();
    return next();
});

module.exports = paymentSchema;
