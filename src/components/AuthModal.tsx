import React, { useEffect, useState } from 'react';
import { useTypingStore } from '../store/useTypingStore';
import {
  User,
  LogIn,
  LogOut,
  AlertCircle,
  Database,
  RefreshCw,
  X,
  UserPlus,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    profile,
    loginUser,
    registerUser,
    logoutUser,
    dbStatus,
    checkDbConnection,
    testHistory,
  } = useTypingStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Solo se consulta el estado de la BD cuando el usuario abre este panel (no en cada visita)
  useEffect(() => {
    if (isOpen) void checkDbConnection();
  }, [isOpen, checkDbConnection]);
  const [testingDb, setTestingDb] = useState(false);

  if (!isOpen) return null;

  const isGuest = profile.id === 'guest' || profile.isGuest;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let res: { success: boolean; error?: string };
    if (mode === 'login') {
      if (!email.trim() || !password) {
        setError('Correo y contraseña son obligatorios.');
        setLoading(false);
        return;
      }
      res = await loginUser(email.trim(), password);
    } else {
      if (!username.trim() || !email.trim() || !password) {
        setError('Completa todos los campos.');
        setLoading(false);
        return;
      }
      if (password.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres.');
        setLoading(false);
        return;
      }
      res = await registerUser(username.trim(), email.trim(), password);
    }

    setLoading(false);
    if (res.success) {
      setUsername('');
      setEmail('');
      setPassword('');
      onClose();
    } else {
      setError(res.error || 'No se pudo completar la operación.');
    }
  };

  const handleLogout = () => {
    logoutUser();
    onClose();
  };

  const handleLogoutAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = useTypingStore.getState().authToken || localStorage.getItem('typemaster_token');
      if (token) {
        await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'logout-all' }),
        });
      }
    } catch {
      // still clear local session
    }
    logoutUser();
    setLoading(false);
    onClose();
  };

  const handleTestDb = async () => {
    setTestingDb(true);
    await checkDbConnection();
    setTestingDb(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {isGuest ? (mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta') : 'Perfil de Usuario'}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isGuest
                ? 'Email + contraseña · sincronización en Neon PostgreSQL'
                : 'Sesión activa'}
            </p>
          </div>
        </div>

        {/* DB status */}
        <div className="mb-6 p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            <div>
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                Neon DB:{' '}
                {dbStatus === 'connected' && (
                  <span className="text-emerald-500">Conectada</span>
                )}
                {dbStatus === 'checking' && (
                  <span className="text-amber-500">Verificando...</span>
                )}
                {dbStatus === 'offline' && (
                  <span className="text-neutral-400">Modo local</span>
                )}
                {dbStatus === 'error' && (
                  <span className="text-rose-500">Error</span>
                )}
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                {isGuest
                  ? 'Los invitados solo guardan datos en este navegador'
                  : 'Tu historial se sincroniza en la nube'}
              </div>
            </div>
          </div>
          <button
            onClick={handleTestDb}
            disabled={testingDb}
            className="p-2 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 transition-colors"
            title="Comprobar conexión"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingDb ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isGuest ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Nombre de usuario <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Tu alias público"
                  className="w-full px-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoComplete="username"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Correo electrónico <span className="text-amber-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                autoComplete="email"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Contraseña <span className="text-amber-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
                className="w-full px-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={8}
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-neutral-950 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : mode === 'login' ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              <span>{mode === 'login' ? 'Entrar' : 'Crear cuenta'}</span>
            </button>

            <div className="text-center text-xs text-neutral-500 dark:text-neutral-400">
              {mode === 'login' ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="hover:text-amber-500 transition-colors"
                >
                  ¿No tienes cuenta? Regístrate
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="hover:text-amber-500 transition-colors"
                >
                  ¿Ya tienes cuenta? Inicia sesión
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Continuar como invitado
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/80">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-neutral-950 font-black text-xl flex items-center justify-center">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-neutral-900 dark:text-white">
                    {profile.username}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">{profile.email}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div>
                  <div className="font-black text-lg text-amber-500">{profile.level}</div>
                  <div className="text-neutral-500 dark:text-neutral-400">Nivel</div>
                </div>
                <div>
                  <div className="font-black text-lg text-indigo-500">{profile.xp}</div>
                  <div className="text-neutral-500 dark:text-neutral-400">XP</div>
                </div>
                <div>
                  <div className="font-black text-lg text-emerald-500">{testHistory.length}</div>
                  <div className="text-neutral-500 dark:text-neutral-400">Tests</div>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-rose-500/10 text-neutral-700 dark:text-neutral-300 hover:text-rose-500 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
            <button
              onClick={handleLogoutAll}
              disabled={loading}
              className="w-full py-2.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-rose-500 transition-colors"
            >
              Cerrar sesión en todos los dispositivos
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
