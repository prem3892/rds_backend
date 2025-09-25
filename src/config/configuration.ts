export default () => ({
  port: parseInt(process.env.PORT || '5000', 10),
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nestjs_chat_app',
  },
  internal: {
    baseurl: process.env.INTERNAL_BASE_URL || 'http://localhost:8888',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'yourSecretKey',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m', // Shorter access token expiry
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'yourRefreshSecretKey',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // Longer refresh token expiry
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? true : false,
  },
  appDomain: process.env.APP_DOMAIN || 'http://localhost:3000', // Used for script URL
  chatTimers: {
    firstAlertThresholdMs: parseInt(
      process.env.CHAT_FIRST_ALERT_THRESHOLD_MS || '60000',
      10,
    ), // 60s
    subsequentAlertIntervalMs: parseInt(
      process.env.CHAT_SUBSEQUENT_ALERT_INTERVAL_MS || '90000',
      10,
    ), // 90s
    maxPriorityAlerts: parseInt(
      process.env.CHAT_MAX_PRIORITY_ALERTS || '1',
      10,
    ),
    agentReconnectTimeoutMs: parseInt(
      process.env.AGENT_RECONNECT_TIMEOUT_MS || '120000',
      10,
    ), // 2 mins
    customerReconnectTimeoutMs: parseInt(
      process.env.CUSTOMER_RECONNECT_TIMEOUT_MS || '300000',
      10,
    ), // 5 mins
    customerAbandonTimeoutMs: parseInt(
      process.env.CUSTOMER_ABANDON_TIMEOUT_MS || '900000',
      10,
    ), // 15 mins
    agentInactivityThresholdMs: parseInt(
      process.env.AGENT_INACTIVITY_THRESHOLD_MS || '180000',
      10,
    ), // 3 mins
    customerInactivityThresholdMs: parseInt(
      process.env.CUSTOMER_INACTIVITY_THRESHOLD_MS || '600000',
      10,
    ), // 10 mins
    visitorGracePeriodMs: parseInt(
      process.env.VISITOR_GRACE_PERIOD_MS || '30000',
      10,
    ), // 30 seconds
  },
  visitorTracking: {
    redisTtlSeconds: parseInt(
      process.env.VISITOR_REDIS_TTL_SECONDS || '1800',
      10,
    ), // 30 minutes
    cleanupIntervalMs: parseInt(
      process.env.VISITOR_CLEANUP_INTERVAL_MS || '120000',
      10,
    ), // 2 minutes
    gracePeriodMs: parseInt(
      process.env.VISITOR_DISCONNECTED_GRACE_PERIOD_MS || '300000',
      10,
    ), // 5 minutes
VisitorsPerAgent: parseInt(
      process.env.MAX_VISITORS_PER_AGENT || '1000',
      10,
    ),
    deltaUpdateEnabled: process.env.VISITOR_DELTA_UPDATES === 'true',
  },
  mail: {
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    from: process.env.MAIL_FROM || 'noreply@yourapp.com',
    enabled: process.env.MAIL_ENABLED !== 'false', // Default to true, set to 'false' to disable
  },
});
