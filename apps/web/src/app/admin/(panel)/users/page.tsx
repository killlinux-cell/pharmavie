'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface UserRow {
  id: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  ordersCount: number;
  pharmacies: { name: string }[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  function load(role?: string) {
    const q = role ? `?role=${role}` : '';
    api<{ data: UserRow[] }>(`/admin/users${q}`)
      .then((res) => setUsers(res.data))
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load(filter || undefined);
  }, [filter]);

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await api(`/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !isActive }),
      });
      load(filter || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  }

  const roleLabel: Record<string, string> = {
    CLIENT: 'Client',
    PHARMACIST: 'Pharmacien',
    PHARMACY_STAFF: 'Personnel',
    ADMIN: 'Admin',
    DELIVERY: 'Livreur',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {['', 'CLIENT', 'PHARMACIST', 'ADMIN'].map((r) => (
          <button
            key={r || 'all'}
            type="button"
            onClick={() => setFilter(r)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              filter === r ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {r ? roleLabel[r] : 'Tous'}
          </button>
        ))}
      </div>
      {error && <p className="text-red-400">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="p-3">Utilisateur</th>
              <th className="p-3">Téléphone</th>
              <th className="p-3">Rôle</th>
              <th className="p-3">Pharmacie(s)</th>
              <th className="p-3">Commandes</th>
              <th className="p-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-800 bg-slate-900/50">
                <td className="p-3 text-white">
                  {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                </td>
                <td className="p-3 text-slate-300">{u.phone}</td>
                <td className="p-3 text-slate-400">{roleLabel[u.role] ?? u.role}</td>
                <td className="p-3 text-slate-400">
                  {u.pharmacies.map((p) => p.name).join(', ') || '—'}
                </td>
                <td className="p-3 text-slate-300">{u.ordersCount}</td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => toggleActive(u.id, u.isActive)}
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      u.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {u.isActive ? 'Actif' : 'Suspendu'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
