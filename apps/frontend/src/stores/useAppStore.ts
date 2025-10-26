import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RancherSite } from '../types';

interface AppState {
  // Current selections
  activeSite: RancherSite | null;
  
  // UI state
  sidebarCollapsed: boolean;
  
  // Actions
  setActiveSite: (site: RancherSite | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Reset
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      activeSite: null,
      sidebarCollapsed: false,
      
      // Actions
      setActiveSite: (site) => set({ activeSite: site }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      
      // Reset all state
      reset: () => set({
        activeSite: null,
        sidebarCollapsed: false,
      }),
    }),
    {
      name: 'rancher-hub-app-store',
      partialize: (state) => ({
        activeSite: state.activeSite,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);