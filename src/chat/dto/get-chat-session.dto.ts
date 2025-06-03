import {
  IsEnum,
  IsMongoId,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { ChatSessionStatus } from '../../shared/constants/enums';

export class GetChatSessionsQueryDto {
  @IsOptional()
  @IsNumberString()
  limit?: number;

  @IsOptional()
  @IsNumberString()
  page?: number;

  @IsOptional()
  @IsEnum(ChatSessionStatus)
  status?: ChatSessionStatus;

  @IsOptional()
  @IsMongoId()
  agentId?: string;

  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @IsOptional()
  @IsString()
  customerName?: string; // For basic search

  @IsOptional()
  @IsString()
  customerEmail?: string; // For basic search
}
