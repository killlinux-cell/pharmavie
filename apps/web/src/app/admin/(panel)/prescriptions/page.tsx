'use client';

import { useEffect, useState } from 'react';
import { api, mediaUrl } from '@/lib/api';

interface Prescription {
  id: string;
  imageUrl: string;
  status: string;
  rejectReason?: string;
  createdAt: string;
  pharmacyId?: string;
  user: { phone: string; firstName?: string; lastName?: string };
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  VALIDATED: 'Validée',
  REJECTED: 'Refusée',
};

export default function AdminPrescriptionsPage() {
  const [list, setList] = useState<Prescription[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'VALIDATED' | 'REJECTED'>('ALL');
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ data: Prescription[] }>('/prescriptions')
      .then((res) => setList(res.data))
      .catch((e) => setError(e.message));
  }, []);

  const filtered =
    filter === 'ALL' ? list : list.filter((p) => p.status === filter);

  return (
    <div className="space-y-4">
      {error && <p className="text-red-400">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {(['ALL', 'PENDING', 'VALIDATED', 'REJECTED'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === f ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {f === 'ALL' ? 'Toutes' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="p-3">Client</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Date</th>
              <th className="p-3">Aperçu</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-slate-800 bg-slate-900/50">
                <td className="p-3 text-slate-200">
                  {[p.user.firstName, p.user.lastName].filter(Boolean).join(' ') || p.user.phone}
                  <br />
                  <span className="text-slate-500">{p.user.phone}</span>
                </td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      p.status === 'VALIDATED'
                        ? 'bg-green-500/20 text-green-400'
                        : p.status === 'REJECTED'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                  {p.rejectReason && (
                    <p className="mt-1 text-xs text-red-400">{p.rejectReason}</p>
                  )}
                </td>
                <td className="p-3 text-slate-400">
                  {new Date(p.createdAt).toLocaleString('fr-FR')}
                </td>
                <td className="p-3">
                  <a
                    href={mediaUrl(p.imageUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline"
                  >
                    Voir l&apos;image
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
