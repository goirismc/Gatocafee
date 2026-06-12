'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AppLayout from '../../components/layout/AppLayout';
import Spinner from '../../components/ui/Spinner';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { TrendingUp, Plus, Target } from 'lucide-react';

const GS = (n) => `Gs. ${Math.round(n||0).toLocaleString('es-PY')}`;

export default function FinancieroPage() {
  const [pe, setPe]               = useState(null);
  const [costos, setCostos]       = useState([]);
  const [metas, setMetas]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('pe');
  const [errorBanner, setErrorBanner] = useState(null);
  const [modalCosto, setModalCosto] = useState(false);
  const [modalMeta, setModalMeta]   = useState(false);
  const [formCosto, setFormCosto] = useState({ nombre:'', monto:'', frecuencia:'mensual' });
  const [formMeta, setFormMeta]   = useState({
    mes: new Date().getMonth() + 1,
    año: new Date().getFullYear(),
    metaVentas: ''
  });
  const [editingMetaId, setEditingMetaId] = useState(null);
  // removed confirm modal state; editing opens directly

  // ── FIX: useEffect NO puede ser async directamente ──
  useEffect(() => {
    async function cargar() {
      setLoading(true);
      setErrorBanner(null);
      try {
        const [resPe, resCostos] = await Promise.all([
          api.get('/financiero/punto-equilibrio'),
          api.get('/financiero/costos-fijos'),
        ]);
        setPe(resPe.data);
        setCostos(resCostos.data.costos || []);

        try {
          const resMetas = await api.get('/financiero/metas');
          setMetas(resMetas.data.metas || []);
        } catch (e) {
          // Manejar 401 (no autorizado) y 404 (ruta faltante)
          if (e?.response?.status === 401) {
            setErrorBanner('Acceso denegado. Iniciá sesión con una cuenta con permisos.');
            setMetas([]);
          } else if (e?.response?.status === 404) {
            // Mostrar toast no persistente para ruta faltante (evita banner fijo)
            toast.error('Ruta del servidor no encontrada. Reiniciá el backend y volvé a intentar.');
            setMetas([]);
          } else {
            console.error('Error cargando metas:', e);
            setErrorBanner('Error al cargar metas');
            setMetas([]);
          }
        }
      } catch (err) {
        console.error('Error cargando financiero:', err);
        setErrorBanner('Error al cargar datos financieros');
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []); // solo al montar

  const guardarCosto = (e) => {
    e.preventDefault();
    api.post('/financiero/costos-fijos', formCosto)
      .then(() => {
        toast.success('Costo registrado');
        setModalCosto(false);
        setFormCosto({ nombre:'', monto:'', frecuencia:'mensual' });
        // Recargar costos
        api.get('/financiero/costos-fijos').then(r => setCostos(r.data.costos || []));
      })
      .catch(err => toast.error(err.response?.data?.mensaje || 'Error al guardar'));
  };

  const guardarMeta = (e) => {
    e.preventDefault();
    const req = editingMetaId
      ? api.put(`/financiero/metas/${editingMetaId}`, formMeta)
      : api.post('/financiero/metas', formMeta);

    req.then(({ data }) => {
      toast.success(data.progreso?.estado || (editingMetaId ? 'Meta actualizada' : 'Meta guardada'));
      setModalMeta(false);
      setEditingMetaId(null);
      setFormMeta({ mes: new Date().getMonth()+1, año: new Date().getFullYear(), metaVentas:'' });
      api.get('/financiero/metas').then(r => setMetas(r.data.metas || []));
    }).catch(err => {
      const msg = err?.response?.data?.mensaje;
      if (err?.response?.status === 401) {
        setErrorBanner('Acceso denegado. Iniciá sesión con una cuenta con permisos.');
      } else if (err?.response?.status === 404 && msg && msg.includes('no encontrada')) {
        setErrorBanner('Ruta del servidor no encontrada. Reiniciá el backend y volvé a intentar.');
      } else {
        toast.error(msg || 'Error al guardar');
      }
    });
  };

  const abrirEditarMeta = (m) => {
    const id = m._id || m.id;
    setEditingMetaId(id);
    setFormMeta({ mes: m.mes, año: m.año, metaVentas: m.metaVentas });
    setModalMeta(true);
  };

  const eliminarMeta = (m) => {
    const id = m && (m._id || m.id);
    if (!m) {
      toast.error('ID de meta inválido. Operación cancelada.');
      return;
    }

    const handleDeleteSuccess = () => {
      toast.success('Meta eliminada');
      api.get('/financiero/metas').then(r => setMetas(r.data.metas || []));
    };

    const handleDeleteError = (err) => {
      const msg = err?.response?.data?.mensaje || err.message;
      if (err?.response?.status === 401) {
        toast.error('Acceso denegado. Iniciá sesión con una cuenta con permisos.');
      } else if (err?.response?.status === 403) {
        toast.error(msg);
      } else if (err?.response?.status === 404) {
        toast.error('Ruta no encontrada en el servidor. Reiniciá el backend.');
      } else {
        toast.error(msg || 'Error al eliminar');
      }
    };

    if (!id) {
      // Fallback: eliminar por mes+año cuando no haya _id (caso de backups)
      api.delete('/financiero/metas/por-mes', { data: { mes: m.mes, año: m.año } })
        .then(handleDeleteSuccess)
        .catch(handleDeleteError);
      return;
    }

    api.delete(`/financiero/metas/${id}`)
      .then(handleDeleteSuccess)
      .catch(handleDeleteError);
  };

  if (loading) return <AppLayout><div className="p-8"><Spinner size="lg"/></div></AppLayout>;

  const zonaTexto = {
    perdida:    'Zona de pérdida',
    equilibrio: 'Zona de equilibrio',
    ganancia:   'Zona de ganancia',
  };
  const zonaClase = {
    perdida:    'bg-red-50 border-red-300 text-red-800',
    equilibrio: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    ganancia:   'bg-green-50 border-green-300 text-green-800',
  };

  const peData = pe ? [
    { name: 'Costos fijos',     valor: pe.costosFijos?.total || 0 },
    { name: 'Ingresos reales',  valor: pe.realMes?.ingresos || 0 },
    { name: 'Punto equilibrio', valor: pe.puntoEquilibrio?.ingresosMensual || 0 },
  ] : [];

  const tooltipStyle = {
    background: '#4a2c2a', border: 'none', borderRadius: 10, color: '#fdf6f0', fontSize: 12,
  };

  const totalMensualCostos = costos
    .filter(c => c.activo)
    .reduce((acc, c) => {
      let m = c.monto;
      if (c.frecuencia === 'diario')   m *= 30;
      if (c.frecuencia === 'semanal')  m *= 4.33;
      if (c.frecuencia === 'anual')    m /= 12;
      return acc + m;
    }, 0);

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  return (
    <AppLayout>
      <div className="p-6">
        {errorBanner && (
          <div className="mb-4 p-3 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 flex items-center justify-between">
            <div className="text-sm">{errorBanner}</div>
            <div className="flex gap-2">
              <button onClick={() => { setErrorBanner(null); setLoading(true); api.get('/financiero/metas').then(r => { setMetas(r.data.metas||[]); setLoading(false); }).catch(e => { setErrorBanner('Ruta del servidor no encontrada. Reiniciá el backend y volvé a intentar.'); setLoading(false); }); }} className="btn-ghost text-sm">Reintentar</button>
              <button onClick={() => setErrorBanner(null)} className="btn-secondary text-sm">Cerrar</button>
            </div>
          </div>
        )}
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-cafe-900">Módulo Financiero</h1>
          <p className="text-cafe-500 text-sm">Punto de equilibrio, costos y metas</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-crema-200">
          {[
            { key: 'pe',     label: 'Punto de Equilibrio' },
            { key: 'costos', label: 'Costos Fijos' },
            { key: 'metas',  label: 'Metas Mensuales' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px
                ${tab === t.key
                  ? 'border-cafe-700 text-cafe-800'
                  : 'border-transparent text-cafe-400 hover:text-cafe-600'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: Punto de Equilibrio ── */}
        {tab === 'pe' && (
          <div className="space-y-4">
            {pe ? (
              <>
                {/* Zona */}
                <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                  className={`p-4 rounded-xl border-2 font-medium ${zonaClase[pe.zona] || zonaClase.equilibrio}`}>
                  <p className="font-bold text-lg">{zonaTexto[pe.zona] || '—'}</p>
                  <p className="text-sm mt-1">{pe.mensaje}</p>
                </motion.div>

                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'PE Mensual',   valor: GS(pe.puntoEquilibrio?.ingresosMensual) },
                    { label: 'PE Semanal',   valor: GS(pe.puntoEquilibrio?.ingresosSemanal) },
                    { label: 'PE Diario',    valor: GS(pe.puntoEquilibrio?.ingresosDiario) },
                    { label: 'Costos fijos', valor: GS(pe.costosFijos?.total) },
                  ].map((k, i) => (
                    <motion.div key={k.label} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
                      transition={{ delay: i * 0.05 }} className="card">
                      <p className="kpi-label">{k.label}</p>
                      <p className="kpi-value mt-1">{k.valor}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Promedios */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Precio venta promedio',   valor: GS(pe.promedios?.precioVentaPromedio) },
                    { label: 'Costo variable promedio', valor: GS(pe.promedios?.costoVariablePromedio) },
                    { label: 'Margen de contribución',  valor: `${GS(pe.promedios?.margenContribucion)} (${pe.promedios?.porcentajeMargen})` },
                  ].map(k => (
                    <div key={k.label} className="card">
                      <p className="kpi-label">{k.label}</p>
                      <p className="font-semibold text-cafe-800 mt-1">{k.valor}</p>
                    </div>
                  ))}
                </div>

                {/* Gráfico */}
                <div className="card">
                  <h3 className="font-semibold text-cafe-800 mb-3">Comparación visual</h3>
                  <div className="p-3 bg-crema-50 rounded-xl text-sm text-cafe-600 mb-4 font-mono">
                    PE = Costos Fijos ÷ (Precio Venta − Costo Variable) = <strong>{pe.puntoEquilibrio?.unidades}</strong> unidades/mes
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={peData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5e6d3"/>
                      <XAxis dataKey="name" tick={{ fontSize:11, fill:'#a0522d' }} tickLine={false} axisLine={false}/>
                      <YAxis tick={{ fontSize:10, fill:'#a0522d' }} tickLine={false} axisLine={false}
                        tickFormatter={v => `${(v/1000000).toFixed(1)}M`}/>
                      <Tooltip contentStyle={tooltipStyle} formatter={v => [GS(v), '']}/>
                      <Bar dataKey="valor" fill="#a0522d" radius={[8,8,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-cafe-400 text-center mt-3">
                    {pe.realMes?.porcentajeAlcanzado} del PE alcanzado este mes
                  </p>
                </div>
              </>
            ) : (
              <div className="card text-center py-10 text-cafe-400">
                <TrendingUp size={32} className="mx-auto mb-2 opacity-40"/>
                <p>No hay datos suficientes para calcular el punto de equilibrio.</p>
                <p className="text-sm mt-1">Asegurate de tener costos fijos y productos registrados.</p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Costos Fijos ── */}
        {tab === 'costos' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-cafe-600 text-sm">
                Total mensual estimado: <strong>{GS(totalMensualCostos)}</strong>
              </p>
              <button onClick={() => setModalCosto(true)} className="btn-primary flex items-center gap-2 text-sm">
                <Plus size={14}/> Agregar costo
              </button>
            </div>
            <div className="card overflow-hidden p-0">
              <table className="w-full">
                <thead>
                  <tr className="bg-crema-100 border-b border-crema-200">
                    {['Concepto','Monto','Frecuencia','Estado'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-cafe-600 uppercase">{h}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {costos.map((c,i) => (
                    <tr key={c._id || `c-${i}`} className="border-b border-crema-100 hover:bg-crema-50">
                      <td className="px-4 py-3 font-medium text-cafe-900">{c.nombre}</td>
                      <td className="px-4 py-3 font-semibold text-cafe-800">{GS(c.monto)}</td>
                      <td className="px-4 py-3 text-sm text-cafe-500 capitalize">{c.frecuencia}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${c.activo ? 'badge-ok' : 'badge-agotado'}`}>
                          {c.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {costos.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-cafe-400">Sin costos registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB: Metas ── */}
        {tab === 'metas' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => setModalMeta(true)} className="btn-primary flex items-center gap-2 text-sm">
                <Target size={14}/> Nueva meta
              </button>
            </div>
            <div className="space-y-4">
              {metas.map((m, i) => (
                <motion.div key={m._id || `meta-${i}`} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                  transition={{ delay: i * 0.05 }} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-cafe-800">
                        Meta {MESES[m.mes - 1]} {m.año}
                      </h3>
                      <p className="text-sm text-cafe-500">
                        {GS(m.ventasActuales)} de {GS(m.metaVentas)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xl font-display font-bold ${parseFloat(m.porcentajeCumplido||0) >= 100 ? 'text-green-600' : 'text-cafe-700'}`}>
                        {parseFloat(m.porcentajeCumplido || 0).toFixed(1)}%
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => abrirEditarMeta(m)} className="btn-ghost text-xs">Editar</button>
                        <button onClick={() => eliminarMeta(m)} className="btn-danger text-xs">Eliminar</button>
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-crema-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(parseFloat(m.porcentajeCumplido || 0), 100)}%` }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.7, ease: 'easeOut' }}
                      className={`h-full rounded-full ${parseFloat(m.porcentajeCumplido||0) >= 100 ? 'bg-green-500' : 'bg-cafe-500'}`}
                    />
                  </div>
                </motion.div>
              ))}
              {metas.length === 0 && (
                <div className="card text-center py-10 text-cafe-400">
                  <Target size={32} className="mx-auto mb-2 opacity-40"/>
                  <p>No hay metas definidas. Creá una para medir el progreso.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal costo */}
        {modalCosto && (
          <div className="fixed inset-0 bg-cafe-900/60 flex items-center justify-center z-50 p-4"
            onClick={() => setModalCosto(false)}>
            <motion.div initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-cafe-lg"
              onClick={e => e.stopPropagation()}>
              <h2 className="font-display font-bold text-cafe-800 mb-4">Agregar costo fijo</h2>
              <form onSubmit={guardarCosto} className="space-y-4">
                <div>
                  <label className="label">Concepto *</label>
                  <input className="input" required placeholder="Ej: Alquiler del local"
                    value={formCosto.nombre} onChange={e => setFormCosto({...formCosto, nombre: e.target.value})}/>
                </div>
                <div>
                  <label className="label">Monto (Gs.) *</label>
                  <input type="number" className="input" required min="0"
                    value={formCosto.monto} onChange={e => setFormCosto({...formCosto, monto: e.target.value})}/>
                </div>
                <div>
                  <label className="label">Frecuencia</label>
                  <select className="input" value={formCosto.frecuencia}
                    onChange={e => setFormCosto({...formCosto, frecuencia: e.target.value})}>
                    <option value="diario">Diario</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensual">Mensual</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setModalCosto(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" className="btn-primary flex-1">Guardar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal meta */}
        {modalMeta && (
          <div className="fixed inset-0 bg-cafe-900/60 flex items-center justify-center z-50 p-4"
            onClick={() => setModalMeta(false)}>
            <motion.div initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-cafe-lg"
              onClick={e => e.stopPropagation()}>
              <h2 className="font-display font-bold text-cafe-800 mb-4">Definir meta mensual</h2>
              <form onSubmit={guardarMeta} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Mes</label>
                    <select className="input" value={formMeta.mes}
                      onChange={e => setFormMeta({...formMeta, mes: parseInt(e.target.value)})}>
                      {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Año</label>
                    <input type="number" className="input" value={formMeta.año}
                      onChange={e => setFormMeta({...formMeta, año: parseInt(e.target.value)})}/>
                  </div>
                </div>
                <div>
                  <label className="label">Meta de ventas (Gs.) *</label>
                  <input type="number" className="input" required min="0" placeholder="Ej: 5000000"
                    value={formMeta.metaVentas}
                    onChange={e => setFormMeta({...formMeta, metaVentas: e.target.value})}/>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setModalMeta(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" className="btn-primary flex-1">Guardar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
          
      </div>
    </AppLayout>
  );
}
