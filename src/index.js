const { http, app } = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const routes = require('./routes');
const { closeBrowserInstance } = require('./controllers/GeneratePdfController');

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

process.on('exit', closeBrowserInstance);
process.on('SIGINT', async () => {
    logger.info('SIGINT received');
    await closeBrowserInstance();
    if (server) {
        server.close();
    }
    process.exit(0);
});
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received');
    await closeBrowserInstance();
    if (server) {
        server.close();
    }
    process.exit(0);
});

app.use(routes);