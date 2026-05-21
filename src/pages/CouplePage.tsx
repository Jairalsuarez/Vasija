import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2,
  Link2Off,
  Copy,
  Check,
  ArrowLeftRight,
  AlertTriangle,
  ArrowLeft,
  Heart,
  Calendar,
  Sparkles,
  Clock,
  HeartHandshake,
  Edit3,
  CheckCircle2,
  XCircle,
  SendHorizonal,
  PartyPopper,
} from 'lucide-react';
import { useCoupleStore, useProfileStore } from '../store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import {
  generateCoupleLink,
  linkWithCode,
  lookupCode,
  getCoupleDetails,
  updateCoupleDetails,
  type CoupleDetails,
} from '../services/coupleService';
import { getJointAccount } from '../services/jointAccountService';
import { proposeNameChange, respondNameChange, getPendingNameChange } from '../services/nameChangeService';

export function CouplePage() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useProfileStore();
  const {
    coupleCode,
    isLinked,
    partnerName,
    partnerAvatar,
    partnerAlias,
    viewMode,
    setCoupleCode,
    setLinked,
    setPartner,
    setViewMode,
    resetCouple,
  } = useCoupleStore();

  const [linkCode, setLinkCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState('');

  const [partnerPreview, setPartnerPreview] = useState<{
    name: string;
    avatar: string | null;
    id: string;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Couple Relationship Details States
  const [details, setDetails] = useState<CoupleDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  // Partner alias state
  const [aliasInput, setAliasInput] = useState(profile?.partner_alias || '');
  const [aliasSaving, setAliasSaving] = useState(false);

  // Fetch couple details when linked
  useEffect(() => {
    async function loadCoupleDetails() {
      if (!profile || !profile.partner_id) return;
      setLoadingDetails(true);
      const res = await getCoupleDetails(profile.id, profile.partner_id);
      if (res) {
        setDetails(res);
      }
      setLoadingDetails(false);
    }

    if (isLinked && profile?.partner_id) {
      loadCoupleDetails();
    }
  }, [isLinked, profile?.partner_id, profile?.id]);

  // Realtime changes listener
  useEffect(() => {
    if (!profile || !profile.partner_id) return;

    const profileChannel = supabase
      .channel('partner-profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.partner_id}`,
        },
        async (payload) => {
          const updatedPartner = payload.new as { name: string; avatar_url: string | null };
          setPartner(
            updatedPartner.name || 'Pareja',
            updatedPartner.avatar_url || null,
            profile?.partner_alias || null
          );
        }
      )
      .subscribe();

    const couplesChannel = supabase
      .channel('couples-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couples',
        },
        async (payload) => {
          if (payload.new && (payload.new as CoupleDetails).id === details?.id) {
            setDetails(payload.new as CoupleDetails);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(couplesChannel);
    };
  }, [profile, profile?.partner_id, details?.id, setPartner]);

  // Handle saving details (updates are debounced or directly trigger on change)
  const handleDetailChange = async (updates: Partial<CoupleDetails>) => {
    if (!details) return;
    setSavingDetails(true);
    const updatedDetails = { ...details, ...updates };
    setDetails(updatedDetails);

    const { success, error: saveErr } = await updateCoupleDetails(details.id, updates);
    if (!success && saveErr) {
      setError('Error al guardar datos de pareja: ' + saveErr);
    }
    setSavingDetails(false);
  };

  const handleGenerate = async () => {
    if (!profile) return;
    setGenerating(true);
    setError('');

    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, partner_id')
      .eq('id', profile.id)
      .maybeSingle();

    if (profileError || !currentProfile) {
      setError('No encontramos tu perfil. Cierra sesion e inicia de nuevo.');
      setGenerating(false);
      return;
    }

    const result = await generateCoupleLink(profile.id);
    if (result.code) {
      setCoupleCode(result.code);
    } else {
      setError(result.error || 'Error al generar código');
    }
    setGenerating(false);
  };

  const handleCopy = async () => {
    if (coupleCode) {
      await navigator.clipboard.writeText(coupleCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLookup = async () => {
    if (linkCode.length < 8) return;
    setPreviewLoading(true);
    setError('');
    setPartnerPreview(null);
    const result = await lookupCode(linkCode);
    if (result.partnerId && result.name) {
      setPartnerPreview({
        name: result.name,
        avatar: result.avatar,
        id: result.partnerId,
      });
    } else {
      setError(result.error || 'Código inválido');
    }
    setPreviewLoading(false);
  };

  const confirmLink = async () => {
    if (!profile || !partnerPreview) return;
    setLinking(true);
    setError('');
    const result = await linkWithCode(profile.id, linkCode);
    if (result.success) {
      setLinked(true);
      setPartner(partnerPreview.name, partnerPreview.avatar, profile?.partner_alias || null);
      setPartnerPreview(null);
    } else {
      setError(result.error || 'Error al vincular');
    }
    setLinking(false);
  };

  const handleUnlink = () => {
    resetCouple();
  };

  // Polling for code generation
  useEffect(() => {
    if (!profile || !coupleCode || isLinked) return;

    pollingRef.current = setInterval(async () => {
      const { data: myProfile, error: profErr } = await supabase
        .from('profiles')
        .select('partner_id')
        .eq('id', profile.id)
        .maybeSingle();
      if (profErr || !myProfile?.partner_id) return;

      clearInterval(pollingRef.current!);

      const { data: rawPartner } = await supabase
        .rpc('get_partner_info', { v_partner_id: myProfile.partner_id })
        .maybeSingle();
      const partnerData = rawPartner as {
        name: string;
        avatar_url: string | null;
      } | null;

      setLinked(true);
      setPartner(
        partnerData?.name || 'Pareja',
        partnerData?.avatar_url || null,
        profile?.partner_alias || null
      );
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [profile, coupleCode, isLinked, setPartner, setLinked]);

  // Utility Date Calculations
  function calculateTimeTogether(startDateStr: string | null): string {
    if (!startDateStr) return 'Configura tu fecha de inicio abajo';
    const start = new Date(startDateStr + 'T00:00:00');
    const now = new Date();

    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} ${years === 1 ? 'año' : 'años'}`);
    if (months > 0) parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);
    if (days > 0) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`);

    return parts.length > 0 ? `Llevan ${parts.join(', ')} juntos` : '¡Empiezan hoy! 💖';
  }

  function calculateNextAnniversary(anniversaryDateStr: string | null): string {
    if (!anniversaryDateStr) return 'Configura tu fecha de aniversario abajo';
    const anniv = new Date(anniversaryDateStr + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const nextAnniv = new Date(now.getFullYear(), anniv.getMonth(), anniv.getDate());
    if (nextAnniv < now) {
      nextAnniv.setFullYear(now.getFullYear() + 1);
    }

    const diffTime = nextAnniv.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 365 || diffDays === 0) return '¡Hoy es su aniversario! 🎉💖';
    return `Faltan ${diffDays} días para su aniversario 💖`;
  }

  function calculateTimeConnected(createdAtStr: string | null): string {
    if (!createdAtStr) return '';
    const created = new Date(createdAtStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `Conectados en Vasija desde hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-2xl mx-auto pb-10"
    >
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mr-1 flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Heart className="w-6 h-6 text-pink-600 animate-pulse" />
        Pareja
      </h2>

      {isLinked ? (
        <div className="space-y-6">
          {/* Couple Header / Profile Banner */}
          <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-pink-700 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-40 h-40 bg-pink-500/20 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-400/20 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <div className="flex items-center gap-4">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-16 h-16 rounded-full object-cover border-2 border-white/50 shadow-md" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold text-xl border border-white/30">
                    {profile?.name?.charAt(0)}
                  </div>
                )}

                <Heart className="w-8 h-8 text-pink-300 animate-pulse shrink-0" />

                {partnerAvatar ? (
                  <img src={partnerAvatar} className="w-16 h-16 rounded-full object-cover border-2 border-white/50 shadow-md" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold text-xl border border-white/30">
                    {partnerName?.charAt(0) || 'P'}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold">
                  {profile?.name} &amp; {partnerAlias || partnerName || 'Pareja'}
                </h3>
                <p className="text-purple-200 text-xs font-medium mt-1">
                  {details ? calculateTimeConnected(details.created_at) : 'Conectados'}
                </p>
              </div>
            </div>
          </div>

          {/* Time & Anniversary Counter Widget */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-pink-50 dark:bg-pink-950/30 flex items-center justify-center shrink-0">
                <Heart className="w-6 h-6 text-pink-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Nuestra historia juntos</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                  {details ? calculateTimeTogether(details.together_since) : 'Llevan tiempo juntos'}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Próximo aniversario</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                  {details ? calculateNextAnniversary(details.anniversary_date) : 'Cuenta regresiva del aniversario'}
                </p>
              </div>
            </div>
          </div>

          {/* Partner Alias Section */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 space-y-4">
            <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Alias para tu pareja
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Así se mostrará tu pareja en movimientos y en la pantalla principal.
            </p>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                  {partnerName?.[0] || 'P'}
                </div>
                <div>
                  <p className="text-sm font-bold text-purple-700 dark:text-purple-300">
                    {partnerAlias || partnerName || 'Pareja'}
                  </p>
                  <p className="text-xs text-purple-500">Nombre real: {partnerName || '—'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ej. mi amor, osito..."
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={async () => {
                    if (!profile) return;
                    setAliasSaving(true);
                    const val = aliasInput.trim() || null;
                    const { error: err } = await supabase
                      .from('profiles')
                      .update({ partner_alias: val })
                      .eq('id', profile.id);
                    if (!err) {
                      updateProfile({ partner_alias: val });
                      setPartner(partnerName || 'Pareja', null, aliasInput.trim());
                    } else {
                      console.error('Error saving alias:', err);
                    }
                    setAliasSaving(false);
                  }}
                  loading={aliasSaving}
                  disabled={aliasInput === (profile?.partner_alias || '')}
                  size="sm"
                >
                  Guardar
                </Button>
              </div>
              <p className="text-[10px] text-gray-400">Déjalo vacío para usar el nombre real.</p>
            </div>
          </div>

          {/* Relationship Details Configuration Widget */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                Nuestros Datos Especiales
              </h3>
              {savingDetails && (
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold animate-pulse">
                  Guardando...
                </span>
              )}
            </div>

            {loadingDetails ? (
              <p className="text-sm text-gray-500">Cargando datos especiales...</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-600 dark:text-gray-400 font-semibold block">Juntos desde</label>
                    <Input
                      type="date"
                      value={details?.together_since || ''}
                      onChange={(e) => handleDetailChange({ together_since: e.target.value || null })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-600 dark:text-gray-400 font-semibold block">Día del Aniversario</label>
                    <Input
                      type="date"
                      value={details?.anniversary_date || ''}
                      onChange={(e) => handleDetailChange({ anniversary_date: e.target.value || null })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                    <div className="flex items-center gap-2">
                      <HeartHandshake className="w-5 h-5 text-pink-600" />
                      <div className="text-left">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">¿Casados?</p>
                        <p className="text-[10px] text-gray-400">Estado civil</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={details?.is_married || false}
                      onChange={(e) => handleDetailChange({ is_married: e.target.checked })}
                      className="w-5 h-5 rounded text-pink-600 border-gray-300 focus:ring-pink-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <div className="text-left">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">¿Sellados?</p>
                        <p className="text-[10px] text-gray-400">Templo Sagrado</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={details?.is_sealed || false}
                      onChange={(e) => handleDetailChange({ is_sealed: e.target.checked })}
                      className="w-5 h-5 rounded text-amber-500 border-gray-300 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Joint Account Name Section */}
          {profile && <JointAccountNameSection userId={profile.id} />}

          {/* Quick Actions / Navigation */}
          <div className="flex gap-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setViewMode(viewMode === 'personal' ? 'couple' : 'personal')}
            >
              <ArrowLeftRight className="w-4 h-4" />
              {viewMode === 'personal' ? 'Ver como pareja' : 'Ver personal'}
            </Button>

            <Button variant="danger" onClick={handleUnlink}>
              <Link2Off className="w-4 h-4" /> Desvincular Cuenta
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Generar código</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Comparte este código con tu pareja para que se vincule a tu cuenta.
            </p>
            {coupleCode ? (
              <div className="text-center space-y-3">
                <div className="inline-block bg-gray-100 dark:bg-gray-800 rounded-xl px-6 py-4">
                  <p className="text-3xl font-mono font-bold tracking-[0.3em] text-gray-900 dark:text-white">
                    {coupleCode}
                  </p>
                </div>
                <p className="text-xs text-gray-400">Esperando a que tu pareja ingrese este código...</p>
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="secondary" onClick={handleCopy}>
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copiar
                      </>
                    )}
                  </Button>
                  <Button size="sm" onClick={handleGenerate} loading={generating}>
                    Regenerar
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={handleGenerate} loading={generating} className="w-full">
                <Link2 className="w-4 h-4" /> Generar código
              </Button>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Vincular con código</h3>
            </div>

            {partnerPreview ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                  {partnerPreview.avatar ? (
                    <img src={partnerPreview.avatar} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                      {partnerPreview.name[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{partnerPreview.name}</p>
                    <p className="text-xs text-gray-400">Se vinculará contigo como pareja</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Al vincularte podrán ver sus finanzas en común. Esta acción no se puede deshacer fácilmente.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setPartnerPreview(null)}>
                    <ArrowLeft className="w-4 h-4" /> Cancelar
                  </Button>
                  <Button className="flex-1" onClick={confirmLink} loading={linking}>
                    <Link2 className="w-4 h-4" /> Confirmar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Código de 8 caracteres"
                    value={linkCode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLinkCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                    }
                    maxLength={8}
                  />
                </div>
                <Button onClick={handleLookup} disabled={linkCode.length < 8} loading={previewLoading}>
                  Buscar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function JointAccountNameSection({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { profile } = useProfileStore();
  const [jointAcc, setJointAcc] = useState<{ id: string; name: string } | null>(null);
  const [pendingRequest, setPendingRequest] = useState<{
    id: string;
    requester_id: string;
    proposed_name: string;
    created_at: string;
  } | null>(null);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [celebrating, setCelebrating] = useState(false);

  const load = async () => {
    const acc = await getJointAccount(userId);
    if (acc) {
      setJointAcc({ id: acc.id, name: acc.account_name || 'Nuestra cuenta' });
      const pending = await getPendingNameChange(acc.id);
      if (pending) {
        setPendingRequest({
          id: pending.id,
          requester_id: pending.requester_id,
          proposed_name: pending.proposed_name,
          created_at: pending.created_at,
        });
      } else {
        setPendingRequest(null);
      }
    }
  };

  useEffect(() => { load(); }, [userId]);

  useEffect(() => {
    if (!jointAcc?.id) return;
    const channel = supabase
      .channel('name-change-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'name_change_requests',
          filter: `joint_account_id=eq.${jointAcc.id}`,
        },
        () => { load(); }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'joint_accounts',
          filter: `id=eq.${jointAcc.id}`,
        },
        () => { load(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [jointAcc?.id]);

  const handlePropose = async () => {
    if (!jointAcc || !newName.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    const result = await proposeNameChange(jointAcc.id, newName.trim());
    if (result.success) {
      setSuccess('Solicitud enviada');
      setNewName('');
      load();
    } else {
      setError(result.error || 'Error al enviar solicitud');
    }
    setLoading(false);
  };

  const handleRespond = async (accept: boolean) => {
    if (!pendingRequest) return;
    setLoading(true);
    setError('');
    const result = await respondNameChange(pendingRequest.id, accept);
    if (result.success) {
      if (accept) {
        setCelebrating(true);
        setTimeout(() => navigate('/'), 1800);
      } else {
        setSuccess('Solicitud rechazada');
        load();
      }
    } else {
      setError(result.error || 'Error al responder');
    }
    setLoading(false);
  };

  if (!jointAcc) return null;

  const myId = profile?.id;
  const isMyRequest = pendingRequest?.requester_id === myId;

  return (
    <motion.div
      layout
      className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-purple-600" />
          Nombre de la cuenta
        </h3>
      </div>

      <motion.div
        layout
        className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-100 dark:border-purple-900"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {jointAcc.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Nombre actual</p>
          <motion.p
            key={jointAcc.name}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-bold text-purple-700 dark:text-purple-300"
          >
            {jointAcc.name}
          </motion.p>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </motion.div>
        )}

        {success && !celebrating && (
          <motion.div
            key="success"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          </motion.div>
        )}

        {celebrating && (
          <motion.div
            key="celebrate"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center py-6"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="inline-block"
            >
              <PartyPopper className="w-12 h-12 text-purple-600 mx-auto mb-2" />
            </motion.div>
            <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
              ¡Nombre cambiado!
            </p>
            <p className="text-sm text-gray-500 mt-1">Redirigiendo al inicio...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!celebrating && pendingRequest ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {isMyRequest ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                  </div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Esperando respuesta</p>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-400 ml-11">
                  Sugeriste <strong className="text-amber-900 dark:text-amber-200">"{pendingRequest.proposed_name}"</strong>
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-200 dark:border-purple-900">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center">
                      <Heart className="w-4 h-4 text-purple-700 dark:text-purple-300" />
                    </div>
                    <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">¡Tu pareja tiene una idea!</p>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 ml-11">
                    Quiere llamar la cuenta <strong className="text-purple-700 dark:text-purple-300">"{pendingRequest.proposed_name}"</strong>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => handleRespond(false)}
                    loading={loading}
                  >
                    <XCircle className="w-4 h-4" /> Rechazar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    onClick={() => handleRespond(true)}
                    loading={loading}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Aceptar
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : null}

        {!celebrating && !pendingRequest && (
          <motion.div
            key="propose"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className="flex gap-2">
              <Input
                placeholder="Nuevo nombre..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handlePropose}
                loading={loading}
                disabled={!newName.trim()}
              >
                <SendHorizonal className="w-4 h-4" /> Enviar
              </Button>
            </div>
            <p className="text-[10px] text-gray-400 flex items-center gap-1">
              <Heart className="w-3 h-3 text-pink-400" />
              Se enviará una solicitud a tu pareja
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
