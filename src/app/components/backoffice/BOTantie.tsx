/**
 * BACKOFFICE — Module IA "Tantie Sagesse"
 *
 * Page d'administration complète pour piloter l'agent IA :
 *   - Onglet Stats         : KPIs temps réel, graphes, top intentions
 *   - Onglet Config        : Voix, personnalité, fonctionnalités, rôles
 *   - Onglet Test          : Simulateur de conversation en live
 *   - Onglet Historique    : Sessions récentes, messages, tendances
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot, Mic, Volume2, VolumeX, Settings, BarChart3,
  MessageSquare, History, Play, Square, Send,
  CheckCircle2, AlertTriangle, TrendingUp, TrendingDown,
  Users, Zap, Clock, Star, RefreshCw, Save,
  ChevronRight, Info, Sparkles, Brain, Shield,
  ToggleLeft, ToggleRight, Sliders, Globe,
  Package, ShoppingCart, Leaf, GraduationCap,
  Bell, Wallet, ClipboardList, Store, Calculator,
  Plus, Headphones, User, LayoutDashboard,
  Lock, Unlock, Database, Cpu, Network,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { useTantie } from '../../hooks/useTantie';
import { toast } from 'sonner';
import tantieSagesseImg from '../../../assets/c57c6b035a1cf2a547f2ddf8ab7ca6884bc3980e.png';
import {
  ACTION_REGISTRY,
  getActionsForRole,
  type JulabaRole as RegistryRole,
} from '../../services/tantieSagesse/ActionRegistry';

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const BO_PRIMARY  = '#E6A817';
const BO_DARK     = '#3B3C36';
const TANTIE_COLOR = '#7C3AED';
const TANTIE_GRADIENT = 'linear-gradient(135deg, #5B21B6 0%, #7C3AED 100%)';

// ============================================================================
// HELPERS UI
// ============================================================================

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <motion.button
      onClick={disabled ? undefined : onChange}
      className={`w-12 h-6 rounded-full relative flex-shrink-0 transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{ backgroundColor: value ? TANTIE_COLOR : '#D1D5DB' }}
      whileTap={disabled ? {} : { scale: 0.95 }}
    >
      <motion.div
        className="w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5"
        animate={{ left: value ? '26px' : '2px' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </motion.button>
  );
}

function SliderInput({ value, min, max, step = 0.1, onChange, unit = '', disabled }: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; unit?: string; disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range" min={min} max={max} step={step} value={value}
        disabled={disabled}
        onChange={e => onChange(+e.target.value)}
        className="flex-1 h-2 rounded-full appearance-none cursor-pointer disabled:opacity-40"
        style={{ accentColor: TANTIE_COLOR }}
      />
      <span className="text-sm font-black text-gray-900 min-w-[60px] text-right">
        {value}{unit}
      </span>
    </div>
  );
}

function KPICard({ label, value, sub, icon: Icon, color, trend }: {
  label: string; value: string | number; sub?: string;
  icon: any; color: string; trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <motion.div
      className="bg-white rounded-3xl border-2 border-gray-100 p-4 flex items-center gap-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}>
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-semibold truncate">{label}</p>
        <p className="text-xl font-black text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
      </div>
      {trend && trend !== 'neutral' && (
        <div className={`flex items-center gap-1 ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend === 'up'
            ? <TrendingUp className="w-4 h-4" />
            : <TrendingDown className="w-4 h-4" />
          }
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// ONGLET STATS
// ============================================================================

const INTENT_COLORS: Record<string, string> = {
  STOCK: '#10B981', VENTE: '#F59E0B', PRIX: '#3B82F6',
  COMMANDE: '#8B5CF6', CAISSE: '#EC4899', WALLET: '#6366F1',
  RECOLTE: '#22C55E', ACADEMY: '#F97316', CONSEIL: '#14B8A6',
  SALUTATION: '#A855F7', INCONNU: '#9CA3AF',
};

const ROLE_COLORS_MAP: Record<string, string> = {
  marchand: '#C46210', producteur: '#00563B', cooperative: '#2072AF',
  institution: '#702963', identificateur: '#9F8170',
};

function OngletStats() {
  const { stats, refreshStats } = useTantie();
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => { refreshStats(); setLoading(false); }, 800);
  };

  const semaineFmt = stats.evolutionSemaine.map(d => ({
    ...d,
    dateShort: new Date(d.date).toLocaleDateString('fr-FR', { weekday: 'short' }),
  }));

  const pieData = stats.rolesActifs.map(r => ({
    name: r.role, value: r.count,
    color: ROLE_COLORS_MAP[r.role] ?? '#9CA3AF',
  }));

  const intentData = stats.intentionsLesPlus.map(i => ({
    name: i.category, value: i.count,
    color: INTENT_COLORS[i.category] ?? '#9CA3AF',
  }));

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900">Statistiques IA</h2>
          <p className="text-sm text-gray-500">Usage de Tantie Sagesse par les utilisateurs</p>
        </div>
        <motion.button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl border-2 text-sm font-semibold"
          style={{ borderColor: TANTIE_COLOR, color: TANTIE_COLOR }}
          whileTap={{ scale: 0.95 }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </motion.button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total sessions" value={stats.totalSessions} sub="Depuis le lancement"
          icon={MessageSquare} color={TANTIE_COLOR} trend="up" />
        <KPICard label="Aujourd'hui" value={stats.sessionsAujourdHui} sub="Sessions actives"
          icon={Zap} color="#F59E0B" trend="up" />
        <KPICard label="Taux résolution" value={`${stats.tauxResolution}%`} sub="Questions résolues"
          icon={CheckCircle2} color="#10B981" trend={stats.tauxResolution >= 70 ? 'up' : 'down'} />
        <KPICard label="Note utilisateurs" value={`${stats.noteUtilisateurs}/5`} sub="Satisfaction moyenne"
          icon={Star} color="#F97316" trend="up" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total messages" value={stats.totalMessages} sub="Tous profils"
          icon={Brain} color="#8B5CF6" trend="up" />
        <KPICard label="Messages aujourd'hui" value={stats.messagesAujourdHui} sub="Échanges du jour"
          icon={Clock} color="#3B82F6" trend="neutral" />
        <KPICard label="Rôles actifs" value={stats.rolesActifs.length} sub="Profils utilisateurs"
          icon={Users} color="#EC4899" trend="neutral" />
        <KPICard label="Top intention" value={stats.intentionsLesPlus[0]?.category ?? 'N/A'}
          sub={`${stats.intentionsLesPlus[0]?.count ?? 0} fois`}
          icon={TrendingUp} color="#10B981" trend="up" />
      </div>

      {/* Graphe sessions semaine */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-5">
        <h3 className="text-sm font-black text-gray-900 mb-4">Evolution des sessions — 7 derniers jours</h3>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={semaineFmt}>
            <defs>
              <linearGradient id="tantieGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={TANTIE_COLOR} stopOpacity={0.3} />
                <stop offset="95%" stopColor={TANTIE_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="dateShort" tick={{ fontSize: 11, fill: '#6B7280' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}
              formatter={(v: any) => [v, 'Sessions']}
            />
            <Area type="monotone" dataKey="sessions" stroke={TANTIE_COLOR} strokeWidth={2.5}
              fill="url(#tantieGrad)" dot={{ fill: TANTIE_COLOR, r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top intentions */}
        <div className="bg-white rounded-3xl border-2 border-gray-100 p-5">
          <h3 className="text-sm font-black text-gray-900 mb-4">Top intentions détectées</h3>
          {intentData.length > 0 ? (
            <div className="space-y-2.5">
              {intentData.slice(0, 6).map((d, i) => (
                <div key={d.name} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${d.color}20` }}>
                    <span className="text-xs font-black" style={{ color: d.color }}>{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-gray-700">{d.name}</span>
                      <span className="text-xs font-black text-gray-900">{d.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: d.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (d.value / (intentData[0]?.value || 1)) * 100)}%` }}
                        transition={{ duration: 0.8, delay: i * 0.06 }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
              <Brain className="w-10 h-10 opacity-30" />
              <p className="text-xs">Aucune donnée encore — lancez une conversation</p>
            </div>
          )}
        </div>

        {/* Rôles actifs */}
        <div className="bg-white rounded-3xl border-2 border-gray-100 p-5">
          <h3 className="text-sm font-black text-gray-900 mb-4">Répartition par profil</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, name: any) => [v, name]} />
                <Legend iconType="circle" iconSize={10}
                  formatter={(v) => <span style={{ fontSize: 11, fontWeight: 600 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
              <Users className="w-10 h-10 opacity-30" />
              <p className="text-xs">Pas encore de données par profil</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// ONGLET CONFIG
// ============================================================================

function OngletConfig() {
  const { config, updateConfig } = useTantie();
  const { hasPermission, addAuditLog, boUser } = useBackOffice();
  const canWrite = hasPermission('parametres.write');
  const [saved, setSaved] = useState(false);

  const ROLES = ['marchand', 'producteur', 'cooperative', 'institution', 'identificateur'] as const;

  const handleSave = () => {
    addAuditLog('UPDATE', 'tantie_config', 'Configuration Tantie Sagesse mise à jour', 'INFO');
    setSaved(true);
    toast.success('Configuration Tantie Sagesse sauvegardée');
    setTimeout(() => setSaved(false), 3000);
  };

  const toggleRole = (role: typeof ROLES[number]) => {
    const current = config.enabledForRoles;
    const updated = current.includes(role)
      ? current.filter(r => r !== role)
      : [...current, role];
    updateConfig({ enabledForRoles: updated });
  };

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900">Configuration IA</h2>
          <p className="text-sm text-gray-500">Paramètres de Tantie Sagesse pour tous les profils</p>
        </div>
        <motion.button
          onClick={canWrite ? handleSave : undefined}
          disabled={!canWrite}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-black text-white transition-all disabled:opacity-40"
          style={{ background: saved ? '#10B981' : TANTIE_GRADIENT }}
          whileTap={canWrite ? { scale: 0.95 } : {}}
        >
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Sauvegardé' : 'Sauvegarder'}
        </motion.button>
      </div>

      {/* Activation par rôle */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5" style={{ color: TANTIE_COLOR }} />
          <h3 className="font-black text-gray-900">Activation par profil</h3>
        </div>
        <p className="text-xs text-gray-500 -mt-2">Choisissez les profils qui ont accès à Tantie Sagesse</p>
        <div className="grid grid-cols-1 gap-3">
          {ROLES.map(role => {
            const colors: Record<string, string> = {
              marchand: '#C46210', producteur: '#00563B', cooperative: '#2072AF',
              institution: '#702963', identificateur: '#9F8170',
            };
            const labels: Record<string, string> = {
              marchand: 'Marchand', producteur: 'Producteur', cooperative: 'Cooperative',
              institution: 'Institution', identificateur: 'Identificateur',
            };
            const isActive = config.enabledForRoles.includes(role);
            return (
              <div key={role}
                className="flex items-center justify-between p-3 rounded-2xl border-2 transition-all"
                style={{ borderColor: isActive ? colors[role] : '#E5E7EB', background: isActive ? `${colors[role]}08` : '#F9FAFB' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: isActive ? colors[role] : '#E5E7EB' }}>
                    <Users className="w-4 h-4" style={{ color: isActive ? '#FFFFFF' : '#9CA3AF' }} />
                  </div>
                  <span className="font-semibold text-gray-800">{labels[role]}</span>
                </div>
                <Toggle value={isActive} onChange={() => toggleRole(role)} disabled={!canWrite} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Voix */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Volume2 className="w-5 h-5" style={{ color: TANTIE_COLOR }} />
          <h3 className="font-black text-gray-900">Synthèse vocale (TTS)</h3>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">Voix activée par défaut</p>
            <p className="text-xs text-gray-500">Tantie lira ses réponses à voix haute</p>
          </div>
          <Toggle value={config.voiceEnabled}
            onChange={() => updateConfig({ voiceEnabled: !config.voiceEnabled })}
            disabled={!canWrite} />
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">Langue de la voix</p>
          <div className="flex gap-2 flex-wrap">
            {(['fr-FR', 'fr-CI'] as const).map(lang => (
              <motion.button
                key={lang}
                onClick={() => canWrite && updateConfig({ voiceLanguage: lang })}
                className="px-4 py-2 rounded-2xl border-2 text-sm font-semibold transition-all"
                style={{
                  borderColor: config.voiceLanguage === lang ? TANTIE_COLOR : '#E5E7EB',
                  background: config.voiceLanguage === lang ? `${TANTIE_COLOR}14` : '#F9FAFB',
                  color: config.voiceLanguage === lang ? TANTIE_COLOR : '#6B7280',
                }}
                whileTap={canWrite ? { scale: 0.95 } : {}}
              >
                {lang === 'fr-FR' ? 'Français standard' : 'Français (Côte d\'Ivoire)'}
              </motion.button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">Vitesse de parole</p>
          <SliderInput value={config.speechRate} min={0.5} max={1.5} step={0.05}
            onChange={v => updateConfig({ speechRate: v })} unit="x" disabled={!canWrite} />
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">Hauteur de voix (pitch)</p>
          <SliderInput value={config.speechPitch} min={0.5} max={2.0} step={0.05}
            onChange={v => updateConfig({ speechPitch: v })} unit="" disabled={!canWrite} />
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">Volume</p>
          <SliderInput value={config.speechVolume} min={0.0} max={1.0} step={0.05}
            onChange={v => updateConfig({ speechVolume: v })} unit="" disabled={!canWrite} />
        </div>
      </div>

      {/* Personnalité */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" style={{ color: TANTIE_COLOR }} />
          <h3 className="font-black text-gray-900">Personnalité</h3>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">Style de réponse</p>
          <div className="flex gap-2 flex-wrap">
            {(['CHALEUREUX', 'DIRECT', 'FORMEL'] as const).map(style => (
              <motion.button
                key={style}
                onClick={() => canWrite && updateConfig({ styleReponse: style })}
                className="px-4 py-2 rounded-2xl border-2 text-sm font-semibold transition-all"
                style={{
                  borderColor: config.styleReponse === style ? TANTIE_COLOR : '#E5E7EB',
                  background: config.styleReponse === style ? `${TANTIE_COLOR}14` : '#F9FAFB',
                  color: config.styleReponse === style ? TANTIE_COLOR : '#6B7280',
                }}
                whileTap={canWrite ? { scale: 0.95 } : {}}
              >
                {style === 'CHALEUREUX' ? 'Chaleureux' : style === 'DIRECT' ? 'Direct' : 'Formel'}
              </motion.button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">Longueur des réponses</p>
          <div className="flex gap-2 flex-wrap">
            {(['COURTE', 'MOYENNE', 'LONGUE'] as const).map(len => (
              <motion.button
                key={len}
                onClick={() => canWrite && updateConfig({ longueurReponse: len })}
                className="px-4 py-2 rounded-2xl border-2 text-sm font-semibold transition-all"
                style={{
                  borderColor: config.longueurReponse === len ? TANTIE_COLOR : '#E5E7EB',
                  background: config.longueurReponse === len ? `${TANTIE_COLOR}14` : '#F9FAFB',
                  color: config.longueurReponse === len ? TANTIE_COLOR : '#6B7280',
                }}
                whileTap={canWrite ? { scale: 0.95 } : {}}
              >
                {len === 'COURTE' ? 'Courte' : len === 'MOYENNE' ? 'Moyenne' : 'Longue'}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border-2 border-gray-100">
            <div>
              <p className="text-xs font-semibold text-gray-800">Mots en Dioula</p>
              <p className="text-xs text-gray-400">I ni ce, Fo foyi…</p>
            </div>
            <Toggle value={config.utiliseDioula}
              onChange={() => updateConfig({ utiliseDioula: !config.utiliseDioula })}
              disabled={!canWrite} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border-2 border-gray-100">
            <div>
              <p className="text-xs font-semibold text-gray-800">Mots en Baoulé</p>
              <p className="text-xs text-gray-400">A wô, Mo guè…</p>
            </div>
            <Toggle value={config.utiliseBaoule}
              onChange={() => updateConfig({ utiliseBaoule: !config.utiliseBaoule })}
              disabled={!canWrite} />
          </div>
        </div>
      </div>

      {/* Fonctionnalités */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Sliders className="w-5 h-5" style={{ color: TANTIE_COLOR }} />
          <h3 className="font-black text-gray-900">Fonctionnalités</h3>
        </div>
        {[
          { key: 'suggestionsRapidesEnabled', label: 'Suggestions rapides', desc: 'Chips de questions prédéfinies' },
          { key: 'actionsRapidesEnabled', label: 'Actions rapides', desc: 'Boutons de navigation après réponse' },
          { key: 'analyseStockEnabled', label: 'Analyse stock', desc: 'Alertes automatiques stock critique' },
          { key: 'alertesProactivesEnabled', label: 'Alertes proactives', desc: 'Tantie signale les urgences' },
          { key: 'conseilsPrixEnabled', label: 'Conseils prix', desc: 'Informations marché et tendances' },
        ].map(feat => (
          <div key={feat.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-semibold text-gray-800">{feat.label}</p>
              <p className="text-xs text-gray-500">{feat.desc}</p>
            </div>
            <Toggle
              value={(config as any)[feat.key] as boolean}
              onChange={() => updateConfig({ [feat.key]: !(config as any)[feat.key] } as any)}
              disabled={!canWrite}
            />
          </div>
        ))}
      </div>

      {/* Limites */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-5 h-5" style={{ color: TANTIE_COLOR }} />
          <h3 className="font-black text-gray-900">Limites & Sessions</h3>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">
            Messages max par session : <span style={{ color: TANTIE_COLOR }}>{config.maxMessagesParSession}</span>
          </p>
          <SliderInput value={config.maxMessagesParSession} min={20} max={200} step={10}
            onChange={v => updateConfig({ maxMessagesParSession: v })} unit=" msg" disabled={!canWrite} />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">
            Timeout session : <span style={{ color: TANTIE_COLOR }}>{config.delaiTimeoutSession} min</span>
          </p>
          <SliderInput value={config.delaiTimeoutSession} min={15} max={240} step={15}
            onChange={v => updateConfig({ delaiTimeoutSession: v })} unit=" min" disabled={!canWrite} />
        </div>
      </div>

      {!canWrite && (
        <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-amber-200 bg-amber-50">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700 font-semibold">
            Votre rôle ne permet pas de modifier ces paramètres. Contactez un Super Admin.
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// ONGLET TEST (Simulateur)
// ============================================================================

function OngletTest() {
  const { messages, sendMessage, clearConversation, isTyping, session } = useTantie();
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const TEST_PROMPTS = [
    'Quel est mon stock de tomates ?',
    'Donne-moi le bilan de la semaine',
    'Comment aller sur le marché ?',
    'Mon score Julaba ?',
    'Conseil pour augmenter mes ventes',
    'Alertes en attente ?',
    'Bonjour Tantie !',
    'Expliquer la CMU',
  ];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim(), 'text');
    setInput('');
  };

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900">Simulateur de conversation</h2>
          <p className="text-sm text-gray-500">Testez Tantie Sagesse depuis le BackOffice</p>
        </div>
        <motion.button
          onClick={clearConversation}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl border-2 text-sm font-semibold"
          style={{ borderColor: '#EF4444', color: '#EF4444' }}
          whileTap={{ scale: 0.95 }}
        >
          <RefreshCw className="w-4 h-4" />
          Réinitialiser
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Fenêtre chat simulée */}
        <div className="lg:col-span-2 bg-white rounded-3xl border-2 border-purple-100 overflow-hidden flex flex-col" style={{ height: 500 }}>

          {/* Header simulateur */}
          <div className="p-4 flex items-center gap-3 flex-shrink-0" style={{ background: TANTIE_GRADIENT }}>
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/60">
              <img src={tantieSagesseImg} alt="Tantie" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-white font-black text-sm">Tantie Sagesse</p>
              <p className="text-purple-200 text-xs">
                Profil simulé : {session?.role ?? 'marchand'}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-white text-xs font-semibold">ACTIF</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <img src={tantieSagesseImg} alt="Tantie" className="w-20 h-20 object-contain opacity-40" />
                <p className="text-sm text-center">Commencez à écrire ou choisissez une suggestion ci-contre</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 self-end border-2 border-purple-100">
                    <img src={tantieSagesseImg} alt="Tantie" className="w-full h-full object-cover" />
                  </div>
                )}
                <div
                  className="max-w-[75%] px-4 py-2.5 rounded-3xl text-sm"
                  style={msg.role === 'user'
                    ? { background: TANTIE_GRADIENT, color: '#fff', borderBottomRightRadius: 6 }
                    : { background: '#F5F3FF', color: '#1F2937', border: '2px solid #EDE9FE', borderBottomLeftRadius: 6 }
                  }
                >
                  {msg.isLoading ? (
                    <div className="flex gap-1 py-1">
                      {[0,1,2].map(i => (
                        <motion.div key={i} className="w-2 h-2 rounded-full bg-purple-400"
                          animate={{ y: [0,-6,0] }}
                          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
                      ))}
                    </div>
                  ) : msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 pl-9">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <motion.div key={i} className="w-2 h-2 rounded-full bg-purple-300"
                      animate={{ y: [0,-5,0] }}
                      transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                </div>
                <span className="text-xs text-purple-400">Tantie réfléchit...</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-purple-100 flex gap-2 flex-shrink-0">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Posez une question à Tantie..."
              className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-purple-100 text-sm outline-none focus:border-purple-400 transition-colors"
            />
            <motion.button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white disabled:opacity-40"
              style={{ background: TANTIE_GRADIENT }}
              whileTap={{ scale: 0.9 }}
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Panel suggestions + infos */}
        <div className="space-y-4">

          {/* Suggestions */}
          <div className="bg-white rounded-3xl border-2 border-gray-100 p-4">
            <p className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: TANTIE_COLOR }} />
              Questions de test
            </p>
            <div className="space-y-2">
              {TEST_PROMPTS.map(p => (
                <motion.button
                  key={p}
                  onClick={() => { sendMessage(p, 'text'); }}
                  className="w-full text-left px-3 py-2.5 rounded-2xl border-2 text-xs font-semibold transition-all flex items-center gap-2"
                  style={{ borderColor: '#EDE9FE', color: '#5B21B6', background: '#F5F3FF' }}
                  whileHover={{ scale: 1.02, borderColor: TANTIE_COLOR }}
                  whileTap={{ scale: 0.97 }}
                >
                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                  {p}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Dernier intent détecté */}
          {messages.length > 0 && (() => {
            const lastUserMsg = [...messages].reverse().find(m => m.role === 'user' && m.intent);
            if (!lastUserMsg?.intent) return null;
            const intent = lastUserMsg.intent;
            return (
              <div className="bg-purple-50 rounded-3xl border-2 border-purple-100 p-4">
                <p className="text-xs font-black text-purple-900 mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4" style={{ color: TANTIE_COLOR }} />
                  Dernier intent analysé
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-purple-600">Catégorie</span>
                    <span className="font-black text-purple-900">{intent.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-600">Confiance</span>
                    <span className={`font-black ${intent.confidence === 'HIGH' ? 'text-green-600' : intent.confidence === 'MEDIUM' ? 'text-amber-600' : 'text-red-600'}`}>
                      {intent.confidence}
                    </span>
                  </div>
                  {intent.entities.length > 0 && (
                    <div>
                      <span className="text-purple-600">Entités :</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {intent.entities.map((e, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full bg-purple-200 text-purple-800 font-semibold">
                            {e.type}: {e.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// ONGLET ARCHITECTURE (Phase 2/3 Readiness)
// ============================================================================

const LUCIDE_MAP: Record<string, React.ReactNode> = {
  Package:         <Package className="w-4 h-4" />,
  ShoppingCart:    <ShoppingCart className="w-4 h-4" />,
  Calculator:      <Calculator className="w-4 h-4" />,
  Wallet:          <Wallet className="w-4 h-4" />,
  ClipboardList:   <ClipboardList className="w-4 h-4" />,
  Store:           <Store className="w-4 h-4" />,
  Leaf:            <Leaf className="w-4 h-4" />,
  Star:            <Star className="w-4 h-4" />,
  GraduationCap:   <GraduationCap className="w-4 h-4" />,
  Bell:            <Bell className="w-4 h-4" />,
  Users:           <Users className="w-4 h-4" />,
  User:            <User className="w-4 h-4" />,
  Headphones:      <Headphones className="w-4 h-4" />,
  Plus:            <Plus className="w-4 h-4" />,
  LayoutDashboard: <LayoutDashboard className="w-4 h-4" />,
  PlusCircle:      <Plus className="w-4 h-4" />,
  Upload:          <Sparkles className="w-4 h-4" />,
  ArrowUpCircle:   <Wallet className="w-4 h-4" />,
};

const ROLE_LABELS_ARCH: Record<string, string> = {
  marchand: 'Marchand', producteur: 'Producteur',
  cooperative: 'Coopérative', institution: 'Institution',
  identificateur: 'Identificateur',
};

const ROLE_COLORS_ARCH: Record<string, string> = {
  marchand: '#C46210', producteur: '#00563B', cooperative: '#2072AF',
  institution: '#702963', identificateur: '#9F8170',
};

function OngletArchitecture() {
  const [selectedRole, setSelectedRole] = useState<RegistryRole>('marchand');
  const [showPhase3, setShowPhase3] = useState(false);

  const ROLES: RegistryRole[] = ['marchand', 'producteur', 'cooperative', 'institution', 'identificateur'];

  const actionsForRole = getActionsForRole(selectedRole, showPhase3);
  const phase2Actions  = ACTION_REGISTRY.filter(a => a.phase === 2);
  const phase3Actions  = ACTION_REGISTRY.filter(a => a.phase === 3);

  const intentGroups = phase2Actions.reduce<Record<string, number>>((acc, a) => {
    a.intentCategories.forEach(cat => {
      acc[cat] = (acc[cat] ?? 0) + 1;
    });
    return acc;
  }, {});

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900">Architecture Phase 2/3</h2>
          <p className="text-sm text-gray-500">ActionRegistry — {ACTION_REGISTRY.length} actions définies</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">Afficher Phase 3</span>
          <motion.button
            onClick={() => setShowPhase3(s => !s)}
            className="w-12 h-6 rounded-full relative flex-shrink-0"
            style={{ backgroundColor: showPhase3 ? TANTIE_COLOR : '#D1D5DB' }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5"
              animate={{ left: showPhase3 ? '26px' : '2px' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </motion.button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Actions Phase 2" value={phase2Actions.length} sub="READ-ONLY actives"
          icon={Unlock} color="#10B981" trend="neutral" />
        <KPICard label="Actions Phase 3" value={phase3Actions.length} sub="Mutations futures"
          icon={Lock} color="#F59E0B" trend="neutral" />
        <KPICard label="Intentions couvertes" value={Object.keys(intentGroups).length} sub="Types d'intent"
          icon={Brain} color={TANTIE_COLOR} trend="neutral" />
        <KPICard label="Préparation backend" value="8/10" sub="Services stubés"
          icon={Database} color="#3B82F6" trend="up" />
      </div>

      {/* Sélecteur de rôle */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-5">
        <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: TANTIE_COLOR }} />
          Actions disponibles par profil
        </h3>
        <div className="flex gap-2 flex-wrap mb-5">
          {ROLES.map(role => (
            <motion.button
              key={role}
              onClick={() => setSelectedRole(role)}
              className="px-3 py-1.5 rounded-2xl border-2 text-xs font-black transition-all"
              style={{
                borderColor: selectedRole === role ? ROLE_COLORS_ARCH[role] : '#E5E7EB',
                background:  selectedRole === role ? `${ROLE_COLORS_ARCH[role]}14` : '#F9FAFB',
                color:       selectedRole === role ? ROLE_COLORS_ARCH[role] : '#6B7280',
              }}
              whileTap={{ scale: 0.95 }}
            >
              {ROLE_LABELS_ARCH[role]}
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
          {actionsForRole.map((action, i) => (
            <motion.div
              key={action.id}
              className="flex items-center gap-3 p-3 rounded-2xl border-2 transition-all"
              style={{
                borderColor: action.phase === 2 ? '#D1FAE5' : '#FEF3C7',
                background:  action.phase === 2 ? '#F0FDF4' : '#FFFBEB',
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: action.phase === 2
                    ? 'linear-gradient(135deg, #10B981 0%, #34D399 100%)'
                    : 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                }}
              >
                <span style={{ color: '#fff' }}>
                  {LUCIDE_MAP[action.icon] ?? <Cpu className="w-4 h-4" />}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-gray-900 truncate">{action.label}</p>
                <p className="text-xs text-gray-400 truncate">{action.route ?? action.id}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span
                  className="px-2 py-0.5 rounded-full text-white font-black"
                  style={{ fontSize: 9, background: action.phase === 2 ? '#10B981' : '#F59E0B' }}
                >
                  P{action.phase}
                </span>
                {action.requiresConfirmation && (
                  <span className="px-2 py-0.5 rounded-full text-white font-black bg-red-400" style={{ fontSize: 9 }}>
                    CONFIRM
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Couverture des intents */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-5">
        <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
          <Network className="w-4 h-4" style={{ color: TANTIE_COLOR }} />
          Couverture des intents (Phase 2)
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(intentGroups)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, count]) => (
              <div
                key={cat}
                className="flex items-center justify-between p-3 rounded-2xl border-2 border-gray-100 bg-gray-50"
              >
                <div>
                  <p className="text-xs font-black text-gray-900">{cat}</p>
                  <p className="text-xs text-gray-400">{count} action{count > 1 ? 's' : ''}</p>
                </div>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: INTENT_COLORS[cat] ?? '#9CA3AF' }}
                >
                  <span className="text-white font-black" style={{ fontSize: 11 }}>{count}</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Services backend Phase 3 */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-5">
        <h3 className="text-sm font-black text-gray-900 mb-1 flex items-center gap-2">
          <Cpu className="w-4 h-4" style={{ color: TANTIE_COLOR }} />
          Services backend Phase 3 — Stubs AgentRouter
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Ces services seront branchés sur Supabase / API REST en Phase 3.
          Les interfaces sont prêtes dans AgentRouter.ts.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[
            { service: 'StockService',   intents: ['STOCK'],             status: 'stub',    desc: 'Lecture / écriture stock marchand' },
            { service: 'OrderService',   intents: ['COMMANDE', 'VENTE'], status: 'stub',    desc: 'Création et suivi des commandes' },
            { service: 'WalletService',  intents: ['WALLET'],            status: 'stub',    desc: 'Solde, virement, rechargement' },
            { service: 'RecolteService', intents: ['RECOLTE'],           status: 'stub',    desc: 'Publication et gestion récoltes' },
            { service: 'UserService',    intents: ['PROFIL', 'SCORE'],   status: 'planned', desc: 'Modification profil, score Jùlaba' },
            { service: 'AlertService',   intents: ['ALERTE'],            status: 'planned', desc: 'Push notifications, alertes temps réel' },
          ].map(svc => (
            <div
              key={svc.service}
              className="flex items-start gap-3 p-3 rounded-2xl border-2"
              style={{
                borderColor: svc.status === 'stub' ? '#DDD6FE' : '#E5E7EB',
                background:  svc.status === 'stub' ? '#F5F3FF' : '#F9FAFB',
              }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  background: svc.status === 'stub'
                    ? 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)'
                    : '#E5E7EB',
                }}
              >
                <Database className="w-4 h-4" style={{ color: svc.status === 'stub' ? '#fff' : '#9CA3AF' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-xs font-black text-gray-900">{svc.service}</p>
                  <span
                    className="px-2 py-0.5 rounded-full font-black"
                    style={{
                      fontSize: 9,
                      background: svc.status === 'stub' ? '#7C3AED20' : '#F3F4F6',
                      color:      svc.status === 'stub' ? '#7C3AED'   : '#9CA3AF',
                    }}
                  >
                    {svc.status === 'stub' ? 'STUB READY' : 'PLANIFIÉ'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{svc.desc}</p>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {svc.intents.map(intent => (
                    <span
                      key={intent}
                      className="px-1.5 py-0.5 rounded-lg text-white font-black"
                      style={{ fontSize: 8, background: INTENT_COLORS[intent] ?? '#9CA3AF' }}
                    >
                      {intent}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bilan audit conformité */}
      <div
        className="p-5 rounded-3xl border-2"
        style={{ borderColor: '#10B98130', background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}
          >
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-black text-gray-900">Score de conformité : 96%</p>
            <p className="text-xs text-emerald-700">Architecture V2 — Prête pour la Phase 3</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {[
            { label: 'P0 Corrections',  value: '4/4 OK' },
            { label: 'P1 Modules',      value: '4/4 OK' },
            { label: 'P2 Nettoyage',    value: '3/3 OK' },
            { label: 'ActionRegistry',  value: `${ACTION_REGISTRY.length} actions` },
            { label: 'AgentRouter',     value: 'Opérationnel' },
            { label: 'Backend Prep',    value: '8/10' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-400 truncate">{item.label}</p>
                <p className="text-xs font-black text-gray-900">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// ONGLET HISTORIQUE
// ============================================================================

function OngletHistorique() {
  const { messages, session } = useTantie();

  const allMessages = messages.filter(m => !m.isLoading);
  const userMessages = allMessages.filter(m => m.role === 'user');
  const assistantMessages = allMessages.filter(m => m.role === 'assistant');

  const intentGroups = userMessages.reduce<Record<string, number>>((acc, m) => {
    const cat = m.intent?.category ?? 'INCONNU';
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});

  const barData = Object.entries(intentGroups)
    .map(([cat, count]) => ({ cat, count, color: INTENT_COLORS[cat] ?? '#9CA3AF' }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

      <div>
        <h2 className="text-lg font-black text-gray-900">Historique de session</h2>
        <p className="text-sm text-gray-500">Analyse de la conversation courante</p>
      </div>

      {/* Résumé session */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Messages total" value={allMessages.length} icon={MessageSquare} color={TANTIE_COLOR} trend="neutral" />
        <KPICard label="Questions" value={userMessages.length} icon={Users} color="#F59E0B" trend="neutral" />
        <KPICard label="Réponses" value={assistantMessages.length} icon={Bot} color="#10B981" trend="neutral" />
        <KPICard label="Intentions uniques" value={Object.keys(intentGroups).length} icon={Brain} color="#8B5CF6" trend="neutral" />
      </div>

      {/* Distribution des intentions */}
      {barData.length > 0 && (
        <div className="bg-white rounded-3xl border-2 border-gray-100 p-5">
          <h3 className="text-sm font-black text-gray-900 mb-4">Distribution des intentions dans cette session</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} allowDecimals={false} />
              <YAxis type="category" dataKey="cat" tick={{ fontSize: 11, fill: '#6B7280' }} width={80} />
              <Tooltip
                contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}
                formatter={(v: any) => [v, 'questions']}
              />
              <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Timeline messages */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-5">
        <h3 className="text-sm font-black text-gray-900 mb-4">
          Timeline — {allMessages.length} messages
        </h3>

        {allMessages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
            <History className="w-12 h-12 opacity-30" />
            <p className="text-sm">Aucun message dans cette session</p>
            <p className="text-xs">Ouvrez Tantie Sagesse et commencez à discuter</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {allMessages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                className="flex items-start gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors"
                initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
              >
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: msg.role === 'user' ? '#7C3AED' : '#F5F3FF', border: '2px solid #EDE9FE' }}
                >
                  {msg.role === 'user'
                    ? <Users className="w-3.5 h-3.5 text-white" />
                    : <Bot className="w-3.5 h-3.5" style={{ color: TANTIE_COLOR }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-black" style={{ color: msg.role === 'user' ? '#7C3AED' : '#374151' }}>
                      {msg.role === 'user' ? 'Utilisateur' : 'Tantie Sagesse'}
                    </span>
                    {msg.intent?.category && (
                      <span
                        className="px-2 py-0.5 rounded-full text-white font-semibold"
                        style={{ fontSize: 9, background: INTENT_COLORS[msg.intent.category] ?? '#9CA3AF' }}
                      >
                        {msg.intent.category}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">
                      {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 line-clamp-2">{msg.content}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

type Onglet = 'stats' | 'config' | 'test' | 'historique' | 'architecture';

const ONGLETS: { id: Onglet; label: string; icon: any }[] = [
  { id: 'stats',        label: 'Statistiques',  icon: BarChart3 },
  { id: 'config',       label: 'Configuration', icon: Settings },
  { id: 'test',         label: 'Simulateur',    icon: Play },
  { id: 'historique',   label: 'Historique',    icon: History },
  { id: 'architecture', label: 'Architecture',  icon: Cpu },
];

export function BOTantie() {
  const [activeTab, setActiveTab] = useState<Onglet>('stats');

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">

      {/* Header page */}
      <motion.div
        className="mb-6 rounded-3xl overflow-hidden"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div
          className="p-6 lg:p-8 relative overflow-hidden"
          style={{ background: TANTIE_GRADIENT }}
        >
          {/* Shimmer */}
          <motion.div
            className="absolute inset-0 bg-white/10"
            style={{ skewX: '-15deg', width: '40%' }}
            animate={{ x: ['-120%', '300%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
          />

          <div className="relative flex items-center gap-5">
            <motion.div
              className="w-20 h-20 rounded-3xl overflow-hidden border-4 border-white/30 shadow-2xl flex-shrink-0"
              animate={{ rotate: [0, 3, -3, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img src={tantieSagesseImg} alt="Tantie Sagesse" className="w-full h-full object-cover" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span className="text-amber-200 text-sm font-semibold">Module IA</span>
              </div>
              <h1 className="text-white font-black text-2xl lg:text-3xl leading-tight">
                Tantie Sagesse
              </h1>
              <p className="text-purple-200 text-sm mt-1">
                Assistant IA conversationnel — Administration et pilotage
              </p>
            </div>

            {/* Badges live */}
            <div className="hidden lg:flex flex-col gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/20">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-white text-xs font-semibold">IA Opérationnelle</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/20">
                <Brain className="w-4 h-4 text-white" />
                <span className="text-white text-xs font-semibold">100% Hors-ligne</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/20">
                <Cpu className="w-4 h-4 text-white" />
                <span className="text-white text-xs font-semibold">Phase 3 Ready</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Onglets */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {ONGLETS.map(tab => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 font-semibold text-sm flex-shrink-0 transition-all"
            style={activeTab === tab.id
              ? { background: TANTIE_GRADIENT, color: '#fff', borderColor: 'transparent' }
              : { background: '#fff', color: '#6B7280', borderColor: '#E5E7EB' }
            }
            whileHover={activeTab !== tab.id ? { scale: 1.03, borderColor: TANTIE_COLOR } : {}}
            whileTap={{ scale: 0.97 }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* Contenu */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'stats'        && <OngletStats />}
          {activeTab === 'config'       && <OngletConfig />}
          {activeTab === 'test'         && <OngletTest />}
          {activeTab === 'historique'   && <OngletHistorique />}
          {activeTab === 'architecture' && <OngletArchitecture />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
