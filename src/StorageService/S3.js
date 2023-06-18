const AWS = require('aws-sdk');
const path = require('path');
const _ = require('lodash');

class S3 {
  constructor(s3Config) {
    const {credentialConfig, storageConfig} = s3Config;
    const {accessKeyId, secretAccessKey, region, endpoint} = credentialConfig;
    if (!accessKeyId || !secretAccessKey)
      throw new Error('AWS S3 credential config is not valid');
    this.storageConfig = storageConfig;
    if (this.storageConfig.pullZone) {
      if (!this.storageConfig.pullZone.endsWith('/'))
        this.storageConfig.pullZone += '/'
    }
    this.s3 = new AWS.S3({
      accessKeyId,
      secretAccessKey,
      region,
      endpoint,
      useAccelerateEndpoint: false,
      s3ForcePathStyle: true,
      apiVersion: '2006-03-01',
      // signatureVersion: 'v4', // cloudflare https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js/#generate-presigned-urls
    });
  }
  getUploadForm(originalname, mimeType) {
    return new Promise((resolve, reject) => {
      const ext = path.extname(originalname);
      const fileName = `${Date.now()}-${_.random(1000, 9999, false)}`;
      const fullFileName = `${fileName}${ext}`

      const params = {
        Bucket: this.storageConfig.bucket,
        Expires: this.storageConfig.expiryTime,
        Fields: {
          Key: fullFileName,
          'Content-Type': mimeType
        }
      }

      this.s3.createPresignedPost(params, (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
  }
  async getEtag(file) {
    const {generatedFileName} = file;
    const {bucket, uploadFolder} = this.storageConfig;
    return new Promise((resolve, reject) => {
      this.s3.headObject({
        Bucket: bucket,
        Key: `${uploadFolder}/${generatedFileName}`,
      }, async (err, data) => err ? reject(err) : resolve(data.ETag))
    });
  }
  deleteFile(file) {
    const {generatedFileName} = file;
    const {bucket, uploadFolder} = this.storageConfig;
    return new Promise((resolve, reject) => {
      this.s3.deleteObject({
        Bucket: bucket,
        Key: `${uploadFolder}/${generatedFileName}`,
      }, async (err, data) => err ? reject(err) : resolve(data))
    });
  }
}

module.exports = S3;
