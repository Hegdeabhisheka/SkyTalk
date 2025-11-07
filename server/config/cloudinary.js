import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure storage for images
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'skytalk/images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
  }
});

// Configure storage for files
const fileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'skytalk/files',
    resource_type: 'auto'
  }
});

// Create multer instances
export const uploadImage = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for images
  }
});

export const uploadFile = multer({
  storage: fileStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for files
  }
});

export default cloudinary;
