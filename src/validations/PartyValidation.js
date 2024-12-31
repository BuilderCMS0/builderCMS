const Joi = require('joi');
const { objectId } = require('./CustomValidation');

const createParty = {
    body: Joi.object().keys({
        fileId: Joi.string().required().custom(objectId),
        houseNumber: Joi.string().required(),
        ownerName: Joi.string().required(),
        mobileNumber: Joi.string().required(),
        subOwners: Joi.array().items(
            Joi.object().keys({
                ownerName: Joi.string().allow(''),
                mobileNumber: Joi.string().allow(''),
            })
        ),
        brokerName: Joi.string().allow(''),
        brokerMobileNumber: Joi.string().allow(''),
        bookingDate: Joi.string().required(),
        reminderDateRegular: Joi.string().required(),
        reminderDateMaster: Joi.string().required(),
        payment: Joi.number().required(),
        downPayment: Joi.number().allow(''),
        month: Joi.number().required(),
        regularEMI: Joi.number().required(),
        regularTenure: Joi.number().required(),
        masterEMI: Joi.number().allow(''),
        masterTenure: Joi.number().allow(''),
        houseSize: Joi.string().required(''),
        sqRate: Joi.string().allow(''),
        address: Joi.string().allow(''),
        startMonth: Joi.string().allow(''),
        remainingAmount: Joi.number().allow(''),
        totalPaidAmount: Joi.number().allow(''),
        narration: Joi.string().allow(''),
        condition: Joi.string().allow(''),
        note: Joi.string().allow(''),
    }),
};

const getParties = {
    body: Joi.object().keys({
        filter: Joi.object().allow(''),
        sort: Joi.allow(''),
        page: Joi.number().allow(''),
        limit: Joi.number().allow(''),
        search: Joi.object().allow(''),
    }),
};

const getParty = {
    params: Joi.object().keys({
        partyId: Joi.string().custom(objectId),
    }),
};

const updateParty = {
    params: Joi.object().keys({
        partyId: Joi.required().custom(objectId),
    }),
    body: Joi.object()
        .keys({
            fileId: Joi.string().required().custom(objectId),
            ownerName: Joi.string().allow(''),
            mobileNumber: Joi.string().allow(''),
            subOwners: Joi.array().items(
                Joi.object().keys({
                    ownerName: Joi.string().allow(''),
                    mobileNumber: Joi.string().allow(''),
                })
            ),
            brokerName: Joi.string().allow(''),
            brokerMobileNumber: Joi.string().allow(''),
            reminderDateRegular: Joi.string().allow(''),
            reminderDateMaster: Joi.string().allow(''),
            payment: Joi.number().allow(''),
            downPayment: Joi.number().allow(''),
            month: Joi.number().allow(''),
            regularEMI: Joi.number().allow(''),
            regularTenure: Joi.number().allow(''),
            masterEMI: Joi.number().allow(''),
            masterTenure: Joi.number().allow(''),
            houseSize: Joi.string().allow(''),
            sqRate: Joi.string().allow(''),
            startMonth: Joi.string().allow(''),
            address: Joi.string().allow(''),
            remainingAmount: Joi.number().allow(''),
            totalPaidAmount: Joi.number().allow(''),
            narration: Joi.string().allow(''),
            condition: Joi.string().allow(''),
            note: Joi.string().allow(''),
        })
        .min(1),
};

const deleteParty = {
    body: Joi.object().keys({
        fileId: Joi.string().required().custom(objectId),
        partyIdArray: Joi.array().required(),
    }),
};

const cancelParty = {
    body: Joi.object().keys({
        partyId: Joi.string().required().custom(objectId),
    }),
};

const createStaff = {
    body: Joi.object().keys({
        fileId: Joi.string().required().custom(objectId),
        partyId: Joi.string().custom(objectId),
        ownerName: Joi.string().required(),
        mobileNumber: Joi.string().required(),
    }),
};


module.exports = {
    createParty,
    getParties,
    getParty,
    updateParty,
    deleteParty,
    createStaff,
    cancelParty
};
