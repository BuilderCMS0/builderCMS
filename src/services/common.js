const moment = require('moment');
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const PDFDocument = require('pdfkit');
const fs = require('fs');

module.exports = {
    getFilter: async (filterOptions) => {
        let options = JSON.parse(JSON.stringify(filterOptions));
        let filter = { where: { $or: [] } };
        // manage pagination logic
        if (options.page && options.limit) {
            filter.skip = (options.page - 1) * options.limit;
            filter.limit = options.limit;
        }

        // sort by request
        if (options.sort) {
            filter.sort = options.sort;
        } else {
            filter.sort = { createdAt: -1 };
        }

        if (_.has(options, 'isActive')) {
            filter.where.isActive = options.isActive;
        }

        if (_.has(options, 'isDeleted')) {
            filter.where.isDeleted = options.isDeleted;
        }

        if (_.has(options, 'userId')) {
            filter.where.userId = options.userId;
        }

        // filter by start with
        if (options.startWith && options.startWith.keys && options.startWith.keyword) {
            _.forEach(options.startWith.keys, (key) => {
                if (key) {
                    const orArray = {};
                    orArray[key] = { startsWith: options.startWith.keyword };
                    filter.where.$or.push(orArray);
                }
            });
        }

        if (options.search && options.search.keys && options.search.keyword) {
            _.forEach(options.search.keys, (key) => {
                if (key) {
                    const orArray = {};
                    orArray[key] = { "$regex": options.search.keyword, "$options": "i" };
                    filter.where.$or.push(orArray);
                }
            });
        }
        // NOTE:- keep this filter at end
        if (_.has(options, 'id')) {
            filter = { where: { id: options.id } };
        }
        // projection by request
        if (options.project) {
            filter.select = options.project;
        }
        if (options.filter) {
            await transformDateRanges(options.filter);
            await transformArrayFilter(options.filter);
            filter.where = _.extend(filter.where, options.filter);

        }

        if (filter.where.$or && !filter.where.$or.length) {
            delete filter.where.$or;
        }

        return filter;
    },

    populateFields: async (query, populateObj) => {
        if (populateObj && typeof populateObj === 'object' && Object.keys(populateObj).length > 0) {
            for (const [association, fields] of Object.entries(populateObj)) {
                if (fields && fields.length > 0) {
                    const fieldSelection = fields.join(' ');
                    query.populate(association, fieldSelection);
                }
            }
        }
    },

    getFloat(value) {
        return Number(parseFloat(value).toFixed(2));
    },

    setDateFormate(date) {
        const newDate = moment(date, 'DD/MM/YYYY').format('MM-DD-YYYY');
        // const localDate = new Date(date);
        // const newDate = moment(date).format('DD-MM-YYYY');
        return moment(newDate, 'MM-DD-YYYY').toISOString();
    },

    dateToISO(date) {
        return moment(date, 'DD/MM/YYYY').toISOString();
    },

    replaceAmountString(amount) {
        const newAmount = amount.replace(/,/g, '');
        return newAmount;
    },

    randomNumber: (length = 4) => {
        let numbers = '12345678901234567890';
        let result = '';
        for (let i = length; i > 0; --i) {
            result += numbers[Math.round(Math.random() * (numbers.length - 1))];
        }

        return result;
    },

    financialExpireDate() {
        const expires = moment();
        expires.add(1, 'year').toISOString();

        return expires;
    },

    downloadPdf: async (title = '', data = [], columns = [], pathToSave, writeStream, headerHeight = 40, headerData = {}) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });

        if (!fs.existsSync(pathToSave)) {
            fs.mkdirSync(pathToSave, { recursive: true });
        }

        doc.pipe(writeStream);

        // Render Header Section
        function drawHeaderSection(doc) {
            const startY = 20; // Top margin
            doc.fontSize(12).font('Helvetica-Bold').text(title, { align: 'center' });
            doc.moveDown();

            doc.fontSize(10).font('Helvetica');
            let headerItems = []
            if (Object.keys(headerData)?.length > 0) {
                headerItems = [
                    { label: 'House No.', value: headerData?.houseNumber || '-' },
                    { label: 'Party Name', value: headerData?.ownerName || '-' },
                    { label: 'Mobile No.', value: headerData?.mobileNumber || '-' },
                    { label: 'Remaining Payment', value: headerData?.remainingPayment || '-' },
                    { label: 'Complete Payment', value: headerData?.completePayment || '-' },
                    { label: 'Total Payment', value: headerData?.totalPayment || '-' },
                ];
            }

            let currentY = startY;
            headerItems.forEach((item, index) => {
                doc.text(`${item.label}: ${item.value}`, 50, currentY + (index * 15));
            });

            // Add a line after the header
            const lineY = currentY + headerItems.length * 15 + 10;
            doc.moveTo(50, lineY).lineTo(doc.page.width - 50, lineY).stroke();
            return lineY + 20; // Return the new Y position
        }

        let currentY = drawHeaderSection(doc);

        const tableTopMargin = currentY;
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const marginLeft = 20;
        const marginRight = 20;
        const usableHeight = pageHeight - tableTopMargin - 50;
        const usableWidth = pageWidth - marginLeft - marginRight;

        const srNoWidth = 20;
        const colWidth = (usableWidth - srNoWidth) / columns.length;

        const srNoColumn = { header: 'No', key: 'srNo' };
        const updatedColumns = [srNoColumn, ...columns];

        function drawHeaders(doc, y) {
            doc.fontSize(10).font('Helvetica-Bold');

            doc.text(srNoColumn.header, marginLeft, y, { width: srNoWidth, align: 'center' });

            updatedColumns.slice(1).forEach((col, index) => {
                doc.text(col.header, marginLeft + srNoWidth + colWidth * index, y, { width: colWidth, align: 'center' });
            });

            const headerY = y + headerHeight;
            doc.moveTo(marginLeft, headerY).lineTo(marginLeft + usableWidth, headerY).stroke();

            let x = marginLeft;
            doc.moveTo(x, y).lineTo(x, headerY).stroke();
            x += srNoWidth;
            for (let i = 1; i <= updatedColumns.length; i++) {
                doc.moveTo(x, y).lineTo(x, headerY).stroke();
                if (i < updatedColumns.length) {
                    x += colWidth;
                }
            }
        }

        function drawRowBorders(doc, y, rowHeight) {
            if (isNaN(rowHeight)) {
                return;
            }

            doc.moveTo(marginLeft, y).lineTo(marginLeft + usableWidth, y).stroke();

            let x = marginLeft;
            doc.moveTo(x, y - rowHeight).lineTo(x, y).stroke();
            x += srNoWidth;
            for (let i = 1; i <= updatedColumns.length; i++) {
                doc.moveTo(x, y - rowHeight).lineTo(x, y).stroke();
                if (i < updatedColumns.length) {
                    x += colWidth;
                }
            }
        }

        function getRowHeight(doc, item) {
            const heights = updatedColumns.map((col, index) => {
                const textWidth = index === 0 ? srNoWidth : colWidth; // Use correct width for SR No.
                const height = doc.heightOfString(item[col.key] || '-', { width: textWidth });
                return height;
            });
            return Math.max(...heights) + 10;
        }

        currentY += 20;
        drawHeaders(doc, currentY);
        currentY += headerHeight + 10;

        data.forEach((item, index) => {
            const rowHeight = getRowHeight(doc, item);

            if (currentY + rowHeight > usableHeight) {
                doc.addPage();
                currentY = tableTopMargin;
                drawHeaders(doc, currentY);
                currentY += headerHeight + 10;
            }

            doc.fontSize(10).font('Helvetica').text(index + 1, marginLeft, currentY + 5, { width: srNoWidth, align: 'center' });

            updatedColumns.slice(1).forEach((col, colIndex) => {
                doc.fontSize(10).font('Helvetica').text(item[col.key] || '-', marginLeft + srNoWidth + colWidth * colIndex, currentY + 5, { width: colWidth, align: 'center' });
            });

            drawRowBorders(doc, currentY + rowHeight, rowHeight);
            currentY += rowHeight;
        });

        drawRowBorders(doc, currentY);

        doc.end();
    },

    downloadReminderPdf: async (title = '', data = [], columns = [], pathToSave, writeStream, headerHeight = 40, headerData = {}) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });

        if (!fs.existsSync(pathToSave)) {
            fs.mkdirSync(pathToSave, { recursive: true });
        }

        doc.pipe(writeStream);

        // Render Header Section
        function drawHeaderSection(doc) {
            const startY = 20; // Top margin
            doc.fontSize(12).font('Helvetica-Bold').text(title, { align: 'center' });
            doc.moveDown();

            doc.fontSize(10).font('Helvetica');
            let headerItems = []
            if (Object.keys(headerData)?.length > 0) {
                headerItems = [
                    { label: 'Date Range.', value: headerData?.dateRange || '-' },
                    { label: 'Status', value: headerData?.status || '-' },
                    { label: 'Emi Type', value: headerData?.emiType || '-' },
                ];
            }

            let currentY = startY;
            headerItems.forEach((item, index) => {
                doc.text(`${item.label}: ${item.value}`, 50, currentY + (index * 15));
            });

            // Add a line after the header
            const lineY = currentY + headerItems.length * 15 + 10;
            doc.moveTo(50, lineY).lineTo(doc.page.width - 50, lineY).stroke();
            return lineY + 20; // Return the new Y position
        }

        let currentY = drawHeaderSection(doc);

        const tableTopMargin = currentY;
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const marginLeft = 20;
        const marginRight = 20;
        const usableHeight = pageHeight - tableTopMargin - 50;
        const usableWidth = pageWidth - marginLeft - marginRight;

        const srNoWidth = 40;
        const colWidth = (usableWidth - srNoWidth) / columns.length;

        const srNoColumn = { header: 'No', key: 'srNo' };
        const updatedColumns = [srNoColumn, ...columns];

        function drawHeaders(doc, y) {
            doc.fontSize(10).font('Helvetica-Bold');

            doc.text(srNoColumn.header, marginLeft, y, { width: srNoWidth, align: 'center' });

            updatedColumns.slice(1).forEach((col, index) => {
                doc.text(col.header, marginLeft + srNoWidth + colWidth * index, y, { width: colWidth, align: 'center' });
            });

            const headerY = y + headerHeight;
            doc.moveTo(marginLeft, headerY).lineTo(marginLeft + usableWidth, headerY).stroke();

            let x = marginLeft;
            doc.moveTo(x, y).lineTo(x, headerY).stroke();
            x += srNoWidth;
            for (let i = 1; i <= updatedColumns.length; i++) {
                doc.moveTo(x, y).lineTo(x, headerY).stroke();
                if (i < updatedColumns.length) {
                    x += colWidth;
                }
            }
        }

        function drawRowBorders(doc, y, rowHeight) {
            if (isNaN(rowHeight)) {
                return;
            }

            doc.moveTo(marginLeft, y).lineTo(marginLeft + usableWidth, y).stroke();

            let x = marginLeft;
            doc.moveTo(x, y - rowHeight).lineTo(x, y).stroke();
            x += srNoWidth;
            for (let i = 1; i <= updatedColumns.length; i++) {
                doc.moveTo(x, y - rowHeight).lineTo(x, y).stroke();
                if (i < updatedColumns.length) {
                    x += colWidth;
                }
            }
        }

        function getRowHeight(doc, item) {
            const heights = updatedColumns.map((col, index) => {
                const textWidth = index === 0 ? srNoWidth : colWidth; // Use correct width for SR No.
                const height = doc.heightOfString(item[col.key] || '-', { width: textWidth });
                return height;
            });
            return Math.max(...heights) + 10;
        }

        currentY += 20;
        drawHeaders(doc, currentY);
        currentY += headerHeight + 10;
        let regCounter = 0;
        let mastCounter = 0
        data.forEach((item, index) => {
            const rowHeight = getRowHeight(doc, item);

            if (currentY + rowHeight > usableHeight) {
                doc.addPage();
                currentY = tableTopMargin;
                drawHeaders(doc, currentY);
                currentY += headerHeight + 10;
            }

            let displayIndex;
            if (item?.emiType == 'Master') {
                mastCounter++;
                displayIndex = 'M' + ' - ' + mastCounter;
            } else if (item?.emiType == 'Regular') {
                regCounter++;
                displayIndex = 'R' + ' - ' + regCounter;
            } else {
                displayIndex = '-';
            }

            doc.fontSize(10).font('Helvetica').text(displayIndex, marginLeft, currentY + 5, { width: srNoWidth, align: 'center' });

            updatedColumns.slice(1).forEach((col, colIndex) => {
                doc.fontSize(10).font('Helvetica').text(item[col.key] || '-', marginLeft + srNoWidth + colWidth * colIndex, currentY + 5, { width: colWidth, align: 'center' });
            });

            drawRowBorders(doc, currentY + rowHeight, rowHeight);
            currentY += rowHeight;
        });

        drawRowBorders(doc, currentY);

        doc.end();
    },

    downloadPaymentPdf: async (title = '', data = [], columns = [], pathToSave, writeStream, headerHeight = 40, headerData = {}) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });

        if (!fs.existsSync(pathToSave)) {
            fs.mkdirSync(pathToSave, { recursive: true });
        }

        doc.pipe(writeStream);

        // Render Header Section
        function drawHeaderSection(doc) {
            const startX = 50; // Left margin
            const startY = 40; // Top margin
            const columnWidth = (doc.page.width - 100) / 4; // Divide page width by 4 columns, leaving margins
            const rowHeight = 30; // Fixed height for each row
            const labelValueSpacing = 15; // Space between label and value

            doc.fontSize(10).font('Helvetica');

            let headerItems = [];
            if (Object.keys(headerData)?.length > 0) {
                headerItems = [
                    { label: 'House No.', value: headerData?.houseNumber || '-' },
                    { label: 'Party Name', value: headerData?.ownerName || '-' },
                    { label: 'Mobile No.', value: headerData?.mobileNumber || '-' },
                    { label: 'Booking Date', value: headerData?.bookingDate || '-' },
                    { label: 'Total Payment', value: headerData?.totalPayment || '-' },
                    { label: 'Complete Payment', value: headerData?.completePayment || '-' },
                    { label: 'Remaining Payment', value: headerData?.remainingPayment || '-' },
                    { label: 'EMI Start Month', value: headerData?.startMonth || '-' },
                ];
            }

            let currentX = startX;
            let currentY = startY;

            headerItems.forEach((item, index) => {
                // Draw the border for the box
                doc.rect(currentX, currentY, columnWidth, rowHeight).stroke();

                // Render label inside the box
                doc.font('Helvetica-Bold').text(`${item.label}:`, currentX + 5, currentY + 5, {
                    width: columnWidth - labelValueSpacing,
                    align: 'left',
                });

                // Render value inside the box, aligned with spacing
                doc.font('Helvetica').text(item.value, currentX + doc.widthOfString(`${item.label}:`) + 10, currentY + 5, {
                    width: columnWidth - labelValueSpacing,
                    marginLeft: labelValueSpacing,
                    align: 'left',
                });

                // Move to the next column or row
                if ((index + 1) % 4 === 0) {
                    currentX = startX; // Reset X position for a new row
                    currentY += rowHeight; // Move down for the next row
                } else {
                    currentX += columnWidth; // Move to the next column
                }
            });

            // Add a line after the header grid
            const lineY = currentY + rowHeight; // Slightly below the last row
            doc.moveTo(50, lineY).lineTo(doc.page.width - 50, lineY).stroke();

            return lineY + 20; // Return the new Y position
        }

        let currentY = drawHeaderSection(doc);

        const tableTopMargin = currentY;
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const marginLeft = 20;
        const marginRight = 20;
        const usableHeight = pageHeight - tableTopMargin - 50;
        const usableWidth = pageWidth - marginLeft - marginRight;

        const srNoWidth = 40;
        const colWidth = (usableWidth - srNoWidth) / columns.length;

        const srNoColumn = { header: 'No', key: 'srNo' };
        const updatedColumns = [srNoColumn, ...columns];

        function drawHeaders(doc, y) {
            doc.fontSize(10).font('Helvetica-Bold');

            doc.text(srNoColumn.header, marginLeft, y, { width: srNoWidth, align: 'center' });

            updatedColumns.slice(1).forEach((col, index) => {
                doc.text(col.header, marginLeft + srNoWidth + colWidth * index, y, { width: colWidth, align: 'center' });
            });

            const headerY = y + headerHeight;
            doc.moveTo(marginLeft, headerY).lineTo(marginLeft + usableWidth, headerY).stroke();

            let x = marginLeft;
            doc.moveTo(x, y).lineTo(x, headerY).stroke();
            x += srNoWidth;
            for (let i = 1; i <= updatedColumns.length; i++) {
                doc.moveTo(x, y).lineTo(x, headerY).stroke();
                if (i < updatedColumns.length) {
                    x += colWidth;
                }
            }
        }

        function drawRowBorders(doc, y, rowHeight) {
            if (isNaN(rowHeight)) {
                return;
            }

            doc.moveTo(marginLeft, y).lineTo(marginLeft + usableWidth, y).stroke();

            let x = marginLeft;
            doc.moveTo(x, y - rowHeight).lineTo(x, y).stroke();
            x += srNoWidth;
            for (let i = 1; i <= updatedColumns.length; i++) {
                doc.moveTo(x, y - rowHeight).lineTo(x, y).stroke();
                if (i < updatedColumns.length) {
                    x += colWidth;
                }
            }
        }

        function getRowHeight(doc, item) {
            const heights = updatedColumns.map((col, index) => {
                const textWidth = index === 0 ? srNoWidth : colWidth; // Use correct width for SR No.
                const height = doc.heightOfString(item[col.key] || '-', { width: textWidth });
                return height;
            });
            return Math.max(...heights) + 10;
        }

        currentY += 20;
        drawHeaders(doc, currentY);
        currentY += headerHeight + 10;
        let regCounter = 0;
        let mastCounter = 0
        data.forEach((item, index) => {
            const rowHeight = getRowHeight(doc, item);

            if (currentY + rowHeight > usableHeight) {
                doc.addPage();
                currentY = tableTopMargin;
                drawHeaders(doc, currentY);
                currentY += headerHeight + 10;
            }

            let displayIndex;
            if (item?.emiType == 'Master') {
                mastCounter++;
                displayIndex = 'M' + ' - ' + mastCounter;
            } else if (item?.emiType == 'Regular') {
                regCounter++;
                displayIndex = 'R' + ' - ' + regCounter;
            } else {
                displayIndex = '-';
            }

            doc.fontSize(10).font('Helvetica').text(displayIndex, marginLeft, currentY + 5, { width: srNoWidth, align: 'center' });

            updatedColumns.slice(1).forEach((col, colIndex) => {
                doc.fontSize(10).font('Helvetica').text(item[col.key] || '-', marginLeft + srNoWidth + colWidth * colIndex, currentY + 5, { width: colWidth, align: 'center' });
            });

            drawRowBorders(doc, currentY + rowHeight, rowHeight);
            currentY += rowHeight;
        });

        drawRowBorders(doc, currentY);

        doc.end();
    },

    convertFilterToObjectId: (id) => {
        if (Array.isArray(id)) {
            return id.map(id => new ObjectId(id));
        } else if (typeof id == 'string') {
            return new ObjectId(id);
        }
        else return null
    }
};

async function transformDateRanges(filter) {
    if (filter && typeof filter === 'object' && Object.keys(filter).length > 0) {
        for (const [field, dateRange] of Object.entries(filter)) {
            if (dateRange && dateRange.startDate && dateRange.endDate) {
                filter[field] = {
                    $gte: dateRange.startDate,
                    $lte: dateRange.endDate,
                };
            }
        }
    }

    return filter;
};

async function transformArrayFilter(filter) {
    if (filter && typeof filter === 'object' && Object.keys(filter).length > 0) {
        for (const field in filter) {
            if (filter.hasOwnProperty(field) && Array.isArray(filter[field])) {
                const value = filter[field];
                if (Array.isArray(value)) {
                    filter[field] = { $in: value };
                }
            }
        }
    }

    return filter;
};