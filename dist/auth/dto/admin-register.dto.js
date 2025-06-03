"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminRegisterDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const register_dto_1 = require("./register.dto");
class AdminRegisterDto extends (0, mapped_types_1.OmitType)(register_dto_1.RegisterDto, [
    'role',
]) {
}
exports.AdminRegisterDto = AdminRegisterDto;
//# sourceMappingURL=admin-register.dto.js.map