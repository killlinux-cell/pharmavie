'use client';

import { useEffect, useState } from 'react';
import { api, formatFcfa } from '@/lib/api';

interface Order {
  id: string;
  orderNumber: string;
  clientName: string;
  total: number;
  status: string;
  statusLabel: string;
  type: string;
  createdAt: string;
}

const NEXT_STATUS: Record<string, { status: string; label: string }[]> = {
  NEW: [{ status: 'CONFIRMED', label: 'Confirmer' }],
  CONFIRMED: [{ status: 'PREPARING', label: 'Préparer' }],
  PREPARING: [{ status: 'READY', label: 'Marquer prête' }],
  READY: [
    { status: 'DELIVERING', label: 'En livraison' },
    { status: 'DELIVERED', label: 'Livrée' },
  ],
  DELIVERING: [{ status: 'DELIVERED', label: 'Livrée' }],
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function loadOrders() {
    const res = await api<{ data: Order[] }>('/orders');
    setOrders(res.data);
  }

  useEffect(() => {
    loadOrders()
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(id: string, status: string, reason?: string) {
    setError('');
    try {
      await api(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      });
      setRejectId(null);
      setRejectReason('');
      await loadOrders();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur mise à jour');
    }
  }

  if (loading) return <div className="card animate-pulse h-64" />;

  return (
    <div className="space-y-4 animate-fade-in">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900">Gestion des commandes</h2>
        <p className="mt-1 text-sm text-slate-500">
          Nouvelle → confirmée → préparation → prête → livraison → livrée
        </p>
      </div>

      {orders.map((order) => (
        <div key={order.id} className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-900">{order.orderNumber}</p>
            <p className="text-sm text-slate-600">
              {order.clientName} · {formatFcfa(order.total)}
            </p>
            <p className="text-xs text-slate-400">
              {order.type === 'DELIVERY' ? 'Livraison' : 'Retrait'} ·{' '}
              {new Date(order.createdAt).toLocaleString('fr-FR')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              {order.statusLabel}
            </span>
            {order.status === 'NEW' && (
              <button
                type="button"
                onClick={() => setRejectId(order.id)}
                className="rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
              >
                Refuser
              </button>
            )}
            {(NEXT_STATUS[order.status] ?? []).map((action) => (
              <button
                key={action.status}
                type="button"
                onClick={() => updateStatus(order.id, action.status)}
                className="btn-secondary py-1.5 text-xs"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md">
            <h3 className="font-semibold text-slate-900">Motif du refus</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
              placeholder="Rupture de stock, ordonnance manquante..."
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => updateStatus(rejectId, 'REJECTED', rejectReason)}
                className="btn-primary flex-1"
              >
                Confirmer le refus
              </button>
              <button type="button" onClick={() => setRejectId(null)} className="btn-secondary">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <div className="card text-center text-slate-500">Aucune commande</div>
      )}
    </div>
  );
}
