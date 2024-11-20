const moment = require('moment'); // Ensure you have moment.js installed
const { TENURE, EMI_TYPE, TENURE_MONTH } = require('../config/constant');

async function calculateEMI(payment = 0, downpayment = 0, months = 0, emiAmount = 0, startDate, tenureType = TENURE.MONTHLY, masterEmi = null, masterTenure = null, reminderRegulerDate = '1', reminderMasterDate = '1') {
    try {
        let totalAmount = payment - downpayment;  // Initial closing amount is payment minus downpayment
        const emiSchedule = [];
        let currentDate = new Date(startDate);      // Start date for EMI schedule
        let masterCurrentDate = new Date(startDate);  // Separate start date for master EMI

        // Determine increments for regular tenure
        let incrementMonthsRegular;
        switch (tenureType) {
            case TENURE.MONTHLY: incrementMonthsRegular = 1; break;
            case TENURE.QUARTERLY: incrementMonthsRegular = 3; break;
            case TENURE.HALF_YEARLY: incrementMonthsRegular = 6; break;
            case TENURE.YEARLY: incrementMonthsRegular = 12; break;
            default: incrementMonthsRegular = 1;  // Default to monthly if an unknown tenure type is passed
        }

        let incrementMonthsMaster = 0; // Initialize master increment
        if (masterEmi > 0 && masterTenure) { // Check if both masterEmi and masterTenure are provided
            switch (masterTenure) {
                case TENURE.MONTHLY: incrementMonthsMaster = 1; break;
                case TENURE.QUARTERLY: incrementMonthsMaster = 3; break;
                case TENURE.HALF_YEARLY: incrementMonthsMaster = 6; break;
                case TENURE.YEARLY: incrementMonthsMaster = 12; break;
                default: incrementMonthsMaster = 1;  // Default to monthly if an unknown tenure type is passed
            }

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

async function calculateAutoEMI(totalAmount = 0, downPayment = 0, numberOfMonths = 0, emiAmount = 0, startDate, tenure = TENURE.MONTHLY, masterEmi = 0, masterTenure = null) {
    try {
        // Subtract down payment from total amount to get the remaining loan amount
        let loanAmount = totalAmount - downPayment;

        // Helper function to calculate the total amount paid through masterEMI
        function getMasterEmiTotal(masterEmi, numberOfMonths, masterTenure) {
            if (masterEmi <= 0 || !masterTenure) return 0;

            let paymentFrequency;
            switch (masterTenure) {
                case TENURE.MONTHLY:
                    paymentFrequency = 1;
                    break;
                case TENURE.QUARTERLY:
                    paymentFrequency = 3;
                    break;
                case TENURE.HALF_YEARLY:
                    paymentFrequency = 6;
                    break;
                case TENURE.YEARLY:
                    paymentFrequency = 12;
                    break;
                default:
                    break;
            }
            const numberOfMasterPayments = numberOfMonths / paymentFrequency;
            return masterEmi * numberOfMasterPayments;
        }

        // Calculate total amount paid through master EMI if applicable
        const totalMasterEmiAmount = getMasterEmiTotal(masterEmi, numberOfMonths, masterTenure);

        // Subtract master EMI total from the loan amount
        loanAmount -= totalMasterEmiAmount;

        // Helper function to calculate EMI based on tenure
        function getEMI(loanAmount, numberOfMonths, tenure) {
            let paymentFrequency;
            switch (tenure) {
                case TENURE.MONTHLY:
                    paymentFrequency = 1;
                    break;
                case TENURE.QUARTERLY:
                    paymentFrequency = 3;
                    break;
                case TENURE.HALF_YEARLY:
                    paymentFrequency = 6;
                    break;
                case TENURE.YEARLY:
                    paymentFrequency = 12;
                    break;
                default:
                    break;
            }
            const numberOfPayments = numberOfMonths / paymentFrequency;
            // Ensure EMI does not exceed the remaining loan amount
            return loanAmount > 0 ? loanAmount / numberOfPayments : 0;
        }

        // Calculate the regular EMI
        const emi = getEMI(loanAmount, numberOfMonths, tenure);

        // Generate EMI objects
        const emiObjects = [];
        const today = moment().startOf('month'); // Starting from the current month

        function createPaymentObjects(amount, type, frequency) {
            const objects = [];
            const numPayments = numberOfMonths / frequency;
            for (let i = 0; i < numPayments; i++) {
                const paymentDate = today.clone().add(frequency * (i + 1), 'months').format('YYYY-MM-DD');
                objects.push({
                    emiAmount: amount,
                    type: type,
                    date: paymentDate,
                });
            }
            return objects;
        }

        // Add regular EMI objects
        const regularEMIs = createPaymentObjects(emi, EMI_TYPE.EMI, TENURE_MONTH[tenure]);

        // Add masterEMI objects if applicable
        const masterEMIs = [];
        if (masterEmi > 0 && masterTenure) {
            const paymentFrequency = TENURE_MONTH[masterTenure];

            const numPayments = numberOfMonths / paymentFrequency;
            for (let i = 1; i <= numPayments; i++) {
                const paymentDate = today.clone().add(paymentFrequency * i, 'months').format('YYYY-MM-DD');
                masterEMIs.push({
                    emiAmount: masterEmi,
                    type: EMI_TYPE.MASTER_EMI,
                    date: paymentDate,
                });
            }
        }

        // Combine and sort EMI objects
        const allEMIs = [...regularEMIs, ...masterEMIs];
        allEMIs.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate total amount from all EMIs
        const totalPaidAmount = allEMIs.reduce((sum, emi) => sum + emi.emiAmount, 0);

        // Adjust regular EMIs and master EMIs to ensure the total does not exceed totalAmount
        if (totalPaidAmount > totalAmount) {
            const adjustmentFactor = totalAmount / totalPaidAmount;
            for (let emi of allEMIs) {
                emi.emiAmount = parseFloat((emi.emiAmount * adjustmentFactor).toFixed(2));
            }
        }

        // Ensure closing amount is zero
        const finalTotalPaidAmount = allEMIs.reduce((sum, emi) => sum + emi.emiAmount, 0);
        const closingAmount = totalAmount - finalTotalPaidAmount;

        if (closingAmount !== 0) {
            // Adjust the last payment to ensure the total matches the totalAmount
            const lastPayment = allEMIs[allEMIs.length - 1];
            lastPayment.emiAmount += closingAmount;
        }

        return allEMIs;

    } catch (error) {
        return false;
    }
}

module.exports = {
    calculateEMI
}
