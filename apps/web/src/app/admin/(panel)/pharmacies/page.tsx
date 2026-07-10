'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { MapPin, Plus, Pencil, RefreshCw, Search } from 'lucide-react';

interface Pharmacy {
  id: string;
  name: string;
  street: string;
  city: string;
  district?: string;
  phone: string;
  email?: string;
  isActive: boolean;
  isOnDuty: boolean;
  latitude: number;
  longitude: number;
  openTime?: string;
  closeTime?: string;
  productsCount: number;
  ordersCount: number;
  staffCount: number;
}

interface DutyStatus {
  totalPharmacies: number;
  bySource: Record<string, number>;
  currentWeek: {
    weekStart: string;
    weekEnd: string;
    syncedAt: string;
    dutyCount: number;
  } | null;
}

const EMPTY_FORM = {
  name: '',
  phone: '+225',
  street: '',
  city: 'Abidjan',
  district: '',
  email: '',
  latitude: '5.32',
  longitude: '-4.02',
  openTime: '08:00',
  closeTime: '20:00',
};

export default function AdminPharmaciesPage() {
  const [list, setList] = useState<Pharmacy[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [staffPharmacyId, setStaffPharmacyId] = useState<string | null>(null);
  const [staffUsers, setStaffUsers] = useState<{ id: string; phone: string; firstName?: string; lastName?: string; role: string }[]>([]);
  const [staffUserId, setStaffUserId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [dutyStatus, setDutyStatus] = useState<DutyStatus | null>(null);
  const [syncMsg, setSyncMsg] = useState('');
  const [search, setSearch] = useState('');

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) =>
      [p.name, p.phone, p.street, p.city, p.district ?? '', p.email ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [list, search]);

  function load() {
    api<{ data: Pharmacy[] }>('/admin/pharmacies')
      .then((res) => setList(res.data))
      .catch((e) => setError(e.message));
  }

  function loadDutyStatus() {
    api<{ data: DutyStatus }>('/admin/pharmacies/duty-status')
      .then((res) => setDutyStatus(res.data))
      .catch(() => setDutyStatus(null));
  }

  useEffect(() => {
    load();
    loadDutyStatus();
  }, []);

  async function syncDuty() {
    setSyncMsg('');
    setError('');
    setLoading('sync-duty');
    try {
      const res = await api<{
        data: { total: number; linked: number; created: number; weekStart: string; weekEnd: string };
      }>('/admin/pharmacies/sync-duty', { method: 'POST' });
      const d = res.data;
      setSyncMsg(
        `Gardes synchronisées : ${d.total} pharmacies (${d.linked} reliées, ${d.created} créées) — semaine du ${new Date(d.weekStart).toLocaleDateString('fr-FR')} au ${new Date(d.weekEnd).toLocaleDateString('fr-FR')}`,
      );
      loadDutyStatus();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync échouée');
    } finally {
      setLoading(null);
    }
  }

  function openEdit(p: Pharmacy) {
    setEditId(p.id);
    setForm({
      name: p.name,
      phone: p.phone,
      street: p.street,
      city: p.city ?? 'Abidjan',
      district: p.district ?? '',
      email: p.email ?? '',
      latitude: String(p.latitude),
      longitude: String(p.longitude),
      openTime: p.openTime ?? '08:00',
      closeTime: p.closeTime ?? '20:00',
    });
  }

  async function toggle(id: string, field: 'isActive' | 'isOnDuty', value: boolean) {
    setLoading(id + field);
    try {
      await api(`/admin/pharmacies/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: value }),
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
      phone: form.phone.trim(),
      street: form.street.trim(),
      city: form.city.trim() || 'Abidjan',
      district: form.district.trim() || undefined,
      email: form.email.trim() || undefined,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      openTime: form.openTime,
      closeTime: form.closeTime,
    };
    try {
      if (editId) {
        await api(`/admin/pharmacies/${editId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        setEditId(null);
      } else {
        await api('/admin/pharmacies', { method: 'POST', body: JSON.stringify(payload) });
        setShowCreate(false);
      }
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(null);
    }
  }

  async function assignStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!staffPharmacyId || !staffUserId) return;
    setLoading('staff');
    try {
      await api(`/admin/pharmacies/${staffPharmacyId}/staff`, {
        method: 'POST',
        body: JSON.stringify({ userId: staffUserId }),
      });
      setStaffPharmacyId(null);
      setStaffUserId('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(null);
    }
  }

  function openStaff(pharmacyId: string) {
    setStaffPharmacyId(pharmacyId);
    setStaffUserId('');
    api<{ data: { id: string; phone: string; firstName?: string; lastName?: string; role: string }[] }>('/admin/users')
      .then((res) => setStaffUsers(res.data))
      .catch((e) => setError(e.message));
  }

  const formOpen = showCreate || editId != null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Pharmacies</h2>
          <p className="text-sm text-slate-400">
            Créez et gérez les pharmacies · {filteredList.length}
            {search.trim() ? ` / ${list.length}` : ''} enregistrée(s)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={syncDuty}
            disabled={loading === 'sync-duty'}
            className="inline-flex items-center gap-2 rounded-lg border border-purple-500/40 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-300 hover:bg-purple-500/20 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading === 'sync-duty' ? 'animate-spin' : ''}`} />
            {loading === 'sync-duty' ? 'Sync…' : 'Sync gardes UNPPCI'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreate(true);
              setEditId(null);
              setForm(EMPTY_FORM);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            Nouvelle pharmacie
          </button>
        </div>
      </div>

      {dutyStatus?.currentWeek && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 px-4 py-3 text-sm text-slate-300">
          <span className="font-medium text-purple-300">Planning de garde actif</span>
          {' — '}
          {new Date(dutyStatus.currentWeek.weekStart).toLocaleDateString('fr-FR')}
          {' → '}
          {new Date(dutyStatus.currentWeek.weekEnd).toLocaleDateString('fr-FR')}
          {' · '}
          <strong className="text-white">{dutyStatus.currentWeek.dutyCount}</strong> pharmacies de garde
          {' · '}
          {dutyStatus.totalPharmacies} pharmacies en base
          {dutyStatus.bySource.UNPPCI != null && (
            <span className="text-slate-500"> ({dutyStatus.bySource.UNPPCI} UNPPCI, {dutyStatus.bySource.OSM ?? 0} OSM)</span>
          )}
        </div>
      )}

      {syncMsg && <p className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400">{syncMsg}</p>}

      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, téléphone, adresse, ville..."
          className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-500"
        />
      </div>

      {staffPharmacyId && (
        <form onSubmit={assignStaff} className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-3">
          <h3 className="font-semibold text-white">Assigner un membre du staff</h3>
          <select
            required
            value={staffUserId}
            onChange={(e) => setStaffUserId(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          >
            <option value="">Choisir un utilisateur</option>
            {staffUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.phone} — {u.role}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="submit" disabled={loading === 'staff'} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900">
              Assigner
            </button>
            <button type="button" onClick={() => setStaffPharmacyId(null)} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300">
              Annuler
            </button>
          </div>
        </form>
      )}

      {formOpen && (
        <form onSubmit={submitForm} className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-4">
          <h3 className="font-semibold text-white">{editId ? 'Modifier la pharmacie' : 'Créer une pharmacie'}</h3>
          <p className="text-xs text-slate-400">
            Pour obtenir les coordonnées GPS : ouvrez Google Maps → clic droit sur l&apos;emplacement → copier les coordonnées.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs text-slate-400">Nom *</span>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Téléphone *</span>
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Email</span>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs text-slate-400">Adresse (rue) *</span>
              <input required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Ville</span>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Quartier</span>
              <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Latitude *</span>
              <input required type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" placeholder="5.3197" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Longitude *</span>
              <input required type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" placeholder="-4.0268" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Ouverture</span>
              <input value={form.openTime} onChange={(e) => setForm({ ...form, openTime: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Fermeture</span>
              <input value={form.closeTime} onChange={(e) => setForm({ ...form, closeTime: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading != null} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">
              {loading ? 'Enregistrement…' : editId ? 'Mettre à jour' : 'Créer la pharmacie'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setEditId(null);
                setForm(EMPTY_FORM);
              }}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="p-3">Pharmacie</th>
              <th className="p-3">Localisation</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Commandes</th>
              <th className="p-3">Équipe</th>
              <th className="p-3">Garde</th>
              <th className="p-3">Statut</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  {search.trim() ? 'Aucune pharmacie ne correspond à votre recherche' : 'Aucune pharmacie'}
                </td>
              </tr>
            ) : (
              filteredList.map((p) => (
              <tr key={p.id} className="border-t border-slate-800 bg-slate-900/50">
                <td className="p-3">
                  <p className="font-medium text-white">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.phone}</p>
                </td>
                <td className="p-3 text-slate-400">
                  <p className="max-w-[180px] truncate">{p.street}</p>
                  <p className="text-xs text-slate-500">
                    <MapPin className="mr-1 inline h-3 w-3" />
                    {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                  </p>
                </td>
                <td className="p-3 text-slate-300">{p.productsCount}</td>
                <td className="p-3 text-slate-300">{p.ordersCount}</td>
                <td className="p-3 text-slate-300">
                  <button type="button" onClick={() => openStaff(p.id)} className="text-amber-400 hover:underline">
                    {p.staffCount} · + staff
                  </button>
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    disabled={loading === p.id + 'isOnDuty'}
                    onClick={() => toggle(p.id, 'isOnDuty', !p.isOnDuty)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      p.isOnDuty ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {p.isOnDuty ? 'De garde' : 'Non'}
                  </button>
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    disabled={loading === p.id + 'isActive'}
                    onClick={() => toggle(p.id, 'isActive', !p.isActive)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      p.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {p.isActive ? 'Active' : 'Suspendue'}
                  </button>
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-amber-400"
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
