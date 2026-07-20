/**
 * Import automatique du catalogue AIRP via MEDPRYM (Côte d'Ivoire)
 *
 * Usage:
 *   npm run import:medprym                          # fetch + import complet
 *   npm run import:medprym -- --dry-run             # simulation
 *   npm run import:medprym -- --fetch-only          # télécharge le cache JSON
 *   npm run import:medprym -- --import-only         # import depuis le cache
 *   npm run import:medprym -- --enrich-only          # DCI/ATC depuis cache existant + import
 *   npm run import:medprym -- --with-stock          # assigne stock aux pharmacies
 *   npm run import:medprym -- --pages=1-3           # pages test
 *   npm run import:medprym -- --delay=200             # ms entre requêtes detail
 *
 * Source: https://www.medprym.ovh/afrique/cote-ivoire (données AIRP)
 */
import { PrismaClient } from '@prisma/client';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  fetchListPage,
  fetchPage,
  parseDetailPage,
  parseListPage,
  parsePagination,
} from './medprym-parser';
import type { MedprymCache, MedprymListItem } from './medprym-types';
import {
  airpToBarcode,
  categoryFromAtc,
  inferRequiresRx,
  normalizeDci,
} from './medprym-utils';
import { estimatePrice } from '../../src/common/estimate-price';
import { productImagePath } from '../../src/common/product-image.util';

const prisma = new PrismaClient();
const CACHE_PATH = join(__dirname, '../data/medprym-cache.json');
const LIMIT_PER_PAGE = 500;

interface CliOptions {
  dryRun: boolean;
  fetchOnly: boolean;
  importOnly: boolean;
  enrichOnly: boolean;
  withDci: boolean;
  withStock: boolean;
  pageStart: number;
  pageEnd: number | null;
  delayMs: number;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const get = (flag: string) => args.find((a) => a.startsWith(`${flag}=`))?.split('=')[1];

  let pageStart = 1;
  let pageEnd: number | null = null;
  const pagesArg = get('--pages');
  if (pagesArg) {
    const [s, e] = pagesArg.split('-').map(Number);
    pageStart = s || 1;
    pageEnd = e || s || 1;
  }

