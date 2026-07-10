import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { LoginDto, SendOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { verifyPassword } from './password.util';

@Injectable()
export class AuthService {
  private readonly otpTtlSeconds = 300;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sms: SmsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    const phone = this.normalizePhone(dto.phone);
    const code = this.generateOtp();
    await this.redis.setex(`otp:${phone}`, this.otpTtlSeconds, code);

    let smsSent = false;
    try {
      smsSent = await this.sms.sendOtp(phone, code);
    } catch {
      throw new BadRequestException('Envoi SMS impossible. Réessayez dans quelques minutes.');
    }

    return {
      success: true,
      message: smsSent ? 'Code OTP envoyé par SMS' : 'Code OTP envoyé',
      data: {
        phone,
        expiresIn: this.otpTtlSeconds,
        ...(!smsSent && process.env.NODE_ENV !== 'production' ? { devCode: code } : {}),
      },
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const phone = this.normalizePhone(dto.phone);
    const stored = await this.redis.get(`otp:${phone}`);

    if (!stored || stored !== dto.code) {
      throw new UnauthorizedException('Code OTP invalide ou expiré');
    }

    await this.redis.del(`otp:${phone}`);

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: UserRole.CLIENT,
        },
      });
    }

    return this.issueToken(user);
  }

  async loginStaff(dto: LoginDto) {
    return this.loginWithPassword(dto, [UserRole.PHARMACIST, UserRole.PHARMACY_STAFF]);
  }

  async loginAdmin(dto: LoginDto) {
    return this.loginWithPassword(dto, [UserRole.ADMIN]);
  }

  private async loginWithPassword(dto: LoginDto, allowedRoles: UserRole[]) {
    const login = dto.login.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [{ email: login }, { username: login }],
      },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    const valid = await verifyPassword(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    if (!allowedRoles.includes(user.role)) {
      throw new UnauthorizedException('Accès non autorisé pour ce compte');
    }

    return this.issueToken(user);
  }

  private async issueToken(user: {
    id: string;
    phone: string;
    firstName: string | null;
    lastName: string | null;
    role: UserRole;
  }) {
    let pharmacyId: string | undefined;
    if (['PHARMACIST', 'PHARMACY_STAFF'].includes(user.role)) {
      const staff = await this.prisma.pharmacyStaff.findFirst({
        where: { userId: user.id },
      });
      pharmacyId = staff?.pharmacyId;
    }

    const token = this.jwt.sign({
      sub: user.id,
      phone: user.phone,
      role: user.role,
      pharmacyId,
    });

    return {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          pharmacyId,
        },
      },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        pharmacyStaff: { include: { pharmacy: true }, take: 1 },
      },
    });
    if (!user) throw new UnauthorizedException();

    const staff = user.pharmacyStaff[0];

    return {
      success: true,
      data: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        pharmacyId: staff?.pharmacyId,
        pharmacy: staff?.pharmacy ?? null,
      },
    };
  }

  normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('225')) return `+${digits}`;
    if (digits.length === 10) return `+225${digits.slice(-10)}`;
    if (digits.length === 8) return `+225${digits}`;
    throw new BadRequestException('Format de numéro invalide');
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
