'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '../../components/layout/AppLayout';
import Spinner from '../../components/ui/Spinner';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Minus, Trash2, ShoppingCart, Search, CreditCard, Banknote, Smartphone, Send } from 'lucide-react';

const GS = (n) => `Gs. ${Math.round(n||0).toLocaleString('es-PY')}`;

const CATEGORIAS = [
  { key: 'todos',           label: ' Todo' },
  { key: 'bebidas_calientes',label: ' Calientes' },
  { key: 'bebidas_frias',   label: ' Frías' },
  { key: 'comidas',         label: ' Comidas' },
  { key: 'postres',         label: ' Postres' },
];

const METODOS = [
  { key: 'efectivo',      label: 'Efectivo',      icon: <Banknote size={16}/> },
  { key: 'tarjeta',       label: 'Tarjeta',       icon: <CreditCard size={16}/> },
  { key: 'transferencia', label: 'Transferencia', icon: <Send size={16}/> },
  { key: 'qr',            label: 'QR',            icon: <Smartphone size={16}/> },
];

export default function POSPage() {
  const [productos, setProductos]   = useState([]);
  const [carrito, setCarrito]       = useState([]);
  const [categoria, setCategoria]   = useState('todos');
  const [busqueda, setBusqueda]     = useState('');
  const [metodo, setMetodo]         = useState('efectivo');
  const [montoPagado, setMontoPagado] = useState('');
  const [canal, setCanal]           = useState('mostrador');
  const [loading, setLoading]       = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [ticket, setTicket]         = useState(null); // legacy raw text
  const [ticketData, setTicketData] = useState(null); // structured venta for rendering printable ticket
  const [clienteQuery, setClienteQuery] = useState('');
  const [sugerenciasClientes, setSugerenciasClientes] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);

  const [promocionesActivas, setPromocionesActivas] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoValidation, setPromoValidation] = useState(null);

  // Modal / creación rápida de cliente
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClient, setNewClient] = useState({ nombre: '', apellido: '', ci_ruc: '', telefono: '' });

  const rightPanelRef = useRef(null);
  const itemsRef = useRef(null);
  const contentInnerRef = useRef(null);
  const prevCountRef = useRef(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [expandedAuto, setExpandedAuto] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/productos?disponible=true'),
      api.get('/promociones')
    ])
      .then(([prodRes, promoRes]) => {
        setProductos(prodRes.data.productos || []);
        setPromocionesActivas(promoRes.data.promociones || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const productosFiltrados = productos.filter(p => {
    const matchCat = categoria === 'todos' || p.categoria === categoria;
    const matchBus = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return matchCat && matchBus;
  });

  const agregarAlCarrito = (producto) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.producto._id === producto._id);
      if (existe) return prev.map(i => i.producto._id === producto._id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { producto, cantidad: 1 }];
    });
  };

  // Collapsed when no items
  const collapsed = carrito.length === 0;

  // Measure content height and handle smooth expand/collapse
  useEffect(() => {
    const prev = prevCountRef.current;
    const curr = carrito.length;
    // reset auto flag to allow animation
    setExpandedAuto(false);

    // measure after DOM updates
    setTimeout(() => {
      try {
        const h = contentInnerRef.current ? contentInnerRef.current.scrollHeight : 0;
        setContentHeight(h + 0); // px
      } catch (e) { /* ignore */ }
    }, 30);

    if (prev === 0 && curr > 0) {
      // wait for expansion animation to finish, then scroll the internal list only
      setTimeout(() => {
        try {
          if (itemsRef.current) itemsRef.current.scrollTo({ top: itemsRef.current.scrollHeight, behavior: 'smooth' });
        } catch (e) { /* ignore */ }
      }, 420); // allow animation to complete
    }

    prevCountRef.current = curr;
  }, [carrito.length]);

  const cambiarCantidad = (id, delta) => {
    setCarrito(prev => prev
      .map(i => i.producto._id === id ? { ...i, cantidad: i.cantidad + delta } : i)
      .filter(i => i.cantidad > 0)
    );
  };

  const subtotalBruto = carrito.reduce((acc, i) => acc + i.producto.precioVenta * i.cantidad, 0);
  const totalIVA = carrito.reduce((acc, i) => {
    const iva = (i.producto.precioVenta / (1 + i.producto.tasaIVA)) * i.producto.tasaIVA;
    return acc + iva * i.cantidad;
  }, 0);

  // Calcular descuentos automáticos por ítem (elige mejor promoción aplicable por ítem)
  const calcularDescuentosPorItem = () => {
    // Desactivar descuentos automáticos: solo aplicar descuentos cuando hay un cupón.
    // Retornamos 0 para todos los ítems para evitar descuentos por promociones automáticas.
    return carrito.map(item => ({ productoId: item.producto._id, descuento: 0 }));
  };

  const descuentosPorItem = calcularDescuentosPorItem();
  const descuentoAutomatico = descuentosPorItem.reduce((acc, d) => acc + (d.descuento || 0), 0);
  // El descuento por cupón solo aplica si hay un cupón realmente aplicado (appliedPromo)
  const descuentoCupon = appliedPromo ? (promoValidation?.descuento || 0) : 0;
  const totalDescuentoAplicado = descuentoAutomatico + descuentoCupon;

  const total = Math.max(0, subtotalBruto - totalDescuentoAplicado);
  const cambio = metodo === 'efectivo' && montoPagado ? parseFloat(montoPagado) - total : 0;

  const procesarVenta = async () => {
    if (carrito.length === 0) return toast.error('Agregá al menos un producto');
    if (metodo === 'efectivo' && parseFloat(montoPagado) < total) return toast.error('Monto insuficiente');
    setProcesando(true);
    try {
      // Preparar items con descuentos calculados
      const descuentosMap = Object.fromEntries(descuentosPorItem.map(d => [String(d.productoId), d.descuento]));
      const itemsPayload = carrito.map(i => ({ productoId: i.producto._id, cantidad: i.cantidad, descuento: descuentosMap[String(i.producto._id)] || 0 }));

      const { data } = await api.post('/ventas', {
        items: itemsPayload,
        clienteId: selectedCliente ? selectedCliente._id : null,
        nombreClienteRapido: selectedCliente ? `${selectedCliente.nombre} ${selectedCliente.apellido || ''}` : (clienteQuery || 'Consumidor Final'),
        metodoPago: metodo,
        montoPagado: parseFloat(montoPagado) || total,
        canal,
        promocionId: appliedPromo || null,
        codigoCupon: couponCode || null,
        descuentoCupon: promoValidation?.descuento || 0,
      });
      toast.success(`Venta ${data.venta.numeroTicket} registrada ✓`);
      // Obtener venta completa para renderizado profesional del ticket
      try {
        const ventaResp = await api.get(`/ventas/${data.venta.id}`);
        if (ventaResp.data && ventaResp.data.venta) {
          setTicketData(ventaResp.data.venta);
        } else if (ventaResp.data && ventaResp.data.ticket) {
          // fallback
          setTicket(ventaResp.data.ticket);
        }
      } catch (e) {
        // fallback to raw ticket text if fetching failed
        setTicket(data.ticket);
      }
      setCarrito([]);
      setMontoPagado('');
      // limpiar estado de cupón después de la venta
      setCouponCode('');
      setAppliedPromo(null);
      setPromoValidation(null);
    } catch (err) {
      console.error('procesarVenta error:', err?.response?.data || err.message || err);
      const serverMsg = err.response?.data?.mensaje;
      const serverErr = err.response?.data?.error;
      if (serverMsg || serverErr) {
        toast.error(`${serverMsg || 'Error'}${serverErr ? `: ${serverErr}` : ''}`);
      } else {
        toast.error(err.message || 'Error al procesar venta');
      }
    } finally {
      setProcesando(false);
    }
  };

  const buscarClientes = async (q) => {
    try {
      if (!q || q.length < 2) return setSugerenciasClientes([]);
      const { data } = await api.get('/clientes/buscar-rapido', { params: { q } });
      setSugerenciasClientes(data.clientes || []);
    } catch (err) {
      console.error('Error buscando clientes', err);
    }
  };

  const openAddModal = (prefill = '') => {
    setNewClient(prev => ({ ...prev, ci_ruc: prefill || clienteQuery }));
    setShowAddModal(true);
  };

  const submitNewClient = async () => {
    try {
      if (!newClient.ci_ruc || !newClient.nombre) return toast.error('Complete RUC/CI y nombre');
      const body = { ...newClient };
      const { data } = await api.post('/clientes', body);
      setSelectedCliente(data.cliente);
      setClienteQuery(`${data.cliente.nombre} ${data.cliente.apellido || ''}`);
      setSugerenciasClientes([]);
      setShowAddModal(false);
      setNewClient({ nombre: '', apellido: '', ci_ruc: '', telefono: '' });
      toast.success('Cliente creado');
    } catch (err) {
      console.error('Error creando cliente', err);
      toast.error(err.response?.data?.mensaje || 'Error creando cliente');
    }
  };

  if (loading) return <AppLayout><div className="p-8"><Spinner size="lg"/></div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex h-full">

        {/* ── Panel izquierdo: productos ── */}
        <div className="flex-1 flex flex-col border-r border-crema-200 overflow-hidden">
          {/* Barra superior */}
          <div className="p-4 border-b border-crema-200 space-y-3 bg-white">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-400"/>
              <input className="input pl-9" placeholder="Buscar producto..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {CATEGORIAS.map(c=>(
                <button key={c.key} onClick={()=>setCategoria(c.key)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition-all
                    ${categoria===c.key ? 'bg-cafe-800 text-crema-100' : 'bg-crema-100 text-cafe-700 hover:bg-crema-200'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de productos */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {productosFiltrados.map((p, idx) => (
                <motion.button key={p._id}
                  initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
                  transition={{delay:idx*0.03}}
                  onClick={()=>agregarAlCarrito(p)}
                  className="card-hover text-left p-4 active:scale-95 transition-transform flex flex-col"
                >
                  <div className="rounded-xl bg-crema-200 mb-3 overflow-hidden" style={{height: '45%'}}>
                    {p.imagen ? (
                      <img
                        src={p.imagen}
                        alt={p.nombre}
                        className="w-full h-full object-cover block"
                        onError={(e)=>{
                          const el = e.currentTarget;
                          if (el.dataset.errored) return;
                          el.dataset.errored = '1';
                          el.src = '/images/default-product.svg';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">{p.categoria==='bebidas_calientes'?'☕':p.categoria==='bebidas_frias'?'❄️':p.categoria==='comidas'?'🥪':'🍰'}</div>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-cafe-900 leading-tight mb-1">{p.nombre}</p>
                  <p className="text-cafe-500 font-display font-bold">{GS(p.precioVenta)}</p>
                  {carrito.find(i=>i.producto._id===p._id) && (
                    <div className="mt-2 w-6 h-6 rounded-full bg-cafe-800 text-crema-100 text-xs font-bold flex items-center justify-center">
                      {carrito.find(i=>i.producto._id===p._id).cantidad}
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Panel derecho: carrito ── */}
        <div ref={rightPanelRef} className="w-80 flex flex-col bg-white overflow-hidden sticky top-0 self-start max-h-screen">
          <div className="p-4 border-b border-crema-200">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-cafe-800 flex items-center gap-2 m-0">
                <ShoppingCart size={18}/> Carrito
              </h2>
              <div className="ml-auto flex items-center gap-2">
                {/* Cupón compacto al lado del carrito. Si ya hay promo aplicada, mostrar pill con opción de quitar */}
                {!appliedPromo ? (
                  <div className="flex items-center gap-2">
                    <input className="input text-xs font-mono w-28" placeholder="Código" value={couponCode} onChange={e=>setCouponCode(e.target.value)} />
                    <button className="btn-primary text-xs px-3 py-1" onClick={async ()=>{
                      try {
                        const { data } = await api.post('/promociones/validar-cupon', { codigo: couponCode, montoCompra: subtotalBruto });
                        setPromoValidation(data);
                        setAppliedPromo(data.promocion?.id || null);
                        toast.success('Cupón válido');
                      } catch(err) {
                        setPromoValidation(null); setAppliedPromo(null);
                        toast.error(err.response?.data?.mensaje || 'Cupón inválido');
                      }
                    }}>Aplicar</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-2 py-1 rounded-full text-xs text-green-800">
                    <span>{promoValidation?.promocion?.codigo || 'Cupón aplicado'}</span>
                    <button className="text-green-700 ml-2" onClick={()=>{ setAppliedPromo(null); setPromoValidation(null); setCouponCode(''); }}>✕</button>
                  </div>
                )}
                {carrito.length>0 && <span className="text-xs bg-cafe-800 text-crema-100 rounded-full w-5 h-5 flex items-center justify-center">{carrito.reduce((a,i)=>a+i.cantidad,0)}</span>}
              </div>
            </div>

            <div className="mt-3">
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="input text-sm"
                  placeholder="Ingrese RUC/CI"
                  value={clienteQuery}
                  onChange={e=>{
                    const v = e.target.value;
                    const digits = v.replace(/\D/g, '');
                    setClienteQuery(digits);
                    setSelectedCliente(null);
                    if (digits.length >= 3) {
                      buscarClientes(digits);
                    } else {
                      setSugerenciasClientes([]);
                    }
                  }}
                />
                {sugerenciasClientes && sugerenciasClientes.length > 0 && (
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-crema-200 rounded-xl shadow-md z-20 max-h-40 overflow-auto">
                    {sugerenciasClientes.map(c => (
                      <button key={c._id} className="w-full text-left px-3 py-2 text-sm hover:bg-crema-100" onClick={() => { setSelectedCliente(c); setClienteQuery(`${c.nombre} ${c.apellido || ''}`); setSugerenciasClientes([]); }}>
                        <div className="font-semibold">{c.nombre} {c.apellido || ''}</div>
                        {c.ci_ruc && <div className="text-xs text-cafe-500">{c.ci_ruc} · {c.telefono || ''}</div>}
                      </button>
                    ))}
                  </div>
                )}
                {/* Si no hay sugerencias pero el usuario escribió algo, ofrecer añadir cliente rápidamente */}
                {(!sugerenciasClientes || sugerenciasClientes.length === 0) && clienteQuery.trim().length > 0 && !selectedCliente && (
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={()=>openAddModal(clienteQuery.replace(/\D/g,''))} className="text-xs bg-crema-100 px-2 py-1 rounded-lg border border-crema-200 flex items-center gap-2">
                      <Plus size={12}/> <span>Añadir cliente</span>
                    </button>
                    <span className="text-xs text-cafe-500">Buscar por RUC/CI</span>
                  </div>
                )}
              </div>
              {selectedCliente && (
                <div className="text-xs text-cafe-600 mt-1 flex items-center justify-between">
                  <span>{selectedCliente.nombre} {selectedCliente.apellido || ''}</span>
                  <button className="text-xs text-cafe-500 hover:underline" onClick={()=>{ setSelectedCliente(null); setClienteQuery(''); setSugerenciasClientes([]); }}>Limpiar</button>
                </div>
              )}
              {/* Mensaje de validación de cupón: más discreto y compacto */}
              {promoValidation && appliedPromo && (
                <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 bg-green-50 border border-green-200 rounded-full text-xs text-green-800">
                  <span>✅</span>
                  <span className="font-semibold">{promoValidation.promocion?.codigo || 'Cupón válido'}</span>
                  <span className="text-cafe-600">· -{GS(promoValidation.descuento || 0)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
            {expandedAuto ? (
              <div ref={itemsRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                <div ref={contentInnerRef}>
                  <AnimatePresence>
                    {carrito.length===0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-cafe-300">
                        <ShoppingCart size={32}/>
                        <p className="text-sm mt-2">Carrito vacío</p>
                      </div>
                    ) : carrito.map(item=>(
                      <motion.div key={item.producto._id}
                        initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}
                        className="flex items-center gap-2 p-2 rounded-xl bg-crema-50 border border-crema-200"
                      >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-cafe-800 truncate">{item.producto.nombre}</p>
                                {(() => {
                                  const d = descuentosPorItem.find(dp => String(dp.productoId) === String(item.producto._id))?.descuento || 0;
                                  const original = item.producto.precioVenta * item.cantidad;
                                  const discounted = Math.max(0, original - d);
                                  if (d > 0) {
                                    return (
                                      <div className="text-xs text-cafe-500">
                                        <span className="line-through mr-2">{GS(original)}</span>
                                        <span className="font-semibold text-cafe-800">{GS(discounted)}</span>
                                      </div>
                                    );
                                  }
                                  return <p className="text-xs text-cafe-500">{GS(original)}</p>;
                                })()}
                              </div>
                        <div className="flex items-center gap-1">
                          <button onClick={()=>cambiarCantidad(item.producto._id,-1)} className="w-6 h-6 rounded-lg bg-crema-200 flex items-center justify-center text-cafe-700 hover:bg-crema-300">
                            <Minus size={12}/>
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-cafe-800">{item.cantidad}</span>
                          <button onClick={()=>cambiarCantidad(item.producto._id,1)} className="w-6 h-6 rounded-lg bg-cafe-800 flex items-center justify-center text-crema-100 hover:bg-cafe-700">
                            <Plus size={12}/>
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <motion.div ref={itemsRef} className="flex-1 overflow-hidden p-3" initial={false}
                animate={{ height: collapsed ? 104 : contentHeight }} transition={{ duration: 0.36, ease: 'easeInOut' }}
                onAnimationComplete={() => { if (!collapsed) setExpandedAuto(true); }}
              >
                <div ref={contentInnerRef} className="space-y-2" style={{ paddingRight: 8 }}>
                  <AnimatePresence>
                    {carrito.length===0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-cafe-300">
                        <ShoppingCart size={32}/>
                        <p className="text-sm mt-2">Carrito vacío</p>
                      </div>
                    ) : carrito.map(item=>(
                      <motion.div key={item.producto._id}
                        initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}
                        className="flex items-center gap-2 p-2 rounded-xl bg-crema-50 border border-crema-200"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-cafe-800 truncate">{item.producto.nombre}</p>
                          {(() => {
                            const d = descuentosPorItem.find(dp => String(dp.productoId) === String(item.producto._id))?.descuento || 0;
                            const original = item.producto.precioVenta * item.cantidad;
                            const discounted = Math.max(0, original - d);
                            if (d > 0) {
                              return (
                                <div className="text-xs text-cafe-500">
                                  <span className="line-through mr-2">{GS(original)}</span>
                                  <span className="font-semibold text-cafe-800">{GS(discounted)}</span>
                                </div>
                              );
                            }
                            return <p className="text-xs text-cafe-500">{GS(original)}</p>;
                          })()}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={()=>cambiarCantidad(item.producto._id,-1)} className="w-6 h-6 rounded-lg bg-crema-200 flex items-center justify-center text-cafe-700 hover:bg-crema-300">
                            <Minus size={12}/>
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-cafe-800">{item.cantidad}</span>
                          <button onClick={()=>cambiarCantidad(item.producto._id,1)} className="w-6 h-6 rounded-lg bg-cafe-800 flex items-center justify-center text-crema-100 hover:bg-cafe-700">
                            <Plus size={12}/>
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

          {/* Totales y pago */}
          <div className="border-t border-crema-200 p-4 space-y-4">
            {/* Resumen */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-cafe-500">
                <span>Subtotal sin IVA</span>
                <span>{GS(total - totalIVA)}</span>
              </div>
              <div className="flex justify-between text-cafe-500">
                <span>IVA</span>
                <span>{GS(totalIVA)}</span>
              </div>
              {/* Mostrar fila de descuento solo si el descuento total es mayor a 0 */}
              {totalDescuentoAplicado > 0 && (
                <div className="flex justify-between text-sm text-red-700">
                  <span>Descuento</span>
                  <span>-{GS(totalDescuentoAplicado)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-cafe-900 text-base pt-1 border-t border-crema-200">
                <span>Total</span>
                <span className="font-display">{GS(total)}</span>
              </div>
            </div>

            {/* Debug: mostrar valores internos si el usuario lo activa */}
            <div className="mt-2">
              <button onClick={()=>setShowDebug(s=>!s)} className="text-xs text-cafe-500 hover:underline">{showDebug ? 'Ocultar detalles' : 'Mostrar detalles'}</button>
              {showDebug && (
                <div className="mt-2 text-xs text-cafe-600 bg-crema-50 p-2 rounded">
                  <div>subtotalBruto: {GS(subtotalBruto)}</div>
                  <div>descuentoAutomatico: {GS(descuentoAutomatico)}</div>
                  <div>descuentoCupon: {GS(descuentoCupon)}</div>
                  <div>totalDescuentoAplicado: {GS(totalDescuentoAplicado)}</div>
                  <div>total (subtotalBruto - descuentos): {GS(total)}</div>
                  <div>appliedPromo: {String(appliedPromo)}</div>
                </div>
              )}
            </div>

            {/* Canal */}
            <div className="flex gap-2">
              {['mostrador','delivery','online'].map(c=>(
                <button key={c} onClick={()=>setCanal(c)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${canal===c?'bg-cafe-800 text-crema-100':'bg-crema-100 text-cafe-600 hover:bg-crema-200'}`}>
                  {c.charAt(0).toUpperCase()+c.slice(1)}
                </button>
              ))}
            </div>

            {/* Método de pago */}
            <div className="grid grid-cols-2 gap-2">
              {METODOS.map(m=>(
                <button key={m.key} onClick={()=>setMetodo(m.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all
                    ${metodo===m.key?'bg-cafe-800 text-crema-100':'bg-crema-50 text-cafe-700 border border-crema-200 hover:bg-crema-100'}`}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            {/* Monto si es efectivo */}
            {metodo==='efectivo' && (
              <div>
                <label className="label text-xs">Monto recibido</label>
                <input type="number" className="input text-sm" placeholder={GS(total)}
                  value={montoPagado} onChange={e=>setMontoPagado(e.target.value)}/>
                {cambio>0 && (
                  <p className="text-xs text-green-700 font-semibold mt-1">Cambio: {GS(cambio)}</p>
                )}
              </div>
            )}

            {/* Botón cobrar */}
            <motion.button
              onClick={procesarVenta} disabled={procesando||carrito.length===0}
              whileTap={{scale:0.97}}
              className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
            >
              {procesando ? (
                <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Procesando...</>
              ) : <><ShoppingCart size={16}/> Cobrar {GS(total)}</>}
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Modal añadir cliente ── */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-cafe-900/70 flex items-center justify-center z-50 p-4" onClick={()=>setShowAddModal(false)}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}} className="bg-white rounded-2xl p-6 max-w-md w-full shadow-cafe-lg" onClick={e=>e.stopPropagation()}>
              <h3 className="font-display font-bold text-cafe-800 text-lg mb-2">Agregar cliente</h3>
              <div className="space-y-2">
                <input className="input text-sm" placeholder="RUC / CI" value={newClient.ci_ruc} onChange={e=>setNewClient(n=>({...n, ci_ruc: e.target.value}))} />
                <input className="input text-sm" placeholder="Nombre" value={newClient.nombre} onChange={e=>setNewClient(n=>({...n, nombre: e.target.value}))} />
                <input className="input text-sm" placeholder="Apellido (opcional)" value={newClient.apellido} onChange={e=>setNewClient(n=>({...n, apellido: e.target.value}))} />
                <input className="input text-sm" placeholder="Teléfono (opcional)" value={newClient.telefono} onChange={e=>setNewClient(n=>({...n, telefono: e.target.value}))} />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={()=>setShowAddModal(false)} className="btn-secondary flex-1 text-sm">Cancelar</button>
                <button onClick={submitNewClient} className="btn-primary flex-1 text-sm">Guardar cliente</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal ticket ── */}
      <AnimatePresence>
        {(ticketData || ticket) && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 bg-cafe-900/70 flex items-center justify-center z-50 p-4"
            onClick={()=>{ setTicketData(null); setTicket(null); }}
          >
            <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-cafe-lg" onClick={e=>e.stopPropagation()}
            >
              <div className="text-center mb-2">
                <h3 className="font-display font-bold text-cafe-800 text-lg">Venta registrada</h3>
                <p className="text-cafe-500 text-sm">El ticket fue generado correctamente</p>
              </div>

              {/* Ticket printable area */}
              <div id="ticket-printable" className="bg-crema-100 rounded-xl p-4 text-xs text-cafe-700 max-h-96 overflow-y-auto">
                {ticketData ? (
                  <div className="text-left font-sans">
                    <div className="text-center font-bold text-base">GATOCAFEE</div>
                    <div className="text-center text-xs">Sistema de Gestión de Cafetería</div>
                    <div className="text-center text-xs">{process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || 'Villarrica, Paraguay'}</div>
                    <div className="text-center text-xs">{process.env.NEXT_PUBLIC_BUSINESS_PHONE || '+595 981 000 000'}</div>
                    <div className="text-center text-xs">RUC: {process.env.NEXT_PUBLIC_BUSINESS_RUC || '12345678-9'}</div>
                    <hr className="my-2 border-cafe-300" />

                    <div className="grid grid-cols-2 text-xs gap-1">
                      <div>Ticket N°: <strong>{ticketData.numeroTicket}</strong></div>
                      <div className="text-right">Fecha: <strong>{new Date(ticketData.createdAt).toLocaleString('es-PY')}</strong></div>
                      <div>Cajero: <strong>{ticketData.usuario?.nombre} {ticketData.usuario?.apellido}</strong></div>
                      <div className="text-right">Canal: <strong>{(ticketData.canal||'').toUpperCase()}</strong></div>
                      <div>Cliente: <strong>{ticketData.cliente ? `${ticketData.cliente.nombre} ${ticketData.cliente.apellido||''}` : ticketData.nombreClienteRapido}</strong></div>
                      <div className="text-right">CI/RUC: <strong>{ticketData.cliente?.ci_ruc || ''}</strong></div>
                      <div>Turno: <strong>{(ticketData.turno||'').toUpperCase()}</strong></div>
                    </div>

                    <hr className="my-2 border-cafe-300" />

                    <table className="w-full text-xs table-fixed">
                      <thead>
                        <tr>
                          <th className="text-left">PRODUCTO</th>
                          <th className="text-right">CANT</th>
                          <th className="text-right">PRECIO</th>
                          <th className="text-right">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ticketData.items.map((it, idx) => (
                          <tr key={idx} className="align-top">
                            <td>{it.nombreProducto}</td>
                            <td className="text-right">{it.cantidad}</td>
                            <td className="text-right">Gs. {Math.round(it.precioUnitario).toLocaleString('es-PY')}</td>
                            <td className="text-right">Gs. {Math.round(it.subtotal).toLocaleString('es-PY')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <hr className="my-2 border-cafe-300" />

                    <div className="text-right text-sm font-semibold">
                      <div>Subtotal (sin IVA): Gs. {Math.round(ticketData.subtotalSinIVA).toLocaleString('es-PY')}</div>
                      <div>IVA: Gs. {Math.round(ticketData.totalIVA).toLocaleString('es-PY')}</div>
                      { (ticketData.codigoCupon || ticketData.promocion) && ticketData.totalDescuentos > 0 && (
                        <div>Descuento: -Gs. {Math.round(ticketData.totalDescuentos).toLocaleString('es-PY')}</div>
                      ) }
                      <div className="text-base">TOTAL A PAGAR: Gs. {Math.round(ticketData.total).toLocaleString('es-PY')}</div>
                    </div>

                    <hr className="my-2 border-cafe-300" />

                    <div className="text-xs">
                      <div>Método de pago: {ticketData.metodoPago}</div>
                      {ticketData.metodoPago === 'efectivo' && (
                        <>
                          <div>Monto recibido: Gs. {Math.round(ticketData.montoPagado).toLocaleString('es-PY')}</div>
                          <div>Cambio: Gs. {Math.round(ticketData.cambio).toLocaleString('es-PY')}</div>
                        </>
                      )}
                    </div>

                    <div className="text-center mt-3 text-xs">Gracias por su visita. Vuelva pronto.</div>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap">{ticket}</pre>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={() => {
                  // Imprimir usando iframe con srcdoc para evitar problemas de cross-origin
                  try {
                    const ticketHtml = document.getElementById('ticket-printable').innerHTML;
                    const iframe = document.createElement('iframe');
                    iframe.style.position = 'fixed';
                    iframe.style.right = '0';
                    iframe.style.bottom = '0';
                    iframe.style.width = '0';
                    iframe.style.height = '0';
                    iframe.style.border = '0';
                    iframe.srcdoc = `<!doctype html><html><head><title>Ticket</title><meta charset="utf-8"><style>
                      @media print { @page { margin: 6mm; } body { -webkit-print-color-adjust: exact; } }
                      body{font-family:Arial,Helvetica,sans-serif;padding:12px;color:#2d1b1a}
                      .header{text-align:center;margin-bottom:8px}
                      .header .title{font-weight:700;font-size:16px}
                      .small{font-size:12px}
                      table{width:100%;border-collapse:collapse;font-size:12px}
                      td,th{padding:6px}
                      .text-right{text-align:right}
                      .divider{border-top:1px solid #e8dccc;margin:8px 0}
                      .total{font-weight:700;font-size:14px}
                      </style></head><body>${ticketHtml}</body></html>`;
                    document.body.appendChild(iframe);
                    iframe.onload = () => {
                      try {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                      } catch (err) {
                        console.error('Error al imprimir desde iframe:', err);
                        // fallback a print global
                        window.print();
                      } finally {
                        setTimeout(() => { try { document.body.removeChild(iframe); } catch(e){} }, 500);
                      }
                    };
                  } catch (err) {
                    console.error('Error preparando impresión:', err);
                    window.print();
                  }
                }} className="btn-secondary flex-1 text-sm">Imprimir</button>
                <button onClick={()=>{ setTicketData(null); setTicket(null); }} className="btn-primary flex-1 text-sm">Cerrar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
