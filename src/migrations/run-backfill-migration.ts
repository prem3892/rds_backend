import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BackfillChatSessionSourceMigration } from './backfill-chat-session-source.migration';

async function runMigration() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const migration = app.get(BackfillChatSessionSourceMigration);

  try {
    await migration.run();
    console.log('✓ Migration completed successfully');
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runMigration();
