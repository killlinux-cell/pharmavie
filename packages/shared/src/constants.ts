export const APP_NAME = 'PharmaVie';
export const APP_TAGLINE = 'Votre santé, à portée de main';
export const DEFAULT_COUNTRY_CODE = '+225';
export const CURRENCY = 'FCFA';
export const API_VERSION = 'v1';

export const ORDER_STATUS = {
  NEW: 'NEW',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  DELIVERING: 'DELIVERING',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
} as const;

export const USER_ROLES = {
  CLIENT: 'CLIENT',
  PHARMACIST: 'PHARMACIST',
  PHARMACY_STAFF: 'PHARMACY_STAFF',
  ADMIN: 'ADMIN',
  DELIVERY: 'DELIVERY',
} as const;
