import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { PrescriptionsService } from './prescriptions.service';
import { UpdatePrescriptionStatusDto } from './dto/prescriptions.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/auth.decorators';

const uploadDir = join(process.cwd(), 'uploads', 'prescriptions');
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  @Roles(UserRole.CLIENT)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          let ext = extname(file.originalname).toLowerCase();
          if (!ext || ext === '.heic' || ext === '.heif') ext = '.jpg';
          cb(null, `${unique}${ext}`);
        },
      }),
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const mime = (file.mimetype ?? '').toLowerCase();
        const ext = extname(file.originalname).toLowerCase();
        const allowedMime = /\/(jpeg|jpg|png|webp|heic|heif)$/;
        const allowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
        if (
          allowedMime.test(mime) ||
          allowedExt.includes(ext) ||
          mime === 'application/octet-stream'
        ) {
          cb(null, true);
          return;
        }
        cb(new BadRequestException('Format image non supporté (JPEG, PNG, WebP, HEIC)'), false);
      },
    }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('notes') notes?: string,
  ) {
    return this.prescriptionsService.create(user, file, notes);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.prescriptionsService.findAll(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.prescriptionsService.findOne(user, id);
  }

  @Patch(':id/status')
  @Roles(UserRole.PHARMACIST, UserRole.PHARMACY_STAFF, UserRole.ADMIN)
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePrescriptionStatusDto,
  ) {
    return this.prescriptionsService.updateStatus(user, id, dto);
  }
}
