'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { api, setStoredUser, setToken } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('admin@pharmavie.space');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api<{ data: { token: string; user: { role: string } } }>('/auth/login/admin', {
        method: 'POST',
        body: JSON.stringify({ login, password }),
        token: null,
      });

      if (res.data.user.role !== 'ADMIN') {
        setError('Accès réservé aux administrateurs PharmaVie.');
        return;
      }

      setToken(res.data.token);
      const me = await api<{ data: Record<string, unknown> }>('/auth/me', { token: res.data.token });
      setStoredUser(me.data);
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-slate-900">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Portail Admin</h1>
            <p className="text-sm text-slate-400">PharmaVie · Administration nationale</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Email ou pseudo</label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-amber-500"
              placeholder="admin@pharmavie.space"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-amber-500"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          <p className="text-xs text-slate-500">
            Compte test : admin@pharmavie.space ou pseudo <strong>admin</strong>
          </p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-slate-900">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
