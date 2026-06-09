// app/login/page.js
'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../lib/AuthContext';
import { Eye, EyeOff, Coffee } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [mostrarPass, setMostrarPass] = useState(false);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    await login(form.email, form.password);
    setCargando(false);
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo: ilustración / branding ── */}
      <motion.div
        className="hidden lg:flex w-1/2 bg-cafe-gradient flex-col justify-between p-12 relative overflow-hidden"
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Círculos decorativos */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-cafe-700/40" />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full bg-crema-500/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-cafe-600/20" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-crema-200 flex items-center justify-center shadow-cafe">
            <Coffee size={24} className="text-cafe-800" />
          </div>
          <span className="font-display text-2xl font-bold text-crema-100">Gatocafee</span>
        </div>

        {/* Texto central */}
        <div className="relative z-10 space-y-4">
          <motion.h1
            className="font-display text-5xl font-bold text-crema-100 leading-tight"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Sistema de Gestión Integral
          </motion.h1>
          <motion.p
            className="text-crema-300 text-lg leading-relaxed"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            Administrá ventas, inventario, clientes y reportes de tu cafetería desde un solo lugar.
          </motion.p>
        </div>

        {/* Features */}
        <motion.div
          className="relative z-10 grid grid-cols-2 gap-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {['Ventas en tiempo real', 'Control de stock', 'Reportes PDF/Excel', 'Punto de equilibrio'].map((f) => (
            <div key={f} className="flex items-center gap-2 text-crema-200 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-crema-400" />
              {f}
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Panel derecho: formulario ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-crema-50">
        <motion.div
          className="w-full max-w-md"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Header móvil */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-cafe-gradient flex items-center justify-center">
              <Coffee size={20} className="text-crema-100" />
            </div>
            <span className="font-display text-2xl font-bold text-cafe-800">Gatocafee</span>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold text-cafe-900 mb-2">Bienvenido</h2>
            <p className="text-cafe-500">Ingresá tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="label">Correo electrónico</label>
              <input
                type="email"
                className="input"
                placeholder="ejemplo@gatocafee.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoFocus
              />
            </div>

            {/* Password */}
            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <input
                  type={mostrarPass ? 'text' : 'password'}
                  className="input pr-12"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarPass(!mostrarPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-cafe-400 hover:text-cafe-700 transition-colors"
                >
                  {mostrarPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              className="btn-primary w-full py-3 text-base mt-2"
              disabled={cargando}
              whileTap={{ scale: 0.98 }}
            >
              {cargando ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Ingresando...
                </span>
              ) : 'Iniciar sesión'}
            </motion.button>
          </form>

          {/* Credenciales de prueba */}
          <div className="mt-8 p-4 bg-crema-100 rounded-xl border border-crema-200">
            <p className="text-xs font-semibold text-cafe-600 mb-2 uppercase tracking-wide">
              Credenciales de prueba
            </p>
            <div className="space-y-1 text-xs text-cafe-500 font-mono">
              <div> admin@gatocafee.com / admin123</div>
              <div> gerente@gatocafee.com / gerente123</div>
              <div> cajero@gatocafee.com / cajero123</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
