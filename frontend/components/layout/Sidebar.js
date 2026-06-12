// components/layout/Sidebar.js
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../lib/AuthContext';
import {
  Coffee, LayoutDashboard, ShoppingCart, Package,
  Warehouse, Users, DollarSign, BarChart2,
  Tag, LogOut, ChevronLeft, TrendingUp, Database,
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { href: '/dashboard',   label: 'Dashboard',       icon: LayoutDashboard, roles: ['administrador','gerente','cajero'] },
  { href: '/pos',         label: 'Punto de Venta',  icon: ShoppingCart,    roles: ['administrador','gerente','cajero'] },
  { href: '/ventas',      label: 'Ventas',           icon: DollarSign,      roles: ['administrador','gerente','cajero'] },
  { href: '/productos',   label: 'Productos',        icon: Package,         roles: ['administrador','gerente'] },
  { href: '/inventario',  label: 'Inventario',       icon: Warehouse,       roles: ['administrador','gerente','cajero'] },
  { href: '/clientes',    label: 'Clientes',         icon: Users,           roles: ['administrador','gerente','cajero'] },
  { href: '/caja',        label: 'Caja',             icon: Coffee,          roles: ['administrador','gerente','cajero'] },
  { href: '/promociones', label: 'Promociones',      icon: Tag,             roles: ['administrador','gerente'] },
  { href: '/reportes',    label: 'Reportes',         icon: BarChart2,       roles: ['administrador','gerente'] },
  { href: '/financiero',  label: 'Financiero',       icon: TrendingUp,      roles: ['administrador','gerente'] },
];

export default function Sidebar() {
  const { usuario, logout, tieneRol } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupModal, setBackupModal] = useState(false);

  const itemsVisibles = NAV_ITEMS.filter(item => tieneRol(...item.roles));

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="h-screen bg-cafe-800 flex flex-col shadow-cafe-lg relative z-20 shrink-0 overflow-hidden"
    >
      {/* Logo (clickable area) */}
      <div
        className="flex items-center gap-3 px-4 py-5 border-b border-cafe-700 cursor-pointer select-none"
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed(!collapsed)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsed(!collapsed); } }}
        title="Mostrar / Ocultar menú"
      >
        <div className="w-9 h-9 rounded-xl bg-crema-200 flex items-center justify-center shrink-0">
          <Coffee size={18} className="text-cafe-800" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}
              className="font-display text-lg font-bold text-crema-100 whitespace-nowrap"
            >
              Gatocafee
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {itemsVisibles.map((item) => {
          const activo = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div whileHover={{ x: 2 }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150
                  ${activo ? 'bg-crema-200 text-cafe-800 shadow-cafe-sm' : 'text-crema-300 hover:bg-cafe-700 hover:text-crema-100'}`}
              >
                <Icon size={18} className="shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.12 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}
        {/* Botón de Backup justo después de Financiero */}
        {itemsVisibles.some(i => i.href === '/financiero') && tieneRol('administrador', 'gerente') && (
          <div className="">
            <button
              onClick={() => setBackupModal(true)}
              disabled={backupLoading}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-crema-300 hover:bg-cafe-700 hover:text-crema-100 transition-colors"
            >
              <Database size={18} className="shrink-0" />
              {!collapsed && <span className="text-sm font-medium">Backup</span>}
            </button>

            {/* Modal de confirmación */}
            {backupModal && (
              <div className="fixed inset-0 bg-cafe-900/60 flex items-center justify-center z-50 p-4" onClick={() => setBackupModal(false)}>
                <div className="bg-white w-full max-w-md p-6 rounded-lg shadow-lg" onClick={(e)=>e.stopPropagation()}>
                  <h3 className="font-semibold text-cafe-800 mb-2">Generar backup</h3>
                  <p className="text-sm text-cafe-500 mb-4">¿Deseas crear un backup completo de toda la cafetería? Se descargará un archivo JSON con todos los registros.</p>
                  <div className="flex gap-3">
                    <button type="button" onClick={()=>setBackupModal(false)} className="btn-secondary flex-1">Cancelar</button>
                    <button type="button" onClick={async () => {
                      setBackupModal(false);
                      // Ejecutar la misma lógica que antes
                      setBackupLoading(true);
                      try {
                        const { data } = await api.post('/backup/crear');
                        const archivo = data.archivo;
                        toast.success('Backup creado. Iniciando descarga...');
                        try {
                          const resp = await api.get(`/backup/descargar/${archivo}`, { responseType: 'blob' });
                          const contentType = resp.headers['content-type'] || '';
                          const url = window.URL.createObjectURL(new Blob([resp.data], { type: contentType || 'application/octet-stream' }));
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = archivo;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (downloadErr) {
                          console.error('Error descargando backup:', downloadErr);
                          // Fallback: intentar obtener el archivo en base64 desde el servidor
                          try {
                            const { data: json } = await api.get(`/backup/descargar-json/${archivo}`);
                            if (json && json.success && json.contenidoBase64) {
                              const b = atob(json.contenidoBase64);
                              const arr = new Uint8Array(b.length);
                              for (let i = 0; i < b.length; i++) arr[i] = b.charCodeAt(i);
                              const blob = new Blob([arr], { type: json.contentType || 'application/octet-stream' });
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = archivo;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              window.URL.revokeObjectURL(url);
                              toast.success('Descarga completada (fallback)');
                            } else {
                              toast.error(json.mensaje || 'Error al descargar backup');
                            }
                          } catch (fbErr) {
                            console.error('Fallback error:', fbErr);
                            toast.error('Error al descargar backup');
                          }
                        }
                      } catch (err) {
                        const msg = err.response?.data?.mensaje || err.message || 'Error al crear backup';
                        toast.error(msg);
                      } finally {
                        setBackupLoading(false);
                      }
                    }} className="btn-primary flex-1">Aceptar</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Usuario */}
      <div className="border-t border-cafe-700 p-3 space-y-1">
        {usuario && !collapsed && (
          <div className="px-3 py-2">
            <p className="text-crema-100 text-sm font-semibold truncate">{usuario.nombre}</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cafe-600 text-crema-200 font-medium">
              {usuario.rol}
            </span>
          </div>
        )}
        <button onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-crema-400 hover:bg-red-900/40 hover:text-red-300 transition-colors"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Cerrar sesión</span>}
        </button>
      </div>

    </motion.aside>
  );
}
