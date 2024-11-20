const express = require('express');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const paymentValidation = require('../validations/PaymentValidation');
const paymentController = require('../controllers/PaymentController');

const router = express.Router();

router
  .route('/paginate')
  .post(
    auth('getPayments'),
    validate(paymentValidation.getPayments),
    paymentController.getPayments
  );

router
  .route('/create-payment')
  .post(
    auth('managePayments'),
    validate(paymentValidation.createPayment),
    paymentController.createPayment
  );

router
  .route('/delete')
  .post(
    auth('managePayments'),
    validate(paymentValidation.deletePayment),
    paymentController.deletePayments
  );

router
  .route('/download-xls')
  .post(
    auth('getPayments'),
    validate(paymentValidation.getPayments),
    paymentController.getExcelPayments
  );

router
  .route('/download-pdf')
  .post(
    auth('getPayments'),
    validate(paymentValidation.getPayments),
    paymentController.getPdfPayments
  );

router
  .route('/:paymentId')
  .get(
    auth('managePayments'),
    validate(paymentValidation.getPayment),
    paymentController.getPayment
  )
  .patch(
    auth('managePayments'),
    validate(paymentValidation.updatePayment),
    paymentController.updatePayment
  );

module.exports = router;
