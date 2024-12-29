require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const passport = require('passport');
const session = require('express-session');
const config = require('./config/config');
const morgan = require('./config/morgan');
const { jwtStrategy } = require('./config/passport');
const CONSTANT = require('./config/constant');

const app = require('express')();
const http = require('http').Server(app);

require('dd-trace').init({
    env: process.env.DD_ENV,
    service: process.env.DD_SERVICE,
    version: process.env.DD_VERSION,
    runtimeMetrics: process.env.DD_RUNTIME_METRICS_ENABLED,
    logInjection: process.env.DD_LOG_INJECTION,
    // profiling: process.env.DD_PROFILING_ENABLED
});


// io.on('connection', (socket) => {
// console.log("Socket connected--->", socket.id);
// });


app.use(session({
    secret: config.google.secret, // This is a secret key used to sign the session ID cookie
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if you are using https
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));


if (config.env !== 'test') {
    app.use(morgan.successHandler);
    app.use(morgan.errorHandler);
}
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: false }));

// parse json request body
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(helmet());

app.use(mongoSanitize());

// enable cors
// const whitelist = CONSTANT.ACCESS_URL;
// let corsOptions = function (req, callback) {
//     let corsOptions;
//     if (whitelist.indexOf(req.header('Origin')) !== -1) {
//         corsOptions = { origin: true } // reflect (enable) the requested origin in the CORS response
//     } else {
//         corsOptions = { origin: false } // disable CORS for this request
//         // console.log('corsOptions', corsOptions)
//     }
//     callback(null, corsOptions);
// };

const corsOptions = {
    origin: '*',
    methods: '*', // Allow all HTTP methods
    allowedHeaders: '*', // Allow all headers
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

const { ok, badRequest, serverError, forbidden, notFound, unauthorized, sessionTimeOut } = require('./responses');

app.use(function (req, res, next) {
    // eslint-disable-next-line no-shadow
    res.ok = function (body, config) {
        ok(req, res, body, config);
    };
    // eslint-disable-next-line no-shadow
    res.badRequest = function (body, config) {
        badRequest(req, res, body, config);
    };
    // eslint-disable-next-line no-shadow
    res.serverError = function (body, config) {
        serverError(req, res, body, config);
    };
    // eslint-disable-next-line no-shadow
    res.forbidden = function (body, config) {
        forbidden(req, res, body, config);
    };
    // eslint-disable-next-line no-shadow
    res.notFound = function (body, config) {
        notFound(req, res, body, config);
    };
    // eslint-disable-next-line no-shadow
    res.unauthorized = function (body, config) {
        unauthorized(req, res, body, config);
    };
    // eslint-disable-next-line no-shadow
    res.sessionTimeOut = function (body, config) {
        sessionTimeOut(req, res, body, config);
    };
    next();
});
// app.get('/events/:id', eventsHandler);

// jwt authentication
app.use(passport.initialize());
app.use(passport.session());
passport.use('jwt', jwtStrategy);

module.exports = { http, app };
