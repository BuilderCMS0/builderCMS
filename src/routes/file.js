const express = require('express');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const fileValidation = require('../validations/FileValidation');
const fileController = require('../controllers/FilesController');

const router = express.Router();

router
    .route('/paginate')
    .post(
        auth('getFiles'),
        // permission(PAGE_PERMISSION_USER.COMPANIES, 'view'),
        validate(fileValidation.getFiles),
        fileController.getFiles
    );

router
    .route('/create-file')
    .post(
        auth('getFiles'),
        // permission(PAGE_PERMISSION_USER.COMPANIES, 'update'),
        validate(fileValidation.createFile),
        fileController.createFiles
    );

router
    .route('/delete')
    .post(
        auth('manageFiles'),
        // permission(PAGE_PERMISSION_USER.COMPANIES, 'delete'),
        validate(fileValidation.deleteFile),
        fileController.deleteFiles
    );

router
    .route('/changeSelectedFile')
    .post(
        auth('manageProfile'),
        // permission(PAGE_PERMISSION_USER.COMPANIES, 'delete'),
        validate(fileValidation.changeSelectedFile),
        fileController.changeSelectedFile
    );

router
    .route('/download-xls')
    .post(
        auth('getFiles'),
        validate(fileValidation.getFiles),
        fileController.getExcelFiles
    );

router
    .route('/download-pdf')
    .post(
        auth('getFiles'),
        validate(fileValidation.getFiles),
        fileController.getPdfFiles
    );

router
    .route('/:fileId')
    .get(
        auth('manageFiles'),
        // permission(PAGE_PERMISSION_USER.COMPANIES, 'update'),
        validate(fileValidation.getFile),
        fileController.getFile
    )
    .post(
        auth('manageFiles'),
        // permission(PAGE_PERMISSION_USER.COMPANIES, 'update'),
        validate(fileValidation.updateFile),
        fileController.updateFiles
    );

module.exports = router;
