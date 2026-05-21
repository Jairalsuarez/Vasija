export type Gender = 'male' | 'female' | 'unspecified';

export type ViewMode = 'personal' | 'couple';

export interface Profile {
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
  partner_alias?: string | null;
  account_name?: string | null;
  created_at: string;
  theme_preference: 'light' | 'dark' | 'system';
}

export interface AuthState {
  user: Profile | null;
  session: string | null;
  is_onboarded: boolean;
}
