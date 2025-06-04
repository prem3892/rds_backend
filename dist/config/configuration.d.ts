declare const _default: () => {
    port: number;
    database: {
        uri: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    redis: {
        host: string;
        port: number;
        password: string | undefined;
        tls: boolean;
    };
    appDomain: string;
    chatTimers: {
        firstAlertThresholdMs: number;
        subsequentAlertIntervalMs: number;
        maxPriorityAlerts: number;
        agentReconnectTimeoutMs: number;
        customerReconnectTimeoutMs: number;
        customerAbandonTimeoutMs: number;
    };
};
export default _default;
