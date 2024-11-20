const ok = require('./ok');
const badRequest = require('./badRequest');
const created = require('./created');
const dependent = require('./dependent');
const forbidden = require('./forbidden');
const negotiate = require('./negotiate');
const notFound = require('./notFound');
const serverError = require('./serverError');
const unauthorized = require('./unauthorized');
const sessionTimeOut = require('./sessionTimeOut');

module.exports = {
    ok,
    badRequest,
    serverError,
    notFound,
    forbidden,
    unauthorized,
    created,
    dependent,
    negotiate,
    sessionTimeOut
};
