const express = require('express');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const accountValidation = require('../validations/AccountValidation');
const dashboardController = require('../controllers/DashboardController');
const { generatePdfController } = require('../controllers');

const router = express.Router();

router
    .route('/getMonthlyTotalBalanceReport')
    .post(
        auth('manageDashboard'),
        validate(accountValidation.getDashboardReport),
        dashboardController.getMonthlyTotalBalanceReport
    );

router
    .route('/getTotalSums')
    .post(
        auth('manageDashboard'),
        validate(accountValidation.getDashboardSumReport),
        dashboardController.getTotalSums
    );

router
    .route('/getMonthlyDebitCreditReport')
    .post(
        auth('manageDashboard'),
        validate(accountValidation.getDashboardReport),
        dashboardController.getMonthlyDebitCreditReport
    );

router
    .route('/download-xls')
    .post(
        auth('manageDashboard'),
        validate(accountValidation.getDownloadData),
        dashboardController.getDownloadedExcel
    );

router
    .route('/download-pdf')
    .post(
        auth('manageDashboard'),
        validate(accountValidation.getDownloadData),
        dashboardController.getDownloadedPdf
    );

router
    .route('/download-invoice')
    .get(
        auth('manageDashboard'),
        generatePdfController.generateInvoice
    );

module.exports = router;
