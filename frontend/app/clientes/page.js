'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AppLayout from '../../components/layout/AppLayout';
import Spinner from '../../components/ui/Spinner';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Star, Crown, Medal } from 'lucide-react';

const GS = (n) => `Gs. ${Math.round(n||0).toLocaleString('es-PY')}`;

const NIVEL_CONFIG = {
  bronce:   { label: 'Bronce',   color: 'bg-orange-100 text-orange-700', icon: <Medal size={12}/> },
  plata:    { label: 'Plata',    color: 'bg-gray-100 text-gray-600',     icon: <Star size={12}/> },
  oro:      { label: 'Oro',      color: 'bg-yellow-100 text-yellow-700', icon: <Star size={12}/> },
  platinum: { label: 'Platinum', color: 'bg-purple-100 text-purple-700', icon: <Crown size={12}/> },
};

const FORM_VACIO = { nombre:'', apellido:'', email:'', telefono:'', ci_ruc:'', notas:'' };

export default function ClientesPage() {
  const [clientes, setClientes]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [busqueda, setBusqueda]   = useState('');
  const [modal, setModal]         = useState(false);
  const [editando, setEditando]   = useState(null);
  const [form, setForm]           = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [perfil, setPerfil]       = useState(null);

  const cargar = (q = '') => {
    setLoading(true);
    const p = q ? `?search=${q}` : '';
    api.get('/clientes' + p)
      .then(r => setClientes(r.data.clientes || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => cargar(), []);

  const abrirCrear = () => { setEditando(null); setForm(FORM_VACIO); setModal(true); };
  const abrirEditar = (c) => {
    setEditando(c._id);
    setForm({ nombre: c.nombre, apellido: c.apellido||'', email: c.email||'', telefono: c.telefono||'', notas: c.notas||'' });
    setModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      if (editando) {
        await api.put('/clientes/' + editando, form);
        toast.success('Cliente actualizado');
      } else {
        await api.post('/clientes', form);
        toast.success('Cliente registrado en fidelización ✓');
      }
      setModal(false);
      cargar(busqueda);
    } catch(err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar');
    } finally { setGuardando(false); }
  };

  const verPerfil = async (id) => {
    const { data } = await api.get('/clientes/' + id);
    setPerfil(data);
  };

  if (loading) return <AppLayout><div className="p-8"><Spinner size="lg"/></div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-cafe-900">Clientes</h1>
            <p className="text-cafe-500 text-sm">{clientes.length} clientes registrados</p>
          </div>
          <button onClick={abrirCrear} className="btn-primary flex items-center gap-2">
            <Plus size={16}/> Nuevo cliente
          </button>
        </div>

        {/* Buscador */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-400"/>
          <input className="input pl-9" placeholder="Buscar por nombre, email o teléfono..."
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); cargar(e.target.value); }}/>
        </div>

        {/* Grid de clientes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientes.map((c, idx) => {
            const niv = NIVEL_CONFIG[c.nivel] || NIVEL_CONFIG.bronce;
            return (
              <motion.div key={c._id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="card hover:shadow-cafe transition-shadow cursor-pointer"
                onClick={() => verPerfil(c._id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-cafe-gradient flex items-center justify-center text-crema-100 font-display font-bold text-lg">
                    {c.nombre.charAt(0).toUpperCase()}
                  </div>
                  <span className={`badge ${niv.color} flex items-center gap-1`}>
                    {niv.icon} {niv.label}
                  </span>
                </div>
                <h3 className="font-semibold text-cafe-900">{c.nombre} {c.apellido || ''}</h3>
                {c.email && <p className="text-xs text-cafe-400 mt-0.5">{c.email}</p>}
                {c.telefono && <p className="text-xs text-cafe-400">{c.telefono}</p>}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-crema-200 text-center">
                  <div>
                    <p className="font-bold text-cafe-800 text-sm">{c.totalCompras || 0}</p>
                    <p className="text-xs text-cafe-400">Compras</p>
                  </div>
                  <div>
                    <p className="font-bold text-cafe-800 text-sm">{c.puntos || 0}</p>
                    <p className="text-xs text-cafe-400">Puntos</p>
                  </div>
                  <div>
                    <p className="font-bold text-cafe-800 text-xs">{GS(c.totalGastado)}</p>
                    <p className="text-xs text-cafe-400">Total</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Modal crear/editar */}
        {modal && (
          <div className="fixed inset-0 bg-cafe-900/60 flex items-center justify-center z-50 p-4" onClick={() => setModal(false)}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-cafe-lg"
              onClick={e => e.stopPropagation()}>
              <h2 className="font-display font-bold text-cafe-800 text-lg mb-4">
                {editando ? 'Editar cliente' : 'Nuevo cliente'}
              </h2>
              <form onSubmit={guardar} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Nombre *</label>
                    <input className="input" required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}/>
                  </div>
                  <div>
                    <label className="label">Apellido</label>
                    <input className="input" value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})}/>
                  </div>
                </div>
                <div>
                  <label className="label">CI / RUC</label>
                  <input className="input" value={form.ci_ruc} onChange={e => setForm({...form, ci_ruc: e.target.value})} placeholder="1234567-8 / 80012345-6" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})}/>
                </div>
                <div>
                  <label className="label">Teléfono</label>
                  <input className="input" placeholder="+595 981 000 000" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})}/>
                </div>
                <div>
                  <label className="label">Notas</label>
                  <textarea className="input" rows={2} value={form.notas} onChange={e => setForm({...form, notas: e.target.value})}/>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" disabled={guardando} className="btn-primary flex-1">
                    {guardando ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal perfil */}
        {perfil && (
          <div className="fixed inset-0 bg-cafe-900/60 flex items-center justify-center z-50 p-4" onClick={() => setPerfil(null)}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}}
              className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-cafe-lg max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-cafe-gradient flex items-center justify-center text-crema-100 font-display font-bold text-2xl">
                  {perfil.cliente.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-display font-bold text-cafe-900 text-xl">
                    {perfil.cliente.nombre} {perfil.cliente.apellido || ''}
                  </h2>
                  <div className="flex gap-2 mt-1">
                    <span className={`badge ${NIVEL_CONFIG[perfil.cliente.nivel]?.color}`}>
                      {NIVEL_CONFIG[perfil.cliente.nivel]?.label}
                    </span>
                    <span className="badge bg-crema-200 text-cafe-700">{perfil.cliente.puntos || 0} pts</span>
                  </div>
                </div>
                <button onClick={() => { setPerfil(null); abrirEditar(perfil.cliente); }}
                  className="ml-auto btn-secondary text-sm py-1.5">Editar</button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Compras', valor: perfil.cliente.totalCompras || 0 },
                  { label: 'Total gastado', valor: GS(perfil.cliente.totalGastado) },
                  { label: 'Puntos', valor: perfil.cliente.puntos || 0 },
                ].map(k => (
                  <div key={k.label} className="bg-crema-50 rounded-xl p-3 text-center">
                    <p className="font-bold text-cafe-800">{k.valor}</p>
                    <p className="text-xs text-cafe-400">{k.label}</p>
                  </div>
                ))}
              </div>

              <h3 className="font-semibold text-cafe-800 mb-3">Últimas compras</h3>
              {perfil.ultimasCompras?.length === 0 ? (
                <p className="text-cafe-400 text-sm text-center py-4">Sin compras registradas</p>
              ) : (
                <div className="space-y-2">
                  {perfil.ultimasCompras?.map((v, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-crema-100 text-sm">
                      <div>
                        <p className="font-mono text-xs text-cafe-500">{v.numeroTicket}</p>
                        <p className="text-cafe-400 text-xs">{new Date(v.createdAt).toLocaleDateString('es-PY')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-cafe-800">{GS(v.total)}</p>
                        <p className="text-xs text-cafe-400 capitalize">{v.metodoPago}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setPerfil(null)} className="btn-primary w-full mt-4">Cerrar</button>
            </motion.div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
