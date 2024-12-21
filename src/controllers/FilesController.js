const moment = require('moment');
const message = require('../config/message');
const { Files, FilesRead, User, UserRead, Party, Payment, Account } = require('../models');
const { ObjectId } = require('mongodb');
const CommonService = require('../services/common');
const excelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

module.exports = {
    async createFiles(req, res) {
        try {
            let loggedInUser = req.user;
            let userId = loggedInUser._id;
            req.body.userId = userId;
            req.body.createdBy = userId;
            req.body.remaining_house = req.body.house;
            req.body.sold_house = 0;

            const files = await Files(req.body).save();
            if (!req?.user?.selectedCompany) {
                await User.updateOne(
                    { _id: userId },
                    {
                        $set: {
                            selectedCompany: files?._id,
                        }
                    }
                );
                loggedInUser = await UserRead.findOne({ _id: userId }).lean();
            }
            return res.ok({ user: loggedInUser, files }, message.message.FILE_CREATED);
        } catch (error) {
            console.log('createFiles', error);
            return res.serverError(error);
        }
    },

    async getFiles(req, res) {
        try {
            if (!req.body || !req.body.filter) {
                req.body.filter = {};
            }
            const filter = await CommonService.getFilter(req.body);
            filter.where.userId = req.user._id;
            const result = await FilesRead.find(filter.where)
                .sort(filter.sort)
                .lean();

            const response = { list: result };

            response.count = await FilesRead.find(filter.where).count();
            return res.ok(response, message.message.OK);
        } catch (error) {
            console.log("File paginate Error::>", error);
            return res.serverError(error);
        }
    },

    async getFile(req, res) {
        try {
            const loggedInUser = req.user;
            let userId = loggedInUser._id;

            const files = await Files.findOne({ _id: req.params.fileId, userId: userId });
            if (!files) {
                return res.notFound(null, message.message.FILE_NOT_FOUND);
            }
            return res.ok(files, message.message.OK);
        } catch (error) {
            console.log('==========> getFile | error', error);
            return res.serverError(error);
        }
    },

    async updateFiles(req, res) {
        try {
            const loggedInUser = req.user;
            let userId = loggedInUser._id;
            req.body.updatedBy = userId;
            req.body.updatedAt = moment().toISOString();

            if (!req.params.fileId) {
                return res.badRequest(null, message.message.BAD_REQUEST);
            }
            const files = await Files.findOne({ _id: req.params.fileId, userId: userId });
            if (!files) {
                return res.notFound(null, message.message.FILE_NOT_FOUND);
            }
            const updatedFiles = await Files.findOneAndUpdate({ _id: req.params.fileId }, { $set: req.body }, { new: true });
            return res.ok(updatedFiles, message.message.FILE_UPDATED);
        } catch (error) {
            console.log('==========> updateFiles| error', error);
            return res.serverError(error);
        }
    },

    async deleteFiles(req, res) {
        try {
            let fileId = new ObjectId(req.body.fileId)
            let user = req.user;
            if (fileId) {
                let userId = req.user._id;

                await Files.deleteOne({ _id: fileId, userId: userId });

                await Party.deleteMany({ fileId: fileId, userId: userId });

                await Payment.deleteMany({ fileId: fileId, userId: userId });

                await Account.deleteMany({ fileId: fileId, userId: userId });

                if (req?.body?.fileId?.toString() == req?.user?.selectedCompany?.toString()) {
                    const remainingFiles = await Files.findOne({ userId: userId });
                    const selectedCompany = remainingFiles[0]?._id || null;
                    await User.updateOne(
                        { _id: userId },
                        {
                            $set: {
                                selectedCompany: selectedCompany,
                            }
                        }
                    );
                    user = await UserRead.findOne({ _id: userId }).lean();
                }

                return res.ok({ user }, message.message.FILE_DELETED);
            }
            return res.notFound({}, message.message.FILE_NOT_FOUND);
        } catch (error) {
            console.log("error", error);
            return res.serverError(error);
        }
    },

    async changeSelectedFile(req, res) {
        try {
            const loggedInUser = req.user;
            let userId = loggedInUser._id;

            const fileId = req?.body?.fileId;
            const files = await Files.findOne({ _id: fileId }).lean();
            if (!files) {
                return res.notFound(null, message.message.FILE_NOT_FOUND);
            }
            await User.updateOne(
                { _id: userId },
                {
                    $set: {
                        selectedCompany: fileId,
                    }
                }
            );

            const user = await UserRead.findOne({ _id: userId }).lean();

            return res.ok({ user: user, fileDetail: files }, message.message.OK);
        } catch (error) {
            console.log("error", error);
            return res.serverError(error);
        }
    },

    async getExcelFiles(req, res) {
        try {
            if (!req.body || !req.body.filter) {
                req.body.filter = {};
            }
            const filter = await CommonService.getFilter(req.body);
            filter.where.userId = req.user._id;
            const filesDetail = await FilesRead.find(filter.where)
                .sort(filter.sort)
                .lean();

            if (filesDetail && filesDetail.length > 0) {
                const filesArray = [];
                for (let index = 0; index < filesDetail.length; index++) {
                    const element = filesDetail[index];
                    filesArray.push({
                        createdDate: element.createdAt ? moment(element.createdAt).format('DD-MM-YYYY hh:mm A') : null,
                        name: element.name || null,
                        house: element.house || null,
                    });
                }
                const workbook = new excelJS.Workbook();
                const worksheet = workbook.addWorksheet('company-list');

                worksheet.columns = [
                    {
                        header: 'Created Date',
                        key: 'createdDate',
                        width: 20,
                    },
                    {
                        header: 'Company Name',
                        key: 'name',
                        width: 20,
                    },
                    {
                        header: 'Total House',
                        key: 'house',
                        width: 20,
                    },
                ];

                worksheet.addRows(filesArray);
                const pathToSave = path.join(__dirname, '../../excels-generated');
                const fileName = `company-list-${Date.now()}.xlsx`;
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
            console.log("File getExcelFiles Error::>", error);
            return res.serverError(error);
        }
    },

    async getPdfFiles(req, res) {
        try {
            if (!req.body || !req.body.filter) {
                req.body.filter = {};
            }
            const filter = await CommonService.getFilter(req.body);
            filter.where.userId = req.user._id;
            const filesDetail = await FilesRead.find(filter.where)
                .sort(filter.sort)
                .lean();

            const columns = [
                {
                    header: 'Created Date',
                    key: 'createdDate',
                    width: 20,
                },
                {
                    header: 'Company Name',
                    key: 'name',
                    width: 20,
                },
                {
                    header: 'Total House',
                    key: 'house',
                    width: 20,
                },
            ];

            const pathToSave = path.join(__dirname, '../../excels-generated');
            const fileName = `company-list-${Date.now()}.pdf`;
            const filePath = path.join(pathToSave, fileName);

            // Check if there are any details to generate PDF
            if (filesDetail && filesDetail.length > 0) {
                const filesArray = filesDetail.map((element) => ({
                    createdDate: moment(element.createdAt).format('DD-MM-YYYY'),
                    name: element.name,
                    house: element.house,
                }));

                const writeStream = fs.createWriteStream(filePath);

                try {
                    await CommonService.downloadPdf('Files List', filesArray, columns, pathToSave, writeStream, 20);
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
            console.log("File getPdfFiles Error::>", error);
            return res.serverError(error);
        }
    },
}