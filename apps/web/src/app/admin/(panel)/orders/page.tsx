'use client';

import { useEffect, useState } from 'react';
import { api, formatFcfa } from '@/lib/api';

interface Order {
  orderNumber: string;
  statusLabel: string;
  total: number;
  pharmacyName: string;
  pharmacyDistrict: string;
  clientName: string;
  clientPhone: string;
  type: string;
  createdAt: string;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ data: Order[] }>('/admin/orders?limit=100')
      .then((res) => setOrders(res.data))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="space-y-4">
      {error && <p className="text-red-400">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="p-3">N° commande</th>
              <th className="p-3">Pharmacie</th>
              <th className="p-3">Client</th>
              <th className="p-3">Type</th>
              <th className="p-3">Montant</th>
              <th className="p-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.orderNumber} className="border-t border-slate-800 bg-slate-900/50">
                <td className="p-3 font-medium text-white">{o.orderNumber}</td>
                <td className="p-3 text-slate-300">
                  {o.pharmacyName}
                  <span className="block text-xs text-slate-500">{o.pharmacyDistrict}</span>
                </td>
                <td className="p-3 text-slate-300">
                  {o.clientName}
                  <span className="block text-xs text-slate-500">{o.clientPhone}</span>
                </td>
                <td className="p-3 text-slate-400">{o.type === 'DELIVERY' ? 'Livraison' : 'Retrait'}</td>
                <td className="p-3 text-amber-400">{formatFcfa(o.total)}</td>
                <td className="p-3">
                  <span className="rounded-full bg-slate-700 px-2 py-1 text-xs text-slate-200">{o.statusLabel}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
