const express = require('express');

const authRoute = require('./Common/auth');
const userFileRoute = require('./file');
const userPartyRoute = require('./party');
const userPaymentRoute = require('./payment');
const userAccountRoutes = require('./account');
const userDashboardRoutes = require('./dashboard');

const router = express.Router();

router.use('/auth', authRoute);
router.use('/user/files', userFileRoute);
router.use('/user/party', userPartyRoute);
router.use('/user/payment', userPaymentRoute);
router.use('/user/account', userAccountRoutes);
router.use('/user/dashboard', userDashboardRoutes);

module.exports = router;
