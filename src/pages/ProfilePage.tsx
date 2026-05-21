import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Save } from 'lucide-react';
import { useProfileStore } from '../store';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { updateProfile, uploadAvatar } from '../services/profileService';

export function ProfilePage() {
  const { profile, updateProfile: updateStore } = useProfileStore();
  const [name, setName] = useState(profile?.name || '');
  const [saving, setSaving] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await updateProfile(profile.id, { name });
    if (!error) updateStore({ name });
    setSaving(false);
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setAvatarError('');
    setAvatarLoading(true);
    const { url, error } = await uploadAvatar(profile.id, file);
    if (url) updateStore({ avatar_url: url });
    if (error) setAvatarError(error);
    setAvatarLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5 max-w-lg"
    >
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Perfil</h2>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800"
      >
        <div className="flex flex-col items-center mb-6">
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {(profile?.name || '?')[0]}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarLoading}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-md hover:bg-purple-700 transition-colors active:scale-90"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          </motion.div>
        </div>
        {avatarError && (
          <p className="mb-4 rounded-xl bg-red-50 p-3 text-center text-xs font-semibold text-red-600 dark:bg-red-950/30 dark:text-red-300">
            {avatarError}
          </p>
        )}

        <div className="space-y-4">
          <Input
            label="Nombre"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          />
          <Input
            label="Correo electrónico"
            value={profile?.email || ''}
            disabled
          />
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button onClick={handleSave} loading={saving} className="w-full">
              <Save className="w-4 h-4" /> Guardar cambios
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
