const moment = require('moment');
const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');
const tokenService = require('./token');
const userService = require('./user');
const { Token, User, TokenRead } = require('../models/index');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');
const message = require('../config/message');
const CONSTANT = require('../config/constant');

/**
 * Login with username and password
 * @param {string} username
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginUserWithUsernameAndPassword = async (username, password, params) => {
    try {
        console.log('username :>> ', username);

        let user = await userService.getUserByEmailOrMobile(username);
        if (!user) {
            throw message.message.USER_NOT_REGISTERED;
        }

        const isPasswordMatch = await user.isPasswordMatch(password);
        if (!isPasswordMatch) {
            throw {
                code: 'E_USER_NOT_FOUND',
                message: 'The username and password combination you entered is mismatched.',
                status: 401,
            };
        }
        const userDetails = await User.findById({ _id: user._id }).lean();

        const getDeviceToken = await TokenRead.findOne({ user: user._id });

        if (getDeviceToken && getDeviceToken?.token) {
            await logout(getDeviceToken?.token);
            return userDetails
        }

        return userDetails
    } catch (error) {
        console.log(error);
        throw error;
    }

};

/**
 * Logout
 * @param {string} accessToken
 * @returns {Promise}
 */
const logout = async (accessToken) => {
    const refreshTokenDoc = await Token.findOne({ token: accessToken, type: tokenTypes.ACCESS });
    if (!refreshTokenDoc) {
        throw message.message.USER_INVALID_TOKEN;
    }
    await Token.deleteOne({ _id: refreshTokenDoc._id });
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
    try {
        const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
        const user = await userService.getUserById(refreshTokenDoc.user);
        if (!user) {
            throw new Error();
        }
        await Token.deleteOne({ _id: refreshTokenDoc._id });
        return tokenService.generateAuthTokens(user);
    } catch (error) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
    }
};

module.exports = {
    loginUserWithUsernameAndPassword,
    logout,
    refreshAuth,

    async changePassword(user, password, newPassword) {
        try {
            const isPasswordMatch = await bcrypt.compare(password, user.password);
            if (!isPasswordMatch) {
                throw message.message.PASSWORD_NOT_MATCH;
            }
            const newPassword1 = await bcrypt.hash(newPassword, 8);
            const updatedUser = await User.findOneAndUpdate({
                _id: user._id
            }, {
                $set: {
                    password: newPassword1,
                    updatedBy: user.id,
                    updatedAt: moment().toISOString(),
                    resetPasswordUpdatedDate: moment().toISOString()
                }
            }, {
                new: true
            });

            return updatedUser;
        } catch (e) {
            throw e;
        }
    },
};
