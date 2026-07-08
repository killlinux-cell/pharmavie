'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  LogOut,
  Menu,
  X,
  FileText,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, clearToken } from '@/lib/api';
import { useAuth, PHARMACY_ROLES } from '@/lib/auth';

const navItems = [
  { href: '/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { href: '/dashboard/orders', label: 'Commandes', icon: ShoppingCart },
  { href: '/dashboard/prescriptions', label: 'Ordonnances', icon: FileText },
  { href: '/dashboard/inventory', label: 'Inventaire', icon: Package },
  { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth(PHARMACY_ROLES);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pharmacyName, setPharmacyName] = useState('Ma pharmacie');

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    api<{ data: { pharmacy?: { name: string } } }>('/auth/me')
      .then((res) => {
        if (!cancelled && res.data.pharmacy?.name) {
          setPharmacyName(res.data.pharmacy.name);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  function logout() {
    clearToken();
    router.push('/login');
  }

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('') || 'PV';

  return (
    <div className="min-h-screen bg-surface-muted">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fermer le menu"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-surface-border bg-white transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-surface-border px-5 py-5">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                P
              </div>
              <div>
                <p className="font-bold text-slate-900">PharmaVie</p>
                <p className="text-xs text-slate-500">Espace pharmacie</p>
              </div>
            </div>
            <button type="button" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-surface-border p-4">
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <LogOut className="h-5 w-5" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-surface-border bg-white/90 px-6 py-4 backdrop-blur">
          <button type="button" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6 text-slate-700" />
          </button>
          <div className="flex-1 lg:ml-0">
            <p className="text-sm text-slate-500">{pharmacyName}</p>
            <h1 className="text-lg font-semibold text-slate-900">Tableau de bord</h1>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {initials}
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
