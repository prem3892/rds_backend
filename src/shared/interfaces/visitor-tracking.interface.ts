import {
  VisitorStatus,
  VisitorChangeType,
  VisitorEventType,
} from '../constants/enums';

export interface VisitorState {
  customerId: string;
  name: string;
  status: VisitorStatus;
  lastActivity: Date;
  metadata: Record<string, any>;
  connectedAt: Date;
  socketId?: string;
  widgetId: string;
  domain: string;
  email?: string;
  phone?: string;
  fingerprint?: string;
  currentPageUrl?: string;
  browserInfo?: Record<string, any>;
}

export interface VisitorChange {
  type: VisitorChangeType;
  customerId: string;
  data: Partial<VisitorState>;
  timestamp: Date;
}

export interface VisitorSyncResponse {
  since: string;
  changes: VisitorChange[];
  fullSync: boolean;
  totalVisitors?: number;
  hasMore?: boolean;
  nextCursor?: string;
}

export interface VisitorListResponse {
  visitors: VisitorState[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
  lastSync: Date;
}

export interface VisitorActivityEvent {
  customerId: string;
  customerProfile: {
    name: string;
    email?: string;
    phone?: string;
    fingerprint?: string;
    metadata: Record<string, any>;
  };
  widget: {
    id: string;
    name: string;
    departmentIds: Array<{
      id: string;
      name: string;
    }>;
  };
  domain: string;
  currentPageUrl: string;
  browserInfo: Record<string, any>;
  timestamp: Date;
  eventType: VisitorEventType;
}

export interface VisitorCleanupResult {
  cleanedCount: number;
  totalProcessed: number;
  errors: string[];
}
