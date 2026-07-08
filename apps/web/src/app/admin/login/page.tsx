'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { api, setStoredUser, setToken } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('+2250700000099');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [devCode, setDevCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api<{ data: { devCode?: string } }>('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phone }),
        token: null,
      });
      if (res.data.devCode) setDevCode(res.data.devCode);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api<{ data: { token: string; user: { role: string } } }>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
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
      setError(err instanceof Error ? err.message : 'Code invalide');
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

        {step === 'phone' ? (
          <form onSubmit={sendOtp} className="space-y-4">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-amber-500"
              placeholder="+2250700000099"
              required
            />
            <p className="text-xs text-slate-500">Compte test admin : +2250700000099</p>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-slate-900">
              {loading ? 'Envoi...' : 'Recevoir OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-center text-lg tracking-widest text-white"
              maxLength={6}
              required
            />
            {devCode && (
              <p className="rounded-lg bg-amber-500/10 p-2 text-center text-sm text-amber-400">
                Code dev : <strong>{devCode}</strong>
              </p>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-slate-900">
              {loading ? 'Connexion...' : 'Accéder au portail'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
