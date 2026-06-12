'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import Sidebar from './Sidebar';
import toast from 'react-hot-toast';

export default function AppLayout({ children }) {
  const { usuario, cargando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && !usuario) router.replace('/login');
  }, [usuario, cargando]);

  // Capturar promesas rechazadas no manejadas para evitar overlay dev y notificar al usuario
  useEffect(() => {
    function onUnhandled(e) {
      try {
        e.preventDefault();
      } catch (err) {}
      const msg = e.reason?.message || (typeof e.reason === 'string' ? e.reason : 'Error inesperado');
      toast.error(msg);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', onUnhandled);
      return () => window.removeEventListener('unhandledrejection', onUnhandled);
    }
  }, []);

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-crema-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cafe-gradient flex items-center justify-center animate-pulse-soft">
            <span className="text-2xl">☕</span>
          </div>
          <p className="text-cafe-500 text-sm font-medium">Cargando Gatocafee...</p>
        </div>
      </div>
    );
  }

  if (!usuario) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-crema-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="page-enter">{children}</div>
      </main>
    </div>
  );
}
