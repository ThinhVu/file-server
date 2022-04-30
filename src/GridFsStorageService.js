const path = require('path');
const {v4} = require("uuid");
const {GridFSBucket} = require('mongodb');
const _ = require('lodash');

class GridFsStorageService {
  constructor(options) {
    this.fileCollectionName = `${options.bucket}.files`;
    this.db = options.db;
    this.bucket = new GridFSBucket(this.db, {
      bucketName: options.bucket,
      chunkSizeBytes: 1024 * 128 /*128 kb*/
    });
  }

  createFile(file) {
    return new Promise((resolve, reject) => {
      try {
        const uploadStreamOpts = { contentType: file.mimeType };
        const {ext, name} = path.parse(file.originalname);
        const generatedFileName = `${v4()}-${_.snakeCase(name)}${ext || 'unknown'}`;
        const uploadStream = this.bucket.openUploadStream(generatedFileName, uploadStreamOpts)
        uploadStream.once('error', (e) => reject(e));
        uploadStream.once('finish', uploadedFile => resolve(uploadedFile));
        file.stream.pipe(uploadStream);
      } catch (e) {
        reject(e);
      }
    })
  }

  async getFile(fileName) {
    return this.bucket.openDownloadStreamByName(fileName);
  }

  async getEtag(fileName) {
    const fileInfo = await this.db.collection(this.fileCollectionName).findOne({ filename: fileName })
    return fileInfo.md5
  }

  async deleteFile(fileName) {
    const fileInfo = await this.db.collection(this.fileCollectionName).findOne({ filename: fileName });
    return this.bucket.delete(fileInfo._id);
  }
}

module.exports = GridFsStorageService
