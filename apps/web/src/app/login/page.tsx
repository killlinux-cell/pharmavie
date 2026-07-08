'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setStoredUser, setToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('+22507');
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
      setError(err instanceof Error ? err.message : 'Erreur envoi OTP');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api<{
        data: {
          token: string;
          user: { id: string; phone: string; role: string; pharmacyId?: string; firstName?: string; lastName?: string };
        };
      }>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
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
      setError(err instanceof Error ? err.message : 'Code invalide');
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

        {step === 'phone' ? (
          <form onSubmit={sendOtp} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Numéro de téléphone (+225)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="+2250700000002"
                required
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Compte test pharmacien : +2250700000002
              </p>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Envoi...' : 'Recevoir le code OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Code OTP (6 chiffres)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border border-surface-border px-4 py-3 text-center text-lg tracking-widest outline-none focus:border-brand-500"
                maxLength={6}
                required
              />
              {devCode && (
                <p className="mt-2 rounded-lg bg-brand-50 p-2 text-center text-sm text-brand-700">
                  Code dev : <strong>{devCode}</strong>
                </p>
              )}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Vérification...' : 'Se connecter'}
            </button>
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full text-sm text-slate-500 hover:text-brand-600"
            >
              Changer de numéro
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
