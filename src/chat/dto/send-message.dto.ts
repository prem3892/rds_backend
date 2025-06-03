import { IsMongoId, IsNotEmpty, IsObject } from 'class-validator';

export class SendMessageDto {
  @IsMongoId()
  @IsNotEmpty()
  chatSessionId: string;

  @IsObject()
  @IsNotEmpty()
  messageContent: Record<string, any>; // e.g., { text: "Hello" } or { url: "...", filename: "..." }
}
