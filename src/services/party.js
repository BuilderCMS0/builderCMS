const moment = require('moment'); // Ensure you have moment.js installed
const { TENURE, EMI_TYPE, TRANSACTION_CONSTANTS } = require('../config/constant');
const { PaymentRead, PartyRead, Party } = require('../models');

async function calculateEMI(payment = 0, downpayment = 0, months = 0, emiAmount = 0, startDate, tenureType = TENURE.MONTHLY, masterEmi = null, masterTenure = null, reminderRegulerDate = '1', reminderMasterDate = '1') {
    try {
        let totalAmount = payment - downpayment;  // Initial closing amount is payment minus downpayment
        const emiSchedule = [];
        let currentDate = new Date(startDate);      // Start date for EMI schedule
        let masterCurrentDate = new Date(startDate);  // Separate start date for master EMI

        // Determine increments for regular tenure
        let incrementMonthsRegular = tenureType;

        let incrementMonthsMaster = 0; // Initialize master increment
        if (masterEmi > 0 && masterTenure) {
            incrementMonthsMaster = masterTenure

            // Start master EMI after the first interval
            masterCurrentDate.setMonth(masterCurrentDate.getMonth() + (incrementMonthsMaster - 1)); // Adjust for starting on the correct month
        }

        // Loop through the total duration in months
        for (let i = 0; i < months; i++) {
            // Regular EMI Payment
            if (i % incrementMonthsRegular === 0) {
                let date = moment(currentDate);
                let newDate = date.date(reminderRegulerDate).format('YYYY-MM-DD');
                emiSchedule.push({
                    reminderDate: newDate,
                    payment: emiAmount,
                    emiType: EMI_TYPE.EMI,
                });

                // Deduct the regular EMI amount from closingAmount

                // Increment the regular EMI date
                currentDate.setMonth(currentDate.getMonth() + incrementMonthsRegular);
            }

            // Master EMI Payment (only if both masterEmi and masterTenure are provided)
            if (masterEmi > 0 && incrementMonthsMaster > 0 && i >= incrementMonthsMaster - 1 && (i - (incrementMonthsMaster - 1)) % incrementMonthsMaster === 0) {
                let date = moment(masterCurrentDate);
                let newDate = date.date(reminderMasterDate).format('YYYY-MM-DD');
                emiSchedule.push({
                    reminderDate: newDate,
                    payment: masterEmi,
                    emiType: EMI_TYPE.MASTER_EMI,
                });

                // Deduct the master EMI amount from closingAmount
                // Increment the master EMI date
                masterCurrentDate.setMonth(masterCurrentDate.getMonth() + incrementMonthsMaster);
            }
        }

        const totalEmiAmount = emiSchedule.reduce((sum, payment) => sum + payment.payment, 0);
        const closingAmount = totalAmount - totalEmiAmount;
        return { emiListArray: emiSchedule, closingAmount };

    } catch (error) {
        return false;
    }
}

async function calculateCompletePayment(partyId, isCancelled = false) {
    try {
        const paymentArr = await PaymentRead.find(
            { partyId: partyId },
            '_id payment transactionType isExtra isPaid'
        ).lean() || [];

        const partyDetail = await PartyRead.findOne({ _id: partyId }).lean()

        const completePaymentArr = paymentArr.filter(t => !t.isExtra && t.isPaid) // Exclude extra transactions

        const completePayment = completePaymentArr.reduce((sum, t) => {
            return t.transactionType == TRANSACTION_CONSTANTS.CREDIT
                ? sum + t.payment  // Subtract for CREDIT
                : t.transactionType == TRANSACTION_CONSTANTS.DEBIT ? sum - t.payment : 0; // Add for DEBIT
        }, 0);
        const remainingPaymentArr = paymentArr.filter(t => !t.isExtra)
        const rPayment = remainingPaymentArr.reduce((sum, t) => {
            return t.transactionType == TRANSACTION_CONSTANTS.CREDIT
                ? sum - t.payment  // Subtract for CREDIT
                : t.transactionType == TRANSACTION_CONSTANTS.DEBIT ? sum + t.payment : 0; // Add for DEBIT
        }, 0);

        const remainingPayment = Math.max((Number(partyDetail?.payment) || 0) - Math.abs(rPayment), 0);
        console.log('remainingPayment', partyDetail?.payment, remainingPayment, completePayment);

        await Party.updateOne(
            { _id: partyId },
            {
                $set: {
                    remainingAmount: remainingPayment, totalPaidAmount: completePayment,
                    isCancelled: isCancelled
                }
            }
        );
    } catch (error) {
        console.log('error', error);

        return false
    }
}

module.exports = {
    calculateEMI,
    calculateCompletePayment
}
