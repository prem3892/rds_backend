import { RegisterDto } from './register.dto';
declare const AdminRegisterDto_base: import("@nestjs/mapped-types").MappedType<Omit<RegisterDto, "role">>;
export declare class AdminRegisterDto extends AdminRegisterDto_base {
}
export {};
