import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpecialistDto, UpdateSpecialistDto } from './dto/specialist.dto';

interface FindAllParams {
  specialty?: string;
  district?: string;
  q?: string;
}

@Injectable()
export class SpecialistsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: FindAllParams) {
    const q = params.q?.trim().toLowerCase();

    const specialists = await this.prisma.specialist.findMany({
      where: {
        isActive: true,
        ...(params.specialty ? { specialty: params.specialty } : {}),
        ...(params.district ? { district: params.district } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { specialty: { contains: q, mode: 'insensitive' } },
                { district: { contains: q, mode: 'insensitive' } },
                { location: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ rating: 'desc' }, { name: 'asc' }],
    });

    return { success: true, data: specialists };
  }

  async listSpecialties() {
    const rows = await this.prisma.specialist.findMany({
      where: { isActive: true },
      select: { specialty: true },
      distinct: ['specialty'],
      orderBy: { specialty: 'asc' },
    });

    return { success: true, data: rows.map((r) => r.specialty) };
  }

  async findAllAdmin(includeInactive = true) {
    const specialists = await this.prisma.specialist.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ isActive: 'desc' }, { rating: 'desc' }, { name: 'asc' }],
    });

    return { success: true, data: specialists };
  }

  async create(dto: CreateSpecialistDto) {
    const specialist = await this.prisma.specialist.create({
      data: {
        name: dto.name.trim(),
        specialty: dto.specialty.trim(),
        location: dto.location.trim(),
        district: dto.district.trim(),
        city: dto.city?.trim() || 'Abidjan',
        phone: dto.phone.trim(),
        rating: dto.rating ?? 0,
      },
    });

    return { success: true, data: specialist };
  }

  async update(id: string, dto: UpdateSpecialistDto) {
    const existing = await this.prisma.specialist.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Spécialiste introuvable');

    const specialist = await this.prisma.specialist.update({
      where: { id },
      data: {
        ...(dto.name != null ? { name: dto.name.trim() } : {}),
        ...(dto.specialty != null ? { specialty: dto.specialty.trim() } : {}),
        ...(dto.location != null ? { location: dto.location.trim() } : {}),
        ...(dto.district != null ? { district: dto.district.trim() } : {}),
        ...(dto.city != null ? { city: dto.city.trim() } : {}),
        ...(dto.phone != null ? { phone: dto.phone.trim() } : {}),
        ...(dto.rating != null ? { rating: dto.rating } : {}),
        ...(dto.isActive != null ? { isActive: dto.isActive } : {}),
      },
    });

    return { success: true, data: specialist };
  }

  async remove(id: string) {
    const existing = await this.prisma.specialist.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Spécialiste introuvable');

    await this.prisma.specialist.delete({ where: { id } });
    return { success: true };
  }
}
