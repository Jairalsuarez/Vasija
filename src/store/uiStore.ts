import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  userMenuOpen: boolean;
  autoTithe: boolean;
  setAutoTithe: (autoTithe: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  toggleUserMenu: () => void;
  closeUserMenu: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      sidebarOpen: false,
      userMenuOpen: false,
      autoTithe: false,
      setAutoTithe: (autoTithe) => set({ autoTithe }),
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      closeSidebar: () => set({ sidebarOpen: false }),
      toggleUserMenu: () => set((s) => ({ userMenuOpen: !s.userMenuOpen })),
      closeUserMenu: () => set({ userMenuOpen: false }),
    }),
    { name: 'ui-store' },
  ),
);
