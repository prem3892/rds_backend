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
exports.WidgetSchema = exports.Widget = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let Widget = class Widget {
    _id;
    name;
    domains;
    departmentIds;
    injectableScriptUrl;
    isEnabled;
    primaryColor;
    welcomeMessage;
    headerText;
    createdBy;
    createdAt;
    updatedAt;
};
exports.Widget = Widget;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Widget.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], index: true, default: [] }),
    __metadata("design:type", Array)
], Widget.prototype, "domains", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [{ type: mongoose_2.Types.ObjectId, ref: 'Department' }],
        index: true,
        default: [],
    }),
    __metadata("design:type", Array)
], Widget.prototype, "departmentIds", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Widget.prototype, "injectableScriptUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], Widget.prototype, "isEnabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true }),
    __metadata("design:type", String)
], Widget.prototype, "primaryColor", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true }),
    __metadata("design:type", String)
], Widget.prototype, "welcomeMessage", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true }),
    __metadata("design:type", String)
], Widget.prototype, "headerText", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Widget.prototype, "createdBy", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Widget.prototype, "createdAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Widget.prototype, "updatedAt", void 0);
exports.Widget = Widget = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Widget);
exports.WidgetSchema = mongoose_1.SchemaFactory.createForClass(Widget);
exports.WidgetSchema.virtual('derivedInjectableScriptUrl').get(function () {
    return this.injectableScriptUrl;
});
//# sourceMappingURL=widget.schema.js.map