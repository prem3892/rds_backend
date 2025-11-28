import { BadRequestException, Logger } from '@nestjs/common';
import { diskStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  validateProfilePictureFile,
  generateProfilePictureFilename,
  getProfilePictureUploadPath,
  validateChatImageFile,
  generateChatImageFilename,
  getChatImageUploadPath,
} from '../utils/file-upload.utils';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

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
          const userId = (req as any).user?.sub || 'anonymous';
          const filename = generateProfilePictureFilename(
            userId,
            file.originalname,
          );
          callback(null, filename);
        } catch (error) {
          callback(error, '');
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
          callback(error, '');
        }
      },
      filename: (req, file, callback) => {
        try {
          validateChatImageFile(file);
          // Generate a temporary filename, we'll handle the actual naming in the controller
          const filename = generateChatImageFilename('temp', file.originalname);
          callback(null, filename);
        } catch (error) {
          callback(error, '');
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

/**
 * Factory function to create CSV upload interceptor for canned messages
 * Usage: @UseInterceptors(createCsvUploadInterceptor())
 */
export function createCsvUploadInterceptor() {
  const uploadPath = join(process.cwd(), 'uploads', 'csv-uploads');

  // Create upload directory if it doesn't exist
  if (!existsSync(uploadPath)) {
    mkdirSync(uploadPath, { recursive: true });
  }

  return FileInterceptor('file', {
    storage: diskStorage({
      destination: uploadPath,
      filename: (req, file, callback) => {
        try {
          validateCsvFile(file);
          const user = req.user as JwtPayload;
          const userId = user?.sub || 'anonymous';
          const timestamp = Date.now();
          const filename = `canned-messages-${userId}-${timestamp}.csv`;
          callback(null, filename);
        } catch (error) {
          callback(error, '');
        }
      },
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, callback) => {
      try {
        validateCsvFile(file);
        callback(null, true);
      } catch (error) {
        callback(error, false);
      }
    },
  });
}

/**
 * Validate CSV file
 */
function validateCsvFile(file: any): void {
  if (!file) {
    throw new BadRequestException('No file provided');
  }

  // Check file type
  const allowedMimeTypes = [
    'text/csv',
    'application/csv',
    'text/plain',
    'application/vnd.ms-excel',
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new BadRequestException(
      'Invalid file type. Only CSV files are allowed.',
    );
  }

  // Check file extension
  const allowedExtensions = ['.csv'];
  const fileExtension = file.originalname
    .toLowerCase()
    .substring(file.originalname.lastIndexOf('.'));

  if (!allowedExtensions.includes(fileExtension)) {
    throw new BadRequestException(
      'Invalid file extension. Only .csv files are allowed.',
    );
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new BadRequestException(
      'File size too large. Maximum allowed size is 10MB.',
    );
  }
}

/**
 * Factory function to create Excel upload interceptor for canned messages
 * Usage: @UseInterceptors(createExcelUploadInterceptor())
 */
export function createExcelUploadInterceptor() {
  const uploadPath = join(process.cwd(), 'uploads', 'excel-uploads');

  // Create upload directory if it doesn't exist
  if (!existsSync(uploadPath)) {
    mkdirSync(uploadPath, { recursive: true });
  }

  return FileInterceptor('file', {
    storage: diskStorage({
      destination: uploadPath,
      filename: (req, file, callback) => {
        try {
          validateExcelFile(file);
          const user = req.user as JwtPayload;
          const userId = user?.sub || 'anonymous';
          const timestamp = Date.now();
          const filename = `canned-messages-${userId}-${timestamp}.xlsx`;
          callback(null, filename);
        } catch (error) {
          callback(error, '');
        }
      },
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, callback) => {
      try {
        validateExcelFile(file);
        callback(null, true);
      } catch (error) {
        callback(error, false);
      }
    },
  });
}

/**
 * Validate Excel file
 */
function validateExcelFile(file: any): void {
  if (!file) {
    throw new BadRequestException('No file provided');
  }

  // Check file type
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/excel',
    'application/x-excel',
    'application/x-msexcel',
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new BadRequestException(
      'Invalid file type. Only Excel files (.xlsx, .xls) are allowed.',
    );
  }

  // Check file extension
  const allowedExtensions = ['.xlsx', '.xls'];
  const fileExtension = file.originalname
    .toLowerCase()
    .substring(file.originalname.lastIndexOf('.'));

  if (!allowedExtensions.includes(fileExtension)) {
    throw new BadRequestException(
      'Invalid file extension. Only .xlsx and .xls files are allowed.',
    );
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new BadRequestException(
      'File size too large. Maximum allowed size is 10MB.',
    );
  }
}
