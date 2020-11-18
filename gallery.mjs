import { readdirSync, writeFile } from "fs"
import { extname } from "path"
import sharp from "sharp"

class Gallery{
  constructor(config){
    this.config = config
    this.tree = {}

    this.loadFolder()
  }

  loadFolder(){
    const {root, suffix, extensions} = this.config
    const rootFolder = readdirSync(root)

    // Sort folders
    // key(folder):array(filenames)
    // {"myFolder": ["cat.jpg","dog.jpg","mouse.png"]}
    let folders = {}
    const addToFolders = function(folder, filename){
      if(folders[folder] === undefined){
        folders[folder] = [filename]
      }
      else{
        folders[folder].push(filename)
      }
    }

    const readFolder = function(rootPath, filesArray){
      for(let value of filesArray){
        if(extname(value) === ""){
          let newFilenames = readdirSync(rootPath + value)
          let newRootPath = rootPath + value + "/"
          readFolder(newRootPath, newFilenames)
        }
        else{
          // Before adding the filename to the folders object,
          // check if the extension name matches
          let ext = extname(value).toLowerCase()
          if(extensions.indexOf(ext) === 0){
            addToFolders(rootPath, value)
          }
        }
      }
    }

    readFolder(root, rootFolder)

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

    const addToTree = function(folder, filename){
      let pattern = `\.(${suffix.join("|")})\.`
      let regexp = RegExp(pattern, "i")
      let matches = filename.match(regexp)
      if(matches === null){
        let imgObj = {
          src: folder + filename,
          tags: folder.replace(root, "").split("/").filter(val => val !== "")
        }

        const addSuffix = (value, filename) => {
          let filenameExt = extname(filename)
          let newFilename = filename.replace(filenameExt, "." + value + filenameExt)
          return newFilename
        }

        // Create suffix paths from the root filename
        for(let newSuffix of suffix){
          imgObj[newSuffix] = folder + addSuffix(newSuffix, filename)
        }

        // Set object
        tree[folder][filename] = imgObj
      }
    }

    for (const folder in folders) {
      if(tree[folder] === undefined){
        tree[folder] = {}
      }

      while(folders[folder].length > 0){
        let filename = folders[folder].pop()
        addToTree(folder, filename)
      }
    }

    this.tree = tree
  }

  createImages(optionsArray){
    let tree = this.tree
    let imageObjs = []

    // Create an array of image objects for sharp
    for(let folderPath in tree){
      let folder = tree[folderPath]
      for(let imagePath in folder){
        let image = folder[imagePath]
        imageObjs.push(image);
      }
    }

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

    for(let imgOptions of optionsArray){
      let {size, format, suffix, quality} = imgOptions
      for(let imageObj of imageObjs){
        let src = imageObj.src

        sharp(src).resize(size[0], size[1]).toBuffer()
          .then(imageBufferRef => {
            changeImage(imageBufferRef, format, quality)
              .then(imageBuffer => {
                let filenameSuffix = imageObj[suffix]
                writeFile(filenameSuffix, imageBuffer, err => {
                  if(err) console.log(err)
                  console.log("SAVED", filenameSuffix);
                })
              })
          })
      }
    }
  }
}

export default Gallery
