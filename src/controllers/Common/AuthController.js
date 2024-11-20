const bcrypt = require('bcryptjs');
const authService = require('../../services/auth');
const _utilService = require('../../services/util');
const tokenService = require('../../services/token');
const message = require('../../config/message');
const { User, UserRead } = require('../../models/index');

module.exports = {
    async register(req, res) {
        try {
            let params = req.body;
            const isEmailTaken = await User.isEmailTaken(params.email);
            if (isEmailTaken) {
                return res.badRequest({}, message.message.EMAIL_REGISTERED);
            }
            const isMobileTaken = await User.isMobileTaken(params.mobile);
            if (isMobileTaken) {
                return res.badRequest({}, message.message.MOBILE_REGISTERED);
            }


            let user = await User.findOne({ $or: [{ email: params.email }, { mobile: params.mobile }] });


            if (user) {
                params.password = await bcrypt.hash(params.password, 8);
                await User.updateOne({ _id: user._id }, { $set: params }).exec();
                await User.deleteMany({ $or: [{ email: params.email }, { mobile: params.mobile }] });
            } else {
                user = await User(params).save();
            }

            user = await User.findById({ _id: user._id },
                '-password')
                .exec();


            user = user.toObject();

            const tokens = await tokenService.generateAuthTokens(user, params.loginType);

            return res.ok({ user: user, tokens }, message.message.OK);
        } catch (e) {
            console.log('register--->', e);
            return res.serverError({}, e);
        }
    },

    async login(req, res) {
        try {
            let params = req.body;

            let user = await authService.loginUserWithUsernameAndPassword(params.username, params.password);

            const tokens = await tokenService.generateAuthTokens({ _id: user._id });

            return res.ok({ user, tokens }, message.message.LOGIN_SUCCESS);
        } catch (e) {
            console.log("login------->", e);
            return res.serverError({}, e);
        }
    },

    async logout(req, res) {
        try {
            const loggedInUser = req.user;
            if (!req.headers.authorization) {
                return res.badRequest(null, message.message.BAD_REQUEST);
            }
            const token = _utilService.getOriginalToken(req.headers.authorization);

            let user = await User.findOne({ _id: loggedInUser._id });
            if (!user) {
                return res.sessionTimeOut(null, message.message.SESSION_TIME_OUT);
            }
            await authService.logout(token);

            return res.ok({}, message.message.LOGOUT_SUCCESS);
        } catch (e) {
            console.log("error", e);
            return res.serverError({}, e);
        }
    },

    async changePassword(req, res) {
        try {
            let response = await authService.changePassword(req.user, req.body.password, req.body.newPassword);
            if (response) {
                const token = _utilService.getOriginalToken(req.headers.authorization);
                await authService.logout(token);
                return res.ok({}, message.message.CHANGE_PASSWORD);
            } else {
                return res.badRequest({}, message.message.CHANGE_PASSWORD_FAIL);
            }
        } catch (err) {
            console.log('changePassword', err);

            return res.serverError({}, err);
        }
    },

    async getUpdatedProfile(req, res) {
        try {
            await User.updateOne({ _id: req.user._id }, { $set: { isUserUpdated: false } }).exec();
            let user = await User.findById({ _id: req.user._id }, '-password').exec();

            user = user.toObject();

            return res.ok({ user }, message.message.OK);
        } catch (error) {
            console.log('getUpdatedProfile--->', error);
            return res.serverError({}, error);
        }
    },

    async updateProfile(req, res) {
        try {
            let data = req.body;
            data.isUserUpdated = true;

            if (!data.firstName) delete data.firstName;
            if (!data.lastName) delete data.lastName;

            await User.findOneAndUpdate({ _id: req.user._id }, { $set: data }, { new: true });
            let userDetails = await User.findById({ _id: req.user._id }, '-password').lean();

            return res.ok(userDetails, message.message.USER_UPDATED);
        } catch (error) {
            console.log('updateProfile--->', error);
            return res.serverError(error);
        }
    },
};