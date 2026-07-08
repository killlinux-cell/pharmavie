import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import {
  CreateAddressDto,
  CreateReviewDto,
  UpdateAddressDto,
  UpdateNotificationPrefsDto,
  UpdateProfileDto,
} from './dto/users.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { Public, Roles } from '../common/decorators/auth.decorators';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('users/me')
  @Roles(UserRole.CLIENT, UserRole.PHARMACIST, UserRole.PHARMACY_STAFF, UserRole.ADMIN)
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('users/me/addresses')
  @Roles(UserRole.CLIENT)
  listAddresses(@CurrentUser() user: AuthUser) {
    return this.usersService.listAddresses(user.id);
  }

  @Post('users/me/addresses')
  @Roles(UserRole.CLIENT)
  createAddress(@CurrentUser() user: AuthUser, @Body() dto: CreateAddressDto) {
    return this.usersService.createAddress(user.id, dto);
  }

  @Patch('users/me/addresses/:id')
  @Roles(UserRole.CLIENT)
  updateAddress(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(user.id, id, dto);
  }

  @Delete('users/me/addresses/:id')
  @Roles(UserRole.CLIENT)
  deleteAddress(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usersService.deleteAddress(user.id, id);
  }

  @Get('users/me/favorites')
  @Roles(UserRole.CLIENT)
  listFavorites(@CurrentUser() user: AuthUser) {
    return this.usersService.listFavorites(user.id);
  }

  @Post('users/me/favorites/:pharmacyId')
  @Roles(UserRole.CLIENT)
  addFavorite(@CurrentUser() user: AuthUser, @Param('pharmacyId') pharmacyId: string) {
    return this.usersService.addFavorite(user.id, pharmacyId);
  }

  @Delete('users/me/favorites/:pharmacyId')
  @Roles(UserRole.CLIENT)
  removeFavorite(@CurrentUser() user: AuthUser, @Param('pharmacyId') pharmacyId: string) {
    return this.usersService.removeFavorite(user.id, pharmacyId);
  }

  @Get('users/me/notification-preferences')
  @Roles(UserRole.CLIENT)
  getNotificationPrefs(@CurrentUser() user: AuthUser) {
    return this.usersService.getNotificationPrefs(user.id);
  }

  @Patch('users/me/notification-preferences')
  @Roles(UserRole.CLIENT)
  updateNotificationPrefs(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateNotificationPrefsDto,
  ) {
    return this.usersService.updateNotificationPrefs(user.id, dto);
  }

  @Public()
  @Get('pharmacies/:pharmacyId/reviews')
  listReviews(@Param('pharmacyId') pharmacyId: string) {
    return this.usersService.listReviews(pharmacyId);
  }

  @Post('pharmacies/:pharmacyId/reviews')
  @Roles(UserRole.CLIENT)
  createReview(
    @CurrentUser() user: AuthUser,
    @Param('pharmacyId') pharmacyId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.usersService.createReview(user, pharmacyId, dto);
  }
}
