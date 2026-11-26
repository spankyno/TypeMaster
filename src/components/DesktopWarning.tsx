import React, { useState, useEffect } from 'react';
import { Monitor, X } from 'lucide-react';

export const DesktopWarning: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
    if (isTouch) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-xl mx-auto bg-amber-500 text-neutral-950 p-4 rounded-2xl shadow-xl flex items-center justify-between gap-4 font-medium text-xs md:text-sm animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-3">
        <Monitor className="w-5 h-5 shrink-0" />
        <span>
          <strong>Nota de diseño:</strong> TypeMaster está optimizado para uso en PC con teclado físico para garantizar precisión y velocidad.
        </span>
      </div>
      <button
        onClick={() => setShow(false)}
        className="p-1 rounded-lg hover:bg-black/10 transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
