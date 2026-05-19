import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Save } from 'lucide-react';
import { useProfileStore } from '../store';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export function ProfilePage() {
  const { profile, updateProfile } = useProfileStore();
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    updateProfile({ name, phone });
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 max-w-lg"
    >
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Perfil</h2>

      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {(profile?.name || '?')[0]}
              </div>
            )}
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white">
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            label="Nombre"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          />
          <Input
            label="Teléfono"
            value={phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
          />
          <Input
            label="Correo electrónico"
            value={profile?.email || ''}
            disabled
          />
          <Button onClick={handleSave} loading={saving} className="w-full">
            <Save className="w-4 h-4" /> Guardar cambios
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
