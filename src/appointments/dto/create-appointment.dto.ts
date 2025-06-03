import {
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsMongoId()
  @IsNotEmpty()
  chatSessionId: string;

  @IsMongoId()
  @IsNotEmpty()
  customerId: string;

  // agentId will be taken from authenticated user or provided for admin
  @IsOptional()
  @IsMongoId()
  agentId?: string; // Required if admin is booking

  @IsDateString()
  @IsNotEmpty()
  appointmentTime: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}
