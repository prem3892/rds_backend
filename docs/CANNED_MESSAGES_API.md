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
  "agentId": {
    "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
    "firstName": "John",
    "lastName": "Doe",
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

### 2. Get Canned Messages (with Pagination & Filtering)

**GET** `/agents/canned-messages`

Retrieves canned messages with pagination and filtering options.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Text search in title (case-insensitive regex) |
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
  "items": [
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "title": "Welcome Message",
      "content": "Hello! Welcome to our support chat. How can I help you today?",
      "agentId": {
        "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
        "firstName": "John",
        "lastName": "Doe",
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
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
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
    "firstName": "John",
    "lastName": "Doe",
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
  "agentId": {
    "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
    "firstName": "John",
    "lastName": "Doe",
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

### Search Functionality:

- Search is performed on the `title` field only
- Uses case-insensitive regex matching
- Special regex characters are escaped to prevent injection

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
const result = await getCannedMessages({
  page: 1,
  limit: 20,
  search: 'welcome',
  tags: 'greeting,support',
  isGlobal: true,
});

console.log('Messages:', result.items);
console.log('Pagination:', result.meta);
// result.meta contains: { page, limit, total, totalPages, hasNext, hasPrev }
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

#### Pagination Helper:

```javascript
const PaginationHelper = {
  // Build pagination controls
  buildPaginationControls: (meta) => {
    return {
      currentPage: meta.page,
      totalPages: meta.totalPages,
      totalItems: meta.total,
      itemsPerPage: meta.limit,
      hasNextPage: meta.hasNext,
      hasPreviousPage: meta.hasPrev,
      nextPage: meta.hasNext ? meta.page + 1 : null,
      previousPage: meta.hasPrev ? meta.page - 1 : null,
    };
  },

  // Generate page numbers for pagination UI
  generatePageNumbers: (meta, maxVisible = 5) => {
    const { page, totalPages } = meta;
    const pages = [];

    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  },
};
```

---

## UI/UX Recommendations

### Suggested Features:

1. **Search Bar**: For quick text search across titles
2. **Tag Filter**: Dropdown or multi-select for filtering by tags
3. **Department Filter**: Filter messages by department access
4. **Global/Personal Toggle**: Switch between viewing all accessible messages vs. only personal messages
5. **Pagination Controls**: Page navigation with configurable page size
6. **Sort Options**: Sort by creation date, title, or usage frequency
7. **Quick Actions**: Edit, delete, and copy-to-clipboard buttons
8. **Preview**: Show message content preview in list view
9. **Usage Analytics**: Track which messages are used most frequently

### Suggested UI Components:

- **Message Card**: Display title, content preview, tags, and actions
- **Create/Edit Modal**: Form for creating or editing messages
- **Confirmation Dialog**: For delete operations
- **Filter Sidebar**: Advanced filtering options
- **Search Results Highlighting**: Highlight search terms in results
- **Pagination Component**: Standard pagination with first/last/prev/next controls

### Pagination UI Example:

```javascript
const PaginationComponent = ({ meta, onPageChange }) => {
  const { page, totalPages, hasNext, hasPrev } = meta;

  return (
    <div className="pagination">
      <button disabled={!hasPrev} onClick={() => onPageChange(page - 1)}>
        Previous
      </button>

      <span>
        Page {page} of {totalPages}
      </span>

      <button disabled={!hasNext} onClick={() => onPageChange(page + 1)}>
        Next
      </button>

      <div className="page-info">
        Showing {meta.limit} items per page, {meta.total} total items
      </div>
    </div>
  );
};
```
