const moment = require('moment');
const message = require('../config/message');
const { Party, PartyRead, Payment, Files, FilesRead, Account } = require('../models');
const { ObjectId } = require('mongodb');
const CommonService = require('../services/common');
const { calculateEMI } = require('../services/party');
const { PAYMENT_STATUS, TENURE_MONTH_NAME, TRANSACTION_CONSTANTS, EMI_TYPE, TYPE_CONSTANTS, PAYMENT_MODE } = require('../config/constant');
const excelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

module.exports = {
    async createParty(req, res) {
        try {
            let params = req.body;
            const loggedInUser = req.user;
            const userId = loggedInUser._id;
            params.userId = userId;
            params.createdBy = userId;
            params.isStaff = false;

            const partyByHouse = await PartyRead.findOne({ houseNumber: params.houseNumber, fileId: params.fileId, userId: params.userId }).lean();

            if (partyByHouse) {
                return res.badRequest(null, message.message.HOUSE_EXIST);
            }

            params.totalPaidAmount = params?.downPayment || 0;

            let startDate = moment(params?.bookingDate).add(1, 'months').toISOString();
            let emiObj = await calculateEMI(params?.payment, params?.downPayment, params?.month, params?.regularEMI, startDate, params?.regularTenure, params?.masterEMI, params?.masterTenure, params?.reminderDateRegular, params?.reminderDateMaster);
            let { emiListArray, closingAmount } = emiObj
            params.remainingAmount = closingAmount || 0;
            const party = await Party(params).save();

            const emiSchedule = emiListArray || [];
            if (emiSchedule.length > 0) {
                const enrichedEmiSchedule = emiSchedule.map(emi => ({
                    ...emi,
                    userId: party.userId || null,
                    fileId: party.fileId || null,
                    partyId: party._id || null,
                    status: PAYMENT_STATUS.PENDING,
                    createdAt: moment().toISOString(),
                    createdBy: party.userId || null,
                    isPaid: false,
                    isManually: false
                }));

                if (params?.downPayment) {

                    const newDate = moment(startDate).format('YYYY-MM-DD');
                    const downPaymentObj = {
                        reminderDate: newDate,
                        collectingDate: newDate,
                        payment: params?.downPayment,
                        status: PAYMENT_STATUS.ON_TIME,
                        transactionType: TRANSACTION_CONSTANTS.CREDIT,
                        paymentMode: PAYMENT_MODE.CASH,
                        emiType: EMI_TYPE.DOWN_PAYMENT,
                        userId: party.userId || null,
                        fileId: party.fileId || null,
                        partyId: party._id || null,
                        createdAt: moment().toISOString(),
                        createdBy: party.userId || null,
                        isPaid: true,
                        isManually: true
                    }

                    enrichedEmiSchedule.unshift(downPaymentObj)
                }
                await Payment.insertMany(enrichedEmiSchedule);
            }
            const payments = await Payment.find({ partyId: party._id }).lean();
            if (params.fileId) {
                const filesDetail = await FilesRead.findOne({ _id: params.fileId }).lean();
                await Files.findOneAndUpdate(
                    { _id: params.fileId },
                    {
                        $set: {
                            remaining_house: filesDetail.remaining_house - 1,
                            sold_house: filesDetail.sold_house + 1
                        }
                    },
                    { new: true }
                );
            }

            const downPaymentObj = payments && payments?.length > 0 && payments?.find((payment) => payment.emiType == EMI_TYPE.DOWN_PAYMENT)
            if (params?.downPayment && downPaymentObj) {
                const accountType = [downPaymentObj.paymentMode].includes(PAYMENT_MODE.CASH) ? TYPE_CONSTANTS.CASH : TYPE_CONSTANTS.BANK;

                const accountData = {
                    userId: userId,
                    fileId: downPaymentObj.fileId,
                    paymentId: downPaymentObj._id,
                    date: downPaymentObj?.collectingDate || moment().format('YYYY-MM-DD'),
                    partyId: downPaymentObj?.partyId,
                    transactionType: downPaymentObj?.transactionType,
                    paymentMode: downPaymentObj?.paymentMode,
                    type: accountType,
                    payment: downPaymentObj?.payment,
                    bank_name: downPaymentObj?.bankName,
                    account_number: downPaymentObj?.accountNumber,
                    cheque_number: downPaymentObj?.chequeNumber,
                    cheque_date: downPaymentObj?.chequeDate,
                    narration: downPaymentObj?.narration,
                    createdBy: userId
                };

                const account = new Account(accountData);
                await account.save();
            }
            return res.ok({ payments, party }, message.message.PARTY_CREATED);
        } catch (error) {
            console.log('createParty', error);
            return res.serverError(error);
        }
    },

    async getParties(req, res) {
        try {
            if (!req.body || !req.body.filter) {
                req.body.filter = {};
            }
            const filter = await CommonService.getFilter(req.body);
            filter.where.userId = req.user._id;
            if (!filter.where.isStaff) {
                filter.where.isStaff = false;
            }

            const result = await PartyRead.find(filter.where)
                .sort(filter.sort)
                .skip(filter.skip)
                .limit(filter.limit)
                .lean();

            const response = { list: result };
            response.count = await PartyRead.find(filter.where).count();
            return res.ok(response, message.message.OK);
        } catch (error) {
            console.log("Party paginate Error::>", error);
            return res.serverError(error);
        }
    },

    async getParty(req, res) {
        try {
            const loggedInUser = req.user;
            const userId = loggedInUser._id;

            const party = await Party.findOne({ _id: req.params.partyId, userId: userId }).lean();
            if (!party) {
                return res.notFound(null, message.message.PARTY_NOT_FOUND);
            }
            return res.ok(party, message.message.OK);
        } catch (error) {
            console.log('==========> getParty | error', error);
            return res.serverError(error);
        }
    },

    async updateParty(req, res) {
        try {
            const loggedInUser = req.user;
            const userId = loggedInUser._id;
            let params = req.body;
            params.updatedBy = userId;
            params.updatedAt = moment().toISOString();
            params.isStaff = false;

            const party = await Party.findOne({ _id: req.params.partyId, userId: userId });
            if (!party) {
                return res.notFound(null, message.message.PARTY_NOT_FOUND);
            }
            const existingPayments = await Payment.find({ partyId: party._id });

            const retainedPayments = existingPayments.filter(payment =>
                payment.isPaid || payment.isManually
            );

            const totalRetainedAmount = retainedPayments.reduce((sum, payment) => sum + payment.payment, 0);

            const emiFieldsChanged = [
                'reminderDateRegular', 'reminderDateMaster', 'payment', 'downPayment',
                'month', 'regularEMI', 'regularTenure', 'masterEMI', 'masterTenure'
            ].some(field => params[field] !== undefined && params[field] !== party[field]);

            if (emiFieldsChanged) {
                const remainingAmount = (params?.payment || party.payment) - (params?.downPayment || party.downPayment);
                const adjustedAmount = remainingAmount - totalRetainedAmount;
                const adjustedMonths = (params?.month || party.month);

                let startDate = moment(party?.bookingDate).add(1, 'months').toISOString();
                let emiObj = await calculateEMI(
                    adjustedAmount,
                    0,
                    adjustedMonths,
                    params?.regularEMI || party.regularEMI,
                    startDate,
                    params?.regularTenure || party.regularTenure,
                    params?.masterEMI || party.masterEMI,
                    params?.masterTenure || party.masterTenure,
                    params?.reminderDateRegular || party.reminderDateRegular,
                    params?.reminderDateMaster || party.reminderDateMaster
                );
                let { emiListArray, closingAmount } = emiObj;
                params.remainingAmount = closingAmount || 0;
                const newEmiSchedule = emiListArray || [];

                const enrichedEmiSchedule = newEmiSchedule.map(emi => ({
                    ...emi,
                    userId: party.userId || null,
                    fileId: party.fileId || null,
                    partyId: party._id || null,
                    status: PAYMENT_STATUS.PENDING,
                    createdAt: moment().toISOString(),
                    isPaid: false
                }));

                const unpaidPayments = existingPayments.filter(payment => !payment.isPaid && !payment.isManually);

                if (unpaidPayments.length > 0) {
                    await Payment.deleteMany({ _id: { $in: unpaidPayments.map(p => p._id) } });
                }

                const filteredEnrichedEmiSchedule = filterEmiSchedule(enrichedEmiSchedule, retainedPayments);

                if (filteredEnrichedEmiSchedule.length > 0) {
                    await Payment.insertMany(filteredEnrichedEmiSchedule);
                }

            }
            const payments = await Payment.find({ partyId: party._id }).lean();
            const updatedParty = await Party.findOneAndUpdate(
                { _id: req.params.partyId },
                { $set: params },
                { new: true }
            );
            return res.ok({ payments, party: updatedParty }, message.message.PARTY_UPDATED);
        } catch (error) {
            console.log('==========> updateParty| error', error);
            return res.serverError(error);
        }
    },

    async deleteParties(req, res) {
        try {
            req.body.partyIdArray = req.body.partyIdArray.map(p => new ObjectId(p));
            if (req.body.partyIdArray && req.body.partyIdArray.length > 0) {
                const userId = req.user._id;
                const numberOfDeletedParties = req.body.partyIdArray.length;

                await Party.deleteMany({ _id: req.body.partyIdArray, userId: userId });

                const fileId = req?.body?.fileId;
                if (fileId) {
                    const filesDetail = await FilesRead.findOne({ _id: fileId }).lean();
                    await Files.findOneAndUpdate(
                        { _id: fileId },
                        {
                            $set: {
                                remaining_house: filesDetail.remaining_house + numberOfDeletedParties,
                                sold_house: filesDetail.sold_house - numberOfDeletedParties
                            }
                        },
                        { new: true }
                    );
                }

                await Payment.deleteMany({ partyId: req.body.partyIdArray, userId: userId });

                await Account.deleteMany({ partyId: req.body.partyIdArray, userId: userId });

                return res.ok(null, message.message.PARTY_DELETED);
            }
            return res.notFound({}, message.message.PARTY_LIST_NOT_FOUND);
        } catch (error) {
            console.log("Party deletion error", error);
            return res.serverError(error);
        }
    },

    async createStaff(req, res) {
        try {
            let params = req.body;
            const loggedInUser = req.user;
            const userId = loggedInUser._id;
            params.userId = userId;
            params.createdBy = userId;
            params.isStaff = true;

            let party;
            if (params.partyId) {
                party = await Party.findOneAndUpdate(
                    { _id: params.partyId, userId: userId, isStaff: true },
                    { $set: params },
                    { new: true }
                );

                if (!party) {
                    return res.notFound(null, message.message.PARTY_NOT_FOUND);
                }
                return res.ok({ party }, message.message.PARTY_UPDATED);
            } else {
                party = await Party(params).save();
                return res.ok({ party }, message.message.PARTY_CREATED);
            }

        } catch (error) {
            console.log('createParty', error);
            return res.serverError(error);
        }
    },

    async getExcelParties(req, res) {
        try {
            if (!req.body || !req.body.filter) {
                req.body.filter = {};
            }
            const filter = await CommonService.getFilter(req.body);
            filter.where.userId = req.user._id;
            if (!filter.where.isStaff) {
                filter.where.isStaff = false;
            }

            const partyDetail = await PartyRead.find(filter.where)
                .sort(filter.sort)
                .lean();

            if (partyDetail && partyDetail.length > 0) {
                const partyArray = [];
                for (let index = 0; index < partyDetail.length; index++) {
                    const element = partyDetail[index];
                    partyArray.push({
                        createdDate: element.createdAt ? moment(element.createdAt).format('DD-MM-YYYY hh:mm A') : null,
                        partyType: element.isStaff ? 'Staff' : 'Non-staff',
                        houseNumber: element.houseNumber ?? null,
                        ownerName: element.ownerName ?? null,
                        mobileNumber: element.mobileNumber ?? null,
                        brokerName: element.brokerName ?? null,
                        brokerMobileNumber: element.brokerMobileNumber ?? null,
                        houseSize: element.houseSize ?? null,
                        bookingDate: element.bookingDate ? moment(element.bookingDate).format('DD-MM-YYYY hh:mm A') : null,
                        payment: element.payment ?? null,
                        downPayment: element.downPayment ?? null,
                        month: element.month ?? null,
                        regularEMI: element.regularEMI ?? null,
                        regularTenure: TENURE_MONTH_NAME[element.regularTenure] ?? null,
                        reminderDateRegular: element.reminderDateRegular ?? null,
                        masterEMI: element.masterEMI ?? null,
                        masterTenure: TENURE_MONTH_NAME[element.masterTenure] ?? null,
                        reminderDateMaster: element.reminderDateMaster ?? null,
                        remainingAmount: element.remainingAmount ?? null,
                        totalPaidAmount: element.totalPaidAmount ?? null,
                        condition: element.condition ?? null,
                        narration: element.narration ?? null,
                    });
                }
                const workbook = new excelJS.Workbook();
                const worksheet = workbook.addWorksheet('party-list');

                worksheet.columns = [
                    {
                        header: 'Created Date',
                        key: 'createdDate',
                        width: 20,
                    },
                    {
                        header: 'Party Type',
                        key: 'partyType',
                        width: 20,
                    },
                    {
                        header: 'House Number',
                        key: 'houseNumber',
                        width: 20,
                    },
                    {
                        header: 'Owner Name',
                        key: 'ownerName',
                        width: 20,
                    },
                    {
                        header: 'Mobile Number',
                        key: 'mobileNumber',
                        width: 20,
                    },
                    {
                        header: 'Broker Name',
                        key: 'brokerName',
                        width: 20,
                    },
                    {
                        header: 'Broker Mobile Number',
                        key: 'brokerMobileNumber',
                        width: 20,
                    },
                    {
                        header: 'House Size',
                        key: 'houseSize',
                        width: 20,
                    },
                    {
                        header: 'Booking Date',
                        key: 'bookingDate',
                        width: 20,
                    },
                    {
                        header: 'Payment',
                        key: 'payment',
                        width: 15,
                    },
                    {
                        header: 'Down Payment',
                        key: 'downPayment',
                        width: 15,
                    },
                    {
                        header: 'Month',
                        key: 'month',
                        width: 10,
                    },
                    {
                        header: 'Regular EMI',
                        key: 'regularEMI',
                        width: 15,
                    },
                    {
                        header: 'Regular Tenure',
                        key: 'regularTenure',
                        width: 20,
                    },
                    {
                        header: 'Reminder Date (Regular)',
                        key: 'reminderDateRegular',
                        width: 25,
                    },
                    {
                        header: 'Master EMI',
                        key: 'masterEMI',
                        width: 15,
                    },
                    {
                        header: 'Master Tenure',
                        key: 'masterTenure',
                        width: 20,
                    },
                    {
                        header: 'Reminder Date (Master)',
                        key: 'reminderDateMaster',
                        width: 25,
                    },
                    {
                        header: 'Remaining Amount',
                        key: 'remainingAmount',
                        width: 20,
                    },
                    {
                        header: 'Total Paid Amount',
                        key: 'totalPaidAmount',
                        width: 20,
                    },
                    {
                        header: 'Condition',
                        key: 'condition',
                        width: 20,
                    },
                    {
                        header: 'Narration',
                        key: 'narration',
                        width: 25,
                    },
                ];

                worksheet.addRows(partyArray);
                const pathToSave = path.join(__dirname, '../../excels-generated');
                const fileName = `party-list-${Date.now()}.xlsx`;
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
            console.log("Party getExcelParties Error::>", error);
            return res.serverError(error);
        }
    },

    async getPdfParties(req, res) {
        try {
            if (!req.body || !req.body.filter) {
                req.body.filter = {};
            }
            const filter = await CommonService.getFilter(req.body);
            filter.where.userId = req.user._id;
            if (!filter.where.isStaff) {
                filter.where.isStaff = false;
            }

            const partyDetail = await PartyRead.find(filter.where)
                .sort(filter.sort)
                .lean();

            if (partyDetail && partyDetail.length > 0) {
                const partyArray = [];
                for (let index = 0; index < partyDetail.length; index++) {
                    const element = partyDetail[index];
                    partyArray.push({
                        createdDate: element.createdAt ? moment(element.createdAt).format('DD-MM-YYYY') : null,
                        partyType: element.isStaff ? 'Staff' : 'Non-staff',
                        houseNumber: element.houseNumber || null,
                        ownerName: element.ownerName || null,
                        mobileNumber: element.mobileNumber || null,
                        bookingDate: element.bookingDate ? moment(element.bookingDate).format('DD-MM-YYYY') : null,
                        payment: element.payment || null,
                        downPayment: element.downPayment || null,
                        month: element.month || null,
                        regularEMI: element.regularEMI || null,
                        regularTenure: TENURE_MONTH_NAME[element.regularTenure] || null,
                        reminderDateRegular: element.reminderDateRegular || null,
                        masterEMI: element.masterEMI || null,
                        masterTenure: TENURE_MONTH_NAME[element.masterTenure] || null,
                        reminderDateMaster: element.reminderDateMaster || null,
                        remainingAmount: element.remainingAmount || null,
                        totalPaidAmount: element.totalPaidAmount || null,
                    });
                }

                const columns = [
                    {
                        header: 'Created Date',
                        key: 'createdDate',
                        width: 20,
                    },
                    {
                        header: 'Party Type',
                        key: 'partyType',
                        width: 20,
                    },
                    {
                        header: 'House Number',
                        key: 'houseNumber',
                        width: 20,
                    },
                    {
                        header: 'Owner Name',
                        key: 'ownerName',
                        width: 20,
                    },
                    {
                        header: 'Mobile Number',
                        key: 'mobileNumber',
                        width: 20,
                    },
                    {
                        header: 'Booking Date',
                        key: 'bookingDate',
                        width: 20,
                    },
                    {
                        header: 'Payment',
                        key: 'payment',
                        width: 15,
                    },
                    {
                        header: 'Down Payment',
                        key: 'downPayment',
                        width: 15,
                    },
                    {
                        header: 'Month',
                        key: 'month',
                        width: 10,
                    },
                    {
                        header: 'Regular EMI',
                        key: 'regularEMI',
                        width: 15,
                    },
                    {
                        header: 'Regular Tenure',
                        key: 'regularTenure',
                        width: 20,
                    },
                    {
                        header: 'Reminder Date (Regular)',
                        key: 'reminderDateRegular',
                        width: 25,
                    },
                    {
                        header: 'Master EMI',
                        key: 'masterEMI',
                        width: 15,
                    },
                    {
                        header: 'Master Tenure',
                        key: 'masterTenure',
                        width: 20,
                    },
                    {
                        header: 'Reminder Date (Master)',
                        key: 'reminderDateMaster',
                        width: 25,
                    },
                    {
                        header: 'Remaining Amount',
                        key: 'remainingAmount',
                        width: 20,
                    },
                    {
                        header: 'Total Paid Amount',
                        key: 'totalPaidAmount',
                        width: 20,
                    },
                ];


                const pathToSave = path.join(__dirname, '../../excels-generated');
                const fileName = `party-list-${Date.now()}.pdf`;
                const filePath = path.join(pathToSave, fileName);

                const writeStream = fs.createWriteStream(filePath);

                try {
                    await CommonService.downloadPdf(partyArray, columns, pathToSave, writeStream, 40);
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
            console.log("getPdfParties Error::>", error);
            return res.serverError(error);
        }
    },
};

const filterEmiSchedule = (newEmiSchedule, retainedPayments) => {
    return newEmiSchedule.filter(emi => {
        const emiReminderMonth = moment(emi.reminderDate).format('YYYY-MM');
        return !retainedPayments.some(retained => {
            const retainedReminderMonth = moment(retained.reminderDate).format('YYYY-MM');
            return emiReminderMonth === retainedReminderMonth && emi.emiType === retained.emiType;
        });
    });
};  