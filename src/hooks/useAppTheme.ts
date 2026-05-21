import { useMemo } from 'react';
import { useProfileStore } from '../store';
import { useCoupleStore } from '../store';
import { getAppThemeForProfile } from '../config/themes';

export function useAppTheme() {
  const profile = useProfileStore((s) => s.profile);
  const viewMode = useCoupleStore((s) => s.viewMode);
  const isCouple = viewMode === 'couple';

  const theme = useMemo(
    () => getAppThemeForProfile(profile?.app_theme, isCouple, profile?.gender),
    [profile?.app_theme, profile?.gender, isCouple],
  );

  return theme;
}
