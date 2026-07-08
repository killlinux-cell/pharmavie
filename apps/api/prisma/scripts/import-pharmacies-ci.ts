/**
 * Import pharmacies Côte d'Ivoire — OpenStreetMap + planning UNPPCI (annuaireci.com)
 *
 * Usage:
 *   npm run import:pharmacies              # OSM + garde UNPPCI
 *   npm run import:pharmacies -- --osm-only
 *   npm run import:pharmacies -- --duty-only
 *   npm run import:pharmacies -- --dry-run
 */
import { PharmacySource, PrismaClient } from '@prisma/client';
import {
  CI_REGIONS,
  coordsForDistrict,
  fetchAnnuaireciDuty,
  fetchOsmRegion,
  runDutyImport,
  slugify,
  parseAnnuaireciDuty,
} from '../../src/pharmacies/pharmacy-import.utils';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const osmOnly = args.includes('--osm-only');
const dutyOnly = args.includes('--duty-only');

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let n = 0;
  while (await prisma.pharmacy.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
  return slug;
}

async function importOsm() {
  console.log('→ Import OpenStreetMap (pharmacies CI)…');
  let total = 0;

  for (const region of CI_REGIONS) {
    try {
      const items = await fetchOsmRegion(region.bbox, region.city);
      console.log(`  ${region.name}: ${items.length} trouvées`);

      for (const item of items) {
        if (dryRun) continue;

        await prisma.pharmacy.upsert({
          where: { osmId: item.osmId },
          update: {
            name: item.name,
            street: item.street,
            city: item.city,
            district: item.district ?? region.name,
            latitude: item.latitude,
            longitude: item.longitude,
            phone: item.phone ?? '+2250000000000',
            source: PharmacySource.OSM,
          },
          create: {
            osmId: item.osmId,
            name: item.name,
            slug: await uniqueSlug(item.name + '-' + region.name),
            street: item.street,
            city: item.city,
            district: item.district ?? region.name,
            latitude: item.latitude,
            longitude: item.longitude,
            phone: item.phone ?? '+2250000000000',
            source: PharmacySource.OSM,
            openTime: '08:00',
            closeTime: '20:00',
          },
        });
        total += 1;
      }
    } catch (e) {
      console.warn(`  ⚠ ${region.name}: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log(`  ✓ ${total} pharmacies OSM importées`);
  return total;
}

async function importDuty() {
  console.log('→ Sync planning UNPPCI (annuaireci.com)…');
  const html = await fetchAnnuaireciDuty();
  if (dryRun) {
    const { week, pharmacies } = parseAnnuaireciDuty(html);
    console.log(`  (dry-run) ${pharmacies.length} pharmacies, semaine ${week?.weekStart.toISOString().slice(0, 10)}`);
    return pharmacies.length;
  }
  const result = await runDutyImport(prisma, html, uniqueSlug);

  console.log(`  Semaine: ${result.weekStart.toISOString().slice(0, 10)} → ${result.weekEnd.toISOString().slice(0, 10)}`);
  console.log(`  ${result.total} pharmacies de garde (${result.linked} reliées, ${result.created} créées)`);
  return result.total;
}

async function main() {
  console.log('PharmaVie — Import pharmacies Côte d\'Ivoire');
  if (dryRun) console.log('(mode dry-run — aucune écriture DB)');

  if (!dutyOnly) await importOsm();
  if (!osmOnly) await importDuty();

  const counts = await prisma.pharmacy.groupBy({ by: ['source'], _count: { id: true } });
  console.log('\nRécapitulatif base:');
  for (const c of counts) console.log(`  ${c.source}: ${c._count.id}`);
  console.log(`  Total: ${await prisma.pharmacy.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
