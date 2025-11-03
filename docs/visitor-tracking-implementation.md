# Visitor Tracking Implementation

This document describes the hybrid visitor tracking architecture implemented in the chat system.

## Overview

The visitor tracking system provides real-time visitor state management that survives page refreshes, network issues, and scales across multiple server instances. It implements a hybrid architecture with server-side state management in Redis and client-side state persistence.

## Architecture Components

### 1. Server-Side State Management (Redis)

**Redis Data Structure:**

```
visitor_state:{widgetId}:{domain} = {
  customerId: string,
  name: string,
  status: 'connected' | 'disconnected',
  lastActivity: timestamp,
  metadata: {...},
  connectedAt: timestamp,
  socketId?: string,
  widgetId: string,
  domain: string,
  email?: string,
  phone?: string,
  fingerprint?: string,
  currentPageUrl?: string,
  browserInfo?: {...}
}
```

**TTL:** Configurable via `VISITOR_REDIS_TTL_SECONDS` (default: 30 minutes)

### 2. Delta Update System

When `VISITOR_DELTA_UPDATES=true`, the system tracks visitor changes:

```
visitor_activity:{widgetId}:{domain}:{customerId} = {
  type: 'connect' | 'disconnect' | 'update',
  customerId: string,
  data: {...},
  timestamp: timestamp
}
```

### 3. REST Endpoints

#### GET `/api/agents/visitors/current`

Returns current visitor state for agent's accessible widgets.

**Query Parameters:**

- `since` (optional): ISO date string to filter visitors by last activity
- `limit` (optional): Number of visitors to return (1-1000, default: 100)
- `cursor` (optional): Pagination cursor

**Response:**

```json
{
  "visitors": [...],
  "totalCount": number,
  "hasMore": boolean,
  "nextCursor": string,
  "lastSync": "2024-01-01T10:00:00Z"
}
```

#### GET `/api/agents/visitors/changes`

Returns visitor changes since a specific timestamp (for delta updates).

**Query Parameters:**

- `since` (required): ISO date string
- `limit` (optional): Number of changes to return (1-1000, default: 100)

**Response:**

```json
{
  "since": "2024-01-01T10:00:00Z",
  "changes": [
    {
      "type": "connect|disconnect|update",
      "customerId": "...",
      "data": {...},
      "timestamp": "..."
    }
  ],
  "fullSync": false,
  "hasMore": boolean
}
```

#### POST `/api/agents/visitors/sync`

Syncs visitor state with client.

**Request Body:**

```json
{
  "lastSync": "2024-01-01T10:00:00Z",
  "version": 1,
  "forceFullSync": false
}
```

#### GET `/api/agents/visitors/stats` (Admin only)

Returns visitor statistics.

#### POST `/api/agents/visitors/cleanup` (Admin only)

Triggers manual visitor cleanup.

### 4. Socket Events

#### Server to Client Events:

- `server:visitor_activity` - Visitor connected/disconnected/updated
- `server:visitor_cleanup` - Visitor removed due to expiration

#### Event Payload:

```json
{
  "customerId": "...",
  "customerProfile": {
    "name": "...",
    "email": "...",
    "phone": "...",
    "fingerprint": "...",
    "metadata": {...}
  },
  "widget": {
    "id": "...",
    "name": "...",
    "departmentIds": [...]
  },
  "domain": "...",
  "currentPageUrl": "...",
  "browserInfo": {...},
  "timestamp": "...",
  "eventType": "visitor_connected|visitor_disconnected|visitor_reconnected|visitor_updated"
}
```

### 5. Automatic Cleanup

A cron job runs every 2 minutes to clean expired visitors:

- Removes visitors with no activity > grace period
- Notifies agents about cleaned visitors
- Configurable via `VISITOR_CLEANUP_INTERVAL_MS` and `VISITOR_GRACE_PERIOD_MS`

## Configuration

Add these environment variables:

```bash
# Visitor Tracking Configuration
VISITOR_REDIS_TTL_SECONDS=1800          # 30 minutes
VISITOR_CLEANUP_INTERVAL_MS=120000      # 2 minutes
VISITOR_GRACE_PERIOD_MS=300000          # 5 minutes
MAX_VISITORS_PER_AGENT=1000             # Max visitors per agent
VISITOR_DELTA_UPDATES=true              # Enable delta updates
```

## Integration Points

### 1. Chat Gateway Integration

- Customer connect/disconnect events automatically update visitor state
- Visitor notifications sent to eligible agents
- Grace period handling for reconnections

### 2. Agent Service Integration

- `getAgentAccessibleWidgets()` - Returns widgets accessible by agent
- `getEligibleOnlineAgents()` - Returns agents eligible for visitor notifications

### 3. Widget Service Integration

- `findWidgetsByDepartments()` - Finds widgets by department IDs

## Usage Example

### Frontend Implementation (Recommended)

```javascript
// 1. Load cached state from localStorage on page load
const cachedVisitors = localStorage.getItem(`visitor_list_${agentId}`);
if (cachedVisitors) {
  displayVisitors(JSON.parse(cachedVisitors).visitors);
  showSyncIndicator();
}

// 2. Request fresh state from server
const response = await fetch('/api/agents/visitors/current');
const freshData = await response.json();

// 3. Merge and update localStorage
const mergedVisitors = mergeVisitorStates(cachedVisitors, freshData);
localStorage.setItem(
  `visitor_list_${agentId}`,
  JSON.stringify({
    visitors: mergedVisitors,
    lastSync: new Date().toISOString(),
    version: 1,
  }),
);

// 4. Listen for real-time updates
socket.on('server:visitor_activity', (event) => {
  updateVisitorInMemoryAndStorage(event);
});

// 5. Periodic sync for delta updates
setInterval(async () => {
  const lastSync = getLastSyncFromStorage();
  const changes = await fetch(`/api/agents/visitors/changes?since=${lastSync}`);
  applyChangesToVisitorList(changes);
}, 30000); // Every 30 seconds
```

## Benefits

✅ **Reliability:** Survives page refresh, network issues, server restarts  
✅ **Performance:** Fast initial load, efficient updates  
✅ **Scalability:** Works across multiple server instances  
✅ **User Experience:** Immediate state restoration, smooth transitions  
✅ **Maintainability:** Clear separation of concerns, comprehensive monitoring

## Monitoring

The system provides built-in monitoring through:

- Visitor statistics endpoint
- Cleanup result logging
- Error tracking and reporting
- Performance metrics for cache hit rates and sync efficiency
