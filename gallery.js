const fs = require("fs")
const path = require("path")
const sharp = require("sharp")

class Gallery{
  constructor(config){
    this.config = config
    this.images = []

    this.images = this.loadFolder()
  }

  static getExt(filename){
    return filename.match(/(.[\w]+)$/gi)[0]
  }

  loadFolder(){
    const rootPath = this.config.rootPath
    const galleryFolder = fs.readdirSync(rootPath)
    let images = []

    const evalPath = (filepath, filename) => {
      let relativePath = filepath.replace(rootPath, "")
      let values = relativePath.split("/")
      values.pop()

      let image = {
        src: {
          relative: relativePath + filename,
          root: filepath + filename
        },
        tags: values
      }

      images.push(image)
    }

    const readFolders = function(rootPath, folder){
      for(const value of folder){
        if(path.extname(value) === ""){
          const content = fs.readdirSync(rootPath + value)
          const newRootPath = rootPath + value + "/"
          readFolders(newRootPath, content)
        }
        else {
          evalPath(rootPath, value)
        }
      }
    }

    readFolders(rootPath, galleryFolder)

    return images
  }

  async createImages(){
    let outputs = this.config.output
    let images = this.images

    const changeFormatAndQuality = async (imageBuffer, format, quality) => {
      switch (format) {
        case "jpg":
          return await sharp(imageBuffer).jpeg({quality: quality || 100}).toBuffer();
        case "png":
          return await sharp(imageBuffer).png({quality: quality || 100}).toBuffer();
      }
    }

    const setExt = (filename, newExt) => {
      let ext = Gallery.getExt(filename)
      return filename.replace(ext, `.${newExt}`)
    }

    const addSuffix = (filename, string) => {
      let arr = filename.split(".")
      let pos = arr.length-1
      arr.splice(pos, 0, string)
      return arr.join(".")
    }

    const saveImage = (image, suffix, format, root) => {
      let newFilename = ""
      newFilename = setExt(root, format)
      if(suffix) newFilename = addSuffix(newFilename, suffix)
      fs.writeFile(newFilename, image, err => {
        if(err) console.log(err);
        console.log("SAVED", newFilename);
      })
    }

    // Loop thru all output options
    for(let {size, format, quality, suffix} of outputs){
      for(let {src, tags} of images){
        let {root, relative} = src

        const imageBufferRef = await sharp(root).resize(size[0], size[1]).toBuffer()
        
        let image;
        // Check if one or multiple formats have been requested
        if(typeof format === "string"){
          // single format per size
          image = await changeFormatAndQuality(imageBufferRef, format, quality)
          saveImage(image, suffix, format, root)
        }else{
          // multiple formats per size
          for(let ext of format){
            image = await changeFormatAndQuality(imageBufferRef, ext, quality)
            saveImage(image, suffix, ext, root)
          }
        }
      }
    }
  }
}

module.exports = Gallery
