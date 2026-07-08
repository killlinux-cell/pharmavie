'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Users,
  X,
  FileText,
  Stethoscope,
} from 'lucide-react';
import { useState } from 'react';
import { clearToken } from '@/lib/api';
import { useAuth, ADMIN_ROLES } from '@/lib/auth';

const navItems = [
  { href: '/admin', label: 'Vue nationale', icon: LayoutDashboard },
  { href: '/admin/pharmacies', label: 'Pharmacies', icon: Building2 },
  { href: '/admin/orders', label: 'Commandes', icon: ClipboardList },
  { href: '/admin/prescriptions', label: 'Ordonnances', icon: FileText },
  { href: '/admin/specialists', label: 'Spécialistes', icon: Stethoscope },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth(ADMIN_ROLES, '/admin/login');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  function logout() {
    clearToken();
    router.push('/admin/login');
  }

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Administrateur';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fermer"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-800 bg-slate-900 transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-800 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-900">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-white">PharmaVie</p>
                <p className="text-xs text-amber-400">Portail Admin</p>
              </div>
            </div>
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
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-800 p-4">
            <p className="mb-2 truncate px-3 text-xs text-slate-500">{name}</p>
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-slate-800 bg-slate-900/95 px-6 py-4 backdrop-blur">
          <button type="button" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6 text-slate-300" />
          </button>
          <button type="button" className="hidden lg:block" onClick={() => setSidebarOpen(false)}>
            <X className="h-0 w-0" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-amber-400">Administration nationale</p>
            <h1 className="text-lg font-semibold text-white">Côte d&apos;Ivoire</h1>
          </div>
          <Link href="/login" className="text-xs text-slate-500 hover:text-amber-400">
            Espace pharmacie →
          </Link>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
