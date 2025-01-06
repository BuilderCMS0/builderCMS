const fs = require('fs');
const path = require('path');
const utils = require('util');
const readFile = utils.promisify(fs.readFile);
const puppeteer = require('puppeteer');
const hb = require('handlebars');
const { app } = require('../app');

let browserInstance = app.locals.browserInstance;

const getBrowserInstance = async () => {
    if (!browserInstance) {
        browserInstance = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        app.locals.browserInstance = browserInstance;
    }
    return browserInstance;
};

const closeBrowserInstance = async () => {
    if (app.locals.browserInstance) {
        await app.locals.browserInstance?.close();
        app.locals.browserInstance = null;
    }
};

module.exports = {
    closeBrowserInstance,
    async generateInvoice(req, res) {
        const data = {
            "companyName": "ABC Enterprises",
            "partyName": "John Doe",
            "bookingDate": "2025-01-06",
            "partyMobileNo": "9876543210",
            "repName": "Jane Smith",
            "repMobileNo": "9123456780",
            "unitNo": "A101",
            "unitSize": "1500 sq. ft.",
            "narration": "Booking confirmed for Unit A101.",
            "condition": "Payment within 30 days.",
            "note": "Payment within 30 days.",
            "totalPrice": "1,200,000",
            "items": [
                {
                    "no": 1,
                    "date": "2025-02-01",
                    "emiType": "Monthly EMI",
                    "amount": "20,000"
                },
                {
                    "no": 2,
                    "date": "2025-03-01",
                    "emiType": "Monthly EMI",
                    "amount": "20,000"
                },
                {
                    "no": 3,
                    "date": "2025-04-01",
                    "emiType": "Monthly EMI",
                    "amount": "20,000"
                },
                {
                    "no": 4,
                    "date": "2025-05-01",
                    "emiType": "Quarterly EMI",
                    "amount": "60,000"
                },
                {
                    "no": 2,
                    "date": "2025-03-01",
                    "emiType": "Monthly EMI",
                    "amount": "20,000"
                },
                {
                    "no": 3,
                    "date": "2025-04-01",
                    "emiType": "Monthly EMI",
                    "amount": "20,000"
                },
                {
                    "no": 4,
                    "date": "2025-05-01",
                    "emiType": "Quarterly EMI",
                    "amount": "60,000"
                }
            ]
        }

        try {
            const pathToSave = path.join(__dirname, '../../excels-generated');
            const fileName = `invoice_${Date.now()}.pdf`;
            const filePath = path.join(pathToSave, fileName);

            let compiledTemplate = app.locals.templates['Vipulbhai'];
            if (!compiledTemplate) {
                console.log("generateInvoice => ",);
                const templateHtml = await module.exports.getTemplateHtml();
                app.locals.templates['Vipulbhai'] = hb.compile(templateHtml, { strict: true });
                compiledTemplate = hb.compile(templateHtml, { strict: true });
            }

            const html = compiledTemplate(data);
            const browser = await getBrowserInstance();
            const page = await browser.newPage();
            await page.setContent(html);
            // await page.setContent(html, { waitUntil: 'networkidle2' });
            await page.setViewport({ width: 1280, height: 720 });
            await page.pdf({
                path: filePath,
                format: 'A4',
                printBackground: true,
            });
            await page.close();

            res.download(filePath, fileName, (err) => {
                if (err) {
                    console.error('Error downloading the file:', err);
                    return res.serverError(err);
                }

                // Delete the file after download
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.error('Error deleting the PDF file:', unlinkErr);
                    } else {
                        console.log('PDF file deleted successfully.');
                    }
                });
            });
        } catch (error) {
            console.log("generateInvoice => ", error);
            return res.serverError(error);
        }
    },

    async getTemplateHtml() {
        try {
            const invoicePath = path.resolve(path.join(__dirname, `../docs/Vipulbhai.html`));
            return await readFile(invoicePath, 'utf8');
        } catch (err) {
            console.log("err => ", err);
            return Promise.reject("Could not load html template");
        }
    },
}