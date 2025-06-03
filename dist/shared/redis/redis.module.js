"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppRedisModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
const redis_service_1 = require("./redis.service");
const redis_constants_1 = require("./redis.constants");
let AppRedisModule = class AppRedisModule {
};
exports.AppRedisModule = AppRedisModule;
exports.AppRedisModule = AppRedisModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            {
                provide: redis_constants_1.REDIS_CLIENT,
                useFactory: (configService) => {
                    return new ioredis_1.default({
                        host: configService.get('redis.host'),
                        port: configService.get('redis.port'),
                        password: configService.get('redis.password'),
                        tls: {},
                        enableReadyCheck: true,
                        maxRetriesPerRequest: 3,
                        lazyConnect: false,
                        connectTimeout: 10000,
                        commandTimeout: 5000,
                    });
                },
                inject: [config_1.ConfigService],
            },
            redis_service_1.RedisService,
        ],
        exports: [redis_service_1.RedisService, redis_constants_1.REDIS_CLIENT],
    })
], AppRedisModule);
//# sourceMappingURL=redis.module.js.map