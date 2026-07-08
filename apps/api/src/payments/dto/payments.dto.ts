import { IsEnum, IsString, Matches } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class InitiatePaymentDto {
  @IsString()
  orderId!: string;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsString()
  @Matches(/^(\+225|225)?[0-9]{8,10}$/)
  phone!: string;
}

export class PaymentWebhookDto {
  @IsString()
  transactionId!: string;

  @IsString()
  status!: string;

  @IsString()
  providerRef!: string;
}
