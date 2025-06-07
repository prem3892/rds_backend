import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { AgentsService } from '../agents/agents.service';
import { UserRole } from '../shared/constants/enums';
import { Types } from 'mongoose';

/**
 * Migration script to create agent profiles for existing admin users
 * who don't have agent profiles yet.
 *
 * Run this script after deploying the code changes to ensure all
 * existing admin users have agent profiles.
 */
async function migrateAdminAgentProfiles() {
  console.log('Starting migration: Creating agent profiles for admin users...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const agentsService = app.get(AgentsService);

  try {
    // Find all admin users
    const allUsers = await usersService.findAll();
    const adminUsers = allUsers.filter((user) => user.role === UserRole.ADMIN);

    console.log(`Found ${adminUsers.length} admin users`);

    let createdProfiles = 0;
    let existingProfiles = 0;
    let errors = 0;

    for (const adminUser of adminUsers) {
      try {
        // Ensure userId is a proper ObjectId
        const userId = new Types.ObjectId(adminUser._id);

        // Check if agent profile already exists
        const existingProfile =
          await agentsService.findAgentProfileByUserId(userId);

        if (existingProfile) {
          console.log(
            `Admin user ${adminUser.email} already has an agent profile`,
          );
          existingProfiles++;
        } else {
          // Create agent profile for admin user
          await agentsService.createAgentProfile(userId, userId, {
            // Set default values for admin agent profiles
            domainAccess: ['*'], // Admins have access to all domains by default
            maxConcurrentChats: 10, // Higher limit for admins
            isOnline: false, // Default to offline
          });
          console.log(
            `Created agent profile for admin user: ${adminUser.email}`,
          );
          createdProfiles++;
        }
      } catch (error) {
        console.error(
          `Error processing admin user ${adminUser.email}:`,
          error.message,
        );
        errors++;
      }
    }

    console.log('\nMigration completed!');
    console.log(`- Created profiles: ${createdProfiles}`);
    console.log(`- Existing profiles: ${existingProfiles}`);
    console.log(`- Errors: ${errors}`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await app.close();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateAdminAgentProfiles()
    .then(() => {
      console.log('Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateAdminAgentProfiles };
