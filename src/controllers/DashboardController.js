const moment = require('moment');
const message = require('../config/message');
const { Account } = require('../models'); // Adjust if necessary
const { ObjectId } = require('mongodb');
const CommonService = require('../services/common');
const { TRANSACTION_CONSTANTS, TENURE } = require('../config/constant');
const excelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

module.exports = {
    async getMonthlyTotalBalanceReport(req, res) {
        try {
            const userId = req.user._id;

            const filter = req?.body?.filter;

            let groupBy;
            switch (filter) {
                case TENURE.QUARTERLY:
                    groupBy = {
                        year: { $year: { $toDate: "$date" } },
                        quarter: { $ceil: { $divide: [{ $month: { $toDate: "$date" } }, 3] } }
                    };
                    break;
                case TENURE.HALF_YEARLY:
                    groupBy = {
                        year: { $year: { $toDate: "$date" } },
                        half: { $cond: [{ $lte: [{ $month: { $toDate: "$date" } }, 6] }, 1, 2] }
                    };
                    break;
                case TENURE.YEARLY:
                    groupBy = {
                        year: { $year: { $toDate: "$date" } }
                    };
                    break;
                default: // monthly
                    groupBy = {
                        year: { $year: { $toDate: "$date" } },
                        month: { $month: { $toDate: "$date" } }
                    };
                    break;
            }

            const report = await Account.aggregate([
                { $match: { userId: new ObjectId(userId), fileId: new ObjectId(req.body.fileId) } },
                {
                    $group: {
                        _id: groupBy,
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
                        period: {
                            $switch: {
                                branches: [
                                    { case: { $eq: [filter, TENURE.MONTHLY] }, then: { $concat: [{ $cond: [{ $lt: ["$_id.month", 10] }, "0", ""] }, { $toString: "$_id.month" }, "-", { $toString: "$_id.year" }] } },
                                    { case: { $eq: [filter, TENURE.QUARTERLY] }, then: { $concat: ["Q", { $toString: "$_id.quarter" }, "-", { $toString: "$_id.year" }] } },
                                    { case: { $eq: [filter, TENURE.HALF_YEARLY] }, then: { $concat: ["H", { $toString: "$_id.half" }, "-", { $toString: "$_id.year" }] } },
                                    { case: { $eq: [filter, TENURE.YEARLY] }, then: { $toString: "$_id.year" } }
                                ],
                                default: "Unknown"
                            }
                        },
                        totalBalance: { $subtract: ["$totalCredit", "$totalDebit"] }
                    }
                },
                { $sort: { "_id.year": 1, "_id.month": 1, "_id.quarter": 1, "_id.half": 1 } }
            ]);

            return res.ok({ list: report }, message.message.OK);
        } catch (error) {
            console.log("getMonthlyTotalBalanceReport Error:", error);
            return res.serverError(error);
        }
    },

    async getTotalSums(req, res) {
        try {
            const userId = req.user._id;

            const result = await Account.aggregate([
                { $match: { userId: new ObjectId(userId), fileId: new ObjectId(req.body.fileId) } },
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

    async getMonthlyDebitCreditReport(req, res) {
        try {
            const userId = req.user._id;
            const filter = req?.body?.filter;

            let groupBy;
            switch (filter) {
                case TENURE.QUARTERLY:
                    groupBy = {
                        year: { $year: { $toDate: "$date" } },
                        quarter: { $ceil: { $divide: [{ $month: { $toDate: "$date" } }, 3] } }
                    };
                    break;
                case TENURE.HALF_YEARLY:
                    groupBy = {
                        year: { $year: { $toDate: "$date" } },
                        half: { $cond: [{ $lte: [{ $month: { $toDate: "$date" } }, 6] }, 1, 2] }
                    };
                    break;
                case TENURE.YEARLY:
                    groupBy = {
                        year: { $year: { $toDate: "$date" } }
                    };
                    break;
                default: // monthly
                    groupBy = {
                        year: { $year: { $toDate: "$date" } },
                        month: { $month: { $toDate: "$date" } }
                    };
                    break;
            }

            const report = await Account.aggregate([
                { $match: { userId: new ObjectId(userId), fileId: new ObjectId(req.body.fileId) } },
                {
                    $group: {
                        _id: groupBy,
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
                }, {
                    $project: {
                        period: {
                            $switch: {
                                branches: [
                                    { case: { $eq: [filter, TENURE.YEARLY] }, then: { $concat: [{ $cond: [{ $lt: ["$_id.month", 10] }, "0", ""] }, { $toString: "$_id.month" }, "-", { $toString: "$_id.year" }] } },
                                    { case: { $eq: [filter, TENURE.QUARTERLY] }, then: { $concat: ["Q", { $toString: "$_id.quarter" }, "-", { $toString: "$_id.year" }] } },
                                    { case: { $eq: [filter, TENURE.HALF_YEARLY] }, then: { $concat: ["H", { $toString: "$_id.half" }, "-", { $toString: "$_id.year" }] } },
                                    { case: { $eq: [filter, TENURE.YEARLY] }, then: { $toString: "$_id.year" } }
                                ],
                                default: "Unknown"
                            }
                        },
                        totalDebit: 1,
                        totalCredit: 1
                    }
                },
                { $sort: { "_id.year": 1, "_id.month": 1, "_id.quarter": 1, "_id.half": 1 } }
            ]);

            return res.ok({ list: report }, message.message.OK);
        } catch (error) {
            console.log("getMonthlyDebitCreditReport Error:", error);
            return res.serverError(error);
        }
    },

    async getDownloadedPdf(req, res) {
        try {
            const params = req.body;
            const dataArray = params?.data || [];
            const columnsArray = params?.columns || [];

            const pathToSave = path.join(__dirname, '../../excels-generated');
            const fileName = `pdf-list-${Date.now()}.pdf`;
            const filePath = path.join(pathToSave, fileName);

            if (dataArray && dataArray.length > 0 && columnsArray && columnsArray.length > 0) {

                const writeStream = fs.createWriteStream(filePath);

                try {
                    await CommonService.downloadPdf('', dataArray, columnsArray, pathToSave, writeStream, 20);
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
                                console.log('Excel file deleted successfully');
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
            console.log("File getDownloadedPdf Error::>", error);
            return res.serverError(error);
        }
    },

    async getDownloadedExcel(req, res) {
        try {
            const params = req.body;
            const dataArray = params?.data || [];
            const columnsArray = params?.columns || [];

            if (dataArray && dataArray.length > 0 && columnsArray && columnsArray.length > 0) {

                const workbook = new excelJS.Workbook();
                const worksheet = workbook.addWorksheet('excel-list');
                worksheet.columns = columnsArray;

                worksheet.addRows(dataArray);
                const pathToSave = path.join(__dirname, '../../excels-generated');
                const fileName = `excel-list-${Date.now()}.xlsx`;
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
            console.log("File getDownloadedExcel Error::>", error);
            return res.serverError(error);
        }
    },
};
