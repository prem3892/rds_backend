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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentProfileSchema = exports.AgentProfile = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let AgentProfile = class AgentProfile {
    userId;
    departmentIds;
    domainAccess;
    isOnline;
    maxConcurrentChats;
    lastSeen;
};
exports.AgentProfile = AgentProfile;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: 'User',
        unique: true,
        index: true,
        required: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], AgentProfile.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [{ type: mongoose_2.Types.ObjectId, ref: 'Department' }],
        index: true,
        default: [],
    }),
    __metadata("design:type", Array)
], AgentProfile.prototype, "departmentIds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], index: true, default: [] }),
    __metadata("design:type", Array)
], AgentProfile.prototype, "domainAccess", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], AgentProfile.prototype, "isOnline", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 3 }),
    __metadata("design:type", Number)
], AgentProfile.prototype, "maxConcurrentChats", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], AgentProfile.prototype, "lastSeen", void 0);
exports.AgentProfile = AgentProfile = __decorate([
    (0, mongoose_1.Schema)({ timestamps: false, _id: false })
], AgentProfile);
exports.AgentProfileSchema = mongoose_1.SchemaFactory.createForClass(AgentProfile);
exports.AgentProfileSchema.pre('save', function (next) {
    if (this.isNew && this.userId) {
        this._id = this.userId;
    }
    next();
});
//# sourceMappingURL=agent-profile.schema.js.map