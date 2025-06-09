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
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? true : false,
  },
  appDomain: process.env.APP_DOMAIN || 'localhost:3000', // Used for script URL
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
      process.env.CHAT_MAX_PRIORITY_ALERTS || '3',
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
  },
});
