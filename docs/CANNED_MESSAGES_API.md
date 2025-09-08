# Canned Messages API Documentation

## Overview

The Canned Messages API allows agents and admins to create, manage, and retrieve pre-written message templates that can be used during chat conversations. Messages can be personal (visible only to the creator) or global (visible to all agents under the same admin).

## Base URL

```
/agents/canned-messages
```

## Authentication

All endpoints require JWT authentication with `AGENT` or `ADMIN` role.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

---

## Endpoints

### 1. Create Canned Message

**POST** `/agents/canned-messages`

Creates a new canned message.

**Request Body:**

```json
{
  "title": "Welcome Message",
  "content": "Hello! Welcome to our support chat. How can I help you today?",
  "isGlobal": false,
  "departmentIds": ["64f1a2b3c4d5e6f7g8h9i0j1"],
  "tags": ["greeting", "welcome"]
}
```

**Request Body Schema:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Short title/name for the message (1-100 chars) |
| `content` | string | Yes | The actual message content (1-2000 chars) |
| `isGlobal` | boolean | No | Whether message is visible to all agents under same admin (default: false) |
| `departmentIds` | string[] | No | Array of department IDs to restrict message to specific departments |
| `tags` | string[] | No | Array of tags for categorization (automatically converted to lowercase) |

**Response:**

```json
{
  "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
  "title": "Welcome Message",
  "content": "Hello! Welcome to our support chat. How can I help you today?",
  "agentId": "64f1a2b3c4d5e6f7g8h9i0j2",
  "adminId": "64f1a2b3c4d5e6f7g8h9i0j3",
  "isGlobal": false,
  "departmentIds": ["64f1a2b3c4d5e6f7g8h9i0j1"],
  "tags": ["greeting", "welcome"],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

### 2. Get Canned Messages (with Pagination & Filtering)

**GET** `/agents/canned-messages`

Retrieves canned messages with pagination and filtering options.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Text search in title and content |
| `tags` | string | No | Comma-separated list of tags to filter by |
| `departmentIds` | string | No | Comma-separated list of department IDs |
| `isGlobal` | boolean | No | Filter by global/personal messages |
| `myMessages` | boolean | No | Show only user's own messages (ignores global filter) |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 10, max: 100) |
| `sortBy` | string | No | Field to sort by (default: 'createdAt') |
| `sortOrder` | string | No | Sort order: 'asc' or 'desc' (default: 'desc') |

**Example Request:**

```
GET /agents/canned-messages?page=1&limit=10&tags=greeting,welcome&isGlobal=true&search=hello
```

**Response:**

```json
{
  "data": [
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "title": "Welcome Message",
      "content": "Hello! Welcome to our support chat. How can I help you today?",
      "agentId": {
        "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "adminId": "64f1a2b3c4d5e6f7g8h9i0j3",
      "isGlobal": true,
      "departmentIds": [
        {
          "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
          "name": "Support"
        }
      ],
      "tags": ["greeting", "welcome"],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

---

### 3. Get Canned Message by ID

**GET** `/agents/canned-messages/:id`

Retrieves a specific canned message by its ID.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | MongoDB ObjectId of the canned message |

**Response:**

```json
{
  "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
  "title": "Welcome Message",
  "content": "Hello! Welcome to our support chat. How can I help you today?",
  "agentId": {
    "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "adminId": "64f1a2b3c4d5e6f7g8h9i0j3",
  "isGlobal": false,
  "departmentIds": [
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "name": "Support"
    }
  ],
  "tags": ["greeting", "welcome"],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

### 4. Update Canned Message

**PUT** `/agents/canned-messages/:id`

Updates an existing canned message. Only the creator can update their own messages.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | MongoDB ObjectId of the canned message |

**Request Body:**

```json
{
  "title": "Updated Welcome Message",
  "content": "Hi there! Welcome to our support chat. How may I assist you?",
  "isGlobal": true,
  "tags": ["greeting", "welcome", "updated"]
}
```

**Request Body Schema:** (All fields optional)
| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Updated title (1-100 chars) |
| `content` | string | Updated content (1-2000 chars) |
| `isGlobal` | boolean | Updated global visibility |
| `departmentIds` | string[] | Updated department restrictions |
| `tags` | string[] | Updated tags |

**Response:**

```json
{
  "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
  "title": "Updated Welcome Message",
  "content": "Hi there! Welcome to our support chat. How may I assist you?",
  "agentId": "64f1a2b3c4d5e6f7g8h9i0j2",
  "adminId": "64f1a2b3c4d5e6f7g8h9i0j3",
  "isGlobal": true,
  "departmentIds": ["64f1a2b3c4d5e6f7g8h9i0j1"],
  "tags": ["greeting", "welcome", "updated"],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T11:45:00.000Z"
}
```

---

### 5. Delete Canned Message

**DELETE** `/agents/canned-messages/:id`

Deletes a canned message. Only the creator can delete their own messages.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | MongoDB ObjectId of the canned message |

**Response:**

```json
{
  "message": "Canned message deleted successfully"
}
```

---

## Error Responses

### Common Error Codes:

- **400 Bad Request**: Invalid input data or malformed request
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: Insufficient permissions or trying to access/modify someone else's message
- **404 Not Found**: Canned message not found
- **500 Internal Server Error**: Server error

### Error Response Format:

```json
{
  "statusCode": 400,
  "message": "Invalid message ID format",
  "error": "Bad Request"
}
```

---

## Business Rules

### Message Visibility:

1. **Personal Messages** (`isGlobal: false`): Only visible to the creator
2. **Global Messages** (`isGlobal: true`): Visible to all agents under the same admin

### Permissions:

1. **Create**: Any agent/admin can create messages
2. **Read**: Agents can see their own messages + global messages from their admin
3. **Update**: Only the creator can update their own messages
4. **Delete**: Only the creator can delete their own messages

### Department Filtering:

- If `departmentIds` is specified, the message will only be visible to agents who have access to at least one of those departments
- If empty or not specified, the message is available to all agents (subject to global/personal visibility rules)

### Tags:

- Tags are automatically converted to lowercase
- Used for categorization and filtering
- Can be used for quick search and organization

---

## Frontend Implementation Examples

### JavaScript/TypeScript Examples:

#### Create Canned Message:

```javascript
const createCannedMessage = async (messageData) => {
  const response = await fetch('/agents/canned-messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(messageData),
  });
  return response.json();
};
```

#### Get Canned Messages with Pagination:

```javascript
const getCannedMessages = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/agents/canned-messages?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.json();
};

// Usage
const messages = await getCannedMessages({
  page: 1,
  limit: 20,
  search: 'welcome',
  tags: 'greeting,support',
  isGlobal: true,
});
```

#### Update Canned Message:

```javascript
const updateCannedMessage = async (messageId, updateData) => {
  const response = await fetch(`/agents/canned-messages/${messageId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updateData),
  });
  return response.json();
};
```

#### Delete Canned Message:

```javascript
const deleteCannedMessage = async (messageId) => {
  const response = await fetch(`/agents/canned-messages/${messageId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.json();
};
```

---
