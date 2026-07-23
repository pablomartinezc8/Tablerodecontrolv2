import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { KeyRound, Shield, User as UserIcon, LogIn, Eye, EyeOff, ClipboardList } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Empresa');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate database lookup
    setTimeout(() => {
      const uLower = username.trim().toLowerCase();
      const pTrim = password.trim();

      if (uLower === 'empresa' && pTrim === 'empresa123') {
        onLoginSuccess({ username: 'Pablo Martinez (TAGING)', role: 'Empresa' });
      } else if (uLower === 'cliente' && pTrim === 'cliente123') {
        onLoginSuccess({ username: 'Representante (CASPOSO)', role: 'Cliente' });
      } else if (uLower === 'control' && pTrim === 'control123') {
        onLoginSuccess({ username: 'Planificador Diario (CONTROL)', role: 'Control de Proyecto' });
      } else {
        setError('Credenciales inválidas. Pruebe "empresa", "cliente", "control" o use el acceso rápido demo debajo.');
        setLoading(false);
      }
    }, 400);
  };

  const handleQuickLogin = (selectedRole: UserRole) => {
    setLoading(true);
    setTimeout(() => {
      if (selectedRole === 'Empresa') {
        onLoginSuccess({ username: 'Pablo Martinez (TAGING)', role: 'Empresa' });
      } else if (selectedRole === 'Cliente') {
        onLoginSuccess({ username: 'Representante (CASPOSO)', role: 'Cliente' });
      } else {
        onLoginSuccess({ username: 'Planificador Diario (CONTROL)', role: 'Control de Proyecto' });
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(30,41,59,0.5)_0%,rgba(15,23,42,1)_100%)] z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:24px_24px] z-0" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-slate-950/80 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-2xl p-8 relative z-10"
      >
        {/* Header with SVG Logo */}
        <div className="text-center mb-6">
          <div className="flex flex-col items-center mb-4">
            <div className="w-16 h-8 relative">
              <svg viewBox="0 0 100 50" className="w-full h-full drop-shadow-[0_0_8px_rgba(14,165,233,0.4)]">
                <polygon points="20,50 80,10 80,50" fill="#00a3e0" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold tracking-widest text-white mt-1">TAGING</h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em]">Ingeniería Inteligente</p>
          </div>
          <h1 className="text-xl font-semibold text-white">Ingreso al Sistema</h1>
          <p className="text-xs text-slate-400 mt-1">Plataforma de Control Integral de Proyectos</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs leading-relaxed"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">Usuario</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <UserIcon className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej: empresa o cliente"
                className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">Contraseña</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese contraseña demo"
                className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 disabled:from-slate-800 disabled:to-slate-800 text-white font-medium py-2.5 rounded-xl text-sm transition shadow-lg shadow-sky-500/15 flex items-center justify-center space-x-2 mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Ingresar</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Quick login links */}
        <div className="mt-8 pt-6 border-t border-slate-900">
          <div className="flex items-center justify-between mb-4">
            <span className="h-[1px] bg-slate-800 w-1/4" />
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest px-2">Acceso Rápido Demo</span>
            <span className="h-[1px] bg-slate-800 w-1/4" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              onClick={() => handleQuickLogin('Empresa')}
              disabled={loading}
              className="flex flex-col items-center p-3 bg-slate-900/50 hover:bg-slate-900 hover:border-sky-500/40 border border-slate-800/80 rounded-xl text-left transition group"
            >
              <Shield className="w-5 h-5 text-sky-400 mb-1 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-xs font-semibold text-slate-200">Rol Empresa</span>
              <span className="text-[9px] text-slate-500 mt-0.5 text-center leading-tight">Control total</span>
            </button>

            <button
              onClick={() => handleQuickLogin('Cliente')}
              disabled={loading}
              className="flex flex-col items-center p-3 bg-slate-900/50 hover:bg-slate-900 hover:border-emerald-500/40 border border-slate-800/80 rounded-xl text-left transition group"
            >
              <UserIcon className="w-5 h-5 text-emerald-400 mb-1 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-xs font-semibold text-slate-200">Rol Cliente</span>
              <span className="text-[9px] text-slate-500 mt-0.5 text-center leading-tight">Solo lectura</span>
            </button>

            <button
              onClick={() => handleQuickLogin('Control de Proyecto')}
              disabled={loading}
              className="flex flex-col items-center p-3 bg-slate-900/50 hover:bg-slate-900 hover:border-amber-500/40 border border-slate-800/80 rounded-xl text-left transition group"
            >
              <ClipboardList className="w-5 h-5 text-amber-400 mb-1 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-xs font-semibold text-slate-200">Control Proy.</span>
              <span className="text-[9px] text-slate-500 mt-0.5 text-center leading-tight">Planificación/Avance</span>
            </button>
          </div>
        </div>

        {/* Informative credentials note */}
        <p className="text-[10px] text-center text-slate-600 mt-6 font-mono leading-relaxed">
          Credenciales manuales:<br />
          Empresa: <span className="text-slate-400">empresa / empresa123</span><br />
          Cliente: <span className="text-slate-400">cliente / cliente123</span><br />
          Control Proyecto: <span className="text-slate-400">control / control123</span>
        </p>
      </motion.div>
    </div>
  );
}
