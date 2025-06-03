"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
const redis_constants_1 = require("./redis.constants");
const enums_1 = require("../constants/enums");
let RedisService = class RedisService {
    redisClient;
    constructor(redisClient) {
        this.redisClient = redisClient;
    }
    async onModuleDestroy() {
        await this.redisClient.quit();
    }
    getClient() {
        return this.redisClient;
    }
    async mapSocketIdToAgentId(socketId, agentId) {
        await this.redisClient.set(`${enums_1.REDIS_SOCKET_AGENT_PREFIX}${socketId}`, agentId);
        await this.redisClient.set(`${enums_1.REDIS_AGENT_SOCKET_ID_PREFIX}${agentId}`, socketId);
    }
    async getAgentIdBySocketId(socketId) {
        return this.redisClient.get(`${enums_1.REDIS_SOCKET_AGENT_PREFIX}${socketId}`);
    }
    async getSocketIdByAgentId(agentId) {
        return this.redisClient.get(`${enums_1.REDIS_AGENT_SOCKET_ID_PREFIX}${agentId}`);
    }
    async removeAgentSocketMapping(socketId, agentId) {
        const currentAgentId = agentId || (await this.getAgentIdBySocketId(socketId));
        if (currentAgentId) {
            await this.redisClient.del(`${enums_1.REDIS_AGENT_SOCKET_ID_PREFIX}${currentAgentId}`);
        }
        await this.redisClient.del(`${enums_1.REDIS_SOCKET_AGENT_PREFIX}${socketId}`);
    }
    async mapSocketIdToCustomerId(socketId, customerId) {
        await this.redisClient.set(`${enums_1.REDIS_SOCKET_CUSTOMER_PREFIX}${socketId}`, customerId);
        await this.redisClient.set(`${enums_1.REDIS_CUSTOMER_SOCKET_ID_PREFIX}${customerId}`, socketId);
    }
    async getCustomerIdBySocketId(socketId) {
        return this.redisClient.get(`${enums_1.REDIS_SOCKET_CUSTOMER_PREFIX}${socketId}`);
    }
    async getSocketIdByCustomerId(customerId) {
        return this.redisClient.get(`${enums_1.REDIS_CUSTOMER_SOCKET_ID_PREFIX}${customerId}`);
    }
    async removeCustomerSocketMapping(socketId, customerId) {
        const currentCustomerId = customerId || (await this.getCustomerIdBySocketId(socketId));
        if (currentCustomerId) {
            await this.redisClient.del(`${enums_1.REDIS_CUSTOMER_SOCKET_ID_PREFIX}${currentCustomerId}`);
        }
        await this.redisClient.del(`${enums_1.REDIS_SOCKET_CUSTOMER_PREFIX}${socketId}`);
    }
    async set(key, value, ttlSeconds) {
        if (ttlSeconds) {
            await this.redisClient.set(key, value, 'EX', ttlSeconds);
        }
        else {
            await this.redisClient.set(key, value);
        }
    }
    async get(key) {
        return this.redisClient.get(key);
    }
    async del(key) {
        await this.redisClient.del(key);
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(redis_constants_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [ioredis_1.default])
], RedisService);
//# sourceMappingURL=redis.service.js.map