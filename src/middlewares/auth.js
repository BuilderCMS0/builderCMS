const passport = require('passport');
const { ROLE_RIGHTS } = require('../config/constant');
const MESSAGE = require('../config/message').message;
const { Token } = require('../models/index');
const _utilService = require('../services/util');

const verifyCallback = (req, resolve, reject, requiredRights) => async (err, user, info) => {
    err && console.log('err :>> ', err);
    if (err || info || !user) {
        return reject(MESSAGE.UNAUTHORIZED);
    }

    req.user = user;

    if (requiredRights.length) {
        const userRights = ROLE_RIGHTS;
        const hasRequiredRights = requiredRights.every((requiredRight) => userRights.includes(requiredRight));
        if (!hasRequiredRights || !user.id) {
            return reject(MESSAGE.UNAUTHORIZED);
        }
    }

    resolve();
};

const auth = (...requiredRights) => async (req, res, next) => {
    return new Promise(async (resolve, reject) => {
        if (req.headers.authorization) {
            const token = _utilService.getOriginalToken(req.headers.authorization);
            let tokenData = await Token.findOne({ token: token });
            if (!tokenData) {
                return res.sessionTimeOut(MESSAGE.SESSION_TIME_OUT);
            }
        }
        passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject, requiredRights))(
            req,
            res,
            next
        );
    })
        .then(() => {
            next()
        })
        .catch((err) => {
            console.log("auth-middleware--->",err)
            return res.serverError({}, err);
        });
};

module.exports = auth;
