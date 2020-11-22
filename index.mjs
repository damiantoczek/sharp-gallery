import { readdirSync, writeFile } from "fs"
import { extname } from "path"
import sharp from "sharp"

class Gallery{
  constructor(config){
    this.config = config
    this.folders = {} // Raw folders "./myFolder/animals": ["cat.jpg", "dog.jpg"]
    this.tree = {} // Prepared deep folder structure with suffixes

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
    this.images = [] // Full image paths for sharp

    if(config.auto){
      this.buildTree()
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
    this.images = images

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
      let imgObj = {
        src: folder + filename,
        tags: folder.replace(root, "").split("/").filter(val => val !== "")
      }

      // Create suffix paths from the root filename
      for(let newSuffix of suffix){
        imgObj[newSuffix] = Gallery.addSuffix(newSuffix, filename)
      }

      tree[folder][filename] = imgObj
    }

    for (let folderPath in folders) {
      if(!tree[folderPath])
        tree[folderPath] = {}

      while(folders[folderPath].length > 0){
        let filename = folders[folderPath].pop()
        if(!this.hasSuffix(filename)){
          addToTree(folderPath, filename)
        }
      }
    }

    this.tree = tree

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

  hasSuffix(filename){
      let suffix = this.config.suffix
      let pattern = `\.(${suffix.join("|")})\.`
      let regexp = RegExp(pattern, "gi")
      return regexp.test(filename)
  }

  createImages(optionsArray){
    let tree = this.tree

    // Create images
    const changeImage = async (imageBuffer,format,_quality) => {
      let quality = _quality || 100
      switch (format) {
        case "jpg":
          return await sharp(imageBuffer).jpeg({quality}).toBuffer()
        case "jpeg":
          return await sharp(imageBuffer).jpeg({quality}).toBuffer()
        case "png":
          return await sharp(imageBuffer).png({quality}).toBuffer()
        default:
          return await sharp(imageBuffer).jpeg({quality}).toBuffer()
      }
    }

    let dir = this.config.root
    for(let imgOptions of optionsArray){
      let {size, format, suffix, quality} = imgOptions
      for(let imageSrc of this.images){
        if(!this.hasSuffix(imageSrc)){
          sharp(imageSrc).resize(size[0], size[1]).toBuffer().then((imageBufferRef) => {
            changeImage(imageBufferRef, format, quality).then(imageBuffer => {
              let newFilePath = Gallery.addSuffix(suffix, imageSrc)
              writeFile(newFilePath, imageBuffer, err => {
                if(err) console.trace(err)
                console.log("SAVED", newFilePath);
              })
            })
          })
        }
      }
    }

    return this
  }
}

export default Gallery
