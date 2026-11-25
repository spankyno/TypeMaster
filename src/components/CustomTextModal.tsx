import React, { useState } from 'react';
import { useTypingStore } from '../store/useTypingStore';
import { AlignLeft, X, Play } from 'lucide-react';

interface CustomTextModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomTextModal: React.FC<CustomTextModalProps> = ({ isOpen, onClose }) => {
  const [customText, setCustomText] = useState('');
  const { updateSettings, initTest } = useTypingStore();

  if (!isOpen) return null;

  const handleStartCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    updateSettings({ mode: 'custom' });
    initTest(customText.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <AlignLeft className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Texto Personalizado</h2>
            <p className="text-sm text-neutral-500">Pega tu propio texto, código o fragmento para practicar.</p>
          </div>
        </div>

        <form onSubmit={handleStartCustom} className="space-y-6">
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Escribe o pega aquí el texto que deseas practicar..."
            rows={5}
            className="w-full p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm resize-none"
            autoFocus
          />

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!customText.trim()}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-neutral-950 font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Play className="w-4 h-4 fill-neutral-950" /> Iniciar Práctica
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
