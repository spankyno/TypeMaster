import React from 'react';
import { useTypingStore } from '../store/useTypingStore';
import { Trophy, X, CheckCircle2, Lock, Flame, Zap, Target, Calendar, Flag } from 'lucide-react';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ isOpen, onClose }) => {
  const { achievements, profile } = useTypingStore();
  if (!isOpen) return null;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flag': return <Flag className="w-5 h-5 text-amber-500" />;
      case 'Zap': return <Zap className="w-5 h-5 text-indigo-500" />;
      case 'Flame': return <Flame className="w-5 h-5 text-rose-500" />;
      case 'Target': return <Target className="w-5 h-5 text-emerald-500" />;
      case 'Calendar': return <Calendar className="w-5 h-5 text-purple-500" />;
      default: return <Trophy className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Logros y Nivel</h2>
            <p className="text-sm text-neutral-500">Nivel actual: {profile.level} ({profile.xp} XP total)</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 mb-6">
          <div className="flex justify-between text-xs font-semibold text-neutral-500 mb-2">
            <span>Progreso hacia Nivel {profile.level + 1}</span>
            <span>{profile.xp % 500} / 500 XP</span>
          </div>
          <div className="w-full h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${((profile.xp % 500) / 500) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                ach.unlocked
                  ? 'bg-amber-500/5 border-amber-500/30'
                  : 'bg-neutral-50 dark:bg-neutral-800/30 border-neutral-200 dark:border-neutral-800 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shadow-xs">
                  {getIcon(ach.icon)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">{ach.title}</h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{ach.description}</p>
                </div>
              </div>

              <div>
                {ach.unlocked ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Lock className="w-5 h-5 text-neutral-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
