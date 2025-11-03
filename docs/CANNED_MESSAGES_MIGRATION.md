# Canned Messages Migration - Title Uniqueness Change

## Overview

This migration changes the uniqueness constraint for canned message titles from global uniqueness to admin-scoped uniqueness. Previously, canned message titles had to be unique across the entire database. Now, titles only need to be unique within each admin's scope.

## Changes Made

### 1. Schema Changes (`src/schemas/canned-message.schema.ts`)

- **Removed**: Global unique constraint on the `title` field
- **Added**: Compound unique index on `title` + `adminId` fields

```typescript
// Before
@Prop({ required: true, trim: true, unique: true })
title: string;

// After
@Prop({ required: true, trim: true })
title: string;

// Index change
// Before
CannedMessageSchema.index({ title: 1 }, { unique: true });

// After
CannedMessageSchema.index({ title: 1, adminId: 1 }, { unique: true });
```

### 2. Service Changes (`src/agents/agents.service.ts`)

- **Updated**: Error handling in `createCannedMessage()` and `updateCannedMessage()` methods
- **Changed**: Error messages to reflect admin-scoped uniqueness

```typescript
// Updated error message
`A canned message with the title "${title}" already exists for this admin. Please choose a different title.`;
```

## Migration Process

### Automatic Migration (Recommended)

Run the migration script to handle the database index changes:

```bash
npm run migrate:canned-message-indexes
```

This script will:

1. Connect to your MongoDB database
2. Drop the old global unique index on `title`
3. Create the new compound unique index on `title` + `adminId`
4. Verify the migration was successful

### Manual Migration (Alternative)

If you prefer to run the migration manually using MongoDB shell:

```javascript
// Connect to your MongoDB instance
use your_database_name

// Drop the old index
db.cannedmessages.dropIndex({ title: 1 })

// Create the new compound unique index
db.cannedmessages.createIndex({ title: 1, adminId: 1 }, { unique: true })

// Verify the new index
db.cannedmessages.getIndexes()
```

## Impact

### Before Migration

- ❌ Two different admins could not have canned messages with the same title
- ❌ Global title conflicts across all admins

### After Migration

- ✅ Each admin can have their own canned messages with any title
- ✅ Titles only need to be unique within each admin's scope
- ✅ Different admins can have canned messages with identical titles

## Example Scenarios

### Scenario 1: Multiple Admins with Same Title

```
Admin A: "Welcome Message" ✅ Allowed
Admin B: "Welcome Message" ✅ Allowed (different admin)
Admin A: "Welcome Message" ❌ Duplicate within Admin A's scope
```

### Scenario 2: Agent Creating Messages

```
Agent under Admin A: "Greeting" ✅ Allowed
Agent under Admin B: "Greeting" ✅ Allowed (different admin scope)
Another Agent under Admin A: "Greeting" ❌ Duplicate within Admin A's scope
```

## Testing

After migration, test the following scenarios:

1. **Create canned message with existing title in same admin scope** - Should fail
2. **Create canned message with existing title in different admin scope** - Should succeed
3. **Update canned message to existing title in same admin scope** - Should fail
4. **Update canned message to existing title in different admin scope** - Should succeed

## Rollback

If you need to rollback this change:

1. Revert the schema changes
2. Drop the compound index: `db.cannedmessages.dropIndex({ title: 1, adminId: 1 })`
3. Create the global unique index: `db.cannedmessages.createIndex({ title: 1 }, { unique: true })`
4. Revert the service error handling changes

**Note**: Rollback may fail if there are duplicate titles across different admins in the database.
