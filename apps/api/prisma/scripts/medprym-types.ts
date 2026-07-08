export interface MedprymListItem {
  name: string;
  laboratory?: string;
  airpAuth: string;
  detailUrl: string;
  dci?: string;
  atcCode?: string;
  molecule?: string;
  packaging?: string;
  origin?: string;
}

export interface MedprymDetail {
  molecule?: string;
  dci?: string;
  atcCode?: string;
  packaging?: string;
  origin?: string;
}

export interface MedprymCache {
  fetchedAt: string;
  source: string;
  totalItems: number;
  items: MedprymListItem[];
}
