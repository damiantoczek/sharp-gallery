const {MongoClient} = require("mongodb")
const fs = require("fs")

class Gallery{
  constructor(config){
    this.config = config
    this.filenames = fs.readdirSync(config.folder, "utf8")
    this.data = []
    this.images = []
  }

  async loadDatabase(){
    const conn = await MongoClient.connect('mongodb://127.0.0.1:27017', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).catch(err => {console.log(err)})

    const db = conn.db("test")
    const collection = db.collection("alt_gallery")
    const data = await collection.find({}).toArray()
    await conn.close()
    this.data = data
    return data
  }

  async update(){
    console.log("UPDATING");
    const newFiles = this.getNewFiles()
    if (newFiles) {
      const mustUpdateImgSrc = await this.hasOldInfo(newFiles)
      if(mustUpdateImgSrc){
        this.render()
      }
    }
  }

  html(){
    return this.images.join("")
  }

  render(){
    console.log("RENDERING VIEW");
    const {data,config} = this
    const images = []
    for(const imageInfo of data){
      images.push(config.element(imageInfo))
    }
    this.images = images
  }

  async hasOldInfo(newFiles){
    console.log("CHECKING FOR OLD INFO");
    const imagesInfo = await this.loadDatabase()
    const hasOldImgSrc = imagesInfo.filter(row => newFiles.indexOf(row.src) === -1)

    return hasOldImgSrc
  }

  getNewFiles(){
    console.log("GETTING NEW FILES");
    const {folder} = this.config
    const oldFilenames = this.filenames
    //const newFilenames = fs.readdirSync(folder, "utf8")
    const newFilenames = [
      'porsche_9ff.jpg',
      'audi_a3_sport.jpg',
      'audirot.jpg',
      'bentleygt-sitzgestellverkleidung.jpg',
      'bmw_m6.jpg',
      'bmw335.jpg',
      'bmwx5.jpg',
      'camaro-armaturenbrett.jpg',
      'camaro-armaturenbrett.min.jpg',
      'evo.jpg',
      'evoausstattung.jpg',
      'ferrarifussmatten.jpg',
      'fussmatten.jpg',
      'r8ausstattung.jpg',
      'sitzgestellverkleidung.jpg'
    ]

    // If both arrays don't have the same length, update
    if(oldFilenames.length !== newFilenames.length){
      this.filenames = newFilenames
      return newFilenames
    }

    // If one is different, update
    for(let i = 0; i < newFilenames.length; i++){
      const name = newFilenames[i]
      if (oldFilenames.indexOf(name) === -1){
        this.filenames = newFilenames
        return newFilenames.filter(name => oldFilenames.indexOf(name) === -1)
      }
    }

    // Dont update
    return false
  }
}

module.exports = Gallery
