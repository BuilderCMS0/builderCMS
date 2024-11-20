const mongoose = require('mongoose');
const moment = require('moment');
const bcrypt = require('bcryptjs');
const { toJSON } = require('./plugins');
const UtilService = require('../services/util');


const userSchema = mongoose.Schema(
    {
        firstName: {
            type: String,
            default: '',
            trim: true,
        },
        lastName: {
            type: String,
            default: '',
            trim: true,
        },
        mobile: {
            type: String,
            default: '',
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            trim: true,
            minlength: 8,
            private: true,
        },
        isUserUpdated: {
            type: Boolean,
            default: false
        },
        selectedCompany: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Files',
            default: null
        },
        createdAt: {
            type: String,
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        updatedAt: {
            type: String,
            default: null,
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

// add plugin that converts mongoose to json
userSchema.plugin(toJSON);

userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
    const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
    return !!user;
};

userSchema.statics.isMobileTaken = async function (mobile, excludeUserId) {
    const user = await this.findOne({ mobile, _id: { $ne: excludeUserId } });
    return !!user;
};

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
userSchema.methods.isPasswordMatch = async function (password) {
    const user = this;
    if (!user.password) {
        user.password = "";
    }
    return bcrypt.compare(password, user.password);
};

// Hook
userSchema.pre('save', async function save(next) {
    const user = this;
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8);
    }

    if (user.firstName) user.firstName = UtilService.toTitleCase(user.firstName);
    if (user.lastName) user.lastName = UtilService.toTitleCase(user.lastName);
    if (user.email) user.email = user.email.toLowerCase();

    user.createdAt = moment().toISOString();
    if (user.loggedInUserId) user.createdBy = user.loggedInUserId;

    return next();
});

userSchema.pre(['findByIdAndUpdate', 'findOneAndUpdate', 'updateOne'], function (next) {
    const update = this.getUpdate();
    const options = this.getOptions();

    if (update && update.$set) {
        if (update.$set.firstName) update.$set.firstName = UtilService.toTitleCase(update.$set.firstName);
        if (update.$set.lastName) update.$set.lastName = UtilService.toTitleCase(update.$set.lastName);
        if (update.$set.email) update.$set.email = update.$set.email.toLowerCase();

        if (options && options.loggedInUserId && update.$set && !update.$set.updatedBy) {
            update.$set.updatedBy = options.loggedInUserId;
        }

        if (update.$set && !update.$set.updatedAt) {
            update.$set.updatedAt = moment().toISOString();
        }
    }

    if (update && update.set) {
        if (update.set.firstName) update.set.firstName = UtilService.toTitleCase(update.set.firstName);
        if (update.set.lastName) update.set.lastName = UtilService.toTitleCase(update.set.lastName);
        if (update.set.email) update.set.email = update.set.email.toLowerCase();
        
        if (options && options.loggedInUserId && update.set && !update.set.updatedBy) {
            update.set.updatedBy = options.loggedInUserId;
        }

        if (update.set && !update.set.updatedAt) {
            update.set.updatedAt = moment().toISOString();
        }
    }

    next();
});

userSchema.pre('updateMany', function (next) {
    const update = this.getUpdate();
    const options = this.getOptions();

    if (update && update.$set) {
        if (update.$set.firstName) update.$set.firstName = UtilService.toTitleCase(update.$set.firstName);
        if (update.$set.lastName) update.$set.lastName = UtilService.toTitleCase(update.$set.lastName);
        if (update.$set.email) update.$set.email = update.$set.email.toLowerCase();
        
        if (options && options.loggedInUserId && update.$set && !update.$set.updatedBy) {
            update.$set.updatedBy = options.loggedInUserId;
        }

        if (update.$set && !update.$set.updatedAt) {
            update.$set.updatedAt = moment().toISOString();
        }
    }

    if (update && update.set) {
        if (update.set.firstName) update.set.firstName = UtilService.toTitleCase(update.set.firstName);
        if (update.set.lastName) update.set.lastName = UtilService.toTitleCase(update.set.lastName);
        if (update.set.email) update.set.email = update.set.email.toLowerCase();
        
        if (options && options.loggedInUserId && update.set && !update.set.updatedBy) {
            update.set.updatedBy = options.loggedInUserId;
        }

        if (update.set && !update.set.updatedAt) {
            update.set.updatedAt = moment().toISOString();
        }
    }

    next();
});

module.exports = userSchema;
