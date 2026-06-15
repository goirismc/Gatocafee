'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AppLayout from '../../components/layout/AppLayout';
import Spinner from '../../components/ui/Spinner';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Coffee, Lock, Unlock, TrendingUp } from 'lucide-react';

const GS = (n) => `Gs. ${Math.round(n||0).toLocaleString('es-PY')}`;

export default function CajaPage() {
  const [estado, setEstado]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [monto, setMonto]         = useState('');
  const [obs, setObs]             = useState('');
  const [procesando, setProcesando] = useState(false);
  // Modal de confirmación de cierre de caja
  const [showCloseCashModal, setShowCloseCashModal] = useState(false);
  const [closingCash, setClosingCash] = useState(false);

  const cargar = () => {
    setLoading(true);
    api.get('/caja/actual').then(r => setEstado(r.data)).finally(() => setLoading(false));
  };
  useEffect(cargar, []);

  const abrirCaja = async (e) => {
    e.preventDefault();
    setProcesando(true);
    try {
      await api.post('/caja/abrir', { montoApertura: parseFloat(monto) || 0, observaciones: obs });
      toast.success('Caja abierta correctamente ✓');
      setMonto(''); setObs(''); cargar();
    } catch(err) { toast.error(err.response?.data?.mensaje || 'Error'); }
    finally { setProcesando(false); }
  };

  const cerrarCaja = async (e) => {
    e.preventDefault();
    // Abrir modal de confirmación visual en lugar de diálogo nativo
    setShowCloseCashModal(true);
    return;
  };

  const confirmarCerrarCaja = async () => {
    setClosingCash(true);
    setProcesando(true);
    try {
      const { data } = await api.post('/caja/' + estado.caja._id + '/cerrar', {
        montoCierre: parseFloat(monto) || 0, observaciones: obs
      });
      toast.success('Caja cerrada correctamente');
      // Mostrar resumen de diferencia
      const dif = data.resumen.diferencia;
      if (dif !== 0) {
        toast(dif > 0 ? `⬆️ Sobrante: ${GS(Math.abs(dif))}` : `⬇️ Faltante: ${GS(Math.abs(dif))}`,
          { duration: 6000, icon: dif > 0 ? '✅' : '⚠️' });
      }
      setMonto(''); setObs(''); cargar();
    } catch(err) { toast.error(err.response?.data?.mensaje || 'Error'); }
    finally { setProcesando(false); setClosingCash(false); setShowCloseCashModal(false); }
  };

  if (loading) return <AppLayout><div className="p-8"><Spinner size="lg"/></div></AppLayout>;

  const cajaAbierta = estado?.cajaAbierta;

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-cafe-900">Caja</h1>
          <p className="text-cafe-500 text-sm">Control de apertura y cierre de turno</p>
        </div>

        {/* Estado actual */}
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
          className={`card mb-6 border-2 ${cajaAbierta ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${cajaAbierta ? 'bg-green-100' : 'bg-red-100'}`}>
              {cajaAbierta ? <Unlock size={24} className="text-green-700"/> : <Lock size={24} className="text-red-600"/>}
            </div>
            <div className="flex-1">
              <h2 className={`font-display font-bold text-lg ${cajaAbierta ? 'text-green-800' : 'text-red-700'}`}>
                {cajaAbierta ? '🟢 Caja Abierta' : '🔴 Caja Cerrada'}
              </h2>
              {cajaAbierta ? (
                <div className="text-sm text-green-700 space-y-0.5 mt-1">
                  <p>Turno: <strong>{estado.caja.turno}</strong> · Apertura: <strong>{GS(estado.caja.montoApertura)}</strong></p>
                  <p>Cajero: <strong>{estado.caja.usuarioApertura?.nombre}</strong></p>
                  <p>Ventas parciales: <strong>{GS(estado.ventasParciales?.total)}</strong> ({estado.ventasParciales?.cantidad} transacciones)</p>
                </div>
              ) : (
                <p className="text-sm text-red-600 mt-1">No hay caja abierta. Abrí una para comenzar a registrar ventas.</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Formulario */}
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="card">
          <h3 className="font-semibold text-cafe-800 mb-4 flex items-center gap-2">
            <Coffee size={18}/>
            {cajaAbierta ? 'Cerrar caja' : 'Abrir caja'}
          </h3>
          <form onSubmit={cajaAbierta ? cerrarCaja : abrirCaja} className="space-y-4">
            <div>
              <label className="label">
                {cajaAbierta ? 'Monto físico en caja (Gs.)' : 'Monto inicial en caja (Gs.)'}
              </label>
              <input type="number" className="input text-lg" min="0" required
                placeholder="Ej: 100000"
                value={monto} onChange={e => setMonto(e.target.value)}/>
              {cajaAbierta && monto && (
                <div className="mt-2 p-3 bg-crema-100 rounded-xl text-sm">
                  <p className="text-cafe-600">Caja esperada: <strong>{GS((estado.caja.montoApertura || 0) + (estado.ventasParciales?.total || 0))}</strong></p>
                  <p className={`font-semibold mt-1 ${parseFloat(monto) - ((estado.caja.montoApertura||0)+(estado.ventasParciales?.total||0)) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    Diferencia estimada: {GS(parseFloat(monto) - ((estado.caja.montoApertura||0)+(estado.ventasParciales?.total||0)))}
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="label">Observaciones (opcional)</label>
              <textarea className="input" rows={2}
                placeholder={cajaAbierta ? 'Novedades del turno...' : 'Observaciones de apertura...'}
                value={obs} onChange={e => setObs(e.target.value)}/>
            </div>
            <button type="submit" disabled={procesando}
              className={`w-full py-3 font-semibold rounded-xl transition-all ${cajaAbierta ? 'btn-danger' : 'btn-primary'}`}>
              {procesando ? 'Procesando...' : cajaAbierta ? ' Cerrar Caja' : ' Abrir Caja'}
            </button>
          </form>
        </motion.div>

        {/* Modal confirmación cierre de caja */}
        {showCloseCashModal && (
          <div className="fixed inset-0 bg-cafe-900/60 flex items-center justify-center z-50 p-4" onClick={()=>setShowCloseCashModal(false)}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-cafe-lg" onClick={e=>e.stopPropagation()}>
              <h2 className="font-display font-bold text-cafe-800 mb-1">Confirmar cierre</h2>
              <p className="text-cafe-500 text-sm mb-4">¿Confirmas el cierre de caja?</p>
              <div className="flex gap-3">
                <button onClick={()=>setShowCloseCashModal(false)} disabled={closingCash} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={confirmarCerrarCaja} disabled={closingCash} className="btn-danger flex-1">{closingCash ? 'Procesando cierre...' : 'Confirmar cierre'}</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Info de niveles de fidelización */}
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.2}} className="card mt-4">
          <h3 className="font-semibold text-cafe-800 mb-3 flex items-center gap-2"><TrendingUp size={16}/> Niveles de fidelización</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { nivel:'Bronce',   rango:'Gs. 0 — 499.999',       color:'bg-orange-100 text-orange-700' },
              { nivel:'Plata',    rango:'Gs. 500.000 — 1.999.999', color:'bg-gray-100 text-gray-600' },
              { nivel:'Oro',      rango:'Gs. 2.000.000 — 4.999.999', color:'bg-yellow-100 text-yellow-700' },
              { nivel:'Platinum', rango:'Gs. 5.000.000+',         color:'bg-purple-100 text-purple-700' },
            ].map(n => (
              <div key={n.nivel} className={`badge ${n.color} flex-col items-start gap-0 py-2 px-3 rounded-xl`}>
                <span className="font-bold">{n.nivel}</span>
                <span className="text-xs opacity-75">{n.rango}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
