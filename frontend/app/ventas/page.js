'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AppLayout from '../../components/layout/AppLayout';
import Spinner from '../../components/ui/Spinner';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Search, Download, RotateCcw, Eye } from 'lucide-react';

const GS = (n) => `Gs. ${Math.round(n||0).toLocaleString('es-PY')}`;

export default function VentasPage() {
  const [ventas, setVentas]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [desde, setDesde]     = useState('');
  const [hasta, setHasta]     = useState('');
  const [detalle, setDetalle] = useState(null);
  const [devModal, setDevModal] = useState(null);
  const [motivoDev, setMotivoDev] = useState('');

  const cargar = () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (desde) p.append('desde', desde);
    if (hasta) p.append('hasta', hasta);
    api.get('/ventas?' + p + '&limit=50')
      .then(r => setVentas(r.data.ventas || []))
      .finally(() => setLoading(false));
  };
  useEffect(cargar, []);

  const verDetalle = async (id) => {
    const { data } = await api.get('/ventas/' + id);
    setDetalle(data);
  };

  const registrarDevolucion = async () => {
    if (!motivoDev) return toast.error('Ingresá el motivo');
    try {
      await api.post('/ventas/' + devModal._id + '/devolucion', { motivo: motivoDev });
      toast.success('Devolución registrada');
      setDevModal(null); setMotivoDev(''); cargar();
    } catch(err) { toast.error(err.response?.data?.mensaje || 'Error'); }
  };

  if (loading) return <AppLayout><div className="p-8"><Spinner size="lg"/></div></AppLayout>;

  const estadoBadge = (e) => ({
    completada: <span className="badge bg-green-100 text-green-800">Completada</span>,
    devuelta:   <span className="badge bg-red-100 text-red-700">Devuelta</span>,
  }[e] || <span className="badge bg-gray-100 text-gray-600">{e}</span>);

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

  const descargarFactura = async (id) => {
    try {
      const res = await api.get('/reportes/factura/' + id, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = (res.headers['content-disposition'] || '').split('filename=')[1] || `factura-${id}.pdf`;
      a.download = filename.replace(/"/g, '');
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Descarga iniciada');
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al descargar factura');
    }
  };

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-cafe-900">Ventas</h1>
            <p className="text-cafe-500 text-sm">{ventas.length} registros</p>
          </div>
          <button onClick={descargarExcel} className="btn-secondary flex items-center gap-2">
            <Download size={14}/> Excel
          </button>
        </div>

        <div className="card mb-4 flex gap-4 items-end">
          <div className="flex-1">
            <label className="label">Desde</label>
            <input type="date" className="input" value={desde} onChange={e => setDesde(e.target.value)}/>
          </div>
          <div className="flex-1">
            <label className="label">Hasta</label>
            <input type="date" className="input" value={hasta} onChange={e => setHasta(e.target.value)}/>
          </div>
          <button onClick={cargar} className="btn-primary flex items-center gap-2">
            <Search size={14}/> Buscar
          </button>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-crema-100 border-b border-crema-200">
                  {['Ticket','Fecha','Cajero','Canal','Método','Total','IVA','Estado','Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-cafe-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ventas.map((v, i) => (
                  <motion.tr key={v._id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.02}}
                    className="border-b border-crema-100 hover:bg-crema-50">
                    <td className="px-4 py-3 font-mono text-xs text-cafe-600">{v.numeroTicket}</td>
                    <td className="px-4 py-3 text-sm">{new Date(v.createdAt).toLocaleDateString('es-PY')}</td>
                    <td className="px-4 py-3 text-sm">{v.usuario?.nombre || '—'}</td>
                    <td className="px-4 py-3 text-sm capitalize">{v.canal}</td>
                    <td className="px-4 py-3 text-sm capitalize">{v.metodoPago}</td>
                    <td className="px-4 py-3 font-semibold text-cafe-800">{GS(v.total)}</td>
                    <td className="px-4 py-3 text-sm text-cafe-400">{GS(v.totalIVA)}</td>
                    <td className="px-4 py-3">{estadoBadge(v.estado)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => verDetalle(v._id)} className="p-1.5 rounded-lg bg-crema-100 text-cafe-600 hover:bg-crema-200"><Eye size={14}/></button>
                        <button onClick={() => descargarFactura(v._id)}
                          className="p-1.5 rounded-lg bg-cafe-100 text-cafe-700 hover:bg-cafe-200"><Download size={14}/></button>
                        {v.estado === 'completada' && (
                          <button onClick={() => setDevModal(v)} className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"><RotateCcw size={14}/></button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {detalle && (
          <div className="fixed inset-0 bg-cafe-900/60 flex items-center justify-center z-50 p-4" onClick={() => setDetalle(null)}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}}
              className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-cafe-lg max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <h2 className="font-display font-bold text-cafe-800 mb-4">{detalle.venta.numeroTicket}</h2>
              {detalle.venta.items?.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-2 border-b border-crema-100">
                  <span>{item.nombreProducto} × {item.cantidad}</span>
                  <span className="font-semibold">{GS(item.subtotal)}</span>
                </div>
              ))}
              <div className="mt-3 p-3 bg-crema-50 rounded-xl text-sm space-y-1">
                <div className="flex justify-between text-cafe-500"><span>IVA</span><span>{GS(detalle.venta.totalIVA)}</span></div>
                <div className="flex justify-between font-bold text-cafe-900 text-base border-t border-crema-200 pt-1"><span>Total</span><span>{GS(detalle.venta.total)}</span></div>
              </div>
              <button onClick={() => setDetalle(null)} className="btn-primary w-full mt-4">Cerrar</button>
            </motion.div>
          </div>
        )}

        {devModal && (
          <div className="fixed inset-0 bg-cafe-900/60 flex items-center justify-center z-50 p-4" onClick={() => setDevModal(null)}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-cafe-lg"
              onClick={e => e.stopPropagation()}>
              <h2 className="font-display font-bold text-cafe-800 mb-4 flex items-center gap-2"><RotateCcw size={18}/> Devolución</h2>
              <p className="text-sm text-cafe-500 mb-3">{devModal.numeroTicket} · {GS(devModal.total)}</p>
              <label className="label">Motivo *</label>
              <textarea className="input" rows={3} placeholder="Describe el motivo..."
                value={motivoDev} onChange={e => setMotivoDev(e.target.value)}/>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setDevModal(null)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={registrarDevolucion} className="btn-danger flex-1">Confirmar</button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
