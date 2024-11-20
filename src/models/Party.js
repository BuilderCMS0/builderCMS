const mongoose = require('mongoose');
const moment = require('moment');
const { TENURE } = require('../config/constant');
const { convertObjectToEnum } = require('../utils/common');

const partySchema = mongoose.Schema(
    {
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
        isStaff: {
            type: Boolean,
            default: false
        },
        houseNumber: {
            type: String,
            default: ''
        },
        ownerName: {
            type: String,
            default: ''
        },
        mobileNumber: {
            type: String,
            default: ''
        },
        subOwners: [
            {
                ownerName: {
                    type: String,
                    default: ''
                },
                mobileNumber: {
                    type: String,
                    default: ''
                }
            }
        ],
        brokerName: {
            type: String, 
            default: ''
        },
        brokerMobileNumber: {
            type: String, 
            default: ''
        },
        bookingDate: {
            type: String, 
            default: null
        },
        payment: {
            type: Number,
            default: 0
        },
        downPayment: {
            type: Number, 
            default: 0
        },
        month: {
            type: Number, 
            default: 0
        },
        regularEMI: {
            type: Number, 
            default: 0
        },
        regularTenure: {
            type: Number,
            default: TENURE.MONTHLY,
            enum: convertObjectToEnum(TENURE)
        },
        reminderDateRegular: {
            type: String, 
            default: '01'
        },
        masterEMI: {
            type: Number, 
            default: 0
        },
        masterTenure: {
            type: Number,
            default: null,
            enum: convertObjectToEnum(TENURE)
        },
        reminderDateMaster: {
            type: String, 
            default: '01'
        },
        houseSize: {
            type: String, 
            default: ''
        },
        remainingAmount: {
            type: Number, 
            default: 0
        },
        totalPaidAmount: {
            type: Number, 
            default: 0
        },
        narration: {
            type: String, 
            default: ''
        },
        condition: { 
            type: String, 
            default: ''
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        createdAt: {
            type: String,
            default: '',
        },
        updatedAt: {
            type: String,
            default: '',
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
    },
    {
        versionKey: false, // set to false then it wont create in mongodb
    }
);

partySchema.pre('save', async function save(next) {
    const party = this;
    party.createdAt = moment().toISOString();
    return next();
});

module.exports = partySchema;
