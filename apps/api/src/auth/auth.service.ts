import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole } from '@prisma/client';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { LoginDto, SendOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { verifyPassword } from './password.util';
import { OtpCache } from './otp-cache';

@Injectable()
export class AuthService {
  private readonly otpTtlSeconds = 300;
  private readonly otpCache: OtpCache;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sms: SmsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.otpCache = new OtpCache(redis);
  }

  async sendOtp(dto: SendOtpDto) {
    const phone = this.normalizePhone(dto.phone);
    const code = this.generateOtp();
    await this.otpCache.set(phone, code, this.otpTtlSeconds);

    let smsSent = false;
    try {
      smsSent = await this.sms.sendOtp(phone, code);
    } catch {
      throw new BadRequestException('Envoi SMS impossible. Réessayez dans quelques minutes.');
    }

    const exposeDevCode =
      !smsSent &&
      (process.env.NODE_ENV !== 'production' || !this.sms.isSmsConfigured());

    return {
      success: true,
      message: smsSent ? 'Code OTP envoyé par SMS' : 'Code OTP envoyé',
      data: {
        phone,
        expiresIn: this.otpTtlSeconds,
        ...(exposeDevCode ? { devCode: code } : {}),
      },
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const phone = this.normalizePhone(dto.phone);
    const stored = await this.otpCache.get(phone);

    if (!stored || stored !== dto.code) {
      throw new UnauthorizedException('Code OTP invalide ou expiré');
    }

    await this.otpCache.del(phone);

    let user = await this.findUserByPhone(phone);
    if (!user) {
      try {
        user = await this.prisma.user.create({
          data: {
            phone,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: UserRole.CLIENT,
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          user = await this.findUserByPhone(phone);
        }
        if (!user) throw err;
      }
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Compte désactivé. Contactez le support PharmaVie.');
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
    if (digits.startsWith('225')) {
      const local = digits.slice(3);
      if (local.length === 9 && !local.startsWith('0')) return `+2250${local}`;
      if (local.length === 10) return `+225${local}`;
      if (local.length === 8) return `+225${local}`;
      return `+225${local}`;
    }
    if (digits.length === 10) return `+225${digits}`;
    if (digits.length === 9 && digits.startsWith('0')) return `+225${digits}`;
    if (digits.length === 9) return `+2250${digits}`;
    if (digits.length === 8) return `+225${digits}`;
    throw new BadRequestException('Format de numéro invalide');
  }

  private phoneLookupVariants(phone: string): string[] {
    const normalized = this.normalizePhone(phone);
    const digits = normalized.replace(/\D/g, '');
    const local = digits.startsWith('225') ? digits.slice(3) : digits;
    const variants = new Set<string>([normalized, `+${digits}`, digits]);
    if (local.length === 10) variants.add(`+225${local}`);
    if (local.length === 9) {
      variants.add(`+2250${local}`);
      variants.add(`+225${local}`);
    }
    if (local.length === 8) variants.add(`+225${local}`);
    return [...variants];
  }

  private async findUserByPhone(phone: string) {
    const normalized = this.normalizePhone(phone);
    const variants = this.phoneLookupVariants(phone);

    const user = await this.prisma.user.findFirst({
      where: { phone: { in: variants } },
    });

    if (user && user.phone !== normalized) {
      try {
        return await this.prisma.user.update({
          where: { id: user.id },
          data: { phone: normalized },
        });
      } catch {
        return user;
      }
    }

    return user;
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
