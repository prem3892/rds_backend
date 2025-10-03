import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ImageProcessingService } from '../shared/services/image-processing.service';
import { AgentsService } from '../agents/agents.service';
import { Logger } from '@nestjs/common';
import { join } from 'path';
import { existsSync } from 'fs';
import { getProfilePictureUrl } from '../shared/utils/file-upload.utils';

/**
 * Migration Script: Convert existing profile pictures to WebP format
 *
 * This script:
 * 1. Finds all agents with profile pictures
 * 2. Converts non-WebP images to WebP format
 * 3. Updates the database with new WebP URLs
 * 4. Deletes old image files
 *
 * Usage: npm run migrate:profile-pictures-to-webp
 */

async function migrateProfilePicturesToWebP() {
  const logger = new Logger('ProfilePictureWebPMigration');

  logger.log('Starting profile picture WebP migration...');

  // Create NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const imageProcessingService = app.get(ImageProcessingService);
    const agentsService = app.get(AgentsService);

    // Get all agent profiles
    const agents = await agentsService.getAllAgentProfiles();
    logger.log(`Found ${agents.length} agent profiles`);

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: Array<{ agentId: string; error: string }> = [];

    for (const agent of agents) {
      const agentIdStr = (agent._id as any).toString();
      try {
        // Skip if no profile picture
        if (!agent.profilePicture) {
          logger.debug(`Agent ${agentIdStr}: No profile picture, skipping`);
          skippedCount++;
          continue;
        }

        // Check if already WebP
        if (agent.profilePicture.endsWith('.webp')) {
          logger.debug(`Agent ${agentIdStr}: Already WebP format, skipping`);
          skippedCount++;
          continue;
        }

        // Extract filename from URL
        const filename = agent.profilePicture.split('/').pop();
        if (!filename) {
          logger.warn(`Agent ${agentIdStr}: Invalid profile picture URL`);
          skippedCount++;
          continue;
        }

        // Build full path to the image file
        const uploadDir = join(process.cwd(), 'uploads', 'profile-pictures');
        const oldFilePath = join(uploadDir, filename);

        // Check if file exists
        if (!existsSync(oldFilePath)) {
          logger.warn(`Agent ${agentIdStr}: File not found: ${oldFilePath}`);
          skippedCount++;
          continue;
        }

        logger.log(`Agent ${agentIdStr}: Converting ${filename} to WebP...`);

        // Process the image (convert to WebP)
        const webpFilename = await imageProcessingService.processProfilePicture(
          oldFilePath,
          agent.userId.toString(),
        );

        // Generate new URL
        const newProfilePictureUrl = getProfilePictureUrl(webpFilename);

        // Update agent profile in database
        await agentsService.updateAgentProfileById(agentIdStr, {
          profilePicture: newProfilePictureUrl,
        });

        logger.log(
          `Agent ${agentIdStr}: Successfully converted to ${webpFilename}`,
        );
        processedCount++;
      } catch (error) {
        logger.error(
          `Agent ${agentIdStr}: Failed to convert profile picture: ${error.message}`,
        );
        errorCount++;
        errors.push({
          agentId: agentIdStr,
          error: error.message,
        });
      }
    }

    // Summary
    logger.log('='.repeat(60));
    logger.log('Migration Summary:');
    logger.log(`Total agents: ${agents.length}`);
    logger.log(`Successfully converted: ${processedCount}`);
    logger.log(`Skipped: ${skippedCount}`);
    logger.log(`Errors: ${errorCount}`);
    logger.log('='.repeat(60));

    if (errors.length > 0) {
      logger.log('Errors encountered:');
      errors.forEach(({ agentId, error }) => {
        logger.log(`  - Agent ${agentId}: ${error}`);
      });
    }

    logger.log('Profile picture WebP migration completed!');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run the migration
migrateProfilePicturesToWebP()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
