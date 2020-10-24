const Gallery = require("./gallery.js")

const gallery = new Gallery({
    rootPath: "./gallery/",
    output: [
        {size: [480,360], format: "jpg", quality: 85, suffix: "min"},
        {size: [1600,900], format: "jpg", quality: 90, suffix: "big"}
    ]
})

gallery.createImages()