const mongoose = require('mongoose');
const config = require('../config/config');
const writeConn = mongoose.createConnection(config.mongoose.url, config.mongoose.options);
const readConn = mongoose.createConnection(config.mongoose.url1, config.mongoose.optionsRead);

// module.exports.Token = require('./Token');
module.exports.Token = writeConn.model('Token', require('./Token'));
module.exports.TokenRead = readConn.model('Token', require('./Token'));
// module.exports.User = require('./User');
module.exports.User = writeConn.model('User', require('./User'));
module.exports.UserRead = readConn.model('User', require('./User'));

module.exports.Files = writeConn.model('Files', require('./Files'));
module.exports.FilesRead = readConn.model('Files', require('./Files'));

module.exports.Party = writeConn.model('Party', require('./Party'));
module.exports.PartyRead = readConn.model('Party', require('./Party'));

module.exports.Payment = writeConn.model('Payment', require('./Payment'));
module.exports.PaymentRead = readConn.model('Payment', require('./Payment'));

module.exports.Account = writeConn.model('Account', require('./Account'));
module.exports.AccountRead = readConn.model('Account', require('./Account'));