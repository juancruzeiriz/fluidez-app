/** Estado global mínimo: settings cacheadas + inicialización de la DB. */
import { create } from 'zustand';
import type { AppSettings } from './types';
import { getSettings, saveSettings } from './db/repo';
import { seedIfEmpty } from './db/seed';
import { DEFAULT_SETTINGS } from './db/schema';

interface AppState {
  ready: boolean;
  settings: AppSettings;
  init: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  ready: false,
  settings: DEFAULT_SETTINGS,
  init: async () => {
    await seedIfEmpty();
    const settings = await getSettings();
    set({ settings, ready: true });
  },
  update: async (patch) => {
    const settings = await saveSettings(patch);
    set({ settings });
  },
  refresh: async () => {
    const settings = await getSettings();
    set({ settings });
  },
}));
