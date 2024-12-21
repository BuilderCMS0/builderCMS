const moment = require('moment');
const message = require('../config/message');
const { Account } = require('../models'); // Adjust if necessary
const { ObjectId } = require('mongodb');
const CommonService = require('../services/common');
const { TRANSACTION_CONSTANTS, PAYMENT_MODE, TYPE_CONSTANTS } = require('../config/constant');
const excelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

module.exports = {
    async createAccount(req, res) {
        try {
            const loggedInUser = req.user;
            let userId = loggedInUser._id;
            req.body.userId = userId; // If you want to track the user who created the account
            req.body.createdBy = userId; // If you want to track who created the account

            const account = await Account(req.body).save();
            return res.ok(account, message.message.OK);
        } catch (error) {
            console.log('createAccount Error:', error);
            return res.serverError(error);
        }
    },

    async getAccounts(req, res) {
        try {
            if (!req.body || !req.body.filter) {
                req.body.filter = {};
            }
            const filter = await CommonService.getFilter(req.body);
            filter.where.userId = req.user._id;
            const result = await Account.find(filter.where)
                .populate('partyId', {
                    isStaff: 1,
                    houseNumber: 1,
                    ownerName: 1,
                    mobileNumber: 1,
                    payment: 1,
                    downPayment: 1,
                })
                .sort(filter.sort)
                .skip(filter.skip)
                .limit(filter.limit)
                .exec();

            const response = { list: result };

            response.count = await Account.find(filter.where).count();
            return res.ok(response, message.message.OK);
        } catch (error) {
            console.log("Account paginate Error::>", error);
            return res.serverError(error);
        }
    },

    async getAccount(req, res) {
        try {
            const loggedInUser = req.user;
            let userId = loggedInUser._id;

            const account = await Account.findOne({ _id: req.params.accountId, userId: userId });
            if (!account) {
                return res.notFound(null, message.message.ACCOUNT_NOT_FOUND);
            }
            return res.ok(account, message.message.OK);
        } catch (error) {
            return res.serverError(error);
        }
    },

    async updateAccount(req, res) {
        try {
            const loggedInUser = req.user;
            let userId = loggedInUser._id;
            req.body.updatedBy = userId;
            req.body.updatedAt = moment().toISOString();

            if (!req.params.accountId) {
                return res.badRequest(null, message.message.BAD_REQUEST);
            }
            const account = await Account.findOne({ _id: req.params.accountId, userId: userId });
            if (!account) {
                return res.notFound(null, message.message.ACCOUNT_NOT_FOUND);
            }
            const updatedAccount = await Account.findOneAndUpdate({ _id: req.params.accountId }, { $set: req.body }, { new: true });
            return res.ok(updatedAccount, message.message.OK);
        } catch (error) {
            return res.serverError(error);
        }
    },

    async deleteAccounts(req, res) {
        try {
            req.body.accountIdArray = req.body.accountIdArray.map(a => new ObjectId(a));
            if (req.body.accountIdArray && req.body.accountIdArray.length > 0) {
                let userId = req.user._id;

                await Account.deleteMany({ _id: req.body.accountIdArray, userId: userId });

                return res.ok(null, message.message.ACCOUNT_DELETED);
            }
            return res.notFound({}, message.message.ACCOUNT_LIST_NOT_FOUND);
        } catch (error) {
            console.log("Account deletion error:", error);
            return res.serverError(error);
        }
    },

    async getLedgerReport(req, res) {
        try {

            if (!req?.body?.page) {
                req.body.page = 1;
            }

            if (!req?.body?.limit) {
                req.body.limit = 20;
            }
            const filter = await CommonService.getFilter(req.body);
            filter.where.userId = req.user._id;

            if (req?.body?.filter?.fileId) {
                filter.where.fileId = CommonService.convertFilterToObjectId(req.body.filter.fileId)
            }

            if (req?.body?.filter?.partyId) {
                filter.where.partyId = CommonService.convertFilterToObjectId(req.body.filter.partyId)
            }

            if (req?.body?.filter?.paymetId) {
                filter.where.paymetId = CommonService.convertFilterToObjectId(req.body.filter.paymetId)
            }

            const ledgerReport = await Account.aggregate([
                { $match: filter.where },
                {
                    $group: {
                        _id: "$partyId",
                        totalDebit: {
                            $sum: {
                                $cond: [{ $eq: ["$transactionType", TRANSACTION_CONSTANTS.DEBIT] }, "$payment", 0]
                            }
                        },
                        totalCredit: {
                            $sum: {
                                $cond: [{ $eq: ["$transactionType", TRANSACTION_CONSTANTS.CREDIT] }, "$payment", 0]
                            }
                        },
                        accountDetails: { $push: "$$ROOT" } // Collect all account details for the party
                    }
                },
                {
                    $lookup: {
                        from: "parties",
                        localField: "_id",
                        foreignField: "_id",
                        as: "partyDetails"
                    }
                },
                { $unwind: "$partyDetails" },
                {
                    $project: {
                        partyId: "$_id",
                        totalDebit: 1,
                        totalCredit: 1,
                        balance: { $subtract: ["$totalCredit", "$totalDebit"] },
                        mobileNumber: "$partyDetails.mobileNumber",
                        ownerName: "$partyDetails.ownerName",
                        accountDetails: 1
                    }
                },
                {
                    $facet: {
                        totalCount: [{ $count: "totalCount" }], // Count the total number of documents
                        data: [
                            { $sort: filter.sort }, // Sort as per the filter
                            { $skip: filter.skip }, // Apply pagination skip
                            { $limit: filter.limit } // Apply pagination limit
                        ]
                    }
                }
            ]);

            // Extract total count and data from the result
            const totalCount = ledgerReport[0].totalCount.length > 0 ? ledgerReport[0].totalCount[0].totalCount : 0;
            const list = ledgerReport[0].data;

            return res.ok({ list, totalCount }, message.message.OK);
        } catch (error) {
            console.log("getLedgerReport Error:", error);
            return res.serverError(error);
        }
    },

    async getTotalAccountSums(req, res) {
        try {
            const filter = await CommonService.getFilter(req.body);
            filter.where.userId = req.user._id;

            if (req?.body?.filter?.fileId) {
                filter.where.fileId = CommonService.convertFilterToObjectId(req.body.filter.fileId)
            }

            if (req?.body?.filter?.partyId) {
                filter.where.partyId = CommonService.convertFilterToObjectId(req.body.filter.partyId)
            }

            if (req?.body?.filter?.paymetId) {
                filter.where.paymetId = CommonService.convertFilterToObjectId(req.body.filter.paymetId)
            }

            const result = await Account.aggregate([
                { $match: filter.where },
                {
                    $group: {
                        _id: null,
                        totalDebit: {
                            $sum: {
                                $cond: [{ $eq: ["$transactionType", TRANSACTION_CONSTANTS.DEBIT] }, "$payment", 0]
                            }
                        },
                        totalCredit: {
                            $sum: {
                                $cond: [{ $eq: ["$transactionType", TRANSACTION_CONSTANTS.CREDIT] }, "$payment", 0]
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalDebit: 1,
                        totalCredit: 1,
                        totalBalance: { $subtract: ["$totalCredit", "$totalDebit"] }
                    }
                }
            ]);

            let data = result.length > 0 ? result[0] : { totalDebit: 0, totalCredit: 0, totalBalance: 0 }
            return res.ok(data, message.message.OK);
        } catch (error) {
            console.log("getTotalSums Error:", error);
            return res.serverError(error);
        }
    },

    async getExcelBank(req, res) {
        try {
            if (!req.body || !req.body.filter) {
                req.body.filter = {};
            }
            const filter = await CommonService.getFilter(req.body);
            filter.where.userId = req.user._id;
            filter.where.type = TYPE_CONSTANTS.BANK;
            const accountDetails = await Account.find(filter.where)
                .populate('partyId', {
                    isStaff: 1,
                    houseNumber: 1,
                    ownerName: 1,
                    mobileNumber: 1,
                    payment: 1,
                    downPayment: 1,
                })
                .sort(filter.sort)
                .exec();

            if (accountDetails && accountDetails.length > 0) {
                const accountArray = [];
                for (let index = 0; index < accountDetails.length; index++) {
                    const element = accountDetails[index];
                    accountArray.push({
                        date: element.date ? moment(element.date).format('DD-MM-YYYY hh:mm A') : null,  // For Reminder Date
                        ownerName: element.partyId?.ownerName || null,  // For Party Name
                        mobileNo: element.partyId?.mobileNumber || null,  // For Mobile No.
                        payment: element.payment || null,  // For Total Payment
                        transactionType: element.transactionType == TRANSACTION_CONSTANTS.CREDIT ? 'Credit' : element.transactionType == TRANSACTION_CONSTANTS.DEBIT ? 'Debit' : null,
                        paymentMode: element.paymentMode == PAYMENT_MODE.CASH ? 'Cash' : element.paymentMode == PAYMENT_MODE.CHEQUE ? 'Cheque' : element.paymentMode == PAYMENT_MODE.ETRANSAFER ? 'E-Transfer' : null,
                        bankName: element.bank_name || null,  // For Bank Name
                        accountNumber: element.account_number || null,  // For Account Number
                        chequeNumber: element.cheque_number || null,  // For Cheque Number
                        chequeDate: element.cheque_date ? moment(element.cheque_date).format('DD-MM-YYYY') : null,  // For Cheque Date                        
                        narration: element.narration ? element.narration : null,
                    });

                }
                const workbook = new excelJS.Workbook();
                const worksheet = workbook.addWorksheet('account-bank-list');

                worksheet.columns = [
                    {
                        header: 'Date',
                        key: 'date',
                        width: 25,
                    },
                    {
                        header: 'Owner Name',
                        key: 'ownerName',
                        width: 20,
                    },
                    {
                        header: 'Mobile No.',
                        key: 'mobileNo',
                        width: 20,
                    },
                    {
                        header: 'Payment',
                        key: 'payment',
                        width: 20,
                    },
                    {
                        header: 'Transaction Type',
                        key: 'transactionType',
                        width: 20,
                    },
                    {
                        header: 'Payment Mode',
                        key: 'paymentMode',
                        width: 20,
                    },
                    {
                        header: 'Bank Name',
                        key: 'bankName',
                        width: 20,
                    },
                    {
                        header: 'Account Number',
                        key: 'accountNumber',
                        width: 20,
                    },
                    {
                        header: 'Cheque Number',
                        key: 'chequeNumber',
                        width: 20,
                    },
                    {
                        header: 'Cheque Date',
                        key: 'chequeDate',
                        width: 20,
                    },
                    {
                        header: 'Narration',
                        key: 'narration',
                        width: 30,
                    },
                ];

                worksheet.addRows(accountArray);
                const pathToSave = path.join(__dirname, '../../excels-generated');
                const fileName = `account-bank-list-${Date.now()}.xlsx`;
                const filePath = `${pathToSave}/${fileName}`;
                workbook.xlsx
                    .writeFile(filePath)
                    .then(() => {
                        res.download(filePath, function (error) {
                            if (error) {
                                console.log(res.headersSent);
                            }
                            fs.unlink(filePath, function (err) {
                                if (err) {
                                    console.log('err :>> ', err);
                                }
                                console.log('Excel file deleted successfully');
                            });
                        });
                    })
                    .catch((error) => {
                        return res.notFound(error, message.message.FAILED_EXCEL_RESPONSE);
                    });
            } else {
                return res.notFound({}, message.message.DATA_NOT_FOUND);
            }

        } catch (error) {
            console.log("Account getExcelBank Error::>", error);
            return res.serverError(error);
        }
    },

    async getExcelCash(req, res) {
        try {
            if (!req.body || !req.body.filter) {
                req.body.filter = {};
            }
            const filter = await CommonService.getFilter(req.body);
            filter.where.userId = req.user._id;
            filter.where.type = TYPE_CONSTANTS.CASH;
            const accountDetails = await Account.find(filter.where)
                .populate('partyId', {
                    isStaff: 1,
                    houseNumber: 1,
                    ownerName: 1,
                    mobileNumber: 1,
                    payment: 1,
                    downPayment: 1,
                })
                .sort(filter.sort)
                .exec();

            if (accountDetails && accountDetails.length > 0) {
                const accountArray = [];
                for (let index = 0; index < accountDetails.length; index++) {
                    const element = accountDetails[index];
                    accountArray.push({
                        date: element.date ? moment(element.date).format('DD-MM-YYYY hh:mm A') : null,  // For Reminder Date
                        ownerName: element.partyId?.ownerName || null,  // For Party Name
                        mobileNo: element.partyId?.mobileNumber || null,  // For Mobile No.
                        payment: element.payment || null,  // For Total Payment
                        transactionType: element.transactionType == TRANSACTION_CONSTANTS.CREDIT ? 'Credit' : element.transactionType == TRANSACTION_CONSTANTS.DEBIT ? 'Debit' : null,
                        paymentMode: element.paymentMode == PAYMENT_MODE.CASH ? 'Cash' : element.paymentMode == PAYMENT_MODE.CHEQUE ? 'Cheque' : element.paymentMode == PAYMENT_MODE.ETRANSAFER ? 'E-Transfer' : null,
                        bankName: element.bank_name || null,  // For Bank Name
                        accountNumber: element.account_number || null,  // For Account Number
                        chequeNumber: element.cheque_number || null,  // For Cheque Number
                        chequeDate: element.cheque_date ? moment(element.cheque_date).format('DD-MM-YYYY') : null,  // For Cheque Date                        
                        narration: element.narration ? element.narration : null,
                    });

                }
                const workbook = new excelJS.Workbook();
                const worksheet = workbook.addWorksheet('account-cash-list');

                worksheet.columns = [
                    {
                        header: 'Date',
                        key: 'date',
                        width: 25,
                    },
                    {
                        header: 'Owner Name',
                        key: 'ownerName',
                        width: 20,
                    },
                    {
                        header: 'Mobile No.',
                        key: 'mobileNo',
                        width: 20,
                    },
                    {
                        header: 'Payment',
                        key: 'payment',
                        width: 20,
                    },
                    {
                        header: 'Transaction Type',
                        key: 'transactionType',
                        width: 20,
                    },
                    {
                        header: 'Narration',
                        key: 'narration',
                        width: 30,
                    },
                ];

                worksheet.addRows(accountArray);
                const pathToSave = path.join(__dirname, '../../excels-generated');
                const fileName = `account-cash-list-${Date.now()}.xlsx`;
                const filePath = `${pathToSave}/${fileName}`;
                workbook.xlsx
                    .writeFile(filePath)
                    .then(() => {
                        res.download(filePath, function (error) {
                            if (error) {
                                console.log(res.headersSent);
                            }
                            fs.unlink(filePath, function (err) {
                                if (err) {
                                    console.log('err :>> ', err);
                                }
                                console.log('Excel file deleted successfully');
                            });
                        });
                    })
                    .catch((error) => {
                        return res.notFound(error, message.message.FAILED_EXCEL_RESPONSE);
                    });
            } else {
                return res.notFound({}, message.message.DATA_NOT_FOUND);
            }

        } catch (error) {
            console.log("Account getExcelCash Error::>", error);
            return res.serverError(error);
        }
    },

    async getExcelLedgerReport(req, res) {
        try {
            const filter = await CommonService.getFilter(req.body);
            filter.where.userId = req.user._id;

            if (req?.body?.filter?.fileId) {
                filter.where.fileId = new ObjectId(req.body.filter.fileId);
            }

            if (req?.body?.filter?.partyId) {
                filter.where.partyId = new ObjectId(req.body.filter.partyId);
            }

            if (req?.body?.filter?.paymetId) {
                filter.where.paymetId = new ObjectId(req.body.filter.paymetId);
            }

            const ledgerReport = await Account.aggregate([
                { $match: filter.where },
                {
                    $group: {
                        _id: "$partyId",
                        totalDebit: {
                            $sum: {
                                $cond: [{ $eq: ["$transactionType", TRANSACTION_CONSTANTS.DEBIT] }, "$payment", 0]
                            }
                        },
                        totalCredit: {
                            $sum: {
                                $cond: [{ $eq: ["$transactionType", TRANSACTION_CONSTANTS.CREDIT] }, "$payment", 0]
                            }
                        },
                        accountDetails: { $push: "$$ROOT" } // Collect all account details for the party
                    }
                },
                {
                    $lookup: {
                        from: "parties",
                        localField: "_id",
                        foreignField: "_id",
                        as: "partyDetails"
                    }
                },
                { $unwind: "$partyDetails" },
                {
                    $project: {
                        partyId: "$_id",
                        totalDebit: 1,
                        totalCredit: 1,
                        balance: { $subtract: ["$totalCredit", "$totalDebit"] },
                        mobileNumber: "$partyDetails.mobileNumber",
                        ownerName: "$partyDetails.ownerName",
                        accountDetails: 1 // Include account details in the projection
                    }
                }
            ]);

            if (ledgerReport && ledgerReport.length > 0) {
                const LedgerArray = [];
                for (let index = 0; index < ledgerReport.length; index++) {
                    const element = ledgerReport[index];
                    LedgerArray.push({
                        ownerName: element.ownerName || null,  // For Party Name
                        mobileNo: element.mobileNumber || null,  // For Mobile No.
                        totalDebit: element.totalDebit || 0,  // For Total Payment
                        totalCredit: element.totalCredit || 0,  // For Total Payment
                        balance: element.balance || 0,  // For Total Payment
                    });

                }
                const workbook = new excelJS.Workbook();
                const worksheet = workbook.addWorksheet('ledger-report-list');

                worksheet.columns = [
                    {
                        header: 'Owner Name',
                        key: 'ownerName',
                        width: 20,
                    },
                    {
                        header: 'Mobile No.',
                        key: 'mobileNo',
                        width: 20,
                    },
                    {
                        header: 'Total Debit',
                        key: 'totalDebit',
                        width: 20,
                    },
                    {
                        header: 'Total Credit',
                        key: 'totalCredit',
                        width: 20,
                    },
                    {
                        header: 'Balance Payment',
                        key: 'balance',
                        width: 20,
                    },
                ];

                worksheet.addRows(LedgerArray);
                const pathToSave = path.join(__dirname, '../../excels-generated');
                const fileName = `ledger-report-list-${Date.now()}.xlsx`;
                const filePath = `${pathToSave}/${fileName}`;
                workbook.xlsx
                    .writeFile(filePath)
                    .then(() => {
                        res.download(filePath, function (error) {
                            if (error) {
                                console.log(res.headersSent);
                            }
                            fs.unlink(filePath, function (err) {
                                if (err) {
                                    console.log('err :>> ', err);
                                }
                                console.log('Excel file deleted successfully');
                            });
                        });
                    })
                    .catch((error) => {
                        return res.notFound(error, message.message.FAILED_EXCEL_RESPONSE);
                    });
            } else {
                return res.notFound({}, message.message.DATA_NOT_FOUND);
            }

        } catch (error) {
            console.log("Account getExcelLedgerReport Error::>", error);
            return res.serverError(error);
        }
    },

    async getPdfBank(req, res) {
        try {
            if (!req.body || !req.body.filter) {
                req.body.filter = {};
            }
            const filter = await CommonService.getFilter(req.body);
            filter.where.userId = req.user._id;
            const accountDetails = await Account.find(filter.where)
                .populate('partyId', {
                    isStaff: 1,
                    houseNumber: 1,
                    ownerName: 1,
                    mobileNumber: 1,
                    payment: 1,
                    downPayment: 1,
                })
                .sort(filter.sort)
                .exec();

            if (accountDetails && accountDetails.length > 0) {
                const accountArray = [];
                for (let index = 0; index < accountDetails.length; index++) {
                    const element = accountDetails[index];
                    accountArray.push({
                        date: element.date ? moment(element.date).format('DD-MM-YYYY hh:mm A') : null,  // For Reminder Date
                        ownerName: element.partyId?.ownerName || null,  // For Party Name
                        mobileNo: element.partyId?.mobileNumber || null,  // For Mobile No.
                        payment: element.payment || null,  // For Total Payment
                        transactionType: element.transactionType == TRANSACTION_CONSTANTS.CREDIT ? 'Credit' : element.transactionType == TRANSACTION_CONSTANTS.DEBIT ? 'Debit' : null,
                        paymentMode: element.paymentMode == PAYMENT_MODE.CASH ? 'Cash' : element.paymentMode == PAYMENT_MODE.CHEQUE ? 'Cheque' : element.paymentMode == PAYMENT_MODE.ETRANSAFER ? 'E-Transfer' : null,
                        bankName: element.bank_name || null,  // For Bank Name
                        accountNumber: element.account_number || null,  // For Account Number
                        chequeNumber: element.cheque_number || null,  // For Cheque Number
                        chequeDate: element.cheque_date ? moment(element.cheque_date).format('DD-MM-YYYY') : null,  // For Cheque Date                        
                        narration: element.narration ? element.narration : null,
                    });

                }

                const columns = [
                    {
                        header: 'Date',
                        key: 'date',
                        width: 25,
                    },
                    {
                        header: 'Owner Name',
                        key: 'ownerName',
                        width: 20,
                    },
                    {
                        header: 'Mobile No.',
                        key: 'mobileNo',
                        width: 20,
                    },
                    {
                        header: 'Payment',
                        key: 'payment',
                        width: 20,
                    },
                    {
                        header: 'Transaction Type',
                        key: 'transactionType',
                        width: 20,
                    },
                    {
                        header: 'Payment Mode',
                        key: 'paymentMode',
                        width: 20,
                    },
                    {
                        header: 'Bank Name',
                        key: 'bankName',
                        width: 20,
                    },
                    {
                        header: 'Account Number',
                        key: 'accountNumber',
                        width: 20,
                    },
                    {
                        header: 'Cheque Number',
                        key: 'chequeNumber',
                        width: 20,
                    },
                    {
                        header: 'Cheque Date',
                        key: 'chequeDate',
                        width: 20,
                    },
                    {
                        header: 'Narration',
                        key: 'narration',
                        width: 30,
                    },
                ];

                const pathToSave = path.join(__dirname, '../../excels-generated');
                const fileName = `pdf-list-${Date.now()}.pdf`;
                const filePath = path.join(pathToSave, fileName);

                const writeStream = fs.createWriteStream(filePath);

                try {
                    await CommonService.downloadPdf('Bank Report', accountArray, columns, pathToSave, writeStream, 40);
                } catch (error) {
                    console.error('Error during PDF generation:', error);
                    return res.serverError(error);
                }
                writeStream.on('finish', function () {
                    try {
                        res.download(filePath, fileName, (err) => {
                            if (err) {
                                console.error('Error downloading the file:', err);
                            }
                            fs.unlink(filePath, function (err) {
                                if (err) {
                                    console.log('err :>> ', err);
                                }
                                console.log('Pdf file deleted successfully');
                            });
                        });
                    } catch (error) {
                        return res.serverError(error);
                    }
                });

                writeStream.on('error', function (err) {
                    console.error('Error writing the PDF file:', err);
                    return res.serverError(err);
                });
            } else {
                return res.notFound({}, message.message.DATA_NOT_FOUND);
            }

        } catch (error) {
            console.log("Account getPdfBank Error::>", error);
            return res.serverError(error);
        }
    },

    async getPdfCash(req, res) {
        try {
            if (!req.body || !req.body.filter) {
                req.body.filter = {};
            }
            const filter = await CommonService.getFilter(req.body);
            filter.where.userId = req.user._id;
            filter.where.type = TYPE_CONSTANTS.CASH;
            const accountDetails = await Account.find(filter.where)
                .populate('partyId', {
                    isStaff: 1,
                    houseNumber: 1,
                    ownerName: 1,
                    mobileNumber: 1,
                    payment: 1,
                    downPayment: 1,
                })
                .sort(filter.sort)
                .exec();

            if (accountDetails && accountDetails.length > 0) {
                const accountArray = [];
                for (let index = 0; index < accountDetails.length; index++) {
                    const element = accountDetails[index];
                    accountArray.push({
                        date: element.date ? moment(element.date).format('DD-MM-YYYY hh:mm A') : null,  // For Reminder Date
                        ownerName: element.partyId?.ownerName || null,  // For Party Name
                        mobileNo: element.partyId?.mobileNumber || null,  // For Mobile No.
                        payment: element.payment || null,  // For Total Payment
                        transactionType: element.transactionType == TRANSACTION_CONSTANTS.CREDIT ? 'Credit' : element.transactionType == TRANSACTION_CONSTANTS.DEBIT ? 'Debit' : null,
                        paymentMode: element.paymentMode == PAYMENT_MODE.CASH ? 'Cash' : element.paymentMode == PAYMENT_MODE.CHEQUE ? 'Cheque' : element.paymentMode == PAYMENT_MODE.ETRANSAFER ? 'E-Transfer' : null,
                        bankName: element.bank_name || null,  // For Bank Name
                        accountNumber: element.account_number || null,  // For Account Number
                        chequeNumber: element.cheque_number || null,  // For Cheque Number
                        chequeDate: element.cheque_date ? moment(element.cheque_date).format('DD-MM-YYYY') : null,  // For Cheque Date                        
                        narration: element.narration ? element.narration : null,
                    });

                }
                const columns = [
                    {
                        header: 'Date',
                        key: 'date',
                        width: 25,
                    },
                    {
                        header: 'Owner Name',
                        key: 'ownerName',
                        width: 20,
                    },
                    {
                        header: 'Mobile No.',
                        key: 'mobileNo',
                        width: 20,
                    },
                    {
                        header: 'Payment',
                        key: 'payment',
                        width: 20,
                    },
                    {
                        header: 'Transaction Type',
                        key: 'transactionType',
                        width: 20,
                    },
                    {
                        header: 'Narration',
                        key: 'narration',
                        width: 30,
                    },
                ];

                const pathToSave = path.join(__dirname, '../../excels-generated');
                const fileName = `pdf-list-${Date.now()}.pdf`;
                const filePath = path.join(pathToSave, fileName);

                const writeStream = fs.createWriteStream(filePath);

                try {
                    await CommonService.downloadPdf('Cash Report', accountArray, columns, pathToSave, writeStream, 40);
                } catch (error) {
                    console.error('Error during PDF generation:', error);
                    return res.serverError(error);
                }
                writeStream.on('finish', function () {
                    try {
                        res.download(filePath, fileName, (err) => {
                            if (err) {
                                console.error('Error downloading the file:', err);
                            }
                            fs.unlink(filePath, function (err) {
                                if (err) {
                                    console.log('err :>> ', err);
                                }
                                console.log('Pdf file deleted successfully');
                            });
                        });
                    } catch (error) {
                        return res.serverError(error);
                    }
                });

                writeStream.on('error', function (err) {
                    console.error('Error writing the PDF file:', err);
                    return res.serverError(err);
                });
            } else {
                return res.notFound({}, message.message.DATA_NOT_FOUND);
            }

        } catch (error) {
            console.log("Account getPdfCash Error::>", error);
            return res.serverError(error);
        }
    },

    async getPdfLedgerReport(req, res) {
        try {
            const filter = await CommonService.getFilter(req.body);
            filter.where.userId = req.user._id;

            if (req?.body?.filter?.fileId) {
                filter.where.fileId = new ObjectId(req.body.filter.fileId);
            }

            if (req?.body?.filter?.partyId) {
                filter.where.partyId = new ObjectId(req.body.filter.partyId);
            }

            if (req?.body?.filter?.paymetId) {
                filter.where.paymetId = new ObjectId(req.body.filter.paymetId);
            }

            const ledgerReport = await Account.aggregate([
                { $match: filter.where },
                {
                    $group: {
                        _id: "$partyId",
                        totalDebit: {
                            $sum: {
                                $cond: [{ $eq: ["$transactionType", TRANSACTION_CONSTANTS.DEBIT] }, "$payment", 0]
                            }
                        },
                        totalCredit: {
                            $sum: {
                                $cond: [{ $eq: ["$transactionType", TRANSACTION_CONSTANTS.CREDIT] }, "$payment", 0]
                            }
                        },
                        accountDetails: { $push: "$$ROOT" } // Collect all account details for the party
                    }
                },
                {
                    $lookup: {
                        from: "parties",
                        localField: "_id",
                        foreignField: "_id",
                        as: "partyDetails"
                    }
                },
                { $unwind: "$partyDetails" },
                {
                    $project: {
                        partyId: "$_id",
                        totalDebit: 1,
                        totalCredit: 1,
                        balance: { $subtract: ["$totalCredit", "$totalDebit"] },
                        mobileNumber: "$partyDetails.mobileNumber",
                        ownerName: "$partyDetails.ownerName",
                        accountDetails: 1 // Include account details in the projection
                    }
                }
            ]);

            if (ledgerReport && ledgerReport.length > 0) {
                const LedgerArray = [];
                for (let index = 0; index < ledgerReport.length; index++) {
                    const element = ledgerReport[index];
                    LedgerArray.push({
                        ownerName: element.ownerName || null,  // For Party Name
                        mobileNo: element.mobileNumber || null,  // For Mobile No.
                        totalDebit: element.totalDebit || 0,  // For Total Payment
                        totalCredit: element.totalCredit || 0,  // For Total Payment
                        balance: element.balance || 0,  // For Total Payment
                    });

                }
                const columns = [
                    {
                        header: 'Owner Name',
                        key: 'ownerName',
                        width: 20,
                    },
                    {
                        header: 'Mobile No.',
                        key: 'mobileNo',
                        width: 20,
                    },
                    {
                        header: 'Total Debit',
                        key: 'totalDebit',
                        width: 20,
                    },
                    {
                        header: 'Total Credit',
                        key: 'totalCredit',
                        width: 20,
                    },
                    {
                        header: 'Balance Payment',
                        key: 'balance',
                        width: 20,
                    },
                ];

                const pathToSave = path.join(__dirname, '../../excels-generated');
                const fileName = `pdf-list-${Date.now()}.pdf`;
                const filePath = path.join(pathToSave, fileName);

                const writeStream = fs.createWriteStream(filePath);

                try {
                    await CommonService.downloadPdf('Ledger Report', LedgerArray, columns, pathToSave, writeStream, 40);
                } catch (error) {
                    console.error('Error during PDF generation:', error);
                    return res.serverError(error);
                }
                writeStream.on('finish', function () {
                    try {
                        res.download(filePath, fileName, (err) => {
                            if (err) {
                                console.error('Error downloading the file:', err);
                            }
                            fs.unlink(filePath, function (err) {
                                if (err) {
                                    console.log('err :>> ', err);
                                }
                                console.log('Pdf file deleted successfully');
                            });
                        });
                    } catch (error) {
                        return res.serverError(error);
                    }
                });

                writeStream.on('error', function (err) {
                    console.error('Error writing the PDF file:', err);
                    return res.serverError(err);
                });
            } else {
                return res.notFound({}, message.message.DATA_NOT_FOUND);
            }

        } catch (error) {
            console.log("Account getPdfLedgerReport Error::>", error);
            return res.serverError(error);
        }
    },

};
