'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import { api, formatFcfa, getPharmacyId } from '@/lib/api';

interface Stats {
  todayOrders: number;
  totalProducts: number;
  lowStock: number;
  todayRevenue: number;
  alerts: number;
}

interface Order {
  orderNumber: string;
  clientName: string;
  total: number;
  statusLabel: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const pharmacyId = getPharmacyId();

    Promise.all([
      api<{ data: Stats }>(`/orders/stats${pharmacyId ? `?pharmacyId=${pharmacyId}` : ''}`),
      api<{ data: Order[] }>('/orders'),
    ])
      .then(([statsRes, ordersRes]) => {
        setStats(statsRes.data);
        setOrders(ordersRes.data.slice(0, 5));
      })
      .catch((err) => setError(err.message));
  }, []);

  const statCards = stats
    ? [
        { label: 'Commandes du jour', value: String(stats.todayOrders), icon: ShoppingCart, trend: 'Temps réel' },
        { label: 'Produits en stock', value: String(stats.totalProducts), icon: Package, trend: `${stats.lowStock} alertes` },
        { label: 'Chiffre du jour', value: formatFcfa(stats.todayRevenue), icon: TrendingUp, trend: 'API live' },
        { label: 'Alertes stock', value: String(stats.alerts), icon: AlertTriangle, trend: 'Stock bas' },
      ]
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(stats ? statCards : Array(4).fill(null)).map((stat, i) => (
          <div key={i} className="card">
            {stat ? (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="mt-1 text-xs text-brand-600">{stat.trend}</p>
                </div>
                <div className="rounded-xl bg-brand-50 p-2.5 text-brand-700">
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            ) : (
              <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Commandes récentes</h2>
          <Link href="/dashboard/orders" className="text-sm text-brand-600 hover:underline">
            Voir tout
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border text-slate-500">
                <th className="pb-3 font-medium">N° commande</th>
                <th className="pb-3 font-medium">Client</th>
                <th className="pb-3 font-medium">Montant</th>
                <th className="pb-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Aucune commande pour le moment
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.orderNumber} className="border-b border-surface-border last:border-0">
                    <td className="py-3 font-medium text-slate-900">{order.orderNumber}</td>
                    <td className="py-3 text-slate-600">{order.clientName}</td>
                    <td className="py-3 text-slate-600">{formatFcfa(order.total)}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                        {order.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
