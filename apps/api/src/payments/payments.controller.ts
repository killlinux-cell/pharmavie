import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto, PaymentWebhookDto } from './dto/payments.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/auth.decorators';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  initiate(@CurrentUser() user: AuthUser, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiate(user, dto);
  }

  @Public()
  @Post('webhook')
  webhook(@Body() dto: PaymentWebhookDto) {
    return this.paymentsService.webhook(dto);
  }

  @Get(':id')
  status(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.paymentsService.getStatus(user, id);
  }
}
