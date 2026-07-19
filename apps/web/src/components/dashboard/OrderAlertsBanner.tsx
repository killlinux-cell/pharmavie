'use client';

import Link from 'next/link';
import { Bell, BellRing, X } from 'lucide-react';
import type { OrderAlertItem, OrderAlertsData } from '@/lib/use-order-alerts';
import { formatFcfa } from '@/lib/api';

interface Props {
  alerts: OrderAlertsData | null;
  latestOrder: OrderAlertItem | null;
  flash: boolean;
  onDismissLatest: () => void;
  onEnableNotifications?: () => void;
  notificationsEnabled: boolean;
}

export function OrderAlertsBanner({
  alerts,
  latestOrder,
  flash,
  onDismissLatest,
  onEnableNotifications,
  notificationsEnabled,
}: Props) {
  if (!alerts) return null;

  const showBanner = alerts.newCount > 0 || latestOrder;

  return (
    <>
      {flash && latestOrder && (
        <div className="animate-pulse border-b border-amber-300 bg-amber-50 px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-500 p-2 text-white">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">Nouvelle commande reçue !</p>
                <p className="text-sm text-amber-800">
                  {latestOrder.orderNumber} — {latestOrder.clientName} · {formatFcfa(latestOrder.total)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/orders"
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Traiter maintenant
              </Link>
              <button
                type="button"
                onClick={onDismissLatest}
                className="rounded-lg p-2 text-amber-700 hover:bg-amber-100"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showBanner && !flash && alerts.newCount > 0 && (
        <div className="border-b border-brand-200 bg-brand-50 px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-brand-800">
              <Bell className="h-4 w-4" />
              <span>
                <strong>{alerts.newCount}</strong> commande{alerts.newCount > 1 ? 's' : ''} en attente
                {alerts.pendingCount > alerts.newCount && (
                  <span className="text-brand-600">
                    {' '}
                    · {alerts.pendingCount} au total à traiter
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!notificationsEnabled && onEnableNotifications && (
                <button
                  type="button"
                  onClick={onEnableNotifications}
                  className="text-xs font-medium text-brand-700 underline hover:text-brand-900"
                >
                  Activer les notifications navigateur
                </button>
              )}
              <Link
                href="/dashboard/orders"
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
              >
                Voir les commandes
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
