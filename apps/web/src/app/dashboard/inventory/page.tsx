'use client';

import { useEffect, useState } from 'react';
import { api, formatFcfa, getPharmacyId } from '@/lib/api';
import { useDebouncedValue } from '@/lib/auth';

interface InventoryItem {
  id: string;
  productId: string;
  name: string;
  dci?: string;
  price: number;
  quantity: number;
  isAvailable: boolean;
  lowStock: boolean;
}

interface CatalogProduct {
  id: string;
  name: string;
  dci?: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const [showAdd, setShowAdd] = useState(false);
  const [catalogQ, setCatalogQ] = useState('');
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [newProduct, setNewProduct] = useState({ productId: '', price: 500, quantity: 10 });

  async function loadInventory() {
    const pharmacyId = getPharmacyId();
    if (!pharmacyId) return;
    const res = await api<{ data: InventoryItem[] }>(
      `/pharmacies/${pharmacyId}/inventory${debouncedQuery ? `?q=${encodeURIComponent(debouncedQuery)}` : ''}`,
    );
    setItems(res.data);
  }

  useEffect(() => {
    setLoading(true);
    setError('');
    loadInventory()
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  async function updateItem(
    id: string,
    data: Partial<{ quantity: number; price: number; isAvailable: boolean }>,
  ) {
    const pharmacyId = getPharmacyId();
    if (!pharmacyId) return;
    try {
      await api(`/pharmacies/${pharmacyId}/inventory/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      await loadInventory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur mise à jour');
    }
  }

  async function removeItem(id: string, name: string) {
    if (!confirm(`Retirer « ${name} » de l'inventaire ?`)) return;
    const pharmacyId = getPharmacyId();
    if (!pharmacyId) return;
    try {
      await api(`/pharmacies/${pharmacyId}/inventory/${id}`, { method: 'DELETE' });
      await loadInventory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur suppression');
    }
  }

  async function searchCatalog(q: string) {
    setCatalogQ(q);
    if (!q.trim()) {
      setCatalog([]);
      return;
    }
    const res = await api<{ data: CatalogProduct[] }>(`/products/catalog?q=${encodeURIComponent(q)}`);
    setCatalog(res.data);
  }

  async function addProduct() {
    const pharmacyId = getPharmacyId();
    if (!pharmacyId || !newProduct.productId) return;
    try {
      await api(`/pharmacies/${pharmacyId}/inventory`, {
        method: 'POST',
        body: JSON.stringify(newProduct),
      });
      setShowAdd(false);
      setNewProduct({ productId: '', price: 500, quantity: 10 });
      await loadInventory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur ajout');
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-900">Inventaire</h2>
          <input
            type="search"
            placeholder="Rechercher un produit..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mt-3 w-full rounded-xl border border-surface-border px-4 py-2.5 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <button type="button" onClick={() => setShowAdd(!showAdd)} className="btn-primary mt-6">
          + Ajouter produit
        </button>
      </div>

      {showAdd && (
        <div className="card space-y-3">
          <h3 className="font-semibold">Ajouter au catalogue pharmacie</h3>
          <input
            placeholder="Rechercher dans le catalogue national..."
            value={catalogQ}
            onChange={(e) => searchCatalog(e.target.value)}
            className="w-full rounded-xl border border-surface-border px-4 py-2.5 text-sm"
          />
          {catalog.length > 0 && (
            <select
              value={newProduct.productId}
              onChange={(e) => setNewProduct({ ...newProduct, productId: e.target.value })}
              className="w-full rounded-xl border border-surface-border px-4 py-2.5 text-sm"
            >
              <option value="">Choisir un produit</option>
              {catalog.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.dci ? `(${p.dci})` : ''}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-3">
            <input
              type="number"
              placeholder="Prix FCFA"
              value={newProduct.price}
              onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
              className="w-32 rounded-xl border border-surface-border px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Quantité"
              value={newProduct.quantity}
              onChange={(e) => setNewProduct({ ...newProduct, quantity: Number(e.target.value) })}
              className="w-32 rounded-xl border border-surface-border px-3 py-2 text-sm"
            />
            <button type="button" onClick={addProduct} className="btn-primary">
              Confirmer
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border text-slate-500">
                <th className="pb-3 font-medium">Produit</th>
                <th className="pb-3 font-medium">DCI</th>
                <th className="pb-3 font-medium">Prix</th>
                <th className="pb-3 font-medium">Stock</th>
                <th className="pb-3 font-medium">Disponible</th>
                <th className="pb-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-surface-border last:border-0">
                  <td className="py-3 font-medium text-slate-900">{item.name}</td>
                  <td className="py-3 text-slate-600">{item.dci ?? '—'}</td>
                  <td className="py-3">
                    <input
                      type="number"
                      defaultValue={item.price}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!Number.isNaN(v) && v >= 0) updateItem(item.id, { price: v });
                      }}
                      className="w-24 rounded-lg border border-surface-border px-2 py-1"
                    />
                  </td>
                  <td className="py-3">
                    <input
                      type="number"
                      defaultValue={item.quantity}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!Number.isNaN(v) && v >= 0) updateItem(item.id, { quantity: v });
                      }}
                      className="w-20 rounded-lg border border-surface-border px-2 py-1"
                    />
                  </td>
                  <td className="py-3">
                    <button
                      type="button"
                      onClick={() => updateItem(item.id, { isAvailable: !item.isAvailable })}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        item.isAvailable
                          ? 'bg-brand-50 text-brand-700'
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {item.isAvailable ? (item.lowStock ? 'Stock bas' : item.quantity === 0 ? 'Rupture' : 'OK') : 'Indisponible'}
                    </button>
                  </td>
                  <td className="py-3">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id, item.name)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && items.length === 0 && (
          <p className="py-8 text-center text-slate-400">Aucun produit en inventaire</p>
        )}
      </div>
    </div>
  );
}
