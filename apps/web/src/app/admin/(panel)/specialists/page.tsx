'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Pencil, Plus, Stethoscope, Trash2 } from 'lucide-react';

interface Specialist {
  id: string;
  name: string;
  specialty: string;
  location: string;
  district: string;
  city: string;
  phone: string;
  rating: number;
  isActive: boolean;
}

const EMPTY_FORM = {
  name: '',
  specialty: 'Médecine générale',
  location: '',
  district: '',
  city: 'Abidjan',
  phone: '+225',
  rating: '4.5',
};

const SPECIALTY_OPTIONS = [
  'Médecine générale',
  'Pédiatrie',
  'Gynécologie',
  'Cardiologie',
  'Dermatologie',
  'Ophtalmologie',
  'ORL',
  'Urologie',
];

export default function AdminSpecialistsPage() {
  const [list, setList] = useState<Specialist[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  function load() {
    api<{ data: Specialist[] }>('/admin/specialists')
      .then((res) => setList(res.data))
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
  }, []);

  function openEdit(s: Specialist) {
    setEditId(s.id);
    setShowCreate(true);
    setForm({
      name: s.name,
      specialty: s.specialty,
      location: s.location,
      district: s.district,
      city: s.city ?? 'Abidjan',
      phone: s.phone,
      rating: String(s.rating),
    });
  }

  function resetForm() {
    setEditId(null);
    setShowCreate(false);
    setForm(EMPTY_FORM);
  }

  async function toggleActive(id: string, isActive: boolean) {
    setLoading(id + 'active');
    try {
      await api(`/admin/specialists/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(null);
    }
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(editId ?? 'create');
    const payload = {
      name: form.name.trim(),
      specialty: form.specialty,
      location: form.location.trim(),
      district: form.district.trim(),
      city: form.city.trim() || 'Abidjan',
      phone: form.phone.trim(),
      rating: parseFloat(form.rating) || 0,
    };
    try {
      if (editId) {
        await api(`/admin/specialists/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await api('/admin/specialists', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      resetForm();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(null);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Supprimer ${name} de l'annuaire ?`)) return;
    setLoading(id + 'delete');
    try {
      await api(`/admin/specialists/${id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Annuaire spécialistes</h2>
          <p className="text-sm text-slate-400">
            Référencés pour orientation santé dans l&apos;app mobile
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowCreate(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={submitForm}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4"
        >
          <h3 className="font-semibold text-white">
            {editId ? 'Modifier le spécialiste' : 'Nouveau spécialiste'}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-400">Nom complet</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Spécialité</span>
              <select
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                {SPECIALTY_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Établissement</span>
              <input
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Commune</span>
              <input
                required
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Téléphone</span>
              <input
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Note (0–5)</span>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading != null}
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
            >
              {loading ? 'Enregistrement…' : editId ? 'Mettre à jour' : 'Créer'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">Praticien</th>
              <th className="px-4 py-3">Spécialité</th>
              <th className="px-4 py-3">Lieu</th>
              <th className="px-4 py-3">Commune</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3">Actif</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/50">
            {list.map((s) => (
              <tr key={s.id} className="text-slate-200">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-amber-400" />
                    {s.name}
                  </div>
                  <p className="text-xs text-slate-500">{s.phone}</p>
                </td>
                <td className="px-4 py-3">{s.specialty}</td>
                <td className="px-4 py-3">{s.location}</td>
                <td className="px-4 py-3">{s.district}</td>
                <td className="px-4 py-3">★ {s.rating.toFixed(1)}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={loading === s.id + 'active'}
                    onClick={() => toggleActive(s.id, !s.isActive)}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.isActive
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {s.isActive ? 'Oui' : 'Non'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-amber-400"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={loading === s.id + 'delete'}
                      onClick={() => remove(s.id, s.name)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Aucun spécialiste — lancez le seed ou ajoutez-en un.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
