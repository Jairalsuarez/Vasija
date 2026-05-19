import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ViewMode } from '../types';

interface CoupleState {
  viewMode: ViewMode;
  partnerName: string | null;
  partnerAvatar: string | null;
  partnerAlias: string | null;
  coupleCode: string | null;
  isLinked: boolean;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  setPartner: (name: string, avatar: string | null, alias?: string | null) => void;
  setCoupleCode: (code: string) => void;
  setLinked: (v: boolean) => void;
  resetCouple: () => void;
}

export const useCoupleStore = create<CoupleState>()(
  persist(
    (set) => ({
      viewMode: 'personal',
      partnerName: null,
      partnerAvatar: null,
      partnerAlias: null,
      coupleCode: null,
      isLinked: false,
      setViewMode: (mode) => set({ viewMode: mode }),
      toggleViewMode: () =>
        set((state) => ({
          viewMode: state.viewMode === 'personal' ? 'couple' : 'personal',
        })),
      setPartner: (name, avatar, alias) =>
        set({ partnerName: name, partnerAvatar: avatar, partnerAlias: alias || null }),
      setCoupleCode: (code) => set({ coupleCode: code }),
      setLinked: (v) => set({ isLinked: v }),
      resetCouple: () =>
        set({
          partnerName: null,
          partnerAvatar: null,
          partnerAlias: null,
          coupleCode: null,
          isLinked: false,
          viewMode: 'personal',
        }),
    }),
    { name: 'couple-store' },
  ),
);
