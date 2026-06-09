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
  Tag, LogOut, ChevronLeft, TrendingUp,
} from 'lucide-react';

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

  const itemsVisibles = NAV_ITEMS.filter(item => tieneRol(...item.roles));

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="h-screen bg-cafe-800 flex flex-col shadow-cafe-lg relative z-20 shrink-0 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-cafe-700">
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

      {/* Toggle */}
      <button onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-crema-200 border-2 border-cafe-700 flex items-center justify-center text-cafe-700 hover:bg-crema-300 transition-colors z-30"
      >
        <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronLeft size={12} />
        </motion.div>
      </button>
    </motion.aside>
  );
}
