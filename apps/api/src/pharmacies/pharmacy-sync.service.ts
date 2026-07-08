import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { fetchAnnuaireciDuty, runDutyImport, slugify } from './pharmacy-import.utils';

@Injectable()
export class PharmacySyncService {
  private readonly logger = new Logger(PharmacySyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async uniqueSlug(base: string): Promise<string> {
    let slug = slugify(base);
    let n = 0;
    while (await this.prisma.pharmacy.findUnique({ where: { slug } })) {
      n += 1;
      slug = `${slugify(base)}-${n}`;
    }
    return slug;
  }

  async syncDutyFromUnppci() {
    this.logger.log('Sync planning UNPPCI depuis annuaireci.com…');
    const html = await fetchAnnuaireciDuty();
    const result = await runDutyImport(this.prisma, html, (b) => this.uniqueSlug(b));
    return { success: true, data: result };
  }

  async getDutyStatus() {
    const day = new Date();
    day.setHours(12, 0, 0, 0);
    const week = await this.prisma.pharmacyDutyWeek.findFirst({
      where: { weekStart: { lte: day }, weekEnd: { gte: day } },
      include: { _count: { select: { entries: true } } },
    });

    const bySource = await this.prisma.pharmacy.groupBy({
      by: ['source'],
      _count: { _all: true },
    });

    return {
      success: true,
      data: {
        totalPharmacies: await this.prisma.pharmacy.count(),
        bySource: Object.fromEntries(bySource.map((s) => [s.source, s._count._all])),
        currentWeek: week
          ? {
              weekStart: week.weekStart,
              weekEnd: week.weekEnd,
              syncedAt: week.syncedAt,
              dutyCount: week._count.entries,
            }
          : null,
      },
    };
  }
}
