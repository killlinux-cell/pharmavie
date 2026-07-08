import type { MedprymListItem, MedprymDetail } from './medprym-types';

const BASE_URL = 'https://www.medprym.ovh';
const LIST_URL = `${BASE_URL}/afrique/cote-ivoire`;

export function parseListPage(html: string): MedprymListItem[] {
  const items: MedprymListItem[] = [];
  const blockRegex =
    /<div class='(?:odd|even)'[^>]*>\s*<h3 class='title'>([^<]+)<\/h3>[\s\S]*?Laboratoire\s*:\s*([^<]+)[\s\S]*?Numéro autorisation\s*([^<]+)[\s\S]*?href="([^"]+)"/g;

  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(html)) !== null) {
    const name = decodeHtml(match[1].trim());
    const laboratory = decodeHtml(match[2].trim());
    const airpAuth = decodeHtml(match[3].trim());
    const detailPath = match[4].trim();
    if (!name || !airpAuth) continue;
    items.push({
      name,
      laboratory: laboratory || undefined,
      airpAuth,
      detailUrl: detailPath.startsWith('http') ? detailPath : `${BASE_URL}${detailPath}`,
    });
  }
  return items;
}

export function parseDetailPage(html: string): MedprymDetail {
  const molecule =
    extract(/Molécule\s*:\s*<\/strong><\/span>\s*([^<]+)/i, html) ??
    extract(/Molécule\s*:\s*<\/strong><\/span>([^<]+)/i, html);

  const dciFromSignification = extract(/Signification\s*:\s*<\/span><span[^>]*>\s*([^<]+)/i, html);
  const atcCode =
    extract(/Code ATC\s*:\s*<\/span><span[^>]*>\s*([A-Z0-9]+)/i, html) ??
    extract(/Code ATC\s*:\s*[^>]*>\s*([A-Z0-9]{3,7})/i, html);

  const packaging = extract(/Conditionnement\s*:\s*<\/strong><\/span>\s*([^<]+)/i, html);
  const origin = extract(/Pays d'Origine\s*:\s*<\/strong><\/span>\s*([^<]+)/i, html);

  return {
    molecule: molecule?.trim(),
    dci: dciFromSignification?.trim(),
    atcCode: atcCode?.trim(),
    packaging: packaging?.trim(),
    origin: origin?.trim(),
  };
}

export function parsePagination(html: string): { totalPages: number; totalItems: number } {
  const pageMatch = html.match(/Page\s+\d+\s+sur\s+(\d+)/i);
  const totalMatch = html.match(/Résultats\s+\d+\s+à\s+\d+\s+sur\s+(\d+)/i);
  return {
    totalPages: pageMatch ? Number(pageMatch[1]) : 1,
    totalItems: totalMatch ? Number(totalMatch[1]) : 0,
  };
}

function extract(pattern: RegExp, html: string): string | undefined {
  const m = html.match(pattern);
  return m?.[1]?.trim();
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"');
}

export async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'PharmaVie-Import/1.0 (+https://pharmavie.ci; usage research)',
      Accept: 'text/html',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  return res.text();
}

export async function fetchListPage(start: number, limit: number): Promise<string> {
  const url = `${LIST_URL}?limit=${limit}&start=${start}`;
  return fetchPage(url);
}

export { LIST_URL, BASE_URL };
