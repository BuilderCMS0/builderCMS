const moment = require('moment');
const message = require('../config/message');
const { Payment, Party, PartyRead, Files, FilesRead, Account } = require('../models');
const { ObjectId } = require('mongodb');
const CommonService = require('../services/common');
const { PAYMENT_STATUS, TRANSACTION_CONSTANTS, PAYMENT_MODE, TYPE_CONSTANTS, EMI_TYPE } = require('../config/constant');
const excelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { cleanObject } = require('../services/util');

module.exports = {
  async createPayment(req, res) {
    try {
      const loggedInUser = req.user;
      const userId = loggedInUser._id;
      let params = req.body;
      params.createdBy = userId;
      params.userId = userId;
      params.isManually = true;

      const collectingDate = params?.collectingDate ? moment(params?.collectingDate).format('YYYY-MM-DD') : null;

      const reminder = params?.reminderDate ? moment(params?.reminderDate).format('YYYY-MM-DD') : null;

      let newStatus;
      if (params?.reminderDate) {
        if ((collectingDate < reminder) && params.isPaid) {
          newStatus = PAYMENT_STATUS.ADVANCE;
        } else if ((collectingDate > reminder) && !params.isPaid) {
          newStatus = PAYMENT_STATUS.OVERDUE;
        } else if ((collectingDate > reminder) && params.isPaid) {
          newStatus = PAYMENT_STATUS.LATE_PAYED;
        } else if ((collectingDate == reminder) && params.isPaid) {
          newStatus = PAYMENT_STATUS.ON_TIME;
        } else {
          newStatus = PAYMENT_STATUS.PENDING;
        }
      }

      if (params?.isPaid && !params?.reminderDate) {
        newStatus = PAYMENT_STATUS.ON_TIME;
      }

      params.status = newStatus;

      const payment = await Payment(params).save();

      const partyDetail = await PartyRead.findOne({ _id: params.partyId }).lean();

      let remainingAmount = partyDetail.remainingAmount;
      let totalPaidAmount = partyDetail.totalPaidAmount;

      if (!params.isExtra) {
        if (params.transactionType === TRANSACTION_CONSTANTS.CREDIT && params.isPaid) {
          remainingAmount -= params.payment;
          totalPaidAmount += params.payment;
        } else if (params.transactionType === TRANSACTION_CONSTANTS.DEBIT) {
          remainingAmount += params.payment;
        } else if (params.transactionType === TRANSACTION_CONSTANTS.CREDIT && !params.isPaid) {
          remainingAmount += params.payment;
        }
      }

      await Party.updateOne(
        { _id: params.partyId },
        { $set: { remainingAmount: remainingAmount, totalPaidAmount: totalPaidAmount } }
      );

      if (params.isPaid) {
        const accountType = params.paymentMode === PAYMENT_MODE.CASH ? TYPE_CONSTANTS.CASH : TYPE_CONSTANTS.BANK;

        const accountData = {
          userId: userId,
          paymentId: payment._id,
          fileId: params.fileId || null,
          date: collectingDate,
          partyId: params.partyId,
          transactionType: params.transactionType,
          paymentMode: params.paymentMode,
          type: accountType,
          payment: params.payment,
          bank_name: params.bankName || null,
          account_number: params.accountNumber || null,
          cheque_number: params.chequeNumber || null,
          cheque_date: params.chequeDate || null,
          narration: params.narration || '',
          createdBy: userId
        };

        await Account(accountData).save();

        if (params.toThirdStaff) {
          const accountType = params.paymentMode === PAYMENT_MODE.CASH ? TYPE_CONSTANTS.CASH : TYPE_CONSTANTS.BANK;

          const accountData = {
            userId: userId,
            fileId: params.fileId,
            date: collectingDate,
            partyId: params.toThirdStaff,
            transactionType: params.transactionType == TRANSACTION_CONSTANTS.CREDIT ? TRANSACTION_CONSTANTS.DEBIT : TRANSACTION_CONSTANTS.CREDIT,
            paymentMode: params.paymentMode,
            type: accountType,
            payment: params.payment,
            bank_name: params.bankName || null,
            account_number: params.accountNumber || null,
            cheque_number: params.chequeNumber || null,
            cheque_date: params.chequeDate || null,
            narration: params.narration || '',
            createdBy: userId
          };

          await Account(accountData).save();

        }
      }

      return res.ok(payment, message.message.PAYMENT_CREATED);
    } catch (error) {
      console.log('createPayment', error);
      return res.serverError(error);
    }
  },

  async getPayments(req, res) {
    try {
      if (!req.body || !req.body.filter) {
        req.body.filter = {};
      }
      if (!req.body.sort) {
        req.body.sort = { reminderDate: 1 }
      }
      const filter = await CommonService.getFilter(req.body);
      filter.where.userId = req.user._id;

      const payments = await Payment.find(filter.where)
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
        .lean();

      await Promise.all(
        payments.map(async (data) => {
          const reminder = data?.reminderDate ? moment(data?.reminderDate).format('YYYY-MM-DD') : null;
          const collectingDate = data?.collectingDate ? moment(data?.collectingDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
          let newStatus;
          if (data?.reminderDate) {
            if ((collectingDate < reminder) && data.isPaid) {
              newStatus = PAYMENT_STATUS.ADVANCE;
            } else if ((collectingDate > reminder) && !data.isPaid) {
              newStatus = PAYMENT_STATUS.OVERDUE;
            } else if ((collectingDate > reminder) && data.isPaid) {
              newStatus = PAYMENT_STATUS.LATE_PAYED;
            } else if ((collectingDate == reminder) && data.isPaid) {
              newStatus = PAYMENT_STATUS.ON_TIME;
            }
          }

          if (newStatus && newStatus !== data.status) {
            await Payment.updateOne({ _id: data._id }, { $set: { status: newStatus } });
            data.status = newStatus;
          }
        })
      );

      const response = { list: payments };

      const paymentsData = await Payment.find(filter.where).lean();

      const totals = paymentsData.reduce((acc, transaction) => {
        if (transaction?.transactionType == TRANSACTION_CONSTANTS.CREDIT) {
          acc.totalCredit += (transaction?.payment || 0);
        } else if (transaction?.transactionType == TRANSACTION_CONSTANTS.DEBIT) {
          acc.totalDebit += (transaction.payment || 0);
        }
        acc.totalAmount += (transaction.payment || 0);
        return acc;
      }, {
        totalCredit: 0,
        totalDebit: 0,
        totalAmount: 0,
      });

      response.count = paymentsData && (paymentsData?.length || 0);
      response.totals = totals;

      return res.ok(response, message.message.OK);
    } catch (error) {
      console.log("Payment paginate Error::>", error);
      return res.serverError(error);
    }
  },

  async getPayment(req, res) {
    try {
      const loggedInUser = req.user;
      const userId = loggedInUser._id;

      const payment = await Payment.findOne({ _id: req.params.paymentId, userId: userId }).lean();
      if (!payment) {
        return res.notFound(null, message.message.PAYMENT_NOT_FOUND);
      }
      return res.ok(payment, message.message.OK);
    } catch (error) {
      console.log('==========> getPayment| error', error);
      return res.serverError(error);
    }
  },

  async updatePayment(req, res) {
    try {
      const loggedInUser = req.user;
      const userId = loggedInUser._id;
      req.body.updatedBy = userId;
      req.body.updatedAt = moment().toISOString();
      let params = req.body;

      if (!req.params.paymentId) {
        return res.badRequest(null, message.message.BAD_REQUEST);
      }

      const payment = await Payment.findOne({ _id: req.params.paymentId, userId: userId });
      if (!payment) {
        return res.notFound(null, message.message.PAYMENT_NOT_FOUND);
      }

      if (payment?.emiType == EMI_TYPE.DOWN_PAYMENT) {
        const updatedPayment = await Payment.findOneAndUpdate(
          { _id: req.params.paymentId },
          { $set: params },
          { new: true }
        );

        const accountType = params.paymentMode == PAYMENT_MODE.CASH ? TYPE_CONSTANTS.CASH : TYPE_CONSTANTS.BANK;

        const accountData = cleanObject({
          paymentMode: params?.paymentMode || payment?.paymentMode,
          type: accountType,
          bank_name: params?.bankName || payment?.bankName,
          account_number: params?.accountNumber || payment?.accountNumber,
          cheque_number: params?.chequeNumber || payment?.chequeNumber,
          cheque_date: params?.chequeDate || payment?.chequeDate,
        });
        await Account.findOneAndUpdate({ paymentId: req.params.paymentId }, accountData);

        if (params.toThirdStaff) {
          const accountData = {
            userId: userId,
            fileId: payment.fileId,
            date: params.collectingDate || moment().format('YYYY-MM-DD'),
            partyId: params.toThirdStaff,
            transactionType: params.transactionType == TRANSACTION_CONSTANTS.CREDIT ? TRANSACTION_CONSTANTS.DEBIT : TRANSACTION_CONSTANTS.CREDIT,
            paymentMode: params.paymentMode,
            type: accountType,
            payment: params.payment,
            bank_name: params.bankName || null,
            account_number: params.accountNumber || null,
            cheque_number: params.chequeNumber || null,
            cheque_date: params.chequeDate || null,
            narration: params.narration || '',
            createdBy: userId
          };
          await Account(accountData).save();
        }
        return res.ok(updatedPayment, message.message.PAYMENT_UPDATED);
      } else {
        const collectingDate = params.collectingDate;
        const reminder = params?.reminderDate ? moment(params.reminderDate).format('YYYY-MM-DD') : payment.reminderDate ? moment(payment.reminderDate).format('YYYY-MM-DD') : null;
        if (collectingDate && reminder) {
          const collecting = moment(collectingDate).format('YYYY-MM-DD');
          let status = PAYMENT_STATUS.PENDING;
          if ((collecting < reminder) && params.isPaid) {
            status = PAYMENT_STATUS.ADVANCE;
          } else if ((collecting > reminder) && !params.isPaid) {
            status = PAYMENT_STATUS.OVERDUE;
          } else if ((collecting > reminder) && params.isPaid) {
            status = PAYMENT_STATUS.LATE_PAYED;
          } else if ((collecting == reminder) && params.isPaid) {
            status = PAYMENT_STATUS.ON_TIME;
          }
          params.status = status
        }

        if (params?.isPaid && !reminder) {
          params.status = PAYMENT_STATUS.ON_TIME;
        }

        const updatedPayment = await Payment.findOneAndUpdate(
          { _id: req.params.paymentId },
          { $set: params },
          { new: true }
        );

        if (!payment.isPaid && params.isPaid) {

          const partyDetail = await PartyRead.findOne({ _id: params.partyId }).lean();

          let remainingAmount = partyDetail.remainingAmount;
          let totalPaidAmount = partyDetail.totalPaidAmount;

          if (!params.isExtra) {
            if (params.transactionType === TRANSACTION_CONSTANTS.CREDIT) {
              remainingAmount -= params.payment;
              totalPaidAmount += params.payment;
            } else if (params.transactionType === TRANSACTION_CONSTANTS.DEBIT) {
              remainingAmount += params.payment;
            }
          }

          await Party.updateOne(
            { _id: params.partyId },
            { $set: { remainingAmount: remainingAmount, totalPaidAmount: totalPaidAmount } }
          );

          const accountType = params.paymentMode == PAYMENT_MODE.CASH ? TYPE_CONSTANTS.CASH : TYPE_CONSTANTS.BANK;

          const accountData = {
            userId: userId,
            fileId: params.fileId || payment.fileId,
            paymentId: payment._id,
            date: collectingDate || moment().format('YYYY-MM-DD'),
            partyId: params.partyId || payment.partyId,
            transactionType: params.transactionType || payment.transactionType,
            paymentMode: params.paymentMode || payment.paymentMode,
            type: accountType,
            payment: params.payment || payment.payment,
            bank_name: params.bankName || payment.bankName,
            account_number: params.accountNumber || payment.accountNumber,
            cheque_number: params.chequeNumber || payment.chequeNumber,
            cheque_date: params.chequeDate || payment.chequeDate,
            narration: params.narration || payment.narration,
            createdBy: userId
          };

          const account = new Account(accountData);
          await account.save();

          if (params.toThirdStaff) {
            const accountData = {
              userId: userId,
              fileId: params.fileId || payment.fileId,
              date: collectingDate || moment().format('YYYY-MM-DD'),
              partyId: params.toThirdStaff,
              transactionType: params.transactionType ? params.transactionType == TRANSACTION_CONSTANTS.CREDIT ? TRANSACTION_CONSTANTS.DEBIT : TRANSACTION_CONSTANTS.CREDIT : payment.transactionType == TRANSACTION_CONSTANTS.CREDIT ? TRANSACTION_CONSTANTS.DEBIT : TRANSACTION_CONSTANTS.CREDIT,
              paymentMode: params.paymentMode || payment.paymentMode,
              type: accountType,
              payment: params.payment || payment.payment,
              bank_name: params.bankName || payment.bankName,
              account_number: params.accountNumber || payment.accountNumber,
              cheque_number: params.chequeNumber || payment.chequeNumber,
              cheque_date: params.chequeDate || payment.chequeDate,
              narration: params.narration || payment.narration,
              createdBy: userId
            };

            const account = new Account(accountData);
            await account.save();

          }
        }
        return res.ok(updatedPayment, message.message.PAYMENT_UPDATED);
      }

    } catch (error) {
      console.log('==========> updatePayment| error', error);
      return res.serverError(error);
    }
  },

  async deletePayments(req, res) {
    try {
      let params = req.body;
      params.paymentIdArray = params.paymentIdArray.map(p => new ObjectId(p));
      if (params.paymentIdArray && params.paymentIdArray.length > 0) {
        const userId = req.user._id;

        const paymentArr = await Payment.find(
          { _id: { $in: params.paymentIdArray }, userId: userId },
          '_id payment transactionType'
        ).lean() || [];

        const partyDetail = await PartyRead.findOne({ _id: params.partyId }).lean();

        let paymentTotal = paymentArr.reduce((sum, payment) => sum + payment.payment, 0);

        let remainingAmount = partyDetail.remainingAmount + paymentTotal;

        await Payment.deleteMany({ _id: { $in: params.paymentIdArray }, userId: userId });

        await Party.updateOne(
          { _id: params.partyId },
          {
            $set: {
              remainingAmount: remainingAmount
            }
          }
        );

        await Account.deleteMany({ _id: { $in: params.paymentIdArray }, userId: userId });

        return res.ok(null, message.message.PAYMENT_DELETED);
      }
      return res.notFound({}, message.message.PAYMENT_LIST_NOT_FOUND);
    } catch (error) {
      console.log("Payment deletion error", error);
      return res.serverError(error);
    }
  },

  async getExcelPayments(req, res) {
    try {
      if (!req.body || !req.body.filter) {
        req.body.filter = {};
      }
      if (!req.body.sort) {
        req.body.sort = { reminderDate: 1 }
      }
      const filter = await CommonService.getFilter(req.body);
      filter.where.userId = req.user._id;

      const paymentsDetails = await Payment.find(filter.where)
        .populate('partyId', {
          isStaff: 1,
          houseNumber: 1,
          ownerName: 1,
          mobileNumber: 1,
          payment: 1,
          downPayment: 1,
        })
        .sort(filter.sort)
        .lean();

      if (paymentsDetails && paymentsDetails.length > 0) {
        const party = await Party.findOne({ _id: req?.body?.filter?.partyId }).lean();

        let totalBalance = party?.payment;
        let mastCounter = 0
        let regCounter = 0;

        const reminderArray = [];
        for (let index = 0; index < paymentsDetails.length; index++) {
          const element = paymentsDetails[index];

          let displayIndex;
          if (element?.emiType == 2) {
            mastCounter++;
            displayIndex = 'M' + ' - ' + mastCounter;
          } else if (element?.emiType == 1) {
            regCounter++;
            displayIndex = 'R' + ' - ' + regCounter;
          } else {
            displayIndex = '-';
          }

          reminderArray.push({
            srNo: displayIndex,
            houseNumber: element.partyId?.houseNumber || null,  // For House No.
            reminderDate: element.reminderDate ? moment(element.reminderDate, 'YYYY-MM-DD').format('DD-MM-YYYY') : null,  // For Reminder Date
            collectingDate: element.collectingDate ? moment(element.collectingDate).format('DD-MM-YYYY') : null,  // For Reminder Date
            ownerName: element.partyId?.ownerName || null,  // For Party Name
            mobileNo: element.partyId?.mobileNumber || null,  // For Mobile No.
            totalPayment: element.partyId?.payment || null,  // For Total Payment
            downPayment: element.partyId?.downPayment || null,  // For Down Payment
            transactionType: element.transactionType == TRANSACTION_CONSTANTS.CREDIT ? 'Credit' : element.transactionType == TRANSACTION_CONSTANTS.DEBIT ? 'Debit' : null,
            paymentMode: element.paymentMode == PAYMENT_MODE.CASH ? 'Cash' : element.paymentMode == PAYMENT_MODE.CHEQUE ? 'Cheque' : element.paymentMode == PAYMENT_MODE.ETRANSAFER ? 'E-Transfer' : null,
            collectingPayment: element.payment || null,  // For Collecting Payment
            emiType: element.emiType === 3 ? "Down Payment" : element.emiType === 2 ? "Master" : element.emiType === 1 ? "Regular" : '',  // For EMI Type
            status: element.status ? findStatus(element.status) : null,
            balance: totalBalance - element.payment,
          });

          totalBalance = totalBalance - element.payment;
        }
        const workbook = new excelJS.Workbook();
        const worksheet = workbook.addWorksheet('payment-list');


        const headerData = {
          houseNumber: party?.houseNumber || '-',
          ownerName: party?.ownerName || '-',
          mobileNumber: party?.mobileNumber || '-',
          remainingPayment: party?.remainingAmount || '-',
          completePayment: party?.totalPaidAmount || '-',
          totalPayment: party?.payment || '-',
        };

        const headerItems = [
          { label: 'Remaining Payment', value: headerData.remainingPayment },
          { label: 'Complete Payment', value: headerData.completePayment },
        ];

        headerItems.forEach((item, index) => {
          const row = worksheet.getRow(index + 2);
          row.getCell(1).value = item.label;
          row.getCell(2).value = item.value;
          row.getCell(1).font = { bold: true };
          row.getCell(2).alignment = { horizontal: 'left' };
        });

        worksheet.columns = [
          { header: 'No', key: 'srNo', width: 20, },
          {
            header: 'Reminder Date',
            key: 'reminderDate',
            width: 20,
          },
          {
            header: 'Collecting Date',
            key: 'collectingDate',
            width: 20,
          },
          {
            header: 'Status',
            key: 'status',
            width: 20,
          },
          {
            header: 'EMI Type',
            key: 'emiType',
            width: 15,
          },
          {
            header: 'Transaction Type',
            key: 'transactionType',
            width: 15,
          },
          {
            header: 'Payment Mode',
            key: 'paymentMode',
            width: 15,
          },
          {
            header: 'Collecting Payment',
            key: 'collectingPayment',
            width: 20,
          },
          {
            header: 'Balance Amount',
            key: 'balance',
            width: 15,
          },
        ];

        worksheet.addRows(reminderArray);
        const pathToSave = path.join(__dirname, '../../excels-generated');
        const fileName = `payment-list-${Date.now()}.xlsx`;
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
      console.log("Payment getExcelPayments Error::>", error);
      return res.serverError(error);
    }
  },

  async getExcelReminder(req, res) {
    try {
      if (!req.body || !req.body.filter) {
        req.body.filter = {};
      }
      if (!req.body.sort) {
        req.body.sort = { reminderDate: 1 }
      }
      const filter = await CommonService.getFilter(req.body);
      filter.where.userId = req.user._id;

      const paymentsDetails = await Payment.find(filter.where)
        .populate('partyId', {
          isStaff: 1,
          houseNumber: 1,
          ownerName: 1,
          mobileNumber: 1,
          payment: 1,
          downPayment: 1,
        })
        .sort(filter.sort)
        .lean();

      if (paymentsDetails && paymentsDetails.length > 0) {
        let mastCounter = 0
        let regCounter = 0;
        const reminderArray = [];
        for (let index = 0; index < paymentsDetails.length; index++) {

          const element = paymentsDetails[index];
          let displayIndex;
          if (element?.emiType == 2) {
            mastCounter++;
            displayIndex = 'M' + ' - ' + mastCounter;
          } else if (element?.emiType == 1) {
            regCounter++;
            displayIndex = 'R' + ' - ' + regCounter;
          } else {
            displayIndex = '-';
          }

          reminderArray.push({
            srNo: displayIndex,
            houseNumber: element.partyId?.houseNumber || null,  // For House No.
            reminderDate: element.reminderDate ? moment(element.reminderDate, 'YYYY-MM-DD').format('DD-MM-YYYY') : null,  // For Reminder Date
            collectingDate: element.collectingDate ? moment(element.collectingDate).format('DD-MM-YYYY') : null,  // For Reminder Date
            ownerName: element.partyId?.ownerName || null,  // For Party Name
            mobileNo: element.partyId?.mobileNumber || null,  // For Mobile No.
            totalPayment: element.partyId?.payment || null,  // For Total Payment
            downPayment: element.partyId?.downPayment || null,  // For Down Payment
            transactionType: element.transactionType == TRANSACTION_CONSTANTS.CREDIT ? 'Credit' : element.transactionType == TRANSACTION_CONSTANTS.DEBIT ? 'Debit' : null,
            paymentMode: element.paymentMode == PAYMENT_MODE.CASH ? 'Cash' : element.paymentMode == PAYMENT_MODE.CHEQUE ? 'Cheque' : element.paymentMode == PAYMENT_MODE.ETRANSAFER ? 'E-Transfer' : null,
            collectingPayment: element.payment || null,  // For Collecting Payment
            emiType: element.emiType === 3 ? "Down Payment" : element.emiType === 2 ? "Master" : element.emiType === 1 ? "Regular" : '',  // For EMI Type
            status: element.status ? findStatus(element.status) : null,
          });

        }
        const workbook = new excelJS.Workbook();
        const worksheet = workbook.addWorksheet('payment-list');

        worksheet.columns = [
          { header: 'No', key: 'srNo', width: 20, },
          {
            header: 'House No.',
            key: 'houseNumber',
            width: 20,
          },
          {
            header: 'Reminder Date',
            key: 'reminderDate',
            width: 20,
          },
          {
            header: 'Collecting Date',
            key: 'collectingDate',
            width: 20,
          },
          {
            header: 'Party Name',
            key: 'ownerName',
            width: 25,
          },
          {
            header: 'Mobile No.',
            key: 'mobileNo',
            width: 20,
          },
          {
            header: 'Total Payment',
            key: 'totalPayment',
            width: 20,
          },
          {
            header: 'Collecting Payment',
            key: 'collectingPayment',
            width: 20,
          },
          {
            header: 'Transaction Type',
            key: 'transactionType',
            width: 15,
          },
          {
            header: 'Payment Mode',
            key: 'paymentMode',
            width: 15,
          },
          {
            header: 'EMI Type',
            key: 'emiType',
            width: 15,
          },
          {
            header: 'Status',
            key: 'status',
            width: 20,
          },
        ];

        worksheet.addRows(reminderArray);
        const pathToSave = path.join(__dirname, '../../excels-generated');
        const fileName = `payment-list-${Date.now()}.xlsx`;
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
      console.log("Payment getExcelPayments Error::>", error);
      return res.serverError(error);
    }
  },

  async getPdfPayments(req, res) {
    try {
      if (!req.body || !req.body.filter) {
        req.body.filter = {};
      }
      if (!req.body.sort) {
        req.body.sort = { reminderDate: 1 }
      }
      const filter = await CommonService.getFilter(req.body);
      filter.where.userId = req.user._id;

      const paymentsDetails = await Payment.find(filter.where)
        .populate('partyId', {
          isStaff: 1,
          houseNumber: 1,
          ownerName: 1,
          mobileNumber: 1,
          payment: 1,
          downPayment: 1,
        })
        .sort(filter.sort)
        .lean();

      if (paymentsDetails && paymentsDetails.length > 0) {

        const party = await Party.findOne({ _id: req?.body?.filter?.partyId }).lean();
        const reminderArray = [];
        let totalBalance = party?.payment;
        for (let index = 0; index < paymentsDetails.length; index++) {
          const element = paymentsDetails[index];
          reminderArray.push({
            houseNumber: element.partyId?.houseNumber || null,  // For House No.
            reminderDate: element.reminderDate ? moment(element.reminderDate, 'YYYY-MM-DD').format('DD-MM-YYYY') : null,  // For Reminder Date
            collectingDate: element.collectingDate ? moment(element.collectingDate).format('DD-MM-YYYY') : null,  // For Reminder Date
            ownerName: element.partyId?.ownerName || null,  // For Party Name
            mobileNo: element.partyId?.mobileNumber || null,  // For Mobile No.
            totalPayment: element.partyId?.payment || null,  // For Total Payment
            transactionType: element.transactionType == TRANSACTION_CONSTANTS.CREDIT ? 'Credit' : element.transactionType == TRANSACTION_CONSTANTS.DEBIT ? 'Debit' : null,
            paymentMode: element.paymentMode == PAYMENT_MODE.CASH ? 'Cash' : element.paymentMode == PAYMENT_MODE.CHEQUE ? 'Cheque' : element.paymentMode == PAYMENT_MODE.ETRANSAFER ? 'E-Transfer' : null,
            collectingPayment: element.payment || null,  // For Collecting Payment
            emiType: element.emiType === 3 ? "Down Payment" : element.emiType === 2 ? "Master" : element.emiType === 1 ? "Regular" : '',  // For EMI Type
            status: element.status ? findStatus(element.status) : null,
            balance: totalBalance - element.payment,
          });
          totalBalance = totalBalance - element.payment;

        }

        const columns = [
          {
            header: 'Reminder Date',
            key: 'reminderDate',
            width: 20,
          },
          {
            header: 'Collecting Date',
            key: 'collectingDate',
            width: 20,
          },
          {
            header: 'Status',
            key: 'status',
            width: 20,
          },
          {
            header: 'EMI Type',
            key: 'emiType',
            width: 15,
          },
          {
            header: 'Transaction Type',
            key: 'transactionType',
            width: 15,
          },
          {
            header: 'Payment Mode',
            key: 'paymentMode',
            width: 15,
          },
          {
            header: 'Collecting Payment',
            key: 'collectingPayment',
            width: 20,
          },
          {
            header: 'Balance Amount',
            key: 'balance',
            width: 15,
          },
        ];

        const pathToSave = path.join(__dirname, '../../excels-generated');
        const fileName = `payment-list-${Date.now()}.pdf`;
        const filePath = path.join(pathToSave, fileName);

        const writeStream = fs.createWriteStream(filePath);


        const headerData = {
          houseNumber: party?.houseNumber,
          ownerName: party?.ownerName,
          mobileNumber: party?.mobileNumber,
          bookingDate: party?.bookingDate ? moment(party?.bookingDate).format('DD-MM-YYYY') : null,
          startMonth: party?.startMonth ? moment(party?.startMonth).format('MM-YYYY') : null,
          remainingPayment: party?.remainingAmount,
          completePayment: party?.totalPaidAmount,
          totalPayment: party?.payment,
        };

        try {
          await CommonService.downloadPaymentPdf('Payment List', reminderArray, columns, pathToSave, writeStream, 40, headerData);
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
      console.log("Payment getPdfPayments Error::>", error);
      return res.serverError(error);
    }
  },

  async getPdfReminder(req, res) {
    try {
      if (!req.body || !req.body.filter) {
        req.body.filter = {};
      }
      if (!req.body.sort) {
        req.body.sort = { reminderDate: 1 }
      }
      const filter = await CommonService.getFilter(req.body);
      filter.where.userId = req.user._id;

      const paymentsDetails = await Payment.find(filter.where)
        .populate('partyId', {
          isStaff: 1,
          houseNumber: 1,
          ownerName: 1,
          mobileNumber: 1,
          payment: 1,
          downPayment: 1,
        })
        .sort(filter.sort)
        .lean();

      if (paymentsDetails && paymentsDetails.length > 0) {
        const reminderArray = [];
        for (let index = 0; index < paymentsDetails.length; index++) {
          const element = paymentsDetails[index];
          reminderArray.push({
            houseNumber: element.partyId?.houseNumber || null,  // For House No.
            reminderDate: element.reminderDate ? moment(element.reminderDate, 'YYYY-MM-DD').format('DD-MM-YYYY') : null,  // For Reminder Date
            collectingDate: element.collectingDate ? moment(element.collectingDate).format('DD-MM-YYYY') : null,  // For Reminder Date
            ownerName: element.partyId?.ownerName || null,  // For Party Name
            mobileNo: element.partyId?.mobileNumber || null,  // For Mobile No.
            totalPayment: element.partyId?.payment || null,  // For Total Payment
            transactionType: element.transactionType == TRANSACTION_CONSTANTS.CREDIT ? 'Credit' : element.transactionType == TRANSACTION_CONSTANTS.DEBIT ? 'Debit' : null,
            paymentMode: element.paymentMode == PAYMENT_MODE.CASH ? 'Cash' : element.paymentMode == PAYMENT_MODE.CHEQUE ? 'Cheque' : element.paymentMode == PAYMENT_MODE.ETRANSAFER ? 'E-Transfer' : null,
            collectingPayment: element.payment || null,  // For Collecting Payment
            emiType: element.emiType === 3 ? "Down Payment" : element.emiType === 2 ? "Master" : element.emiType === 1 ? "Regular" : '',  // For EMI Type
            status: element.status ? findStatus(element.status) : null,
          });
        }

        const columns = [
          {
            header: 'House No.',
            key: 'houseNumber',
            width: 20,
          },
          {
            header: 'Party Name',
            key: 'ownerName',
            width: 25,
          },
          {
            header: 'Mobile No.',
            key: 'mobileNo',
            width: 20,
          },
          {
            header: 'Reminder Date',
            key: 'reminderDate',
            width: 20,
          },
          {
            header: 'Collecting Date',
            key: 'collectingDate',
            width: 20,
          },
          {
            header: 'Total Payment',
            key: 'totalPayment',
            width: 20,
          },
          {
            header: 'Collecting Payment',
            key: 'collectingPayment',
            width: 20,
          },
          {
            header: 'Transaction Type',
            key: 'transactionType',
            width: 15,
          },
          {
            header: 'Payment Mode',
            key: 'paymentMode',
            width: 15,
          },
          {
            header: 'EMI Type',
            key: 'emiType',
            width: 15,
          },
          {
            header: 'Status',
            key: 'status',
            width: 20,
          },
        ];

        const pathToSave = path.join(__dirname, '../../excels-generated');
        const fileName = `reminder-list-${Date.now()}.pdf`;
        const filePath = path.join(pathToSave, fileName);

        const writeStream = fs.createWriteStream(filePath);

        const headerData = {
          dateRange: filter.where.reminderDate ? moment(filter.where.reminderDate.$gte).format('DD-MM-YYYY') + ' to ' + moment(filter.where.reminderDate.$lte).format('DD-MM-YYYY') : null,
          emiType: (!filter.where.emiType || filter.where.emiType?.length == 0) ? 'All' : filter.where.emiType.includes(1) && 'Regular' + ' , ' + filter.where.emiType.includes(2) && 'Master' + ' , ' + filter.where.emiType.includes(3) && 'Down Payment',  // For EMI Type
          status: (!filter.where.status || filter.where.status?.length == 0) ? 'All' : filter.where.status.includes(1) && 'Pending' + ' , ' + filter.where.status.includes(2) && 'On-Time' + ' , ' + filter.where.status.includes(3) && 'Advanced' + ' , ' + filter.where.status.includes(4) && 'Overdue' + ' , ' + filter.where.status.includes(5) && 'Late Payed',
        };


        try {
          await CommonService.downloadReminderPdf('Reminder List', reminderArray, columns, pathToSave, writeStream, 40, headerData);
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
      console.log("Payment getPdfPayments Error::>", error);
      return res.serverError(error);
    }
  },


};

const findStatus = (code) => {
  let text;
  if (code === 2) {
    text = 'On-Time';
  } else if (code === 4) {
    text = 'Overdue';
  } else if (code === 1) {
    text = 'Pending';
  } else if (code === 3) {
    text = 'Advanced';
  } else if (code === 5) {
    text = 'Late Payed';
  } else {
    text = ''
  }
  return text;
}
