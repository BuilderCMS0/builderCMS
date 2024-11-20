const mongoose = require('mongoose');
const moment = require('moment');

const fileSchema = mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        name: {
            type: String,
            required: true,
            // trim: true,
        },
        house: {
            type: Number,
            default: 0
        },
        remaining_house: {
            type: Number,
            default: 0
        },
        sold_house: {
            type: Number,
            default: 0
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

fileSchema.pre('save', async function save(next) {
    const files = this;
    files.createdAt = moment().toISOString();
    return next();
});

module.exports = fileSchema;
