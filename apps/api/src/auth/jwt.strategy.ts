import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

interface JwtPayload {
  sub: string;
  phone: string;
  role: string;
  pharmacyId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'dev-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Session invalide');
    }

    let pharmacyId = payload.pharmacyId;
    if (!pharmacyId && ['PHARMACIST', 'PHARMACY_STAFF'].includes(user.role)) {
      const staff = await this.prisma.pharmacyStaff.findFirst({
        where: { userId: user.id },
      });
      pharmacyId = staff?.pharmacyId;
    }

    return {
      id: user.id,
      phone: user.phone,
      role: user.role,
      pharmacyId,
    };
  }
}
