import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PharmacyDutyService {
  constructor(private readonly prisma: PrismaService) {}

  /** IDs des pharmacies de garde pour la date donnée (planning UNPPCI) */
  async getOnDutyPharmacyIds(at: Date = new Date()): Promise<Set<string>> {
    const day = new Date(at);
    day.setHours(12, 0, 0, 0);

    const week = await this.prisma.pharmacyDutyWeek.findFirst({
      where: { weekStart: { lte: day }, weekEnd: { gte: day } },
    });

    if (!week) return new Set();

    const entries = await this.prisma.pharmacyDutyEntry.findMany({
      where: { dutyWeekId: week.id, pharmacyId: { not: null } },
      select: { pharmacyId: true },
    });

    return new Set(entries.map((e) => e.pharmacyId!));
  }

  async hasActiveDutyWeek(at: Date = new Date()): Promise<boolean> {
    const day = new Date(at);
    day.setHours(12, 0, 0, 0);
    const count = await this.prisma.pharmacyDutyWeek.count({
      where: { weekStart: { lte: day }, weekEnd: { gte: day } },
    });
    return count > 0;
  }

  async getCurrentDutyWeek() {
    const day = new Date();
    day.setHours(12, 0, 0, 0);
    return this.prisma.pharmacyDutyWeek.findFirst({
      where: { weekStart: { lte: day }, weekEnd: { gte: day } },
      include: { _count: { select: { entries: true } } },
    });
  }
}
