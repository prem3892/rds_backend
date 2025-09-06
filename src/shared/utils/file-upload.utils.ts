import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * File upload utility functions
 */

// Allowed image file extensions for profile pictures
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];

// Maximum file size for profile pictures (5MB)
export const MAX_PROFILE_PICTURE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

/**
 * Generate a unique filename for uploaded profile pictures
 * Format: {userId}-{uuid}.{extension}
 */
export function generateProfilePictureFilename(
  userId: string,
  originalFilename: string,
): string {
  const fileExtension = extname(originalFilename).toLowerCase();
  const uniqueId = uuidv4();
  return `${userId}-${uniqueId}${fileExtension}`;
}

/**
 * Validate profile picture file
 */
export function validateProfilePictureFile(file: any): void {
  if (!file) {
    throw new BadRequestException('No file provided');
  }

  // Check file size
  if (file.size > MAX_PROFILE_PICTURE_SIZE) {
    throw new BadRequestException(
      `File size too large. Maximum allowed size is ${MAX_PROFILE_PICTURE_SIZE / (1024 * 1024)}MB`,
    );
  }

  // Check file extension
  const fileExtension = extname(file.originalname).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(fileExtension)) {
    throw new BadRequestException(
      `Invalid file type. Allowed types: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`,
    );
  }

  // Check MIME type as additional validation
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
  ];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new BadRequestException(
      `Invalid MIME type. Allowed types: ${allowedMimeTypes.join(', ')}`,
    );
  }
}

/**
 * Get the upload directory path for profile pictures
 */
export function getProfilePictureUploadPath(): string {
  return 'uploads/profile-pictures';
}

/**
 * Generate the public URL for a profile picture
 */
export function getProfilePictureUrl(filename: string): string {
  return `/uploads/profile-pictures/${filename}`;
}
