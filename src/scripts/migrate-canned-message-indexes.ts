/**
 * Migration script to update canned message indexes
 * This script removes the old global unique index on title and creates a new compound unique index on title + adminId
 */

import { MongoClient, Db, Collection, IndexDescriptionInfo } from 'mongodb';

async function migrateCannedMessageIndexes(): Promise<void> {
  const mongoUrl =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/nestjs_chat_app';
  const client = new MongoClient(mongoUrl);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db: Db = client.db();
    const collection: Collection = db.collection('cannedmessages');

    // Check if the collection exists and has indexes
    let indexes: IndexDescriptionInfo[] = [];
    try {
      indexes = await collection.indexes();
    } catch (error: any) {
      if (error.code === 26) {
        // NamespaceNotFound
        console.log('Collection does not exist yet, skipping index operations');
        console.log('✅ Migration completed - no existing indexes to migrate');
        return;
      }
      throw error;
    }

    const oldTitleIndex = indexes.find(
      (index: IndexDescriptionInfo) =>
        index.key &&
        index.key.title === 1 &&
        index.unique === true &&
        !index.key.adminId,
    );

    if (oldTitleIndex) {
      console.log('Dropping old unique index on title field...');
      await collection.dropIndex(oldTitleIndex.name || 'title_1');
      console.log('Old index dropped successfully');
    } else {
      console.log('Old unique index on title not found, skipping drop');
    }

    // Check if the compound index already exists
    const existingCompoundIndex = indexes.find(
      (index: IndexDescriptionInfo) =>
        index.key &&
        index.key.title === 1 &&
        index.key.adminId === 1 &&
        index.unique === true,
    );

    if (existingCompoundIndex) {
      console.log(
        'Compound unique index on title + adminId already exists:',
        existingCompoundIndex.name,
      );
    } else {
      // Create the new compound unique index
      console.log('Creating new compound unique index on title + adminId...');
      await collection.createIndex(
        { title: 1, adminId: 1 },
        { unique: true, name: 'title_adminId_unique' },
      );
      console.log('New compound unique index created successfully');
    }

    // Verify the new index exists
    const newIndexes: IndexDescriptionInfo[] = await collection.indexes();
    const newCompoundIndex = newIndexes.find(
      (index: IndexDescriptionInfo) =>
        index.key &&
        index.key.title === 1 &&
        index.key.adminId === 1 &&
        index.unique === true,
    );

    if (newCompoundIndex) {
      console.log('✅ Migration completed successfully');
      console.log('New index details:', newCompoundIndex);
    } else {
      console.error('❌ Migration failed - new index not found');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the migration
migrateCannedMessageIndexes()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error: Error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
