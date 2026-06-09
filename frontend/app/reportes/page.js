'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { FileText, Download, BarChart2, Sun, Sunset, Moon } from 'lucide-react';

const GS = (n) => `Gs. ${Math.round(n||0).toLocaleString('es-PY')}`;
const TURNOS = [
  { key:'mañana', label:'Mañana',  icon:<Sun size={16}/>,    rango:'6:00 — 12:59' },
  { key:'tarde',  label:'Tarde',   icon:<Sunset size={16}/>, rango:'13:00 — 18:59' },
  { key:'noche',  label:'Noche',   icon:<Moon size={16}/>,   rango:'19:00 — 5:59' },
];

export default function ReportesPage() {
  const [desde, setDesde]         = useState('');
  const [hasta, setHasta]         = useState('');
  const [turnoData, setTurnoData] = useState(null);
  const [loadingTurno, setLoadingTurno] = useState(false);

  const descargarExcel = async () => {
    const p = new URLSearchParams();
    if (desde) p.append('desde', desde);
    if (hasta) p.append('hasta', hasta);
    try {
      const res = await api.get('/reportes/ventas/excel?' + p.toString(), { responseType: 'blob' });
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = (res.headers['content-disposition'] || '').split('filename=')[1] || `reporte-ventas-${Date.now()}.xlsx`;
      a.download = filename.replace(/"/g, '');
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Descarga iniciada');
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al descargar Excel');
    }
  };

  const verTurno = async (turno) => {
    setLoadingTurno(turno);
    try {
      const fecha = new Date().toISOString().slice(0, 10);
      const { data } = await api.get('/reportes/turno/' + turno + '?fecha=' + fecha);
      setTurnoData(data.reporte);
    } catch(err) { toast.error('Error al cargar reporte'); }
    finally { setLoadingTurno(false); }
  };

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-cafe-900">Reportes</h1>
          <p className="text-cafe-500 text-sm">Exporta datos en PDF o Excel</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Reporte Excel */}
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Download size={18} className="text-green-700"/>
              </div>
              <div>
                <h3 className="font-semibold text-cafe-800">Reporte de Ventas Excel</h3>
                <p className="text-xs text-cafe-400">3 hojas: Ventas, Top Productos, IVA</p>
              </div>
            </div>
            <div className="space-y-3">
              <div><label className="label">Desde</label>
                <input type="date" className="input" value={desde} onChange={e=>setDesde(e.target.value)}/>
              </div>
              <div><label className="label">Hasta</label>
                <input type="date" className="input" value={hasta} onChange={e=>setHasta(e.target.value)}/>
              </div>
              <button onClick={descargarExcel} className="btn-primary w-full flex items-center justify-center gap-2">
                <Download size={16}/> Descargar Excel
              </button>
            </div>
          </motion.div>

          {/* Reporte por turno */}
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cafe-100 flex items-center justify-center">
                <BarChart2 size={18} className="text-cafe-700"/>
              </div>
              <div>
                <h3 className="font-semibold text-cafe-800">Reporte por Turno — Hoy</h3>
                <p className="text-xs text-cafe-400">Ventas del día por turno</p>
              </div>
            </div>
            <div className="space-y-2">
              {TURNOS.map(t => (
                <button key={t.key} onClick={() => verTurno(t.key)} disabled={loadingTurno===t.key}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-crema-50 hover:bg-crema-100 border border-crema-200 transition-all text-left">
                  <div className="w-8 h-8 rounded-lg bg-cafe-100 flex items-center justify-center text-cafe-700">{t.icon}</div>
                  <div className="flex-1">
                    <p className="font-medium text-cafe-800 text-sm">Turno {t.label}</p>
                    <p className="text-xs text-cafe-400">{t.rango}</p>
                  </div>
                  {loadingTurno===t.key
                    ? <svg className="animate-spin h-4 w-4 text-cafe-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    : <span className="text-cafe-400 text-xs">Ver →</span>
                  }
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Resultado turno */}
        {turnoData && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="card mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-cafe-800">
                Reporte Turno {turnoData.turno?.toUpperCase()} — {turnoData.fecha}
              </h3>
              <button onClick={() => setTurnoData(null)} className="btn-ghost text-sm">✕ Cerrar</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[
                { label:'Ventas',       valor:turnoData.cantidadVentas },
                { label:'Ingresos',     valor:GS(turnoData.totalIngresos) },
                { label:'IVA',          valor:GS(turnoData.totalIVA) },
                { label:'Ticket prom.', valor:GS(turnoData.ticketPromedio) },
              ].map(k=>(
                <div key={k.label} className="bg-crema-50 rounded-xl p-3 text-center">
                  <p className="font-bold text-cafe-800">{k.valor}</p>
                  <p className="text-xs text-cafe-400">{k.label}</p>
                </div>
              ))}
            </div>
            {turnoData.cantidadVentas === 0 ? (
              <p className="text-center text-cafe-400 py-4">Sin ventas en este turno</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {turnoData.ventas?.map((v, i) => (
                  <div key={i} className="flex justify-between text-sm py-1.5 border-b border-crema-100">
                    <span className="font-mono text-xs text-cafe-500">{v.hora}</span>
                    <span className="text-cafe-700">{v.cajero}</span>
                    <span className="text-cafe-500 capitalize">{v.metodoPago}</span>
                    <span className="font-semibold text-cafe-800">{GS(v.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
