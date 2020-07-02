# nodejs_gallery

```
const fs = require("fs")
const Gallery = require("./module/gallery.js")

const gallery = new Gallery({
  folder: "./myImages",
  element: img => `<figure><img src="myImages/${img.src}" data-tag="${img.tag}"></figure>`
});

(async function(){
  await gallery.update()
  
  const html = `<!DOCTYPE html>
  <html lang="de" dir="ltr">
    <head>
      <meta charset="utf-8">
      <title>Gallery</title></head>
    <body>
      <div id="gallery">
        <div class="grid">
          ${gallery.html()}
        </div>
      </div>
    </body>
  </html>`

  fs.writeFileSync("gallerie.html", html)
})()
```
