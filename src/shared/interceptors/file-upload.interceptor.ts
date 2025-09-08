import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import {
  validateProfilePictureFile,
  generateProfilePictureFilename,
  getProfilePictureUploadPath,
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
