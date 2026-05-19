import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Gender } from '../types';

interface UserProfile {
  id: string;
  email: string | null;
  phone: string;
  country_code: string;
  name: string;
  age: number;
  gender: Gender;
  avatar_url: string | null;
  phone_verified: boolean;
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
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setAuthenticated: (v: boolean) => void;
  setOnboarded: (v: boolean) => void;
  markUsedBefore: () => void;
  setSessionReady: (v: boolean) => void;
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
      setProfile: (profile) => set({ profile, isAuthenticated: true }),
      updateProfile: (updates) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : null,
        })),
      setAuthenticated: (v) => set({ isAuthenticated: v }),
      setOnboarded: (v) => set({ isOnboarded: v }),
      markUsedBefore: () => set({ hasUsedBefore: true }),
      setSessionReady: (v) => set({ sessionReady: v }),
      logout: () => set({
        profile: null,
        isAuthenticated: false,
        isOnboarded: false,
        sessionReady: false,
      }),
    }),
    { name: 'auth-store' },
  ),
);
