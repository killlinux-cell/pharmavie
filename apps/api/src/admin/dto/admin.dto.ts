import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreatePharmacyDto {
  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsString()
  street!: string;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  openTime?: string;

  @IsOptional()
  @IsString()
  closeTime?: string;

  @IsOptional()
  @IsString()
  licenseNo?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  staffUsername?: string;

  @ValidateIf((o: CreatePharmacyDto) => Boolean(o.staffUsername))
  @IsString()
  @MinLength(6, { message: 'Mot de passe pharmacien : 6 caractères minimum' })
  staffPassword?: string;

  @IsOptional()
  @IsString()
  staffEmail?: string;

  @IsOptional()
  @IsString()
  staffPhone?: string;

  @IsOptional()
  @IsString()
  staffFirstName?: string;

  @IsOptional()
  @IsString()
  staffLastName?: string;
}

export class AdminUpdatePharmacyDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isOnDuty?: boolean;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  openTime?: string;

  @IsOptional()
  @IsString()
  closeTime?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AdminUpdateUserDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}

export class AdminAssignStaffDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
