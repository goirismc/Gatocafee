'use client';
import { motion } from 'framer-motion';

export default function KpiCard({ label, valor, sub, icono, color = 'cafe', delay = 0, tendencia }) {
  const colores = {
    cafe:    'from-cafe-700 to-cafe-500',
    verde:   'from-green-700 to-green-500',
    naranja: 'from-orange-600 to-amber-500',
    rojo:    'from-red-700 to-red-500',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="card hover:shadow-cafe transition-shadow duration-200"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="kpi-label truncate">{label}</p>
          <p className="kpi-value mt-1 truncate">{valor}</p>
          {sub && <p className="text-xs text-cafe-400 mt-1">{sub}</p>}
          {tendencia !== undefined && (
            <div className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2 py-0.5 rounded-full
              ${tendencia >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {tendencia >= 0 ? '↑' : '↓'} {Math.abs(tendencia)}%
            </div>
          )}
        </div>
        {icono && (
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colores[color] || colores.cafe} flex items-center justify-center text-white shadow-cafe-sm shrink-0 ml-3`}>
            {icono}
          </div>
        )}
      </div>
    </motion.div>
  );
}
