import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrescriptionStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { UpdatePrescriptionStatusDto } from './dto/prescriptions.dto';

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthUser, file: Express.Multer.File, notes?: string) {
    if (!file) throw new BadRequestException('Image requise');
    const imageUrl = `/uploads/prescriptions/${file.filename}`;
    const prescription = await this.prisma.prescription.create({
      data: {
        userId: user.id,
        imageUrl,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        notes,
      },
    });
    return { success: true, data: prescription };
  }

  async findAll(user: AuthUser) {
    let where: Record<string, unknown> = {};

    if (user.role === UserRole.CLIENT) {
      where = { userId: user.id };
    } else if (user.role === UserRole.ADMIN) {
      where = {};
    } else if (['PHARMACIST', 'PHARMACY_STAFF'].includes(user.role)) {
      const pharmacyId = user.pharmacyId ?? (await this.resolvePharmacyId(user));
      where = pharmacyId
        ? {
            OR: [
              { status: PrescriptionStatus.PENDING },
              { pharmacyId, status: { in: [PrescriptionStatus.VALIDATED, PrescriptionStatus.REJECTED] } },
            ],
          }
        : { status: PrescriptionStatus.PENDING };
    }

    const prescriptions = await this.prisma.prescription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, phone: true, firstName: true, lastName: true } },
      },
    });
    return { success: true, data: prescriptions };
  }

  private async resolvePharmacyId(user: AuthUser): Promise<string | undefined> {
    if (user.pharmacyId) return user.pharmacyId;
    const staff = await this.prisma.pharmacyStaff.findFirst({ where: { userId: user.id } });
    return staff?.pharmacyId;
  }

  async findOne(user: AuthUser, id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, phone: true, firstName: true, lastName: true } },
      },
    });
    if (!prescription) throw new NotFoundException('Ordonnance introuvable');
    if (user.role === UserRole.CLIENT && prescription.userId !== user.id) {
      throw new NotFoundException('Ordonnance introuvable');
    }
    return { success: true, data: prescription };
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdatePrescriptionStatusDto) {
    const prescription = await this.prisma.prescription.findUnique({ where: { id } });
    if (!prescription) throw new NotFoundException('Ordonnance introuvable');

    const pharmacyId = user.pharmacyId ?? (await this.resolvePharmacyId(user));

    const updated = await this.prisma.prescription.update({
      where: { id },
      data: {
        status: dto.status,
        rejectReason: dto.status === PrescriptionStatus.REJECTED ? dto.rejectReason : null,
        notes: dto.notes ?? prescription.notes,
        pharmacyId:
          dto.status === PrescriptionStatus.VALIDATED
            ? dto.pharmacyId ?? pharmacyId ?? prescription.pharmacyId
            : prescription.pharmacyId,
      },
    });
    return { success: true, data: updated };
  }
}
