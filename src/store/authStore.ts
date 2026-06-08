import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Gender } from '../types';

interface UserProfile {
  id: string;
  email: string | null;
  phone?: string;
  country_code?: string;
  name: string;
  age: number;
  gender: Gender;
  avatar_url: string | null;
  phone_verified?: boolean;
  account_name?: string | null;
  partner_alias?: string | null;
  app_theme?: string | null;
  couple_code: string | null;
  partner_id: string | null;
  couple_alias?: string | null;
}

interface ProfileState {
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  hasUsedBefore: boolean;
  sessionReady: boolean;
  isEntering: boolean;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setAuthenticated: (v: boolean) => void;
  setOnboarded: (v: boolean) => void;
  markUsedBefore: () => void;
  setSessionReady: (v: boolean) => void;
  setEntering: (v: boolean) => void;
  logout: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      isAuthenticated: false,
      isOnboarded: false,
      hasUsedBefore: false,
      sessionReady: false,
      isEntering: false,
      setProfile: (profile) => set({ profile, isAuthenticated: true }),
      updateProfile: (updates) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : null,
        })),
      setAuthenticated: (v) => set({ isAuthenticated: v }),
      setOnboarded: (v) => set({ isOnboarded: v }),
      markUsedBefore: () => set({ hasUsedBefore: true }),
      setSessionReady: (v) => set({ sessionReady: v }),
      setEntering: (v) => set({ isEntering: v }),
      logout: () => set({
        profile: null,
        isAuthenticated: false,
        isOnboarded: false,
        hasUsedBefore: true,
        sessionReady: true,
        isEntering: false,
      }),
    }),
    {
      name: 'auth-store',
      version: 2,
      partialize: (state) => ({
        profile: state.profile,
        isOnboarded: state.isOnboarded,
        hasUsedBefore: state.hasUsedBefore,
      }),
      migrate: (persistedState) => {
        const state = persistedState as Partial<ProfileState>;
        return {
          profile: state.profile || null,
          isAuthenticated: false,
          isOnboarded: state.isOnboarded || false,
          hasUsedBefore: state.hasUsedBefore || false,
          sessionReady: false,
        };
      },
    },
  ),
);
