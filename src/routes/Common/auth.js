const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const authValidation = require('../../validations/AuthValidation');
const authController = require('../../controllers/Common/AuthController');

const router = express.Router();

router
    .post(
        '/register',
        validate(authValidation.register),
        authController.register
    );

router
    .post(
        '/login',
        validate(authValidation.login),
        authController.login
    );

router
    .post(
        '/logout',
        auth('manageProfile'),
        authController.logout
    );

router
    .route('/change-password')
    .post(
        auth('manageProfile'),
        validate(authValidation.changePassword),
        authController.changePassword
    );

router
    .get(
        '/get-updated-profile',
        auth('manageProfile'),
        authController.getUpdatedProfile
    );

router
    .post(
        '/update-profile',
        auth('manageProfile'),
        validate(authValidation.updateProfile),
        authController.updateProfile
    );

module.exports = router;
