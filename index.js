const fs = require('fs');
const delay = require("delay");
const fsExtra = require('fs-extra');
const readlineSync = require('readline-sync');
const utils = require('./utils');

module.exports.login = async function () {
    const rootDIR = __dirname + "/browser"
    await fsExtra.removeSync(rootDIR)

    const browser = await utils.browserInit(rootDIR, true)
    const mainPage = await browser.newPage()
    await mainPage.goto(`https://studio.youtube.com/`);

    const email = await readlineSync.question('Please input your email: ');
    await mainPage.type('input[type="email"]', email);
    await mainPage.keyboard.press('Enter');
    await delay(5000);

    const password = await readlineSync.question('Please input your password: ', {hideEchoBack: true});
    await mainPage.type('input[type="password"]', password);
    await mainPage.keyboard.press('Enter');
    await delay(5000);

    let confirmed = await readlineSync.question('Please input `' + email + '` to confirm login success: ');
    while (confirmed !== email) {
        confirmed = await readlineSync.question('Please input `' + email + '` to confirm login success: ');
    }
    const cookies = await mainPage.cookies();
    await fs.writeFileSync('./cookies-' + email + '.json', JSON.stringify(cookies, null, 2));
    await fsExtra.removeSync(__dirname + "/browser")
};

module.exports.loginByParams = async function (email, password) {
    const rootDIR = __dirname + "/browser"
    await fsExtra.removeSync(rootDIR)

    const browser = await utils.browserInit(rootDIR, true)
    const mainPage = await browser.newPage()
    await mainPage.goto(`https://studio.youtube.com/`);

    await mainPage.type('input[type="email"]', email);
    await mainPage.keyboard.press('Enter');
    await delay(5000);

    await mainPage.type('input[type="password"]', password);
    await mainPage.keyboard.press('Enter');
    await delay(5000);

    let confirmed = await readlineSync.question('Please input `' + email + '` to confirm login success: ');
    while (confirmed !== email) {
        confirmed = await readlineSync.question('Please input `' + email + '` to confirm login success: ');
    }
    const cookies = await mainPage.cookies();
    await fs.writeFileSync('./cookies-' + email + '.json', JSON.stringify(cookies, null, 2));
    await browser.close()
    await fsExtra.removeSync(__dirname + "/browser")
};

