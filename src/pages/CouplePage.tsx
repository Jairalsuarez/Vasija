import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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
  Pencil,
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

export function CouplePage() {
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
    couple_alias: string | null;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Couple Relationship Details States
  const [details, setDetails] = useState<CoupleDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  // Alias states
  const [aliasInput, setAliasInput] = useState(profile?.couple_alias || '');
  const [aliasSaving, setAliasSaving] = useState(false);
  const [aliasError, setAliasError] = useState('');
  const [isEditingAlias, setIsEditingAlias] = useState(!profile?.couple_alias);

  // Validation for Alias
  const handleAliasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAliasInput(val);

    if (val.length > 8) {
      setAliasError('No más de 8 caracteres.');
      return;
    }

    const words = val.trim().split(/\s+/).filter(Boolean);
    if (words.length > 2) {
      setAliasError('Máximo 2 palabras.');
      return;
    }

    setAliasError('');
  };

  const saveAlias = async () => {
    if (!profile) return;
    setAliasSaving(true);
    setAliasError('');

    const words = aliasInput.trim().split(/\s+/).filter(Boolean);
    if (words.length > 2) {
      setAliasError('Máximo 2 palabras.');
      setAliasSaving(false);
      return;
    }
    if (aliasInput.length > 8) {
      setAliasError('No más de 8 caracteres.');
      setAliasSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ couple_alias: aliasInput.trim() || null })
      .eq('id', profile.id);

    if (updateError) {
      setAliasError(updateError.message);
    } else {
      updateProfile({ couple_alias: aliasInput.trim() || null });
      setIsEditingAlias(false);
    }
    setAliasSaving(false);
  };

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
          const updatedPartner = payload.new as { name: string; avatar_url: string | null; couple_alias: string | null };
          setPartner(
            updatedPartner.name || 'Pareja',
            updatedPartner.avatar_url || null,
            updatedPartner.couple_alias
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
        couple_alias: (result as any).couple_alias || null,
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
      setPartner(partnerPreview.name, partnerPreview.avatar, partnerPreview.couple_alias);
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
        .single();
      if (profErr || !myProfile?.partner_id) return;

      clearInterval(pollingRef.current!);

      const { data: rawPartner } = await supabase
        .rpc('get_partner_info', { partner_id: myProfile.partner_id })
        .single();
      const partnerData = rawPartner as {
        name: string;
        avatar_url: string | null;
        couple_alias: string | null;
      } | null;

      setLinked(true);
      setPartner(
        partnerData?.name || 'Pareja',
        partnerData?.avatar_url || null,
        partnerData?.couple_alias
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
                  {profile?.couple_alias || profile?.name} &amp; {partnerAlias || partnerName || 'Pareja'}
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

          {/* Alias Config Section */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 space-y-4">
            <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Apodos en la Pareja
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Personalicen cómo desean verse el uno al otro en la pantalla principal.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!isEditingAlias && profile?.couple_alias ? (
                <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Mi nombre de pareja</p>
                    <p className="text-md font-bold text-pink-700 dark:text-pink-300 mt-1">
                      {profile.couple_alias}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setAliasInput(profile.couple_alias || '');
                      setIsEditingAlias(true);
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs text-gray-600 dark:text-gray-400 font-semibold block">Mi nombre de pareja</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej. mi amor, osito..."
                      value={aliasInput}
                      onChange={handleAliasChange}
                      maxLength={8}
                      className="flex-1"
                    />
                    <Button
                      onClick={saveAlias}
                      loading={aliasSaving}
                      disabled={aliasInput === (profile?.couple_alias || '') || aliasError !== ''}
                      size="sm"
                    >
                      Guardar
                    </Button>
                    {profile?.couple_alias && (
                      <Button
                        onClick={() => setIsEditingAlias(false)}
                        variant="secondary"
                        size="sm"
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                  {aliasError && <p className="text-[10px] text-red-500 font-medium">{aliasError}</p>}
                  <p className="text-[9px] text-gray-400">Máx. 2 palabras y 8 caracteres.</p>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">El apodo de mi pareja</p>
                  <p className="text-md font-bold text-purple-700 dark:text-purple-300 mt-1">
                    {partnerAlias || '(Ninguno establecido todavía)'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
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
