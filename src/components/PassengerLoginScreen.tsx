import React, { useState } from 'react';
import { PassengerUser, SpecialPersonCategory, CommuterProfileId } from '../types/transit';
import { TRANSLATIONS } from '../services/i18n';
import { SupportedLanguage } from '../services/speechService';
import {
  ShieldCheck,
  User,
  Accessibility,
  HeartHandshake,
  Eye,
  Bus,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface PassengerLoginScreenProps {
  initialUser: PassengerUser;
  language: SupportedLanguage;
  onLoginComplete: (user: PassengerUser) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export const PassengerLoginScreen: React.FC<PassengerLoginScreenProps> = ({
  initialUser,
  language,
  onLoginComplete,
  onCancel,
  isModal = false,
}) => {
  const t = TRANSLATIONS[language];

  const [name, setName] = useState(initialUser.name || '');
  const [age, setAge] = useState(initialUser.age || 28);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(initialUser.gender || 'Male');
  const [specialPerson, setSpecialPerson] = useState<SpecialPersonCategory>(
    initialUser.specialPerson || 'none'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Map special person status to CommuterProfileId
    let profileId: CommuterProfileId = 'default';
    if (specialPerson === 'wheelchair') {
      profileId = 'wheelchair';
    } else if (specialPerson === 'elderly' || age >= 60) {
      profileId = 'elderly';
    } else if (specialPerson === 'mobility') {
      profileId = 'elderly';
    }

    const updatedUser: PassengerUser = {
      name: name.trim(),
      age: Number(age),
      gender,
      specialPerson,
      commuterProfileId: profileId,
      isRegistered: true,
    };

    onLoginComplete(updatedUser);
  };

  const specialOptions: {
    id: SpecialPersonCategory;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      id: 'none',
      label: t.specialNone,
      description: 'Standard commuter routing with balanced risk weights.',
      icon: <User className="w-5 h-5 text-emerald-400" />,
      color: 'border-slate-700 hover:border-emerald-500',
    },
    {
      id: 'wheelchair',
      label: t.specialWheelchair,
      description: 'Strict step-free requirement. Wheelchair bay reserved on bus. Inaccessible routes excluded.',
      icon: <Accessibility className="w-5 h-5 text-emerald-400" />,
      color: 'border-emerald-600 bg-emerald-950/20',
    },
    {
      id: 'elderly',
      label: t.specialElderly,
      description: '50% fare concession on ETM, guaranteed lower-deck seating priority.',
      icon: <HeartHandshake className="w-5 h-5 text-amber-400" />,
      color: 'border-amber-600 bg-amber-950/20',
    },
    {
      id: 'mobility',
      label: t.specialMobility,
      description: 'Low-strain routes with minimum walking and low-floor bus boarding.',
      icon: <Accessibility className="w-5 h-5 text-cyan-400" />,
      color: 'border-cyan-600 bg-cyan-950/20',
    },
    {
      id: 'vision',
      label: t.specialVision,
      description: 'Tactile paving verification, audible crosswalks, and auto-voice guidance.',
      icon: <Eye className="w-5 h-5 text-indigo-400" />,
      color: 'border-indigo-600 bg-indigo-950/20',
    },
  ];

  return (
    <div
      className={
        isModal
          ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs'
          : 'min-h-[85vh] flex items-center justify-center py-8 px-4'
      }
    >
      <div className="bg-slate-900 border border-emerald-800/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl shadow-emerald-950/50 flex flex-col">
        {/* RedBus-Green Header Banner */}
        <div className="bg-linear-to-r from-emerald-800 via-emerald-700 to-teal-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center shadow-inner">
              <Bus className="w-7 h-7 text-emerald-200 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold tracking-tight font-mono">
                  TRANSITSHIELD
                </h2>
                <span className="text-[10px] font-bold uppercase bg-white/20 px-2 py-0.5 rounded-full tracking-wider">
                  Green Edition
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-medium">
                {t.loginSubheading}
              </p>
            </div>
          </div>

          {isModal && onCancel && (
            <button
              onClick={onCancel}
              className="text-white/80 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 transition"
            >
              Close
            </button>
          )}
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 bg-slate-900">
          {/* Name & Age Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.labelName} *</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.placeholderName}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-200">
                {t.labelAge} *
              </label>
              <input
                type="number"
                required
                min={5}
                max={120}
                value={age}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setAge(val || 18);
                  if (val >= 60 && specialPerson === 'none') {
                    setSpecialPerson('elderly');
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Gender Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">
              {t.labelGender}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Male', 'Female', 'Other'] as const).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                    gender === g
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {g === 'Male' ? t.genderMale : g === 'Female' ? t.genderFemale : t.genderOther}
                </button>
              ))}
            </div>
          </div>

          {/* Special Person / Accessibility Needs (Key requirement!) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.labelSpecialPerson}</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">Select matching need</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {specialOptions.map(opt => {
                const isSelected = specialPerson === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSpecialPerson(opt.id)}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/40 ring-1 ring-emerald-500/50 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-950/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="p-1 rounded-lg bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                      {opt.icon}
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{opt.label}</span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Concession & Accessibility Benefit Notice */}
          <div className="bg-emerald-950/50 border border-emerald-800/60 p-3 rounded-xl text-[11px] text-emerald-200/90 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {t.loginBenefitNotice}
            </p>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3 px-4 rounded-xl bg-linear-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
          >
            <span>{t.loginSubmitBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
