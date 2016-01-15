# In Memory TarGz
Allow tar.gz files to be loaded in memory, for later use (ex: served by a web server)

## Exemple
```js
import InMemoryTargz from 'in-memory-targz';
import express from 'express';
import mime from 'mime';

const memTargz = InMemoryTargz.create('./data/archive.tar.gz');

const app = express();

app.use('/foo/bar', function(req, res) {
  // Strip the leading '/'
  const filename = req.path.slice(1);

  memTargz.getFile(filename)
    .then((fileBuffer) => {
      const contentType = mime.lookup(filename);
      res.set('Content-type', contentType);
      res.status(200).send(fileBuffer);
    })
    .catch((err) => {
      if (err && err.code === 'ENOENT') {
        return res.status(404).send('File not found');
      }
      res.status(400).send('An error occurred');
    });
});

app.listen(3000);
console.log('Server listening on port 3000');
```
