import { OmitType } from '@nestjs/mapped-types';
import { RegisterDto } from './register.dto';

export class AdminRegisterDto extends OmitType(RegisterDto, [
  'role',
] as const) {}
