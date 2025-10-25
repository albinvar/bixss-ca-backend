const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../config/config');
const fs = require('fs');
const path = require('path');

class S3Service {
  constructor() {
    this.isProduction = config.storage.type === 's3';

    if (this.isProduction) {
      this.s3Client = new S3Client({
        region: config.storage.s3Region,
        credentials: {
          accessKeyId: config.storage.s3AccessKeyId,
          secretAccessKey: config.storage.s3SecretAccessKey,
        },
      });
      this.bucket = config.storage.s3BucketName;
    }

    this.localUploadDir = config.storage.localPath || './uploads';
  }

  /**
   * Upload a file to S3 or local storage based on environment
   */
  async uploadFile(file, folder = 'documents') {
    if (this.isProduction) {
      return await this._uploadToS3(file, folder);
    } else {
      return await this._uploadLocal(file, folder);
    }
  }

  /**
   * Upload file to S3
   */
  async _uploadToS3(file, folder) {
    const key = `${folder}/${Date.now()}-${file.originalname}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
        uploadDate: new Date().toISOString(),
      },
    });

    await this.s3Client.send(command);

    return {
      storage: 's3',
      bucket: this.bucket,
      key: key,
      url: `https://${this.bucket}.s3.${config.storage.s3Region}.amazonaws.com/${key}`,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  /**
   * Upload file to local storage
   */
  async _uploadLocal(file, folder) {
    const uploadPath = path.join(this.localUploadDir, folder);

    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const filename = `${Date.now()}-${file.originalname}`;
    const filepath = path.join(uploadPath, filename);

    // Write file to disk
    fs.writeFileSync(filepath, file.buffer);

    return {
      storage: 'local',
      path: filepath,
      relativePath: `${folder}/${filename}`,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  /**
   * Get presigned URL for S3 file (valid for 1 hour)
   * Or return local file path
   */
  async getFileUrl(fileInfo, expiresIn = 3600) {
    if (fileInfo.storage === 's3') {
      const command = new GetObjectCommand({
        Bucket: fileInfo.bucket,
        Key: fileInfo.key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } else {
      // For local files, return the absolute path
      return fileInfo.path;
    }
  }

  /**
   * Delete a file from S3 or local storage
   */
  async deleteFile(fileInfo) {
    if (fileInfo.storage === 's3') {
      const command = new DeleteObjectCommand({
        Bucket: fileInfo.bucket,
        Key: fileInfo.key,
      });

      await this.s3Client.send(command);
    } else {
      // Delete local file
      if (fs.existsSync(fileInfo.path)) {
        fs.unlinkSync(fileInfo.path);
      }
    }
  }

  /**
   * Check if using S3 or local storage
   */
  isUsingS3() {
    return this.isProduction;
  }
}

module.exports = new S3Service();
