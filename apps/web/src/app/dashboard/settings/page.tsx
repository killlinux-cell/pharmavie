'use client';

import { useEffect, useState } from 'react';
import { api, getPharmacyId } from '@/lib/api';

interface Pharmacy {
  id: string;
  name: string;
  phone: string;
  email?: string;
  street: string;
  city?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  openTime?: string;
  closeTime?: string;
  isOnDuty: boolean;
  description?: string;
}

export default function SettingsPage() {
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const me = await api<{ data: { pharmacy?: Pharmacy } }>('/auth/me');
        if (me.data.pharmacy) {
          setPharmacy(me.data.pharmacy);
        } else {
          const pharmacyId = getPharmacyId();
          if (pharmacyId) {
            const res = await api<{ data: Pharmacy }>(`/pharmacies/${pharmacyId}`);
            setPharmacy(res.data);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur chargement');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!pharmacy) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await api<{ data: Pharmacy }>(`/pharmacies/${pharmacy.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: pharmacy.name,
          phone: pharmacy.phone,
          email: pharmacy.email,
          street: pharmacy.street,
          city: pharmacy.city,
          district: pharmacy.district,
          latitude: pharmacy.latitude,
          longitude: pharmacy.longitude,
          openTime: pharmacy.openTime,
          closeTime: pharmacy.closeTime,
          isOnDuty: pharmacy.isOnDuty,
          description: pharmacy.description,
        }),
      });
      setPharmacy(res.data);
      setMessage('Paramètres enregistrés avec succès');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card animate-pulse h-64" />;
  if (!pharmacy) {
    return (
      <div className="card text-slate-500">
        Aucune pharmacie associée à ce compte.
      </div>
    );
  }

  return (
    <form onSubmit={save} className="card space-y-5 animate-fade-in">
      <h2 className="text-lg font-semibold text-slate-900">Paramètres pharmacie</h2>

      {message && <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700">{message}</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-slate-600">Nom</span>
          <input
            value={pharmacy.name}
            onChange={(e) => setPharmacy({ ...pharmacy, name: e.target.value })}
            className="mt-1 w-full rounded-xl border border-surface-border px-4 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-600">Téléphone</span>
          <input
            value={pharmacy.phone}
            onChange={(e) => setPharmacy({ ...pharmacy, phone: e.target.value })}
            className="mt-1 w-full rounded-xl border border-surface-border px-4 py-2.5 text-sm"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm text-slate-600">Adresse</span>
          <input
            value={pharmacy.street}
            onChange={(e) => setPharmacy({ ...pharmacy, street: e.target.value })}
            className="mt-1 w-full rounded-xl border border-surface-border px-4 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-600">Quartier</span>
          <input
            value={pharmacy.district ?? ''}
            onChange={(e) => setPharmacy({ ...pharmacy, district: e.target.value })}
            className="mt-1 w-full rounded-xl border border-surface-border px-4 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-600">Ville</span>
          <input
            value={pharmacy.city ?? 'Abidjan'}
            onChange={(e) => setPharmacy({ ...pharmacy, city: e.target.value })}
            className="mt-1 w-full rounded-xl border border-surface-border px-4 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-600">Latitude GPS</span>
          <input
            type="number"
            step="any"
            value={pharmacy.latitude ?? ''}
            onChange={(e) => setPharmacy({ ...pharmacy, latitude: parseFloat(e.target.value) || undefined })}
            placeholder="5.3197"
            className="mt-1 w-full rounded-xl border border-surface-border px-4 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-600">Longitude GPS</span>
          <input
            type="number"
            step="any"
            value={pharmacy.longitude ?? ''}
            onChange={(e) => setPharmacy({ ...pharmacy, longitude: parseFloat(e.target.value) || undefined })}
            placeholder="-4.0268"
            className="mt-1 w-full rounded-xl border border-surface-border px-4 py-2.5 text-sm"
          />
        </label>
        <p className="sm:col-span-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          Pour définir votre position sur la carte mobile : ouvrez Google Maps → clic droit sur votre pharmacie →
          « Copier les coordonnées » → collez latitude et longitude ici.
        </p>
        <label className="block">
          <span className="text-sm text-slate-600">Email</span>
          <input
            type="email"
            value={pharmacy.email ?? ''}
            onChange={(e) => setPharmacy({ ...pharmacy, email: e.target.value })}
            className="mt-1 w-full rounded-xl border border-surface-border px-4 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-600">Ouverture</span>
          <input
            value={pharmacy.openTime ?? '08:00'}
            onChange={(e) => setPharmacy({ ...pharmacy, openTime: e.target.value })}
            className="mt-1 w-full rounded-xl border border-surface-border px-4 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-600">Fermeture</span>
          <input
            value={pharmacy.closeTime ?? '20:00'}
            onChange={(e) => setPharmacy({ ...pharmacy, closeTime: e.target.value })}
            className="mt-1 w-full rounded-xl border border-surface-border px-4 py-2.5 text-sm"
          />
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={pharmacy.isOnDuty}
          onChange={(e) => setPharmacy({ ...pharmacy, isOnDuty: e.target.checked })}
          className="h-4 w-4 rounded border-surface-border text-brand-600"
        />
        <span className="text-sm text-slate-700">Pharmacie de garde</span>
      </label>

      <label className="block">
        <span className="text-sm text-slate-600">Description</span>
        <textarea
          value={pharmacy.description ?? ''}
          onChange={(e) => setPharmacy({ ...pharmacy, description: e.target.value })}
          rows={3}
          className="mt-1 w-full rounded-xl border border-surface-border px-4 py-2.5 text-sm"
        />
      </label>

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </form>
  );
}
