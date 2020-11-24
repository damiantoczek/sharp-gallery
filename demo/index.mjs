import Gallery from '../index.mjs'

// This here initiates the whole image tree without creating images.
const gallery = new Gallery({
    root: "./images/",
    suffix: ["min", "mid", "big"],
    extensions: ["jpg","jpeg"]
})
gallery.buildTree()

console.log(gallery.tree);

// This step now creates and resizes all the images
gallery.createImages([
  {size: [480,360], format: "jpg", quality: 85, suffix: "min"},
  {size: [1600,900], format: "jpg", quality: 85, suffix: "mid"},
  {size: [2560,1440], format: "jpg", quality: 95, suffix: "big"}
])

// OR
//
const gallery2 = new Gallery({
    root: "./images/",
    suffix: ["thumbnail", "preview", "fullscreen"],
    watermarks: [{input:"./assets/watermark.png", gravity:"southeast"}],
    extensions: ["jpg","jpeg"],
    images: [
      {size: [480,360], format: "jpg", quality: 80, suffix: "thumbnail"},
      {size: [1600,900], format: "jpg", quality: 85, suffix: "preview"},
      {size: [2560,1440], format: "jpg", quality: 94, suffix: "fullscreen"}
    ]
})

// node index.mjs
