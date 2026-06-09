'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import Sidebar from './Sidebar';

export default function AppLayout({ children }) {
  const { usuario, cargando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && !usuario) router.replace('/login');
  }, [usuario, cargando]);

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
