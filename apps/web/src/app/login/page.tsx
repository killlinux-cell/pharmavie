'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setStoredUser, setToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('pharmacie-plateau');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api<{
        data: {
          token: string;
          user: { id: string; phone: string; role: string; pharmacyId?: string; firstName?: string; lastName?: string };
        };
      }>('/auth/login/staff', {
        method: 'POST',
        body: JSON.stringify({ login, password }),
        token: null,
      });

      setToken(res.data.token);

      const me = await api<{
        data: {
          id: string;
          phone: string;
          role: string;
          firstName?: string;
          lastName?: string;
          pharmacy?: { id: string };
        };
      }>('/auth/me', { token: res.data.token });

      const profile = {
        id: me.data.id,
        phone: me.data.phone,
        role: me.data.role,
        firstName: me.data.firstName,
        lastName: me.data.lastName,
        pharmacyId: me.data.pharmacy?.id ?? res.data.user.pharmacyId,
      };
      setStoredUser(profile);

      if (profile.role === 'ADMIN') {
        router.replace('/admin');
      } else if (['PHARMACIST', 'PHARMACY_STAFF'].includes(profile.role)) {
        router.replace('/dashboard');
      } else {
        setError('Ce compte est un compte client. Utilisez l\'app mobile.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-white p-6">
      <div className="card w-full max-w-md animate-slide-up">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            P
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">PharmaVie</h1>
            <p className="text-sm text-slate-500">Connexion espace pharmacie</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Email ou pseudo
            </label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full rounded-xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="pharmacie-plateau"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          <p className="text-xs text-slate-400">
            Comptes test : <strong>pharmacie-plateau</strong>, pharmacie-cocody, pharmacie-marcory
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
