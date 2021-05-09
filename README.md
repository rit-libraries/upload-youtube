# RIT Youtube Uploader

Upload video to youtube via browser

# Install

```bash
$ npm install --save upload-youtube
```

# Usage

```js
const uploadYT = require('upload-youtube');

(async () => {
    const email = "INPUT YOUR EMAIL"
    const password = "INPUT YOUR PASSWORD"
    await uploadYT.loginByParams(email, password);
    const ytID = await uploadYT.uploadVideoToYoutube(
        "./cookies-" + email + ".json",
        "./resources/movie.mp4",
        "./resources/image.jpeg",
        {
            title: "Example Title",
            description: "Example Description",
            keywords: ["keywords1", "keywords2"],
            playlist: "Playlist Name",
        }
    )
    console.log(`Upload success: https://youtu.be/${ytID}`)
})()


```

# License

MIT. Based on [upload-youtube](https://github.com/rit-libraries/upload-youtube).
