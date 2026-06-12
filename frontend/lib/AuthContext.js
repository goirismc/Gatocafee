// lib/AuthContext.js
'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from './api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  // Restaurar sesión al recargar la página
  useEffect(() => {
    const token = localStorage.getItem('gatocafee_token');
    const usuarioGuardado = localStorage.getItem('gatocafee_usuario');
    if (token && usuarioGuardado) {
      try {
        setUsuario(JSON.parse(usuarioGuardado));
      } catch {}
    }
    setCargando(false);
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('gatocafee_token', data.token);
      localStorage.setItem('gatocafee_usuario', JSON.stringify(data.usuario));
      setUsuario(data.usuario);
      toast.success(`¡Bienvenido, ${data.usuario.nombre}!`);
      router.push('/dashboard');
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.mensaje || 'Error al iniciar sesión';
      toast.error(msg);
      return { success: false, mensaje: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('gatocafee_token');
    localStorage.removeItem('gatocafee_usuario');
    setUsuario(null);
    router.push('/login');
    toast.success('Sesión cerrada');
  };

  // Verifica si el usuario tiene el rol requerido
  const tieneRol = (...roles) => usuario && roles.includes(usuario.rol);

  return (
    <AuthContext.Provider value={{ usuario, login, logout, tieneRol, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
