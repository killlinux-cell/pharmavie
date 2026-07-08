'use client';

import { useEffect, useState } from 'react';
import { api, formatFcfa } from '@/lib/api';

interface Overview {
  pharmaciesTotal: number;
  pharmaciesActive: number;
  pharmaciesOnDuty: number;
  usersTotal: number;
  clientsCount: number;
  pharmacistsCount: number;
  productsCount: number;
  ordersToday: number;
  ordersPending: number;
  revenueToday: number;
  prescriptionsPending: number;
  heatmap: { pharmacyName: string; district: string; orders: number }[];
  recentOrders: {
    orderNumber: string;
    statusLabel: string;
    total: number;
    pharmacyName: string;
    clientName: string;
  }[];
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ data: Overview }>('/admin/overview')
      .then((res) => setData(res.data))
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return <div className="rounded-xl border border-red-800 bg-red-950/50 p-4 text-red-300">{error}</div>;
  }

  if (!data) {
    return <div className="h-64 animate-pulse rounded-xl bg-slate-800" />;
  }

  const kpis = [
    { label: 'Pharmacies actives', value: `${data.pharmaciesActive}/${data.pharmaciesTotal}` },
    { label: 'De garde', value: String(data.pharmaciesOnDuty) },
    { label: 'Commandes aujourd\'hui', value: String(data.ordersToday) },
    { label: 'CA du jour', value: formatFcfa(data.revenueToday) },
    { label: 'En attente', value: String(data.ordersPending) },
    { label: 'Produits catalogue', value: data.productsCount.toLocaleString('fr-FR') },
    { label: 'Clients', value: String(data.clientsCount) },
    { label: 'Ordonnances à valider', value: String(data.prescriptionsPending) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">{k.label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 font-semibold text-white">Activité par pharmacie (30 j)</h2>
          <div className="space-y-3">
            {data.heatmap.length === 0 ? (
              <p className="text-slate-500">Aucune commande récente</p>
            ) : (
              data.heatmap
                .sort((a, b) => b.orders - a.orders)
                .slice(0, 8)
                .map((h) => (
                  <div key={h.pharmacyName} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-slate-200">{h.pharmacyName}</p>
                      <p className="text-slate-500">{h.district}</p>
                    </div>
                    <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-amber-400">
                      {h.orders} cmd
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 font-semibold text-white">Commandes récentes</h2>
          <div className="space-y-3">
            {data.recentOrders.map((o) => (
              <div key={o.orderNumber} className="flex items-center justify-between border-b border-slate-800 pb-3 text-sm last:border-0">
                <div>
                  <p className="font-medium text-slate-200">{o.orderNumber}</p>
                  <p className="text-slate-500">{o.pharmacyName} · {o.clientName}</p>
                </div>
                <div className="text-right">
                  <p className="text-amber-400">{formatFcfa(o.total)}</p>
                  <p className="text-xs text-slate-500">{o.statusLabel}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
