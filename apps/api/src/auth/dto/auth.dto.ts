import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { UserRole } from '@prisma/client';

export class SendOtpDto {
  @IsString()
  @Matches(/^(\+225|225)?[0-9]{8,10}$/, {
    message: 'Numéro ivoirien invalide (+225XXXXXXXX)',
  })
  phone!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class VerifyOtpDto {
  @IsString()
  @Matches(/^(\+225|225)?[0-9]{8,10}$/)
  phone!: string;

  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'Code OTP à 6 chiffres requis' })
  code!: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}
