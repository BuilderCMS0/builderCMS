const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    mongoose: {
        url: process.env.MONGODB_URL,
        url1: process.env.MONGODB_URL1,
        options: {
            user: process.env.MONGODB_USER,
            pass: process.env.MONGODB_PASS,
        },
        optionsRead: {
            readConcern: { level: "majority" },
            user: process.env.MONGODB_USER,
            pass: process.env.MONGODB_PASS,
        }
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        accessExpirationMinutes: process.env.JWT_ACCESS_EXPIRATION_MINUTES,
        refreshExpirationDays: process.env.JWT_REFRESH_EXPIRATION_DAYS,
        resetPasswordExpirationMinutes: 10
    },
    google: {
        secret: process.env.GOOGLE_SECRET_KEY,
    },
};