module.exports.uploadVideoToYoutube = async function (channel, cookiesPath, videoPath, imagePath, {
    title = "Example Title",
    description = "Example Description",
    keywords = ["keywords1", "keywords2"],
    playlist = "Playlist Name",
}) {
    // verify cookiesPath
    if (!cookiesPath || !(fs.existsSync(cookiesPath))) {
        throw 'Please input your cookies';
    }

    // verify video
    if (!videoPath || !(fs.existsSync(videoPath))) {
        throw 'Please input your video';
    }

    const rootDIR = __dirname + "/browser"
    await fsExtra.removeSync(rootDIR)
    const browser = await utils.browserInit(rootDIR, false)
    const mainPage = await browser.newPage()
    await mainPage.setViewport({
        width: 1920 + Math.floor(Math.random() * 100),
        height: 1080 + Math.floor(Math.random() * 100),
        deviceScaleFactor: 1,
        hasTouch: false,
        isLandscape: false,
        isMobile: false,
    });
    const cookiesString = await fs.readFileSync(cookiesPath);
    const cookies = JSON.parse(cookiesString);
    await mainPage.setCookie(...cookies);

    let videoId = null
    try {
        console.log("+ Go to `https://studio.youtube.com/channel/" + channel + "?approve_browser_access=true`")
        await mainPage.goto('https://studio.youtube.com/channel/' + channel + '?approve_browser_access=true');
        await mainPage.waitForSelector('a[test-id="upload-icon-url"]', {timeout: 10000});

        // upload file
        const uploadVideoButton = await mainPage.$('a[test-id="upload-icon-url"]');
        await uploadVideoButton.click();

        // upload file
        console.log("+ Video uploading....")
        await mainPage.waitForSelector('#content > input[type=file]');
        const submitFile = await mainPage.$('#content > input[type=file]');
        await submitFile.uploadFile(videoPath);
        await delay(5000)

        // waiting for title
        let inputTitle = await mainPage.$$('#textbox');
        while (inputTitle['length'] === 0) {
            inputTitle = await mainPage.$$('#textbox');
            await delay(1000);
        }

        // fill title
        console.log("+ Input video title")
        await inputTitle[0].click();
        await delay(1000);
        await mainPage.evaluate(() => document.execCommand('selectall', false, null));
        await delay(1000);
        await mainPage.keyboard.type(title.substr(0, 100), {delay: 10});
        await delay(1000);

        // fill description
        console.log("+ Input video description")
        inputTitle = await mainPage.$$('#textbox');
        await inputTitle[1].click();
        await mainPage.keyboard.type(description.substr(0, 5000), {delay: 10});
        await delay(1000);

        // upload image
        console.log("+ Upload image")
        if (imagePath && fs.existsSync(imagePath)) {
            const inputImage = await mainPage.$('#file-loader');
            await inputImage.uploadFile(imagePath);
            await delay(1000 * 10);
        }

        try {
            let shareTag = await mainPage.$("a[class=\"style-scope ytcp-video-info\"]");
            let linkVideo = await mainPage.evaluate(el => el.getAttribute('href'), shareTag);
            videoId = linkVideo.split("/").pop();
        } catch (e) {
            console.error(e)
        }

        // wait for next button enable
        let nextButton = await mainPage.$$("ytcp-button[id=\"next-button\"]");
        while (nextButton.length === 0) {
            nextButton = await mainPage.$$("ytcp-button[id=\"next-button\"]");
            await delay(5000);
        }

        // load more
        let moreOption = await mainPage.$$("ytcp-button[id=\"toggle-button\"]");
        await moreOption[0].click();

        // Add video to playlist
        console.log("+ Add to Playlist")
        try {
            let buttons = await mainPage.$x('/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[1]/ytcp-video-metadata-editor/div/ytcp-video-metadata-editor-basics/div[4]/div[3]/div[1]/ytcp-video-metadata-playlists/ytcp-text-dropdown-trigger/ytcp-dropdown-trigger');
            await buttons[0].click();
            await delay(5000);

            let addToPlaylist = false
            buttons = await mainPage.$x("/html/body/ytcp-playlist-dialog/tp-yt-paper-dialog/ytcp-checkbox-group/div/ul/tp-yt-iron-list/div/ytcp-ve/li/label/span/span");
            for (const button of buttons) {
                let existPlaylist = await mainPage.evaluate(el => el.innerText, button);
                if (existPlaylist === playlist) {
                    buttons = [button]
                    addToPlaylist = true
                    break
                }
            }

            if (!addToPlaylist) {
                buttons = await mainPage.$$("ytcp-button[class=\"new-playlist-button action-button style-scope ytcp-playlist-dialog\"]");
                await buttons[0].click()
                await delay(5000);

                await mainPage.keyboard.type(playlist);
                await delay(1000);

                buttons = await mainPage.$$("ytcp-button[class=\"create-playlist-button action-button style-scope ytcp-playlist-dialog\"]");
                await buttons[0].click()
                await delay(5000);

                buttons = await mainPage.$x("/html/body/ytcp-playlist-dialog/tp-yt-paper-dialog/ytcp-checkbox-group/div/ul/tp-yt-iron-list/div/ytcp-ve/li/label/span/span");
            }

            await buttons[0].click();
            await delay(5000);

            buttons = await mainPage.$x("/html/body/ytcp-playlist-dialog/tp-yt-paper-dialog/div[2]/ytcp-button[3]");
            await buttons[0].click();
            await delay(5000);

        } catch (e) {
            console.error(e)
        }

        // Update keywords tags
        console.log("+ Add keywords")
        if (keywords) {
            try {
                let buttons = await mainPage.$x('/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[1]/ytcp-video-metadata-editor/div/ytcp-video-metadata-editor-advanced/div[3]/ytcp-form-input-container/div[1]/div');
                await buttons[0].click();
                await delay(5000);

                await mainPage.keyboard.press('Escape');
                await delay(1000);

                await mainPage.keyboard.type(keywords.join(","));
                await delay(1000);

                await mainPage.keyboard.press('Enter');
                await delay(1000);
            } catch (e) {
                console.error(e);
            }
        }

        console.log("+ Move to latest tab")
        try {
            let doneButton = await mainPage.$$("tp-yt-paper-radio-button[name=\"PUBLIC\"]");
            while (!doneButton[0]) {
                await nextButton[0].click();
                await delay(5000);
                doneButton = await mainPage.$$("tp-yt-paper-radio-button[name=\"PUBLIC\"]");
            }
        } catch (e) {
        }

        console.log("+ Wait for processing video...")
        let doneTextElement = await mainPage.$('#dialog > div > ytcp-animatable.button-area.metadata-fade-in-section.style-scope.ytcp-uploads-dialog > div > div.left-button-area.style-scope.ytcp-uploads-dialog > ytcp-video-upload-progress > span');
        let doneText = '';
        while (!(doneText.indexOf('Đã kiểm tra xong') !== -1 || doneText.indexOf('Upload complete') !== -1 || doneText.toLowerCase().indexOf('processing') !== -1)) {
            doneTextElement = await mainPage.$('#dialog > div > ytcp-animatable.button-area.metadata-fade-in-section.style-scope.ytcp-uploads-dialog > div > div.left-button-area.style-scope.ytcp-uploads-dialog > ytcp-video-upload-progress > span');
            if (doneTextElement) {
                doneText = await mainPage.evaluate(el => el.innerText, doneTextElement);
            }
            await delay(120000);
        }
        await mainPage.click('#done-button');
        await delay(60000);

    } catch (e) {
        console.error(e)
    }
    await mainPage.close();
    await browser.close();
    fsExtra.removeSync(rootDIR)
    return videoId;
};

