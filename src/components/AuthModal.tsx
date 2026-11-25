import React, { useState } from 'react';
import { useTypingStore } from '../store/useTypingStore';
import { User, LogIn, LogOut, CheckCircle2, AlertCircle, Database, RefreshCw, X, Shield, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { profile, loginUser, logoutUser, dbStatus, checkDbConnection, testHistory } = useTypingStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [testingDb, setTestingDb] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Por favor, introduce tu nombre de usuario o alias.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await loginUser(username.trim(), email.trim());
    setLoading(false);

    if (res.success) {
      setUsername('');
      setEmail('');
      onClose();
    } else {
      setError(res.error || 'No se pudo iniciar sesión. Verifica tu conexión.');
    }
  };

  const handleLogout = () => {
    logoutUser();
    onClose();
  };

  const handleTestDb = async () => {
    setTestingDb(true);
    await checkDbConnection();
    setTestingDb(false);
  };

  const isGuest = profile.id === 'guest' || profile.isGuest;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          title="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {isGuest ? 'Identificación de Usuario' : 'Perfil de Usuario'}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isGuest
                ? 'Inicia sesión para guardar tu progreso en Neon PostgreSQL'
                : 'Sesión activa y sincronizada'}
            </p>
          </div>
        </div>

        {/* Database Status Pill */}
        <div className="mb-6 p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-neutral-500" />
            <div>
              <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                Base de Datos Neon:
                {dbStatus === 'connected' && (
                  <span className="text-emerald-500 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Conectada
                  </span>
                )}
                {dbStatus === 'checking' && (
                  <span className="text-amber-500 font-medium">Verificando...</span>
                )}
                {dbStatus === 'offline' && (
                  <span className="text-neutral-400 font-medium">Modo Local / Esperando DATABASE_URL</span>
                )}
                {dbStatus === 'error' && (
                  <span className="text-rose-500 font-bold">Error de conexión</span>
                )}
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                {dbStatus === 'connected'
                  ? 'Tus tests y nivel se guardan en la nube Neon'
                  : 'Se guardan en el navegador hasta que configures DATABASE_URL'}
              </div>
            </div>
          </div>

          <button
            onClick={handleTestDb}
            disabled={testingDb}
            className="p-2 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 transition-colors"
            title="Comprobar conexión con Neon"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingDb ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isGuest ? (
          /* Login / Registration Form */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Nombre de Usuario o Alias <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ejemplo: carlos_pro, marta, dev_typing"
                className="w-full px-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                autoFocus
                required
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Si el usuario ya existe en Neon, se cargará su historial y nivel. Si no existe, se creará uno nuevo automáticamente.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Correo Electrónico <span className="text-neutral-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={loading || !username.trim()}
                className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-neutral-950 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>Acceder / Crear Perfil</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                Continuar como Invitado
              </button>
            </div>
          </form>
        ) : (
          /* Logged In Profile Details */
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/80">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-neutral-950 font-black text-xl flex items-center justify-center">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                    {profile.username}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span className="font-mono">{profile.id}</span>
                    {profile.email && <span>• {profile.email}</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-700/60 text-center">
                <div>
                  <div className="text-[10px] uppercase font-bold text-neutral-400">Nivel</div>
                  <div className="text-lg font-black text-amber-500">{profile.level}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-neutral-400">XP Total</div>
                  <div className="text-lg font-black text-neutral-900 dark:text-white">{profile.xp}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-neutral-400">Tests</div>
                  <div className="text-lg font-black text-neutral-900 dark:text-white">{testHistory.length}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                className="flex-1 py-3 px-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>

              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                Continuar Practicando
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
