const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('pharmavie_token');
}

export function setToken(token: string) {
  localStorage.setItem('pharmavie_token', token);
}

export function clearToken() {
  localStorage.removeItem('pharmavie_token');
  localStorage.removeItem('pharmavie_user');
}

export function getStoredUser<T>() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('pharmavie_user');
  return raw ? (JSON.parse(raw) as T) : null;
}

export function setStoredUser(user: unknown) {
  localStorage.setItem('pharmavie_user', JSON.stringify(user));
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const token = options.token ?? getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('Impossible de joindre le serveur. Vérifiez que l\'API tourne.', 0);
  }

  let data: { message?: string; error?: string };
  try {
    data = await res.json();
  } catch {
    throw new ApiError('Réponse serveur invalide', res.status);
  }

  if (res.status === 401 && typeof window !== 'undefined') {
    clearToken();
    const loginPath = window.location.pathname.startsWith('/admin') ? '/admin/login' : '/login';
    window.location.href = loginPath;
    throw new ApiError('Session expirée', 401);
  }

  if (!res.ok) {
    throw new ApiError(data.message ?? data.error ?? 'Erreur API', res.status);
  }

  return data as T;
}

export function formatFcfa(amount: number) {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

export function getPharmacyId(): string | null {
  const user = getStoredUser<{ pharmacyId?: string }>();
  return user?.pharmacyId ?? null;
}

export function mediaUrl(path: string): string {
  const base = API_URL.replace(/\/api\/v1\/?$/, '');
  if (path.startsWith('http')) return path;
  return `${base}${path}`;
}
