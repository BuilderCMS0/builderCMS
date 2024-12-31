const moment = require('moment'); // Ensure you have moment.js installed
const { TENURE, EMI_TYPE } = require('../config/constant');

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

module.exports = {
    calculateEMI
}
