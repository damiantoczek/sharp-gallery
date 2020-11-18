import Gallery from './src/gallery.mjs'

// This here initiates the whole image tree without creating images.
const gallery = new Gallery({
    root: "./images/",
    suffix: ["min", "mid", "big"],
    extensions: ".jpg"
})

console.log(gallery.tree);

// This step now creates and resizes all the images
gallery.createImages([
  {size: [480,360], format: "jpg", quality: 85, suffix: "min"},
  {size: [1600,900], format: "jpg", quality: 85, suffix: "mid"},
  {size: [2560,1440], format: "jpg", quality: 95, suffix: "big"}
])
