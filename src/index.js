const {createServer} = require('http');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const {MongoClient} = require('mongodb');
const GridFsStorageService = require('./GridFsStorageService');
require('dotenv').config();

process.on('uncaughtException', function(err) {
  console.error((err && err.stack) ? err.stack : err);
});

const url = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'orca-fs';

const client = new MongoClient(url);

async function main() {
  try {
    await client.connect();
    const db = client.db(dbName);
    const fsFiles = db.collection('fs.files');

    const app = express();
    app.use(cors());

    const gridFs = new GridFsStorageService({ bucket: 'fs', db: db })
    const uploadFileHandler = multer({
      storage: {
        _handleFile: async (req, file, cb) => {
          try {
            const uploadedFile = await gridFs.createFile(file);
            // @ts-ignore
            req.__uploadedFileName = uploadedFile.filename;
            cb(null, file);
          } catch (e) {
            console.error(e);
            cb(null, null);
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        _removeFile: () => { }
      }
    }).any();
    app.post('/api', uploadFileHandler, (req, res) => res.send({data: req.__uploadedFileName }));
    app.get('/api/:fileName', async (req, res, next) => {
      const fileInfo = await fsFiles.findOne({filename: req.params.fileName}, { contentType: 1, uploadDate:1 , metadata: 1 })
      const file = await gridFs.getFile(req.params.fileName)
      if (fileInfo.contentType)
        res.setHeader('Content-Type', fileInfo.contentType)
      res.setHeader('Cache-Control', 'max-age=315360000')
      file.on('error', next).pipe(res)
    });
    app.delete('/api/:fileName', async (req, res) => {
      await gridFs.deleteFile(req.params.fileName);
      res.send('OK');
    })

    const httpServer = createServer(app);
    const PORT = process.env.PORT || process.env.API_PORT || 8081;
    httpServer.listen({ port: PORT }, () => console.log(`httpServer ready at port ${PORT}`));
  } catch (e) {
    console.error(e);
  }
}

main().then(() => console.log('...'));
