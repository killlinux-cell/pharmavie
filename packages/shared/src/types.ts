import { ORDER_STATUS, USER_ROLES } from './constants';

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface PharmacySummary {
  id: string;
  name: string;
  address: string;
  phone: string;
  isOnDuty: boolean;
  isOpen: boolean;
  rating: number;
  distanceKm?: number;
  coordinates: Coordinates;
}

export interface ProductSummary {
  id: string;
  name: string;
  dci?: string;
  price: number;
  inStock: boolean;
  quantity?: number;
  pharmacyId: string;
  pharmacyName: string;
}
