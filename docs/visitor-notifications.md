# Visitor Notification System

## Overview

The visitor notification system notifies eligible agents when customers connect to or disconnect from the chat widget, allowing agents to see real-time visitor activity.

## Events

### `server:visitor_activity`

Sent to eligible agents when visitor activity occurs.

**Event Types:**

- `visitor_connected` - Customer connected to widget
- `visitor_disconnected` - Customer disconnected from widget
- `visitor_reconnected` - Customer reconnected during grace period

**Payload Structure:**

```typescript
{
  customerId: string;
  customerProfile: {
    name: string | null;           // Customer name or "Anonymous Visitor"
    email: string | null;          // Customer email if available
    phone: string | null;          // Customer phone if available
    fingerprint: string;           // Browser fingerprint
    metadata: {                    // Additional customer metadata
      browserInfo?: object;        // Browser details
      currentPageUrl?: string;     // Current page URL
      initialDomain?: string;      // Initial domain
      // ... other metadata
    };
  };
  widget: {
    id: string;                    // Widget ID
    name: string;                  // Widget name
    departmentIds: Array<{         // Associated departments
      id: string;
      name: string;
    }>;
  };
  domain: string;                  // Domain where widget is embedded
  currentPageUrl: string;          // Current page URL
  browserInfo: object;             // Browser information
  timestamp: Date;                 // Event timestamp
  eventType: 'visitor_connected' | 'visitor_disconnected' | 'visitor_reconnected';
}
```

## Frontend Implementation Guide

### 1. Listen for Visitor Events

```typescript
socket.on('server:visitor_activity', (data) => {
  const { eventType, customerId, customerProfile, widget, currentPageUrl } =
    data;

  switch (eventType) {
    case 'visitor_connected':
      // Add visitor to the list
      addVisitorToList(data);
      break;

    case 'visitor_disconnected':
      // Remove visitor from list (but keep for grace period)
      markVisitorAsDisconnected(customerId);
      break;

    case 'visitor_reconnected':
      // Restore visitor in the list
      markVisitorAsConnected(customerId);
      break;
  }
});
```

### 2. Visitor List Management

```typescript
interface Visitor {
  customerId: string;
  name: string;
  currentPageUrl: string;
  domain: string;
  isConnected: boolean;
  lastActivity: Date;
  browserInfo: object;
  // ... other fields from customerProfile
}

class VisitorManager {
  private visitors = new Map<string, Visitor>();

  addVisitorToList(data: VisitorActivityData) {
    const visitor: Visitor = {
      customerId: data.customerId,
      name: data.customerProfile.name || 'Anonymous Visitor',
      currentPageUrl: data.currentPageUrl,
      domain: data.domain,
      isConnected: true,
      lastActivity: new Date(data.timestamp),
      browserInfo: data.browserInfo,
      // ... map other fields
    };

    this.visitors.set(data.customerId, visitor);
    this.updateUI();
  }

  markVisitorAsDisconnected(customerId: string) {
    const visitor = this.visitors.get(customerId);
    if (visitor) {
      visitor.isConnected = false;
      visitor.lastActivity = new Date();
      this.updateUI();
    }
  }

  markVisitorAsConnected(customerId: string) {
    const visitor = this.visitors.get(customerId);
    if (visitor) {
      visitor.isConnected = true;
      visitor.lastActivity = new Date();
      this.updateUI();
    }
  }

  // Optional: Clean up old disconnected visitors
  cleanupOldVisitors() {
    const now = new Date();
    const cutoff = 5 * 60 * 1000; // 5 minutes

    for (const [customerId, visitor] of this.visitors) {
      if (
        !visitor.isConnected &&
        now.getTime() - visitor.lastActivity.getTime() > cutoff
      ) {
        this.visitors.delete(customerId);
      }
    }
    this.updateUI();
  }
}
```

### 3. UI Components

```typescript
// Example React component
const VisitorList: React.FC = () => {
  const [visitors, setVisitors] = useState<Map<string, Visitor>>(new Map());

  useEffect(() => {
    socket.on('server:visitor_activity', handleVisitorActivity);

    return () => {
      socket.off('server:visitor_activity', handleVisitorActivity);
    };
  }, []);

  const handleVisitorActivity = (data: VisitorActivityData) => {
    setVisitors(prev => {
      const newVisitors = new Map(prev);

      switch (data.eventType) {
        case 'visitor_connected':
          newVisitors.set(data.customerId, {
            customerId: data.customerId,
            name: data.customerProfile.name || 'Anonymous Visitor',
            currentPageUrl: data.currentPageUrl,
            isConnected: true,
            lastActivity: new Date(data.timestamp),
            // ... other fields
          });
          break;

        case 'visitor_disconnected':
          const visitor = newVisitors.get(data.customerId);
          if (visitor) {
            visitor.isConnected = false;
            visitor.lastActivity = new Date(data.timestamp);
          }
          break;

        case 'visitor_reconnected':
          const reconnectedVisitor = newVisitors.get(data.customerId);
          if (reconnectedVisitor) {
            reconnectedVisitor.isConnected = true;
            reconnectedVisitor.lastActivity = new Date(data.timestamp);
          }
          break;
      }

      return newVisitors;
    });
  };

  return (
    <div className="visitor-list">
      <h3>Current Visitors</h3>
      {Array.from(visitors.values()).map(visitor => (
        <div
          key={visitor.customerId}
          className={`visitor-item ${visitor.isConnected ? 'connected' : 'disconnected'}`}
        >
          <div className="visitor-name">{visitor.name}</div>
          <div className="visitor-page">{visitor.currentPageUrl}</div>
          <div className="visitor-status">
            {visitor.isConnected ? '🟢 Online' : '🔴 Offline'}
          </div>
        </div>
      ))}
    </div>
  );
};
```

## Configuration

### Backend Configuration

Add to your configuration file:

```typescript
chatTimers: {
  visitorGracePeriodMs: 30000, // 30 seconds grace period
  // ... other timer configurations
}
```

## Technical Notes

### Grace Period Behavior

- When a visitor disconnects, they're immediately marked as disconnected
- A 30-second grace period is set in Redis
- If the visitor reconnects within this period, they're restored
- If no reconnection occurs, the visitor remains in the disconnected state

### Agent Eligibility

Visitors are only sent to agents who:

1. Are currently online (`isOnline: true`)
2. Have access to the widget's departments
3. Have domain access (specific domain or wildcard `*`)
4. Have available chat capacity (under `maxConcurrentChats`)

### Performance Considerations

- Events are only sent to eligible agents, not all agents
- Redis is used for efficient grace period management
- Consider implementing client-side cleanup for old disconnected visitors

## Testing

### Test Scenarios

1. **Basic Connection**: Customer connects → Agent receives `visitor_connected`
2. **Basic Disconnection**: Customer disconnects → Agent receives `visitor_disconnected`
3. **Grace Period Reconnection**: Customer disconnects and reconnects within 30s → Agent receives `visitor_disconnected` then `visitor_reconnected`
4. **Multiple Agents**: Multiple eligible agents should all receive the same events
5. **Department Filtering**: Only agents with access to the widget's departments should receive events
6. **Domain Filtering**: Only agents with domain access should receive events

### Debug Logging

The system includes comprehensive logging. Check server logs for:

- `Notified X eligible agents about visitor_connected for customer Y`
- `Customer X reconnected during grace period`
- `No eligible agents found for visitor notification`
