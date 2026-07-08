import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AiChatDto {
  @IsString()
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
