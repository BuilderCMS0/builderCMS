/* eslint-disable prettier/prettier */
const { User } = require('../models/index');

module.exports = {
    async getUserById(id) {
        return User.findById(id);
    },

    async getUserByEmail(email) {
        return User.findOne({ email });
    },

    async getUserByEmailOrMobile(username) {
        return User.findOne(
            {
                $or: [{ email: username }, { mobile: username }]
            },
            '_id password'
        );
    },
};

