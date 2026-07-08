'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, clearToken, getToken, setStoredUser } from '@/lib/api';

export interface StoredUser {
  id: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  role: string;
  pharmacyId?: string;
}

export const PHARMACY_ROLES = ['PHARMACIST', 'PHARMACY_STAFF'] as const;
export const ADMIN_ROLES = ['ADMIN'] as const;

export function useAuth(requiredRoles?: readonly string[], loginPath = '/login') {
  const router = useRouter();
  const rolesKey = requiredRoles?.join('|') ?? '';
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function check() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        router.replace(loginPath);
        return;
      }

      try {
        const res = await api<{
          data: StoredUser & { pharmacy?: { id: string; name: string } };
        }>('/auth/me');

        const profile: StoredUser = {
          id: res.data.id,
          phone: res.data.phone,
          firstName: res.data.firstName,
          lastName: res.data.lastName,
          role: res.data.role,
          pharmacyId: res.data.pharmacy?.id ?? res.data.pharmacyId,
        };

        if (requiredRoles && !requiredRoles.includes(profile.role)) {
          clearToken();
          setLoading(false);
          router.replace(loginPath);
          return;
        }

        setStoredUser(profile);
        setUser(profile);
      } catch {
        clearToken();
        router.replace(loginPath);
      } finally {
        setLoading(false);
      }
    }

    void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, rolesKey]);

  return { user, loading };
}

export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
