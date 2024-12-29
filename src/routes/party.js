const express = require('express');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const partyValidation = require('../validations/PartyValidation');
const partyController = require('../controllers/PartyController');

const router = express.Router();

router
    .route('/paginate')
    .post(
        auth('getParties'),
        validate(partyValidation.getParties),
        partyController.getParties
    );

router
    .route('/create-party')
    .post(
        auth('manageParties'),
        validate(partyValidation.createParty),
        partyController.createParty
    );

router
    .route('/add-staff')
    .post(
        auth('manageParties'),
        validate(partyValidation.createStaff),
        partyController.createStaff
    );

router
    .route('/delete')
    .post(
        auth('manageParties'),
        validate(partyValidation.deleteParty),
        partyController.deleteParties
    );


router
    .route('/download-xls')
    .post(
        auth('getParties'),
        validate(partyValidation.getParties),
        partyController.getExcelParties
    );

router
    .route('/download-pdf')
    .post(
        auth('getParties'),
        validate(partyValidation.getParties),
        partyController.getPdfParties
    );

router
    .route('/cancel-party')
    .post(
        auth('manageParties'),
        validate(partyValidation.cancelParty),
        partyController.cancelParty
    );

router
    .route('/:partyId')
    .get(
        auth('manageParties'),
        validate(partyValidation.getParty),
        partyController.getParty
    )
    .post(
        auth('manageParties'),
        validate(partyValidation.updateParty),
        partyController.updateParty
    );

module.exports = router;
