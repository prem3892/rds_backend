import { BadRequestException, Logger } from '@nestjs/common';
import { diskStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import {
  validateProfilePictureFile,
  generateProfilePictureFilename,
  getProfilePictureUploadPath,
  validateChatImageFile,
  generateChatImageFilename,
  getChatImageUploadPath,
} from '../utils/file-upload.utils';

/**
 * Factory function to create profile picture upload interceptor
 * Usage: @UseInterceptors(createProfilePictureUploadInterceptor())
 */
export function createProfilePictureUploadInterceptor() {
  const uploadPath = getProfilePictureUploadPath();

  // Create upload directory if it doesn't exist
  if (!existsSync(uploadPath)) {
    mkdirSync(uploadPath, { recursive: true });
  }

  return FileInterceptor('profilePicture', {
    storage: diskStorage({
      destination: uploadPath,
      filename: (req, file, callback) => {
        try {
          validateProfilePictureFile(file);
          const userId = req.user?.sub || 'anonymous';
          const filename = generateProfilePictureFilename(
            userId,
            file.originalname,
          );
          callback(null, filename);
        } catch (error) {
          callback(error, null);
        }
      },
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, callback) => {
      try {
        validateProfilePictureFile(file);
        callback(null, true);
      } catch (error) {
        callback(error, false);
      }
    },
  });
}

/**
 * Factory function to create chat image upload interceptor
 * Usage: @UseInterceptors(createChatImageUploadInterceptor())
 */
export function createChatImageUploadInterceptor() {
  return FileInterceptor('image', {
    storage: diskStorage({
      destination: (req, file, callback) => {
        try {
          // For multipart form data, we need to handle the case where chatSessionId
          // might not be available yet in req.body. We'll use a default path
          // and handle the actual validation in the controller
          const uploadPath = getChatImageUploadPath('temp');

          // Create upload directory if it doesn't exist
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }

          callback(null, uploadPath);
        } catch (error) {
          callback(error, null);
        }
      },
      filename: (req, file, callback) => {
        try {
          validateChatImageFile(file);
          // Generate a temporary filename, we'll handle the actual naming in the controller
          const filename = generateChatImageFilename('temp', file.originalname);
          callback(null, filename);
        } catch (error) {
          callback(error, null);
        }
      },
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, callback) => {
      try {
        validateChatImageFile(file);
        callback(null, true);
      } catch (error) {
        callback(error, false);
      }
    },
  });
}
