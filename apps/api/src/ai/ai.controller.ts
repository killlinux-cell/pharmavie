import { Body, Controller, Post, Req } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiChatDto } from './dto/ai.dto';
import { Public } from '../common/decorators/auth.decorators';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Public()
  @Post('chat')
  chat(@Body() dto: AiChatDto, @Req() req: { user?: AuthUser }) {
    return this.aiService.chat(req.user ?? null, dto);
  }
}
