import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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

  private async applyDutyFlags(weekStart: Date, weekEnd: Date) {
    const week = await this.prisma.pharmacyDutyWeek.findFirst({
      where: { weekStart, weekEnd },
      include: {
        entries: {
          where: { pharmacyId: { not: null } },
          select: { pharmacyId: true },
        },
      },
    });
    if (!week) return;

    const onDutyIds = week.entries
      .map((e) => e.pharmacyId)
      .filter((id): id is string => Boolean(id));

    await this.prisma.pharmacy.updateMany({ data: { isOnDuty: false } });
    if (onDutyIds.length) {
      await this.prisma.pharmacy.updateMany({
        where: { id: { in: onDutyIds } },
        data: { isOnDuty: true },
      });
    }
  }

  async syncDutyFromUnppci() {
    this.logger.log('Sync planning UNPPCI depuis annuaireci.com…');
    try {
      const html = await fetchAnnuaireciDuty();
      const result = await runDutyImport(this.prisma, html, (b) => this.uniqueSlug(b));
      await this.applyDutyFlags(result.weekStart, result.weekEnd);
      return { success: true, data: result };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Synchronisation des gardes UNPPCI échouée';
      this.logger.error(`Sync gardes UNPPCI: ${message}`, err instanceof Error ? err.stack : undefined);
      throw new BadRequestException(message);
    }
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
