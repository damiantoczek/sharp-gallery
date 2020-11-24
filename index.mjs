import { readdirSync, writeFile } from "fs"
import { extname } from "path"
import sharp from "sharp"

class Gallery{
  constructor(config){
    this.config = config
    this.folders = {} // Raw folders "./myFolder/animals": ["cat.jpg", "dog.jpg"]
    this.tree = {} // Prepared deep folder structure with suffixes
    this.cache = {
      'watermark': {}
    }

    /*
    tree = {
      "./myFolder":{
        "/animals":[
          "cat.jpg",
          "dog.jpg"
        ]
      }
    }
    */
    this.imagePaths = [] // Full image paths for sharp

    if(config.images){
      this.buildTree()
      this.createImages(this.config.images)
    }
  }

  buildTree(){
    const {root, suffix, extensions} = this.config
    let rootFolder = readdirSync(root)

    // Sort folders
    // key(folder):array(filenames)
    // {"myFolder": ["cat.jpg","dog.jpg","mouse.png"]}
    let folders = {}
    let images = [] // Stores all full image paths to be used with sharp when .createImages is called.
    const addToFolders = (folder, filename) => {
      if(!folders[folder])
        folders[folder] = [filename]
      else
        folders[folder].push(filename)

      images.push(folder + filename)
    }

    const readFolder = (rootPath, filesArray) => {
      for(let filename of filesArray){
        if(extname(filename) === ""){
          let newFilenames = readdirSync(rootPath + filename)
          let newRootPath = rootPath + filename + "/"
          readFolder(newRootPath, newFilenames)
        }
        else if(this.hasValidExt(filename)){
          addToFolders(rootPath, filename)
        }
      }
    }

    readFolder(root, rootFolder)
    this.folders = folders
    // Filter image sources with suffixes, im putting this now here
    // Because I used this filter about 3 times in multiple methods.
    this.imagePaths = images.filter(src => !this.hasSuffix(src) && !this.hasSuffix(src, ["watermark"]))

    /*
    Create a tree like this
    {
      "myFolder": {
        "imagenameAsKey": {
          min: "cat.min.js",
          big: "cat.big.js"
        }
      }
    }
    */

    let tree = {}
    const addToTree = (folder, filename) => {
      /* Create image objects like:
      {
        src:"./gallery/dogs/husky.jpg",
        thumbnail:"./gallery/dogs/husky.min.jpg"
      }
      */
      let newFilename = filename.replaceAll(/\s+/g, "_")
      let imgObj = {
        src: folder + newFilename,
        _src: folder + filename,
        tags: folder.replace(root, "").split("/").filter(val => val !== "")
      }

      // Create suffix paths from the root filename
      for(let newSuffix of suffix){
        imgObj[newSuffix] = Gallery.addSuffix(newSuffix, newFilename)
      }

      tree[folder][newFilename] = imgObj
    }

    for (let folderPath in folders) {
      if(!tree[folderPath])
        tree[folderPath] = {}

      while(folders[folderPath].length > 0){
        let newFilename = folders[folderPath].pop()
        if(!this.hasSuffix(newFilename)){
          addToTree(folderPath, newFilename)
        }
      }
    }

    this.tree = tree
    console.log(tree);

    return this
  }

  static addSuffix(value, filename){
    let filenameExt = extname(filename)
    let newFilename = filename.replace(filenameExt, "." + value + filenameExt)
    return newFilename
  }

  hasValidExt(filename){
    let extensions = this.config.extensions
    let pattern = `\.(${extensions.join("|")})$`
    let regexp = RegExp(pattern, "gi")
    return regexp.test(filename)
  }

  hasSuffix(filename, suffixArr){
      let suffix = suffixArr || this.config.suffix
      let pattern = `\.(${suffix.join("|")})\.`
      let regexp = RegExp(pattern, "gi")
      return regexp.test(filename)
  }

  async loadWatermarks(width, height, axis){
    let imageOptions = this.config.images
    let watermarks = this.config.watermarks

    return Promise.all(
      imageOptions.map(async ({size, suffix}) => {
        /* TODO: Now it is only able to load and cache one single watermark
          this.cache.watermark = {
            "suffixA": watermarkBufferA,
            "suffixB": watermarkBufferB,
            "suffixC": watermarkBufferC
          }
        */
        let watermarkBuffer = await sharp(watermarks[0].input)
        let meta = await watermarkBuffer.metadata()

        // Calculate the new size for the watermark
        // sizeDif is the difference between image and watermark
        let sizeDif = axis === "width"? (size[0] / width) : (size[1] / height)
        let newWidth = Math.round(meta.width * sizeDif)
        let newHeight = Math.round(meta.height * sizeDif)

        let watermarkOptions = {fit:"inside"}
        let resizedWatermark = await watermarkBuffer.resize(newWidth, newHeight, watermarkOptions).toBuffer()
        this.cache.watermark[suffix] = resizedWatermark
      })
    ).then(() => {
      console.log(`Watermarks created.`);
    })
  }

  async createImages(options){
    if(!this.config.images) this.config.images = options
    let imagePaths = this.imagePaths
    let watermarks = this.config.watermarks

    if(watermarks){
      await this.loadWatermarks(6480, 4320)
    }

    // Loops through all imagePaths
    return Promise.all(
      imagePaths.map(async (imageSrc) => {
        let imageBufferRef = await sharp(imageSrc).rotate()
        let {width,height} = await imageBufferRef.metadata()

        // Possible to do it for each image individually but this will const so much performance
        // if(watermarks){
        //   this.loadWatermarks(width, height)
        // }

        // Loops through all image options config.images
        return Promise.all(
          options.map(async ({size,suffix,format,quality}) => {
            let newImageSrc = Gallery.addSuffix(suffix, imageSrc.replaceAll(/\s+/g, "_"))

            await imageBufferRef.resize(size[0],size[1]).toBuffer()
            // Adds watermark if defined in config.watermark
            // If config.watermark is defined this.config.watermark will have a imageBuffer
              .then(async (buffer) => {
                if(this.cache.watermark[suffix] !== undefined){
                  let watermarkBuffer = this.cache.watermark[suffix]
                  return await sharp(buffer).composite([{input: watermarkBuffer, gravity: watermarks[0].gravity}]).toBuffer()
                }

                return buffer
              })
            // Check what file format it is and save it to file.
              .then(async (buffer) => {
                quality = quality || 100
                switch (format) {
                  case "jpg":
                    await sharp(buffer).jpeg({quality}).toFile(newImageSrc)
                  case "jpeg":
                    await sharp(buffer).jpeg({quality}).toFile(newImageSrc)
                  case "png":
                    await sharp(buffer).png({quality}).toFile(newImageSrc)
                  default:
                    await sharp(buffer).jpeg({quality}).toFile(newImageSrc)
                }
              })
          })
        )


        // let newImageSrc = Gallery.addSuffix(suffix, src)
        // // console.log(newImageSrc);
        // writeFile(newImageSrc, imageBuffer, err => {
        //   if(err) console.trace(err)
        // })
      })
    ).then(() => {
      console.log(`${options.length * imagePaths.length} images saved.`);
    })
  }
}

export default Gallery
