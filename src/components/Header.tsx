import React from 'react';
import {
  User,
  Volume2,
  VolumeX,
  Eye,
  BarChart3,
  Sparkles,
  Bus,
  Printer,
  Database,
  Navigation,
  MapPin,
  ClockAlert,
  LocateFixed,
  Shield,
} from 'lucide-react';
import { CommuterProfileId, PassengerUser, CustomerLocation } from '../types/transit';
import { SupportedLanguage } from '../services/speechService';
import { TRANSLATIONS } from '../services/i18n';

interface HeaderProps {
  currentProfile: CommuterProfileId;
  onSelectProfile: (profile: CommuterProfileId) => void;
  passenger: PassengerUser;
  onEditPassenger: () => void;
  customerLocation: CustomerLocation;
  onDetectLocation: () => void;
  language: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  activeNavTab: string;
  onSelectNavTab: (tab: string) => void;
  onOpenBacktest: () => void;
  onOpenAIAssistant: () => void;
  onOpenETM: () => void;
  onOpenGpsTracker: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentProfile,
  onSelectProfile,
  passenger,
  onEditPassenger,
  customerLocation,
  onDetectLocation,
  language,
  onSelectLanguage,
  highContrast,
  onToggleHighContrast,
  voiceEnabled,
  onToggleVoice,
  activeNavTab,
  onSelectNavTab,
  onOpenBacktest,
  onOpenAIAssistant,
  onOpenETM,
  onOpenGpsTracker,
}) => {
  const t = TRANSLATIONS[language];

  return (
    <header className="border-b border-emerald-800/60 bg-emerald-950/95 text-white sticky top-0 z-40 shadow-lg shadow-emerald-950/40">
      {/* Top Bar: Brand, Customer Specific Location, Language & Quick Actions (Back button removed from task bar per user request) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white text-emerald-700 flex items-center justify-center shadow-md font-bold shrink-0">
              <Bus className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight font-mono text-white">
                  {t.appTitle}
                </span>
                <span className="text-[9px] bg-emerald-500 text-slate-950 font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider">
                  GREEN
                </span>
              </div>
              <p className="text-[10px] text-emerald-200/80 font-medium truncate max-w-[200px] sm:max-w-xs">
                {t.tagline}
              </p>
            </div>
          </div>

          {/* Mobile Right Quick Action Icons */}
          <div className="flex items-center gap-1.5 md:hidden">
            <button
              onClick={onOpenGpsTracker}
              title="GPS Fleet Tracker"
              className="p-1.5 rounded-lg bg-emerald-900 border border-emerald-700 text-emerald-200"
            >
              <Navigation className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenETM}
              title={t.tabETM}
              className="p-1.5 rounded-lg bg-emerald-900 border border-emerald-700 text-emerald-200"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onEditPassenger}
              title="Edit Profile"
              className="p-1.5 rounded-lg bg-emerald-900 border border-emerald-700 text-white"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Commuter Specific Real-time Location Indicator */}
        <div
          onClick={onOpenGpsTracker}
          className="cursor-pointer group flex items-center gap-2.5 bg-emerald-900/60 hover:bg-emerald-900/90 px-3 py-1.5 rounded-xl border border-emerald-700/80 text-xs transition shadow-inner"
          title="Click to view live GPS radar & distance from approaching buses"
        >
          <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300">
            <MapPin className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-emerald-300">
              <span>{t.customerLocationLabel} (GPS ±{customerLocation.accuracyMeters}m):</span>
            </div>
            <div className="font-bold text-white text-xs truncate max-w-[220px] lg:max-w-xs">
              {customerLocation.locationName}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDetectLocation();
            }}
            className="p-1 rounded-md bg-emerald-800 hover:bg-emerald-700 text-white"
            title="Detect GPS"
          >
            <LocateFixed className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Global Toolbar: Language, Accessibility, GPS, ETM, AI Advisor */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Language Selector (Working across EN, HI, KN) */}
          <div className="flex items-center bg-emerald-900/80 rounded-lg p-0.5 border border-emerald-700/80 text-xs shadow-xs">
            {(['en', 'hi', 'kn'] as SupportedLanguage[]).map(lang => (
              <button
                key={lang}
                onClick={() => onSelectLanguage(lang)}
                className={`px-2 py-1 rounded font-bold transition text-xs ${
                  language === lang
                    ? 'bg-white text-emerald-900 shadow-sm'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                {lang === 'en' ? 'EN' : lang === 'hi' ? 'हिन्दी' : 'ಕನ್ನಡ'}
              </button>
            ))}
          </div>

          {/* Voice Audio Toggle */}
          <button
            onClick={onToggleVoice}
            title={voiceEnabled ? 'Voice Guidance Active' : 'Enable Voice Guidance'}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition ${
              voiceEnabled
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-emerald-900/70 text-emerald-300 border-emerald-700 hover:text-white'
            }`}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* High Contrast */}
          <button
            onClick={onToggleHighContrast}
            title="Accessibility High Contrast"
            className={`p-1.5 rounded-lg border text-xs flex items-center transition ${
              highContrast
                ? 'bg-yellow-400 text-slate-950 border-yellow-300 font-bold'
                : 'bg-emerald-900/70 text-emerald-300 border-emerald-700 hover:text-white'
            }`}
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Dedicated GPS Tracker Tool Button */}
          <button
            onClick={onOpenGpsTracker}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeNavTab === 'gps_tracker'
                ? 'bg-white text-emerald-900 shadow-sm'
                : 'bg-emerald-900 hover:bg-emerald-800 text-emerald-200 border border-emerald-700'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GPS Tracker</span>
          </button>

          {/* Conductor ETM Machine Button */}
          <button
            onClick={onOpenETM}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>ETM Conductor POS</span>
          </button>

          {/* AI Advisor */}
          <button
            onClick={onOpenAIAssistant}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">AI Advisor</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-emerald-900/50 border-t border-emerald-800/40 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-4 overflow-x-auto text-xs py-1.5 font-medium">
          {[
            { id: 'buses', label: t.tabBuses, icon: <Bus className="w-3.5 h-3.5" /> },
            { id: 'gps_tracker', label: t.tabGpsTracker, icon: <Navigation className="w-3.5 h-3.5 text-cyan-400" /> },
            { id: 'live_map', label: t.tabLiveMap, icon: <Shield className="w-3.5 h-3.5" /> },
            { id: 'busy_times', label: t.tabBusyTimes, icon: <ClockAlert className="w-3.5 h-3.5" /> },
            { id: 'etm_showcase', label: t.tabETM, icon: <Printer className="w-3.5 h-3.5" /> },
            { id: 'evaluator_db', label: t.tabEvaluatorDB, icon: <Database className="w-3.5 h-3.5" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => onSelectNavTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                activeNavTab === tab.id
                  ? 'bg-white text-emerald-900 font-bold shadow-xs'
                  : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
