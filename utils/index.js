//Enable stealth mode
const puppeteer = require("puppeteer-extra")
const UserAgentPlugin = require("puppeteer-extra-plugin-anonymize-ua")
const StealthPlugin = require("puppeteer-extra-plugin-stealth")
puppeteer.use(StealthPlugin());
puppeteer.use(UserAgentPlugin({makeWindows: true}));

module.exports.browserInit = async function (dirPath, showWeb = false) {
    return await puppeteer.launch({
        headless: !showWeb,
        defaultViewport: null,
        userDataDir: dirPath,
        args: [
            '--no-sandbox',
            '--disable-gpu',
            '--start-fullscreen',
            '--ignore-certificate-errors'
        ]
    });
};