  return {
    dryRun: args.includes('--dry-run'),
    fetchOnly: args.includes('--fetch-only'),
    importOnly: args.includes('--import-only'),
    enrichOnly: args.includes('--enrich-only'),
    withDci: args.includes('--with-dci') || args.includes('--enrich-only'),
    withStock: args.includes('--with-stock'),
    pageStart,
    pageEnd,
    delayMs: Number(get('--delay') ?? '150'),
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchCatalog(opts: CliOptions): Promise<MedprymListItem[]> {
  console.log('📡 Téléchargement MEDPRYM / AIRP (Côte d\'Ivoire)...');

  const firstHtml = await fetchListPage(0, LIMIT_PER_PAGE);
  const { totalPages, totalItems } = parsePagination(firstHtml);
  const endPage = opts.pageEnd ?? totalPages;

  console.log(`   ${totalItems} médicaments · ${totalPages} pages (${LIMIT_PER_PAGE}/page)`);
  console.log(`   Import pages ${opts.pageStart} → ${endPage}`);

  const all: MedprymListItem[] = [];
  const seen = new Set<string>();

  for (let page = opts.pageStart; page <= endPage; page++) {
    const start = (page - 1) * LIMIT_PER_PAGE;
    const html = start === 0 && opts.pageStart === 1 ? firstHtml : await fetchListPage(start, LIMIT_PER_PAGE);
    const items = parseListPage(html);
    let added = 0;
    for (const item of items) {
      const key = item.airpAuth.toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(item);
      added++;
    }
    console.log(`   Page ${page}/${endPage} : +${added} (${all.length} total)`);
    if (page < endPage) await sleep(300);
  }

  if (opts.withDci && !opts.enrichOnly) await enrichWithDci(all, opts);

  saveCache(all);
  console.log(`\n💾 Cache sauvegardé : ${CACHE_PATH} (${all.length} produits)`);

  return all;
}

function saveCache(items: MedprymListItem[]) {
  const cache: MedprymCache = {
    fetchedAt: new Date().toISOString(),
    source: 'https://www.medprym.ovh/afrique/cote-ivoire',
    totalItems: items.length,
    items,
  };
  mkdirSync(join(__dirname, '../data'), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
}

async function enrichWithDci(items: MedprymListItem[], opts: CliOptions) {
  const todo = items.filter((i) => !i.dci || !i.atcCode);
  console.log(`\n🔬 Enrichissement DCI/ATC : ${todo.length}/${items.length} fiches à compléter (delay ${opts.delayMs}ms)...`);

  let done = 0;
  let enriched = 0;
  for (const item of items) {
    if (item.dci && item.atcCode) continue;
    try {
      const html = await fetchPage(item.detailUrl);
      const detail = parseDetailPage(html);
      item.molecule = detail.molecule ?? item.molecule;
      item.dci = detail.dci ?? detail.molecule ?? item.dci;
      item.atcCode = detail.atcCode ?? item.atcCode;
      item.packaging = detail.packaging ?? item.packaging;
      item.origin = detail.origin ?? item.origin;
      if (item.dci || item.atcCode) enriched++;
    } catch (err) {
      console.warn(`   ⚠ Detail échoué ${item.airpAuth}: ${(err as Error).message}`);
    }
    done++;
    if (done % 100 === 0) {
      console.log(`   … ${done}/${todo.length} traités · ${enriched} enrichis`);
      saveCache(items);
    }
    await sleep(opts.delayMs);
  }
  saveCache(items);
  console.log(`\n💾 Cache enrichi : ${enriched} fiches DCI/ATC complétées`);
}

function loadCache(): MedprymListItem[] {
  if (!existsSync(CACHE_PATH)) {
    throw new Error(`Cache introuvable : ${CACHE_PATH}. Lancez d'abord --fetch-only ou sans --import-only.`);
  }
  const cache = JSON.parse(readFileSync(CACHE_PATH, 'utf-8')) as MedprymCache;
  console.log(`📂 Cache chargé : ${cache.items.length} produits (${cache.fetchedAt})`);
  return cache.items;
}

async function importToDatabase(items: MedprymListItem[], opts: CliOptions) {
  console.log(`\n💊 Import en base${opts.dryRun ? ' (DRY RUN)' : ''}...`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let seq = 100000;

  for (const item of items) {
    seq++;
    const dci = normalizeDci(item.dci ?? item.molecule);
    const category = categoryFromAtc(item.atcCode);
    const requiresRx = inferRequiresRx(item.name, dci, item.atcCode);
    const barcode = airpToBarcode(item.airpAuth, seq);
    const description = [
      item.packaging ? `Conditionnement: ${item.packaging}` : null,
      item.origin ? `Origine: ${item.origin}` : null,
      `Réf. AIRP: ${item.airpAuth}`,
    ]
      .filter(Boolean)
      .join(' · ');

    const data = {
      name: item.name.trim(),
      dci: dci ?? null,
      category,
      barcode,
      airpAuth: item.airpAuth.trim(),
      atcCode: item.atcCode ?? null,
      laboratory: item.laboratory ?? null,
      requiresRx,
      description,
      imageUrl: productImagePath(category, item.name.trim(), dci),
    };

    if (opts.dryRun) {
      if (created + updated < 5) console.log('   [dry]', data.name, '—', data.airpAuth);
      created++;
      continue;
    }

    try {
      const existing = await prisma.product.findUnique({ where: { airpAuth: data.airpAuth } });
      if (existing) {
        const { barcode: _b, ...rest } = data;
        await prisma.product.update({
          where: { airpAuth: data.airpAuth },
          data: { ...rest, barcode: existing.barcode },
        });
        updated++;
      } else {
        await prisma.product.create({ data });
        created++;
      }
    } catch (err) {
      skipped++;
      if (skipped <= 5) console.warn(`   ⚠ Ignoré ${item.airpAuth}: ${(err as Error).message}`);
    }

    if ((created + updated + skipped) % 500 === 0) {
      console.log(`   … ${created + updated + skipped}/${items.length}`);
    }
  }

  console.log(`\n✅ Import terminé : ${created} créés, ${updated} mis à jour, ${skipped} ignorés`);

  if (opts.withStock && !opts.dryRun) {
    await assignStock();
  }
}

async function assignStock() {
  console.log('\n🏪 Attribution stock aux pharmacies (catalogue complet)...');
  const { seedAllPharmaciesInventory } = await import('../../src/common/inventory-seed.util');
  const { lines, pharmacies } = await seedAllPharmaciesInventory(prisma, { onlyMissing: true });
  console.log(`   ${lines} lignes pour ${pharmacies} pharmacies`);
}

async function main() {
  const opts = parseArgs();
  console.log('🇨🇮 PharmaVie — Import catalogue AIRP/MEDPRYM\n');

  let items: MedprymListItem[];

  if (opts.enrichOnly) {
    items = loadCache();
    await enrichWithDci(items, opts);
  } else if (opts.importOnly) {
    items = loadCache();
  } else {
    items = await fetchCatalog(opts);
    if (opts.fetchOnly) {
      console.log('\n✔ Fetch terminé (--fetch-only, pas d\'import DB)');
      return;
    }
  }

  if (!opts.fetchOnly || opts.enrichOnly) {
    await importToDatabase(items, opts);
  }
}

main()
  .catch((e) => {
    console.error('❌ Erreur import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
