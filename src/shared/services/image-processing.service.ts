import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import * as sharp from 'sharp';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Image Processing Service
 * Handles image conversion, optimization, and resizing operations
 */
@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  // Configuration constants
  private readonly PROFILE_PICTURE_WIDTH = 400;
  private readonly PROFILE_PICTURE_HEIGHT = 400;
  private readonly WEBP_QUALITY = 85; // Balance between quality and file size
  private readonly THUMBNAIL_SIZE = 150;

  /**
   * Convert an uploaded image to WebP format with optimization
   * @param inputPath - Path to the original uploaded file
   * @param outputPath - Path where the WebP file should be saved
   * @param options - Optional configuration for conversion
   * @returns Promise<string> - Path to the converted WebP file
   */
  async convertToWebP(
    inputPath: string,
    outputPath: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    },
  ): Promise<string> {
    try {
      this.logger.log(
        `Converting image to WebP: ${inputPath} -> ${outputPath}`,
      );

      // Verify input file exists
      if (!existsSync(inputPath)) {
        throw new Error(`Input file not found: ${inputPath}`);
      }

      const width = options?.width || this.PROFILE_PICTURE_WIDTH;
      const height = options?.height || this.PROFILE_PICTURE_HEIGHT;
      const quality = options?.quality || this.WEBP_QUALITY;
      const fit = options?.fit || 'cover';

      // Process image with sharp
      await sharp(inputPath)
        .resize(width, height, {
          fit,
          position: 'center',
          withoutEnlargement: false, // Allow upscaling if needed
        })
        .webp({
          quality,
          effort: 4, // Compression effort (0-6, higher = better compression but slower)
        })
        .toFile(outputPath);

      this.logger.log(`Successfully converted image to WebP: ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.logger.error(
        `Failed to convert image to WebP: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to process image: ${error.message}`,
      );
    }
  }

  /**
   * Convert profile picture to WebP and clean up original file
   * @param originalFilePath - Full path to the original uploaded file
   * @param userId - User ID for generating the output filename
   * @returns Promise<string> - Filename of the converted WebP file
   */
  async processProfilePicture(
    originalFilePath: string,
    userId: string,
  ): Promise<string> {
    try {
      this.logger.log(`Processing profile picture for user: ${userId}`);

      // Generate WebP filename
      const webpFilename = this.generateWebPFilename(userId);
      const uploadDir = join(process.cwd(), 'uploads', 'profile-pictures');
      const webpFilePath = join(uploadDir, webpFilename);

      // Convert to WebP
      await this.convertToWebP(originalFilePath, webpFilePath, {
        width: this.PROFILE_PICTURE_WIDTH,
        height: this.PROFILE_PICTURE_HEIGHT,
        quality: this.WEBP_QUALITY,
        fit: 'cover',
      });

      // Clean up original file
      await this.deleteFile(originalFilePath);

      this.logger.log(
        `Profile picture processed successfully: ${webpFilename}`,
      );
      return webpFilename;
    } catch (error) {
      this.logger.error(
        `Failed to process profile picture: ${error.message}`,
        error.stack,
      );
      // Clean up original file even if processing failed
      await this.deleteFile(originalFilePath).catch(() => {
        // Ignore cleanup errors
      });
      throw error;
    }
  }

  /**
   * Generate a unique WebP filename for profile pictures
   * @param userId - User ID
   * @returns string - Filename with .webp extension
   */
  private generateWebPFilename(userId: string): string {
    const timestamp = Date.now();
    return `${userId}-${timestamp}.webp`;
  }

  /**
   * Delete a file from the filesystem
   * @param filePath - Full path to the file to delete
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      if (existsSync(filePath)) {
        await unlink(filePath);
        this.logger.log(`Deleted file: ${filePath}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to delete file ${filePath}: ${error.message}`);
      // Don't throw error for cleanup failures
    }
  }

  /**
   * Delete old profile picture when a new one is uploaded
   * @param filename - Filename of the old profile picture
   */
  async deleteOldProfilePicture(filename: string): Promise<void> {
    if (!filename) return;

    try {
      const uploadDir = join(process.cwd(), 'uploads', 'profile-pictures');
      const filePath = join(uploadDir, filename);
      await this.deleteFile(filePath);
    } catch (error) {
      this.logger.warn(
        `Failed to delete old profile picture ${filename}: ${error.message}`,
      );
    }
  }

  /**
   * Get image metadata
   * @param filePath - Path to the image file
   * @returns Promise<sharp.Metadata> - Image metadata
   */
  async getImageMetadata(filePath: string): Promise<sharp.Metadata> {
    try {
      return await sharp(filePath).metadata();
    } catch (error) {
      this.logger.error(`Failed to get image metadata: ${error.message}`);
      throw new InternalServerErrorException('Failed to read image metadata');
    }
  }

  /**
   * Validate image file (check if it's a valid image)
   * @param filePath - Path to the image file
   * @returns Promise<boolean> - True if valid image
   */
  async validateImage(filePath: string): Promise<boolean> {
    try {
      await sharp(filePath).metadata();
      return true;
    } catch (error) {
      this.logger.warn(`Invalid image file: ${filePath}`);
      return false;
    }
  }

  /**
   * Create a thumbnail version of an image
   * @param inputPath - Path to the original image
   * @param outputPath - Path where the thumbnail should be saved
   * @param size - Thumbnail size (default: 150x150)
   */
  async createThumbnail(
    inputPath: string,
    outputPath: string,
    size: number = this.THUMBNAIL_SIZE,
  ): Promise<string> {
    try {
      await sharp(inputPath)
        .resize(size, size, {
          fit: 'cover',
          position: 'center',
        })
        .webp({
          quality: this.WEBP_QUALITY,
        })
        .toFile(outputPath);

      this.logger.log(`Thumbnail created: ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.logger.error(`Failed to create thumbnail: ${error.message}`);
      throw new InternalServerErrorException('Failed to create thumbnail');
    }
  }
}
