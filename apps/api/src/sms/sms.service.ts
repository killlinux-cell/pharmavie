import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  /** Envoie le code OTP par SMS. Retourne true si envoyé, false si mode dev (log seulement). */
  async sendOtp(phone: string, code: string): Promise<boolean> {
    const message = `PharmaVie : votre code de connexion est ${code}. Valide 5 minutes. Ne le partagez pas.`;
    return this.send(phone, message);
  }

  async send(phone: string, message: string): Promise<boolean> {
    const provider = (this.config.get<string>('SMS_PROVIDER') ?? 'twilio').toLowerCase();

    switch (provider) {
      case 'twilio':
        return this.sendViaTwilio(phone, message);
      case 'africastalking':
        return this.sendViaAfricasTalking(phone, message);
      default:
        this.logger.warn(`SMS_PROVIDER inconnu : ${provider}`);
        return this.devFallback(phone, message);
    }
  }

  private async sendViaTwilio(phone: string, message: string): Promise<boolean> {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = this.config.get<string>('TWILIO_PHONE_NUMBER');
    const messagingServiceSid = this.config.get<string>('TWILIO_MESSAGING_SERVICE_SID');

    if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) {
      return this.devFallback(phone, message);
    }

    const body = new URLSearchParams({ To: phone, Body: message });
    if (messagingServiceSid) {
      body.set('MessagingServiceSid', messagingServiceSid);
    } else {
      body.set('From', fromNumber!);
    }

    try {
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        },
      );

      const data = (await res.json()) as { sid?: string; status?: string; message?: string; code?: number };

      if (res.ok && data.sid && data.status !== 'failed') {
        this.logger.log(`SMS Twilio envoyé à ${phone} (${data.sid})`);
        return true;
      }

      this.logger.error(`Échec SMS Twilio : ${JSON.stringify(data)}`);
      if (this.isProduction()) throw new Error(data.message ?? 'SMS delivery failed');
      return false;
    } catch (err) {
      this.logger.error(`Erreur envoi SMS Twilio : ${err}`);
      if (this.isProduction()) throw err;
      return false;
    }
  }

  private async sendViaAfricasTalking(phone: string, message: string): Promise<boolean> {
    const username = this.config.get<string>('AFRICASTALKING_USERNAME');
    const apiKey = this.config.get<string>('AFRICASTALKING_API_KEY');

    if (!username || !apiKey) {
      return this.devFallback(phone, message);
    }

    const senderId = this.config.get<string>('SMS_SENDER_ID') ?? 'PharmaVie';
    const body = new URLSearchParams({
      username,
      to: phone,
      message,
      from: senderId,
    });

    try {
      const res = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          apiKey,
        },
        body: body.toString(),
      });

      const data = (await res.json()) as {
        SMSMessageData?: { Recipients?: Array<{ status: string; number: string }> };
      };

      const recipient = data.SMSMessageData?.Recipients?.[0];
      if (res.ok && recipient?.status === 'Success') {
        this.logger.log(`SMS envoyé à ${phone}`);
        return true;
      }

      this.logger.error(`Échec SMS Africa's Talking : ${JSON.stringify(data)}`);
      if (this.isProduction()) throw new Error('SMS delivery failed');
      return false;
    } catch (err) {
      this.logger.error(`Erreur envoi SMS : ${err}`);
      if (this.isProduction()) throw err;
      return false;
    }
  }

  private devFallback(phone: string, message: string): boolean {
    if (this.isProduction()) {
      this.logger.error(
        'SMS non configuré en production — vérifiez TWILIO_* ou AFRICASTALKING_* dans apps/api/.env',
      );
      throw new Error('SMS not configured');
    }
    this.logger.log(`[OTP-DEV] ${phone} → ${message}`);
    return false;
  }

  private isProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  isSmsConfigured(): boolean {
    const provider = (this.config.get<string>('SMS_PROVIDER') ?? 'twilio').toLowerCase();
    if (provider === 'twilio') {
      const sid = this.config.get<string>('TWILIO_ACCOUNT_SID');
      const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
      const from = this.config.get<string>('TWILIO_PHONE_NUMBER');
      const msSid = this.config.get<string>('TWILIO_MESSAGING_SERVICE_SID');
      return !!(sid && token && (from || msSid));
    }
    return !!(
      this.config.get<string>('AFRICASTALKING_USERNAME') &&
      this.config.get<string>('AFRICASTALKING_API_KEY')
    );
  }
}
