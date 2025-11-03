import { IsMongoId, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AgentInitiateChatDto {
  @IsMongoId()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  initialMessage: string;
}
