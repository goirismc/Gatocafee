'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AppLayout from '../../components/layout/AppLayout';
import Spinner from '../../components/ui/Spinner';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { AlertTriangle, Plus, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';

const ESTADO_BADGE = {
  ok:      <span className="badge badge-ok">✓ OK</span>,
  bajo:    <span className="badge badge-bajo">⚠ Bajo</span>,
  critico: <span className="badge badge-critico">🔴 Crítico</span>,
  agotado: <span className="badge badge-agotado">✗ Agotado</span>,
};

export default function InventarioPage() {
  const [items, setItems]         = useState([]);
  const [alertas, setAlertas]     = useState({});
  const [loading, setLoading]     = useState(true);
  const [filtro, setFiltro]       = useState('todos');
  const [modalMov, setModalMov]   = useState(null); // { item }
  const [mov, setMov]             = useState({ tipo:'entrada', cantidad:'', motivo:'' });
  const [guardando, setGuardando] = useState(false);
  // Form modal for create/edit insumo
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'
  const [formData, setFormData] = useState({ nombre:'', categoria:'insumo', unidadMedida:'unidad', stockActual:0, stockMinimo:10, precioUnitario:0, proveedor:'', descripcion:'' });
  const [savingItem, setSavingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const cargar = () => {
    setLoading(true);
    api.get('/inventario').then(r=>{
      setItems(r.data.inventario||[]);
      setAlertas(r.data.alertas||{});
    }).finally(()=>setLoading(false));
  };
  useEffect(cargar,[]);

  const openCreateModal = () => {
    setFormMode('create');
    setEditingItemId(null);
    setFormData({ nombre:'', categoria:'insumo', unidadMedida:'unidad', stockActual:0, stockMinimo:10, precioUnitario:0, proveedor:'', descripcion:'' });
    setShowFormModal(true);
  };

  const openEditModal = (item) => {
    setFormMode('edit');
    setEditingItemId(item._id || item.id);
    setFormData({
      nombre: item.nombre || '',
      categoria: item.categoria || 'insumo',
      unidadMedida: item.unidadMedida || 'unidad',
      stockActual: item.stockActual || 0,
      stockMinimo: item.stockMinimo || 10,
      precioUnitario: item.precioUnitario || 0,
      proveedor: item.proveedor || '',
      descripcion: item.descripcion || '',
    });
    setShowFormModal(true);
  };

  const submitItem = async () => {
    // Validaciones mínimas
    if (!formData.nombre || !formData.unidadMedida) return toast.error('Complete nombre y unidad de medida');
    if (formData.stockActual < 0 || formData.stockMinimo < 0 || formData.precioUnitario < 0) return toast.error('Valores numéricos no pueden ser negativos');
    setSavingItem(true);
    try {
      if (formMode === 'create') {
        await api.post('/inventario', formData);
        toast.success('Insumo creado');
      } else {
        await api.put(`/inventario/${editingItemId}`, formData);
        toast.success('Insumo actualizado');
      }
      setShowFormModal(false);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error');
    } finally {
      setSavingItem(false);
    }
  };

  const eliminarItem = async (item) => {
    const id = item._id || item.id;
    setDeleting(true);
    try {
      await api.delete(`/inventario/${id}`);
      toast.success('Insumo eliminado');
      setPendingDeleteItem(null);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const registrarMovimiento = async () => {
    if (!mov.cantidad) return toast.error('Ingresá la cantidad');
    setGuardando(true);
    try {
      await api.post(`/inventario/${modalMov._id}/movimiento`, mov);
      toast.success('Movimiento registrado');
      setModalMov(null);
      setMov({ tipo:'entrada', cantidad:'', motivo:'' });
      cargar();
    } catch(err) {
      toast.error(err.response?.data?.mensaje||'Error');
    } finally { setGuardando(false); }
  };

  const itemsFiltrados = filtro==='todos' ? items : items.filter(i=>i.estado===filtro);

  if (loading) return <AppLayout><div className="p-8"><Spinner size="lg"/></div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-cafe-900">Inventario</h1>
            <p className="text-cafe-500 text-sm">{items.length} insumos registrados</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
              <Plus size={14}/> Nuevo Insumo
            </button>
            <button onClick={cargar} className="btn-secondary flex items-center gap-2">
              <RefreshCw size={14}/> Actualizar
            </button>
          </div>
        </div>

        {/* Resumen alertas */}
        {(alertas.critico>0||alertas.agotado>0) && (
          <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
            className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertTriangle className="text-red-500 shrink-0" size={20}/>
            <div>
              <p className="font-semibold text-red-700 text-sm">Atención: stock crítico</p>
              <p className="text-xs text-red-500">
                {alertas.agotado||0} agotados · {alertas.critico||0} críticos · {alertas.bajo||0} bajos
              </p>
            </div>
          </motion.div>
        )}

        {/* Filtros */}
        <div className="flex gap-2 mb-4">
          {['todos','ok','bajo','critico','agotado'].map(f=>(
            <button key={f} onClick={()=>setFiltro(f)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all capitalize
                ${filtro===f?'bg-cafe-800 text-crema-100':'bg-crema-100 text-cafe-700 hover:bg-crema-200'}`}>
              {f==='todos'?'Todos':f}
              {f!=='todos'&&alertas[f]>0&&<span className="ml-1 text-xs">({alertas[f]})</span>}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-crema-100 border-b border-crema-200">
                  {['Insumo','Categoría','Stock actual','Mínimo','Unidad','Estado','Acciones'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-cafe-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itemsFiltrados.map((item,idx)=>(
                  <motion.tr key={item._id || item.id || `item-${idx}`} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:idx*0.03}}
                    className="border-b border-crema-100 hover:bg-crema-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-cafe-900">{item.nombre}</td>
                    <td className="px-4 py-3 text-sm text-cafe-500 capitalize">{item.categoria?.replace('_',' ')}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold text-sm ${item.estado==='agotado'?'text-red-600':item.estado==='critico'?'text-orange-600':item.estado==='bajo'?'text-yellow-600':'text-green-600'}`}>
                        {item.stockActual}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-cafe-500">{item.stockMinimo}</td>
                    <td className="px-4 py-3 text-sm text-cafe-500">{item.unidadMedida}</td>
                    <td className="px-4 py-3">{ESTADO_BADGE[item.estado]}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={()=>{setModalMov(item);setMov({tipo:'entrada',cantidad:'',motivo:''})}}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200">
                          <ArrowUp size={12}/> Entrada
                        </button>
                        <button onClick={()=>{setModalMov(item);setMov({tipo:'salida',cantidad:'',motivo:''})}}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200">
                          <ArrowDown size={12}/> Salida
                        </button>
                        <button onClick={()=>openEditModal(item)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-medium hover:bg-blue-200">
                          Editar
                        </button>
                        <button onClick={()=>setPendingDeleteItem(item)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal crear / editar insumo */}
        {showFormModal && (
          <div className="fixed inset-0 bg-cafe-900/60 flex items-center justify-center z-50 p-4" onClick={()=>setShowFormModal(false)}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}}
              className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-cafe-lg" onClick={e=>e.stopPropagation()}>
              <h2 className="font-display font-bold text-cafe-800 mb-1">{formMode==='create'?'Nuevo insumo':'Editar insumo'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Nombre</label>
                  <input className="input" value={formData.nombre} onChange={e=>setFormData(d=>({...d,nombre:e.target.value}))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Categoría</label>
                    <select className="input" value={formData.categoria} onChange={e=>setFormData(d=>({...d,categoria:e.target.value}))}>
                      <option value="materia_prima">Materia prima</option>
                      <option value="insumo">Insumo</option>
                      <option value="packaging">Packaging</option>
                      <option value="limpieza">Limpieza</option>
                      <option value="otros">Otros</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Unidad</label>
                    <select className="input" value={formData.unidadMedida} onChange={e=>setFormData(d=>({...d,unidadMedida:e.target.value}))}>
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="litro">litro</option>
                      <option value="ml">ml</option>
                      <option value="unidad">unidad</option>
                      <option value="caja">caja</option>
                      <option value="rollo">rollo</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="label">Stock actual</label>
                    <input type="number" min="0" className="input" value={formData.stockActual} onChange={e=>setFormData(d=>({...d,stockActual:Number(e.target.value)}))} />
                  </div>
                  <div>
                    <label className="label">Stock mínimo</label>
                    <input type="number" min="0" className="input" value={formData.stockMinimo} onChange={e=>setFormData(d=>({...d,stockMinimo:Number(e.target.value)}))} />
                  </div>
                  <div>
                    <label className="label">Costo unitario</label>
                    <input type="number" min="0" className="input" value={formData.precioUnitario} onChange={e=>setFormData(d=>({...d,precioUnitario:Number(e.target.value)}))} />
                  </div>
                </div>
                <div>
                  <label className="label">Proveedor (opcional)</label>
                  <input className="input" value={formData.proveedor} onChange={e=>setFormData(d=>({...d,proveedor:e.target.value}))} />
                </div>
                <div>
                  <label className="label">Descripción (opcional)</label>
                  <input className="input" value={formData.descripcion} onChange={e=>setFormData(d=>({...d,descripcion:e.target.value}))} />
                </div>
                <div className="flex gap-3">
                  <button onClick={()=>setShowFormModal(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button onClick={submitItem} disabled={savingItem} className="btn-primary flex-1">{savingItem? 'Guardando...': (formMode==='create'?'Crear':'Guardar')}</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal eliminar insumo */}
        {pendingDeleteItem && (
          <div className="fixed inset-0 bg-cafe-900/60 flex items-center justify-center z-50 p-4" onClick={()=>setPendingDeleteItem(null)}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-cafe-lg" onClick={e=>e.stopPropagation()}>
              <h2 className="font-display font-bold text-cafe-800 mb-1">Eliminar insumo</h2>
              <p className="text-cafe-500 text-sm mb-4">¿Estás seguro de que deseas eliminar este insumo? Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <button onClick={()=>setPendingDeleteItem(null)} disabled={deleting} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={()=>eliminarItem(pendingDeleteItem)} disabled={deleting} className="btn-primary flex-1">{deleting ? 'Eliminando...' : 'Eliminar'}</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal movimiento */}
        {modalMov && (
          <div className="fixed inset-0 bg-cafe-900/60 flex items-center justify-center z-50 p-4" onClick={()=>setModalMov(null)}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-cafe-lg" onClick={e=>e.stopPropagation()}>
              <h2 className="font-display font-bold text-cafe-800 mb-1">Registrar movimiento</h2>
              <p className="text-cafe-500 text-sm mb-4">{modalMov.nombre} · Stock actual: {modalMov.stockActual} {modalMov.unidadMedida}</p>
              <div className="space-y-4">
                <div>
                  <label className="label">Tipo</label>
                  <div className="flex gap-2">
                    {['entrada','salida','ajuste'].map(t=>(
                      <button key={t} onClick={()=>setMov({...mov,tipo:t})}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all
                          ${mov.tipo===t?'bg-cafe-800 text-crema-100':'bg-crema-100 text-cafe-700 hover:bg-crema-200'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Cantidad ({modalMov.unidadMedida})</label>
                  <input type="number" className="input" min="0" step="0.1"
                    value={mov.cantidad} onChange={e=>setMov({...mov,cantidad:e.target.value})}/>
                </div>
                <div>
                  <label className="label">Motivo (opcional)</label>
                  <input className="input" placeholder="Ej: Reposición semanal"
                    value={mov.motivo} onChange={e=>setMov({...mov,motivo:e.target.value})}/>
                </div>
                <div className="flex gap-3">
                  <button onClick={()=>setModalMov(null)} className="btn-secondary flex-1">Cancelar</button>
                  <button onClick={registrarMovimiento} disabled={guardando} className="btn-primary flex-1">
                    {guardando?'Guardando...':'Registrar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
