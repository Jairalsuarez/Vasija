ALTER TABLE profiles ALTER COLUMN app_theme DROP DEFAULT;

UPDATE profiles
SET app_theme = NULL
WHERE app_theme = 'lavender';
