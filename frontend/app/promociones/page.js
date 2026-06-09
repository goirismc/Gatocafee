'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AppLayout from '../../components/layout/AppLayout';
import Spinner from '../../components/ui/Spinner';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Tag, Plus, CheckCircle } from 'lucide-react';

const FORM = { nombre:'', tipo:'porcentaje', valor:'', codigo:'', fechaInicio:'', fechaFin:'', minimoCompra:0, usoMaximo:'' };

export default function PromocionesPage() {
  const [promos, setPromos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(FORM);
  const [cupon, setCupon]     = useState('');
  const [monto, setMonto]     = useState('');
  const [validacion, setValidacion] = useState(null);

  const cargar = () => {
    setLoading(true);
    api.get('/promociones?soloActivas=false').then(r=>setPromos(r.data.promociones||[])).finally(()=>setLoading(false));
  };
  useEffect(cargar,[]);

  const guardar = async (e) => {
    e.preventDefault();
    try {
      await api.post('/promociones', form);
      toast.success('Promoción creada'); setModal(false); setForm(FORM); cargar();
    } catch(err) { toast.error(err.response?.data?.mensaje||'Error'); }
  };

  const validarCupon = async () => {
    try {
      const { data } = await api.post('/promociones/validar-cupon',{ codigo: cupon, montoCompra: parseFloat(monto)||0 });
      setValidacion(data); toast.success('Cupón válido ✓');
    } catch(err) { setValidacion(null); toast.error(err.response?.data?.mensaje||'Cupón inválido'); }
  };

  const ahora = new Date();
  const activas = promos.filter(p => p.activo && new Date(p.fechaFin) >= ahora);
  const inactivas = promos.filter(p => !p.activo || new Date(p.fechaFin) < ahora);

  if (loading) return <AppLayout><div className="p-8"><Spinner size="lg"/></div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-cafe-900">Promociones</h1>
            <p className="text-cafe-500 text-sm">{activas.length} activas</p>
          </div>
          <button onClick={()=>setModal(true)} className="btn-primary flex items-center gap-2"><Plus size={16}/> Nueva</button>
        </div>

        {/* Validador de cupón */}
        <div className="card mb-6">
          <h3 className="font-semibold text-cafe-800 mb-3 flex items-center gap-2"><CheckCircle size={16}/> Validar cupón</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1"><label className="label">Código de cupón</label>
              <input className="input font-mono uppercase" placeholder="BIENVENIDO15" value={cupon} onChange={e=>setCupon(e.target.value)}/></div>
            <div className="flex-1"><label className="label">Monto de compra (Gs.)</label>
              <input type="number" className="input" placeholder="35000" value={monto} onChange={e=>setMonto(e.target.value)}/></div>
            <button onClick={validarCupon} className="btn-primary">Validar</button>
          </div>
          {validacion && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
              <p className="font-semibold">{validacion.mensaje}</p>
              <p>Descuento: <strong>Gs. {validacion.descuento?.toLocaleString()}</strong></p>
              <p>Total con descuento: <strong>Gs. {validacion.totalConDescuento?.toLocaleString()}</strong></p>
            </div>
          )}
        </div>

        {/* Promociones activas */}
        <h2 className="font-semibold text-cafe-800 mb-3">Vigentes ({activas.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {activas.map((p,i)=>(
            <motion.div key={p._id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
              className="card border-l-4 border-green-400">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-cafe-900">{p.nombre}</h3>
                  {p.codigo && <span className="badge bg-crema-200 text-cafe-700 font-mono">{p.codigo}</span>}
                </div>
                <span className="badge bg-green-100 text-green-700">Activa</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-cafe-500">
                <span>Tipo: {p.tipo}</span>
                <span>Valor: {p.tipo==='porcentaje'?`${p.valor}%`:`Gs. ${p.valor?.toLocaleString()}`}</span>
                <span>Hasta: {new Date(p.fechaFin).toLocaleDateString('es-PY')}</span>
                <span>Usos: {p.usosActuales||0}{p.usoMaximo?`/${p.usoMaximo}`:' (ilimitado)'}</span>
              </div>
            </motion.div>
          ))}
          {activas.length===0&&<p className="text-cafe-400 text-sm col-span-2 py-4">No hay promociones vigentes</p>}
        </div>

        {/* Modal nueva */}
        {modal && (
          <div className="fixed inset-0 bg-cafe-900/60 flex items-center justify-center z-50 p-4" onClick={()=>setModal(false)}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-cafe-lg max-h-[90vh] overflow-y-auto"
              onClick={e=>e.stopPropagation()}>
              <h2 className="font-display font-bold text-cafe-800 text-lg mb-4 flex items-center gap-2"><Tag size={18}/> Nueva promoción</h2>
              <form onSubmit={guardar} className="space-y-4">
                <div><label className="label">Nombre *</label>
                  <input className="input" required value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Ej: Descuento de bienvenida"/></div>
                <div><label className="label">Tipo *</label>
                  <select className="input" value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>
                    <option value="porcentaje">Porcentaje (%)</option>
                    <option value="monto_fijo">Monto fijo (Gs.)</option>
                    <option value="cupon">Cupón</option>
                  </select></div>
                <div><label className="label">Valor ({form.tipo==='porcentaje'?'%':'Gs.'}) *</label>
                  <input type="number" className="input" required min="0" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})}/></div>
                <div><label className="label">Código (para cupones)</label>
                  <input className="input font-mono uppercase" placeholder="VERANO25" value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value.toUpperCase()})}/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Desde *</label>
                    <input type="date" className="input" required value={form.fechaInicio} onChange={e=>setForm({...form,fechaInicio:e.target.value})}/></div>
                  <div><label className="label">Hasta *</label>
                    <input type="date" className="input" required value={form.fechaFin} onChange={e=>setForm({...form,fechaFin:e.target.value})}/></div>
                </div>
                <div><label className="label">Mínimo de compra (Gs.)</label>
                  <input type="number" className="input" min="0" value={form.minimoCompra} onChange={e=>setForm({...form,minimoCompra:e.target.value})}/></div>
                <div><label className="label">Límite de usos (vacío = ilimitado)</label>
                  <input type="number" className="input" min="1" value={form.usoMaximo} onChange={e=>setForm({...form,usoMaximo:e.target.value})}/></div>
                <div className="flex gap-3">
                  <button type="button" onClick={()=>setModal(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" className="btn-primary flex-1">Crear promoción</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
