import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RancherSite, Environment } from '../types';

interface AppState {
  // Current selections
  activeSite: RancherSite | null;
  selectedEnvironment: Environment | null;
  
  // UI state
  sidebarCollapsed: boolean;
  
  // Actions
  setActiveSite: (site: RancherSite | null) => void;
  setSelectedEnvironment: (environment: Environment | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Reset
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      activeSite: null,
      selectedEnvironment: null,
      sidebarCollapsed: false,
      
      // Actions
      setActiveSite: (site) => set({ activeSite: site }),
      setSelectedEnvironment: (environment) => set({ selectedEnvironment: environment }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      
      // Reset all state
      reset: () => set({
        activeSite: null,
        selectedEnvironment: null,
        sidebarCollapsed: false,
      }),
    }),
    {
      name: 'rancher-hub-app-store',
      partialize: (state) => ({
        activeSite: state.activeSite,
        selectedEnvironment: state.selectedEnvironment,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);