import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { InitiatePaymentDto, PaymentWebhookDto } from './dto/payments.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async initiate(user: AuthUser, dto: InitiatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { payment: true },
    });

    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.userId !== user.id) throw new BadRequestException('Commande non autorisée');
    if (order.payment?.status === PaymentStatus.SUCCESS) {
      throw new BadRequestException('Commande déjà payée');
    }

    if (dto.method === PaymentMethod.CASH) {
      const payment = await this.prisma.payment.upsert({
        where: { orderId: order.id },
        update: { method: dto.method, status: PaymentStatus.PENDING, phone: dto.phone, amount: order.total },
        create: {
          orderId: order.id,
          method: dto.method,
          status: PaymentStatus.PENDING,
          phone: dto.phone,
          amount: order.total,
        },
      });
      return {
        success: true,
        data: {
          paymentId: payment.id,
          status: payment.status,
          message: 'Paiement espèces — à régler à la livraison ou au retrait',
        },
      };
    }

    const transactionId = `PV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const providerRef = await this.initiateMobileMoney(dto.method, dto.phone, order.total, transactionId);

    const payment = await this.prisma.payment.upsert({
      where: { orderId: order.id },
      update: {
        method: dto.method,
        status: PaymentStatus.PENDING,
        phone: dto.phone,
        amount: order.total,
        transactionId,
        providerRef,
      },
      create: {
        orderId: order.id,
        method: dto.method,
        status: PaymentStatus.PENDING,
        phone: dto.phone,
        amount: order.total,
        transactionId,
        providerRef,
      },
    });

    return {
      success: true,
      data: {
        paymentId: payment.id,
        transactionId,
        providerRef,
        status: payment.status,
        amount: order.total,
        method: dto.method,
        message: this.getPaymentMessage(dto.method),
        ...(process.env.NODE_ENV === 'development'
          ? { devHint: 'Simulez le webhook POST /api/v1/payments/webhook avec status=SUCCESS' }
          : {}),
      },
    };
  }

  async webhook(dto: PaymentWebhookDto) {
    const payment = await this.prisma.payment.findFirst({
      where: { OR: [{ transactionId: dto.transactionId }, { providerRef: dto.providerRef }] },
    });

    if (!payment) throw new NotFoundException('Paiement introuvable');

    const status =
      dto.status.toUpperCase() === 'SUCCESS'
        ? PaymentStatus.SUCCESS
        : PaymentStatus.FAILED;

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status, providerRef: dto.providerRef },
    });

    if (status === PaymentStatus.SUCCESS) {
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'CONFIRMED' },
      });
    }

    return { success: true, data: updated };
  }

  async getStatus(user: AuthUser, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('Paiement introuvable');
    if (payment.order.userId !== user.id) throw new BadRequestException();

    return { success: true, data: payment };
  }

  private async initiateMobileMoney(
    method: PaymentMethod,
    phone: string,
    amount: number,
    transactionId: string,
  ): Promise<string> {
    const apiKey = process.env.CINETPAY_API_KEY;

    if (apiKey && process.env.NODE_ENV === 'production') {
      // Intégration CinetPay réelle (Orange Money, MTN MoMo, Wave)
      const res = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apikey: apiKey,
          site_id: process.env.CINETPAY_SITE_ID,
          transaction_id: transactionId,
          amount,
          currency: 'XOF',
          description: 'Commande PharmaVie',
          customer_phone_number: phone,
          channels: this.methodToChannel(method),
        }),
      });
      const data = (await res.json()) as { data?: { payment_token?: string } };
      return data.data?.payment_token ?? transactionId;
    }

    console.log(`[Mobile Money] ${method} ${phone} ${amount} FCFA → ${transactionId}`);
    return `mock-${transactionId}`;
  }

  private methodToChannel(method: PaymentMethod): string {
    const map: Record<string, string> = {
      ORANGE_MONEY: 'MOBILE_MONEY',
      MTN_MOMO: 'MOBILE_MONEY',
      WAVE: 'MOBILE_MONEY',
    };
    return map[method] ?? 'MOBILE_MONEY';
  }

  private getPaymentMessage(method: PaymentMethod): string {
    const labels: Record<string, string> = {
      ORANGE_MONEY: 'Confirmez le paiement sur votre Orange Money',
      MTN_MOMO: 'Confirmez le paiement sur votre MTN MoMo',
      WAVE: 'Confirmez le paiement sur Wave',
    };
    return labels[method] ?? 'Paiement initié';
  }
}
