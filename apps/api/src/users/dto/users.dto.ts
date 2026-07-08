import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

export class CreateAddressDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsString()
  street!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  label?: string;

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
  latitude?: number;

  @IsOptional()
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateNotificationPrefsDto {
  @IsOptional()
  @IsBoolean()
  orderStatus?: boolean;

  @IsOptional()
  @IsBoolean()
  promotions?: boolean;

  @IsOptional()
  @IsBoolean()
  reminders?: boolean;

  @IsOptional()
  @IsBoolean()
  pharmacyNews?: boolean;
}
