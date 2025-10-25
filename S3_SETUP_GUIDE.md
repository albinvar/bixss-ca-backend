# S3 Storage Setup Guide

## Overview
The system now supports both **local file storage** (development) and **AWS S3 storage** (production) via environment variables.

## Environment Configuration

### Node.js Backend (.env)
```bash
# Storage Configuration
STORAGE_TYPE=local  # Set to 's3' for production
LOCAL_UPLOAD_PATH=./uploads

# AWS S3 Configuration (only needed if STORAGE_TYPE=s3)
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Python Microservice (.env)
```bash
# Storage Mode
STORAGE_MODE=local  # Set to 's3' for production
```

## Required NPM Packages (Node.js)
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## How It Works

### Local Mode (Development)
1. User uploads file → Node.js saves to `./uploads/documents/`
2. Node.js sends file path to Python microservice
3. Python reads file from local path
4. Analysis proceeds normally

### S3 Mode (Production)
1. User uploads file → Node.js uploads to S3 bucket
2. Node.js generates presigned URL (temporary, 1-hour expiry)
3. Node.js sends presigned URL to Python microservice
4. Python downloads from presigned URL temporarily
5. Python processes file and deletes local copy
6. File remains in S3 permanently

## Benefits of Presigned URLs
✅ **No AWS credentials in Python** - Secure temporary access
✅ **Works on any cloud platform** - Python doesn't need S3 SDK
✅ **Automatic cleanup** - URLs expire after 1 hour
✅ **Simple implementation** - Python just downloads HTTP URL

## Files Modified

###Node.js Backend:
- ✅ `src/services/s3Service.js` - Created
- ✅ `src/config/config.js` - Added storage config
- ✅ `src/controllers/document.controller.js` - Updated to use S3Service
- ✅ `src/models/Document.js` - Added S3 fields
- ✅ `.env` - Added storage variables

### Python Microservice:
- ✅ `src/api/analysis.py` - Accept presigned URL parameter via `file_urls`
- ✅ `src/config.py` - Added STORAGE_MODE config
- ✅ `.env` - Added STORAGE_MODE variable
- ✅ `.env.example` - Created with all config variables

### Documentation:
- ✅ This guide created
- ✅ `IMPLEMENTATION_GUIDE.md` - S3 setup instructions added

## Next Steps

1. **Install AWS SDK** in Node.js backend:
   ```bash
   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   ```

2. **Install httpx** in Python microservice (for downloading from presigned URLs):
   ```bash
   cd /path/to/financial-analysis-microservice
   source myenv/bin/activate  # or your venv name
   pip install httpx
   ```

3. **Test local mode** (current setup):
   - Ensure `STORAGE_TYPE=local` in Node.js `.env`
   - Ensure `STORAGE_MODE=local` in Python `.env`
   - Upload documents and trigger analysis

4. **Test S3 mode** (when ready for production):
   - Set up AWS S3 bucket and IAM user (see below)
   - Update `.env` files with S3 credentials
   - Change `STORAGE_TYPE=s3` in Node.js
   - Change `STORAGE_MODE=s3` in Python (optional, presigned URLs work without this)
   - Test upload and analysis flow

5. **Deploy to production** with `STORAGE_TYPE=s3`

## AWS S3 Setup (Production)

1. **Create S3 Bucket**:
   - Go to AWS S3 Console
   - Create bucket with appropriate name
   - Enable versioning (optional)
   - Block public access (keep files private)

2. **Create IAM User**:
   - Create IAM user for application
   - Attach policy with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` permissions
   - Generate access keys
   - Add keys to `.env`

3. **Set Environment Variables**:
   ```bash
   STORAGE_TYPE=s3
   AWS_S3_BUCKET_NAME=your-bucket-name
   AWS_S3_REGION=us-east-1
   AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
   AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

## Security Notes
- ⚠️ Never commit AWS credentials to version control
- ⚠️ Use environment variables only
- ⚠️ Presigned URLs expire after 1 hour (configurable)
- ⚠️ S3 bucket should have private access only
- ✅ Python doesn't need AWS credentials (uses presigned URLs)
