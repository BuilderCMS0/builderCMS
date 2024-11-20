const mongoose = require('mongoose');
const {http, app} = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
// const fs = require("fs");
// const path = require('path');
// const { createSession } = require('./services/WhatsappConnection');

let server;
// mongoose.createConnection(config.mongoose.url, config.mongoose.options);
//   logger.info('Connected to MongoDB');
server = http.listen(config.port, () => {
    logger.info(`Listening to port ${config.port}`);
});
server.timeout = 2 * 60 * 1000;
// });
const exitHandler = () => {
    if (server) {
        server.close(() => {
            logger.info('Server closed');
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
};

const unexpectedErrorHandler = (error) => {
    logger.error(error);
    exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
    logger.info('SIGTERM received');
    if (server) {
        server.close();
    }
});
const routes = require('./routes');

app.use(routes);