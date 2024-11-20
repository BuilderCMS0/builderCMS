const jwt = require('jsonwebtoken');
const moment = require('moment');
const config = require('../config/config');
const { Token } = require('../models/index');
const { tokenTypes } = require('../config/tokens');



/**
 * Generate token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} [secret]
 * @returns {string}
 */
const generateToken = (userId, expires, type, secret = config.jwt.secret) => {
    const payload = {
        sub: userId,
        iat: moment().unix(),
        exp: expires.unix(),
        type,
    };
    return jwt.sign(payload, secret);
};

/**
 * Save a token
 * @param {string} token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {boolean} [blacklisted]
 * @returns {Promise<Token>}
 */
const saveToken = async (token, userId, expires, type) => {
    await Token.deleteMany({ user: userId });
    const tokenDoc = await Token.create({
        token,
        user: userId,
        expires: expires.toDate(),
        type,
    });
    return tokenDoc;
};

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Token>}
 */
const verifyToken = async (token, type, getPayload = false) => {
    const payload = jwt.verify(token, config.jwt.secret);
    const tokenDoc = await Token.findOne({ token, type, user: payload.sub });
    if (getPayload) return payload;
    if (!tokenDoc) {
        throw new Error('Token not found');
    }
    return tokenDoc;
};

/**
 * Generate auth tokens
 * @param {User} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user) => {
    const accessTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
    const accessToken = generateToken(user.id || user._id, accessTokenExpires, tokenTypes.ACCESS,);
    await saveToken(accessToken, user.id || user._id, accessTokenExpires, tokenTypes.ACCESS);

    // const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
    // const refreshToken = generateToken(user.id || user._id, refreshTokenExpires, tokenTypes.REFRESH);
    // await saveToken(refreshToken, user.id || user._id, refreshTokenExpires, tokenTypes.REFRESH);

    return {
        access: {
            token: accessToken,
            expires: accessTokenExpires.toDate(),
        },
        // refresh: {
        //     token: refreshToken,
        //     expires: refreshTokenExpires.toDate(),
        // },
    };
};

module.exports = {
    generateToken,
    saveToken,
    verifyToken,
    generateAuthTokens,
};