'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AppLayout from '../../components/layout/AppLayout';
import Spinner from '../../components/ui/Spinner';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Package, TrendingUp } from 'lucide-react';

const GS = (n) => `Gs. ${Math.round(n||0).toLocaleString('es-PY')}`;

const CATS = { bebidas_calientes:' Calientes', bebidas_frias:' Frías', comidas:' Comidas', postres:' Postres', otros:' Otros' };
const FORM_VACIO = { nombre:'', descripcion:'', categoria:'bebidas_calientes', precioVenta:'', costoProduccion:'', tasaIVA:0.10, disponible:true, imagen:'/images/default-product.svg' };

export default function ProductosPage() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(false);
  const [editando, setEditando]   = useState(null);
  const [form, setForm]           = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => {
    setLoading(true);
    api.get('/productos').then(r=>setProductos(r.data.productos||[])).finally(()=>setLoading(false));
  };
  useEffect(cargar, []);

  const abrirCrear = () => { setEditando(null); setForm(FORM_VACIO); setModal(true); };
  const abrirEditar = (p) => { setEditando(p._id); setForm({ nombre:p.nombre, descripcion:p.descripcion||'', categoria:p.categoria, precioVenta:p.precioVenta, costoProduccion:p.costoProduccion, tasaIVA:p.tasaIVA, disponible:p.disponible, imagen: p.imagen || '/images/default-product.svg' }); setModal(true); };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      if (editando) {
        await api.put(`/productos/${editando}`, form);
        toast.success('Producto actualizado');
      } else {
        await api.post('/productos', form);
        toast.success('Producto creado');
      }
      setModal(false);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar');
    } finally { setGuardando(false); }
  };

  const margen = (p) => p.precioVenta - p.costoProduccion;
  const pctMargen = (p) => p.precioVenta>0 ? ((margen(p)/p.precioVenta)*100).toFixed(1) : 0;

  if (loading) return <AppLayout><div className="p-8"><Spinner size="lg"/></div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-cafe-900">Productos</h1>
            <p className="text-cafe-500 text-sm">{productos.length} productos registrados</p>
          </div>
          <button onClick={abrirCrear} className="btn-primary flex items-center gap-2">
            <Plus size={16}/> Nuevo producto
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {productos.map((p,idx)=>(
            <motion.div key={p._id} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:idx*0.04}}
              className={`card hover:shadow-cafe transition-shadow ${!p.disponible?'opacity-60':''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-1">
                  {!p.disponible && <span className="badge badge-agotado">Inactivo</span>}
                  <button onClick={()=>abrirEditar(p)} className="btn-ghost p-1.5"><Edit size={14}/></button>
                </div>
              </div>
              <h3 className="font-semibold text-cafe-900 mb-1">{p.nombre}</h3>
              <p className="text-xs text-cafe-400 mb-3">{CATS[p.categoria]||p.categoria}</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-cafe-500">Precio venta</span>
                  <span className="font-semibold text-cafe-800">{GS(p.precioVenta)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cafe-500">Costo</span>
                  <span className="text-cafe-600">{GS(p.costoProduccion)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-crema-200">
                  <span className="text-cafe-500 flex items-center gap-1"><TrendingUp size={12}/> Margen</span>
                  <span className={`font-semibold ${margen(p)>0?'text-green-600':'text-red-600'}`}>
                    {GS(margen(p))} ({pctMargen(p)}%)
                  </span>
                </div>
                <div className="flex justify-between text-xs text-cafe-400">
                  <span>IVA {(p.tasaIVA*100).toFixed(0)}%</span>
                  <span>{p.totalVendido||0} vendidos</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Modal */}
        {modal && (
          <div className="fixed inset-0 bg-cafe-900/60 flex items-center justify-center z-50 p-4" onClick={()=>setModal(false)}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-cafe-lg" onClick={e=>e.stopPropagation()}>
              <h2 className="font-display font-bold text-cafe-800 text-lg mb-4 flex items-center gap-2">
                <Package size={20}/> {editando?'Editar producto':'Nuevo producto'}
              </h2>
              <form onSubmit={guardar} className="space-y-4">
                <div>
                  <label className="label">Nombre *</label>
                  <input className="input" required value={form?.nombre ?? ''} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Ej: Café Americano"/>
                </div>
                <div>
                  <label className="label">Categoría *</label>
                  <select className="input" value={form?.categoria ?? 'bebidas_calientes'} onChange={e=>setForm({...form,categoria:e.target.value})}>
                    {Object.entries(CATS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Precio venta (Gs.) *</label>
                    <input type="number" className="input" required min="0" value={form?.precioVenta ?? ''} onChange={e=>setForm({...form,precioVenta:e.target.value})}/>
                  </div>
                  <div>
                    <label className="label">Costo producción (Gs.) *</label>
                    <input type="number" className="input" required min="0" value={form?.costoProduccion ?? ''} onChange={e=>setForm({...form,costoProduccion:e.target.value})}/>
                  </div>
                </div>
                <div>
                  <label className="label">Tasa IVA</label>
                  <select className="input" value={form?.tasaIVA ?? 0.10} onChange={e=>setForm({...form,tasaIVA:parseFloat(e.target.value)})}>
                    <option value={0.10}>10% (general)</option>
                    <option value={0.05}>5% (alimentos básicos)</option>
                    <option value={0}>0% (exento)</option>
                  </select>
                </div>
                {(form?.precioVenta || form?.precioVenta === 0) && (form?.costoProduccion || form?.costoProduccion === 0) && (
                  <div className={`p-3 rounded-xl text-sm font-medium ${(form.precioVenta-form.costoProduccion)>0?'bg-green-50 text-green-700':'bg-red-50 text-red-700'}`}>
                    Margen: {GS((form?.precioVenta||0)-(form?.costoProduccion||0))} ({(form?.precioVenta>0?((((form?.precioVenta||0)-(form?.costoProduccion||0))/(form?.precioVenta||1))*100).toFixed(1):0)}%)
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="disp" checked={form?.disponible ?? true} onChange={e=>setForm({...form,disponible:e.target.checked})} className="w-4 h-4 accent-cafe-700"/>
                  <label htmlFor="disp" className="text-sm text-cafe-700">Disponible para la venta</label>
                </div>
                <div>
                  <label className="label">Imagen del producto</label>
                  <input type="file" accept="image/*" className="input" onChange={async (e)=>{
                    const file = e.target.files[0];
                    if (!file) return;
                    const fd = new FormData(); fd.append('file', file);
                    try {
                      const { data } = await api.post('/uploads/product-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                      setForm(prev=>({ ...prev, imagen: data.url }));
                      toast.success('Imagen subida');
                    } catch (err) {
                      console.error(err);
                      toast.error('Error subiendo imagen');
                    }
                  }}/>
                  {form?.imagen && <div className="mt-2"><img src={form.imagen} alt="preview" className="w-20 h-20 object-cover rounded"/></div>}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={()=>setModal(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" className="btn-primary flex-1" disabled={guardando}>
                    {guardando?'Guardando...':'Guardar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
