/// <reference lib="webworker" />
/**
 * Service worker propio (modo injectManifest de vite-plugin-pwa): precaching
 * de la PWA + recordatorio diario vía Periodic Background Sync.
 *
 * Periodic sync solo existe en Chrome/Edge (Android/desktop) con la app
 * instalada; en el resto el listener simplemente nunca se dispara. Lee la
 * config y el estado del día directo de IndexedDB (sin Dexie: acá alcanza
 * con la API cruda y evita sumar peso al SW).
 */
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { shouldRemind } from './lib/reminder';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Parameters<typeof precacheAndRoute>[0];
};

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// ---------- Recordatorio diario ----------

interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string;
}

self.addEventListener('periodicsync', (event) => {
  const e = event as PeriodicSyncEvent;
  if (e.tag === 'fluidez-reminder') {
    e.waitUntil(maybeNotify());
  }
});

async function maybeNotify(): Promise<void> {
  try {
    const db = await openDb();
    const settings = await get<{
      reminderEnabled?: boolean;
      reminderTime?: string;
    }>(db, 'settings', 'app');
    const today = new Date().toISOString().slice(0, 10);
    const stats = await get<{ sessionCompleted?: boolean }>(db, 'dailyStats', today);
    db.close();

    const remind = shouldRemind({
      enabled: settings?.reminderEnabled ?? false,
      time: settings?.reminderTime ?? '19:00',
      sessionCompletedToday: stats?.sessionCompleted ?? false,
      now: new Date(),
    });
    if (!remind) return;

    await self.registration.showNotification('Fluidez', {
      body: 'Tu sesión de hoy te espera: 10 minutos y mantenés la racha 🔥',
      icon: '/fluidez-app/icon.svg',
      tag: 'fluidez-reminder', // reemplaza la anterior, no acumula
    });
  } catch {
    // best-effort: un recordatorio fallido nunca debe romper el SW
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const existing = clients[0] as WindowClient | undefined;
      if (existing) return existing.focus();
      return self.clients.openWindow('/fluidez-app/');
    }),
  );
});

// ---------- IndexedDB mínima (sin Dexie) ----------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('fluidez');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function get<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}
