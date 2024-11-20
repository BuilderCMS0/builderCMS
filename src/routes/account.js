const express = require('express');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const accountValidation = require('../validations/AccountValidation');
const accountController = require('../controllers/AccountController');

const router = express.Router();

router
    .route('/paginate')
    .post(
        auth('getAccounts'),
        validate(accountValidation.getAccounts),
        accountController.getAccounts
    );

router
    .route('/create-account')
    .post(
        auth('manageAccounts'),
        validate(accountValidation.createAccount),
        accountController.createAccount
    );

router
    .route('/delete')
    .post(
        auth('manageAccounts'),
        validate(accountValidation.deleteAccount),
        accountController.deleteAccounts
    );

router
    .route('/getLedgerReport')
    .post(
        auth('manageAccounts'),
        validate(accountValidation.getLedgerReport),
        accountController.getLedgerReport
    );

router
    .route('/getAccountSums')
    .post(
        auth('manageAccounts'),
        validate(accountValidation.getAccountSum),
        accountController.getTotalAccountSums
    );

router
    .route('/bank/download-xls')
    .post(
        auth('getAccounts'),
        validate(accountValidation.getAccounts),
        accountController.getExcelBank
    );

router
    .route('/cash/download-xls')
    .post(
        auth('getAccounts'),
        validate(accountValidation.getAccounts),
        accountController.getExcelCash
    );

router
    .route('/ledger-report/download-xls')
    .post(
        auth('manageAccounts'),
        validate(accountValidation.getLedgerReport),
        accountController.getExcelLedgerReport
    );

router
    .route('/bank/download-pdf')
    .post(
        auth('getAccounts'),
        validate(accountValidation.getAccounts),
        accountController.getPdfBank
    );

router
    .route('/cash/download-pdf')
    .post(
        auth('getAccounts'),
        validate(accountValidation.getAccounts),
        accountController.getPdfCash
    );

router
    .route('/ledger-report/download-pdf')
    .post(
        auth('manageAccounts'),
        validate(accountValidation.getLedgerReport),
        accountController.getPdfLedgerReport
    );

router
    .route('/:accountId')
    .get(
        auth('manageAccounts'),
        validate(accountValidation.getAccount),
        accountController.getAccount
    )
    .patch(
        auth('manageAccounts'),
        validate(accountValidation.updateAccount),
        accountController.updateAccount
    );

module.exports = router;
