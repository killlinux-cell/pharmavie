'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getPharmacyId } from '@/lib/api';

export interface OrderAlertItem {
  id: string;
  orderNumber: string;
  clientName: string;
  total: number;
  type: string;
  createdAt: string;
}

export interface OrderAlertsData {
  newCount: number;
  pendingCount: number;
  newOrders: OrderAlertItem[];
}

const POLL_MS = 15_000;
const SEEN_KEY = 'pharmavie_seen_order_ids';

function playNewOrderSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1175;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.55);
    osc2.start(ctx.currentTime + 0.18);
    osc2.stop(ctx.currentTime + 0.55);
  } catch {
    // Audio non disponible
  }
}

function notifyBrowser(order: OrderAlertItem) {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification('Nouvelle commande PharmaVie', {
      body: `${order.orderNumber} — ${order.clientName}`,
      tag: order.id,
      icon: '/favicon.ico',
    });
  } catch {
    // Notification non disponible
  }
}

function loadSeenIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  sessionStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-100)));
}

export function useOrderAlerts(enabled = true) {
  const [alerts, setAlerts] = useState<OrderAlertsData | null>(null);
  const [latestOrder, setLatestOrder] = useState<OrderAlertItem | null>(null);
  const [flash, setFlash] = useState(false);
  const seenIdsRef = useRef<Set<string>>(loadSeenIds());
  const initialLoadRef = useRef(true);

  const fetchAlerts = useCallback(async () => {
    const pharmacyId = getPharmacyId();
    const res = await api<{ data: OrderAlertsData }>(
      `/orders/alerts${pharmacyId ? `?pharmacyId=${pharmacyId}` : ''}`,
    );
    const data = res.data;
    setAlerts(data);

    const incoming = data.newOrders.filter((o) => !seenIdsRef.current.has(o.id));
    if (!initialLoadRef.current && incoming.length > 0) {
      const newest = incoming[0];
      setLatestOrder(newest);
      setFlash(true);
      playNewOrderSound();
      notifyBrowser(newest);
      window.setTimeout(() => setFlash(false), 4000);
    }

    for (const o of data.newOrders) {
      seenIdsRef.current.add(o.id);
    }
    saveSeenIds(seenIdsRef.current);
    initialLoadRef.current = false;

    if (typeof document !== 'undefined') {
      document.title =
        data.newCount > 0
          ? `(${data.newCount}) Nouvelle${data.newCount > 1 ? 's' : ''} commande${data.newCount > 1 ? 's' : ''} — PharmaVie`
          : 'PharmaVie — Dashboard pharmacie';
    }

    return data;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    fetchAlerts().catch(() => undefined);
    const timer = window.setInterval(() => {
      fetchAlerts().catch(() => undefined);
    }, POLL_MS);

    return () => window.clearInterval(timer);
  }, [enabled, fetchAlerts]);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }, []);

  const dismissLatest = useCallback(() => setLatestOrder(null), []);

  return {
    alerts,
    latestOrder,
    flash,
    refresh: fetchAlerts,
    requestNotificationPermission,
    dismissLatest,
  };
}
