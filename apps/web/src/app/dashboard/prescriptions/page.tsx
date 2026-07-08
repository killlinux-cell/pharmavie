'use client';

import { useEffect, useState } from 'react';
import { api, mediaUrl } from '@/lib/api';

interface Prescription {
  id: string;
  imageUrl: string;
  fileName: string;
  status: 'PENDING' | 'VALIDATED' | 'REJECTED';
  rejectReason?: string;
  notes?: string;
  createdAt: string;
  user: { phone: string; firstName?: string; lastName?: string };
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  VALIDATED: 'Validée',
  REJECTED: 'Refusée',
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  VALIDATED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function DashboardPrescriptionsPage() {
  const [list, setList] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  function load() {
    api<{ data: Prescription[] }>('/prescriptions')
      .then((res) => setList(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: 'VALIDATED' | 'REJECTED', reason?: string) {
    setActionId(id);
    setError('');
    try {
      await api(`/prescriptions/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          ...(reason ? { rejectReason: reason } : {}),
        }),
      });
      setRejectReason('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setActionId(null);
    }
  }

  if (loading) return <div className="card h-64 animate-pulse" />;

  const pending = list.filter((p) => p.status === 'PENDING');

  return (
    <div className="space-y-4 animate-fade-in">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900">Ordonnances clients</h2>
        <p className="mt-1 text-sm text-slate-500">
          {pending.length} en attente de validation · {list.length} au total
        </p>
      </div>

      {list.length === 0 ? (
        <div className="card text-center text-slate-500">Aucune ordonnance pour le moment</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((p) => {
            const clientName = [p.user.firstName, p.user.lastName].filter(Boolean).join(' ') || p.user.phone;
            return (
              <div key={p.id} className="card overflow-hidden">
                <div className="flex gap-4">
                  <a href={mediaUrl(p.imageUrl)} target="_blank" rel="noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaUrl(p.imageUrl)}
                      alt={p.fileName}
                      className="h-32 w-24 rounded-lg border border-surface-border object-cover"
                    />
                  </a>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{clientName}</p>
                        <p className="text-sm text-slate-500">{p.user.phone}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[p.status]}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {new Date(p.createdAt).toLocaleString('fr-FR')}
                    </p>
                    {p.notes && <p className="mt-2 text-sm text-slate-600">{p.notes}</p>}
                    {p.rejectReason && (
                      <p className="mt-2 text-sm text-red-600">Motif : {p.rejectReason}</p>
                    )}
                  </div>
                </div>

                {p.status === 'PENDING' && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-surface-border pt-4">
                    <button
                      type="button"
                      disabled={actionId === p.id}
                      onClick={() => updateStatus(p.id, 'VALIDATED')}
                      className="btn-primary text-sm"
                    >
                      Valider
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionId(actionId === p.id ? null : p.id)}
                      className="btn-secondary text-sm text-red-600"
                    >
                      Refuser
                    </button>
                  </div>
                )}

                {actionId === p.id && p.status === 'PENDING' && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Motif du refus (ordonnance illisible, médicament non autorisé...)"
                      className="w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      disabled={!rejectReason.trim()}
                      onClick={() => updateStatus(p.id, 'REJECTED', rejectReason)}
                      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Confirmer le refus
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
