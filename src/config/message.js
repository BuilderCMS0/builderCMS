const { BANK_STATEMENT_MAX_EXCEL_ROW, SP_MAX_EXCEL_ROW, JV_MAX_EXCEL_ROW, BM_MAX_EXCEL_ROW, BANK_STATEMENT_MAX_MERGE_ROW } = require('./constant');

module.exports = {
    message: {
        OK: {
            code: 'OK',
            message: 'Operation is successfully executed',
            status: 200,
        },
        BAD_REQUEST: {
            code: 'E_BAD_REQUEST',
            message: 'Sorry, we are facing some issue. Please contact customer support for more details.',
            status: 400,
        },
        UNAUTHORIZED: {
            code: 'E_UNAUTHORIZED',
            message: "Sorry, you're not authorized to perform this action. We apologize for the inconvenience.",
            status: 401,
        },
        SESSION_TIME_OUT: {
            code: 'E_UNAUTHORIZED',
            message: `You're already logged into another PC/Laptop. You can only be logged in on one device at a time.`,
            status: 401,
        },
        FORBIDDEN: {
            code: 'E_FORBIDDEN',
            message: 'Access Denied You don`t have permission to access.',
            status: 403,
        },
        NOT_FOUND: {
            code: 'E_NOT_FOUND',
            message: 'The requested resource could not be found.',
            status: 200,
        },
        DATA_NOT_FOUND: {
            code: 'E_NOT_FOUND',
            message: 'data not found.',
            status: 404,
        },
        SERVER_ERROR: {
            code: 'E_INTERNAL_SERVER_ERROR',
            // eslint-disable-next-line prettier/prettier
            message: 'Oops, there\'s some issue at our end. Please wait for sometime and try again.',
            status: 500,
        },
        ERROR: {
            code: 'E_ERROR',
            // eslint-disable-next-line prettier/prettier
            message: 'Oops, there\'s some issue at our end. Please wait for sometime and try again.',
            status: 400,
        },
        EMAIL_REGISTERED: {
            code: 'UNPROCESSABLE_ENTITY',
            message: 'Email is already exist',
            status: 422,
        },
        MOBILE_REGISTERED: {
            code: 'UNPROCESSABLE_ENTITY',
            message: 'Mobile number is already exist',
            status: 422,
        },
        LOGIN_SUCCESS: {
            code: 'OK',
            message: 'Welcome to Suvit',
            status: 200,
        },
        LOGOUT_SUCCESS: {
            code: 'OK',
            message: 'Logout successfully.',
            status: 200,
        },
        ALREADY_LOGIN: {
            code: 'UNPROCESSABLE_ENTITY',
            message: 'Any other user already login',
            status: 401,
        },
        CHANGE_PASSWORD: {
            code: 'OK',
            message: 'Password changed successfully. Please log in again!',
            status: 200,
        },
        CHANGE_PASSWORD_FAIL: {
            code: 'E_BAD_REQUEST',
            message: 'Change Password Failed',
            status: 401,
        },
        PASSWORD_NOT_MATCH: {
            code: 'UNPROCESSABLE_ENTITY',
            message: 'Your current password is incorrect.',
            status: 403,
        },
        PASSWORD_REQUIRED: {
            code: 'E_BAD_REQUEST',
            message: 'Password is required.',
            status: 403,
        },
        USER_NOT_REGISTERED: {
            code: 'E_USER_NOT_FOUND',
            message: 'You are not registered, please create a new account or try again with the existing account.',
            status: 401,
        },
        USER_INVALID_TOKEN: {
            code: 'E_USER_NOT_FOUND',
            message: 'Your session is timed out. Please login again to continue.',
            status: 401,
        },
        USER_DEACTIVATE: {
            code: 'E_UNAUTHORIZED',
            message: 'Your account has been deactivated. Please contact customer support.',
            status: 403,
        },
        USER_ALREADY_LOGGED_IN: {
            code: 'OK',
            message: `You're already logged into another PC/Laptop. Would you like to proceed? *By clicking on "Yes", you'll be logged in here and logged out from another PC/laptop.`,
            status: 200,
        },
        USER_UPDATED: {
            code: 'OK',
            message: 'User updated successfully.',
            status: 200,
        },
        FAILED_EXCEL_RESPONSE: {
            code: 'FAILED_EXCEL_RESPONSE',
            message: 'Failed to write excel in response!',
            status: 500,
        },
        FILE_CREATED: {
            code: 'OK',
            message: 'File added successfully.',
            status: 200,
        },
        FAIL_FILE_SAVE: {
            code: 'OK',
            message: 'File save failed!',
            status: 200,
        },
        FILE_UPDATED: {
            code: 'OK',
            message: 'File updated successfully.',
            status: 200,
        },
        FILE_NOT_FOUND: {
            code: 'E_NOT_FOUND',
            message: 'File record not found.',
            status: 200,
        },
        FILE_LIST_NOT_FOUND: {
            code: 'E_NOT_FOUND',
            message: 'File list not found.',
            status: 200,
        },
        FILE_LIST_NOT_FOUND_SOCKET: {
            code: 'E_NOT_FOUND',
            message: 'File list not found.',
            status: 404,
        },
        FILE_DELETED: {
            code: 'OK',
            message: 'Company deleted successfully.',
            status: 200,
        },
        PARTY_CREATED: {
            code: 'OK',
            message: 'Party created successfully.',
            status: 200,
        },
        PARTY_UPDATED: {
            code: 'OK',
            message: 'Party updated successfully.',
            status: 200,
        },
        PARTY_NOT_FOUND: {
            code: 'E_NOT_FOUND',
            message: 'Party record not found.',
            status: 200,
        },
        PARTY_LIST_NOT_FOUND: {
            code: 'E_NOT_FOUND',
            message: 'Party list not found.',
            status: 200,
        },
        PARTY_DELETED: {
            code: 'OK',
            message: 'Party deleted successfully.',
            status: 200,
        },
        PARTY_CANCELLED: {
            code: 'OK',
            message: 'Party cancelled successfully.',
            status: 200,
        },
        ACCOUNT_NOT_FOUND: {
            code: 'E_NOT_FOUND',
            message: 'Account record not found.',
            status: 200,
        },
        ACCOUNT_LIST_NOT_FOUND: {
            code: 'E_NOT_FOUND',
            message: 'Account list not found.',
            status: 200,
        },
        ACCOUNT_DELETED: {
            code: 'OK',
            message: 'Account deleted successfully.',
            status: 200,
        },
        HOUSE_EXIST: {
            code: 'UNPROCESSABLE_ENTITY',
            message: 'House No. is already exist',
            status: 422,
        },
        PAYMENT_CREATED: {
            code: 'OK',
            message: 'Payment added successfully.',
            status: 200,
        },
        FILE_ALREADY_PAID: {
            code: 'OK',
            message: 'Payment already done for the file.',
            status: 200,
        },
        PAYMENT_UPDATED: {
            code: 'OK',
            message: 'Payment updated successfully.',
            status: 200,
        },
        PAYMENT_FOUND_SUCCESS: {
            code: 'OK',
            message: 'Payment successfully found.',
            status: 200,
        },
        PAYMENT_NOT_FOUND: {
            code: 'E_NOT_FOUND',
            message: 'Payment record not found.',
            status: 200,
        },
        PAYMENT_LIST_NOT_FOUND: {
            code: 'E_NOT_FOUND',
            message: 'Payment list not found.',
            status: 200,
        },
        PAYMENT_STATUS_UPDATED: {
            code: 'OK',
            message: 'Payment status updated successfully.',
            status: 200,
        },
        PAYMENT_DELETED: {
            code: 'OK',
            message: 'Payment deleted successfully.',
            status: 200,
        },
    },
};
