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
  // Invoice modal state
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({
    cliente: { nombre: '', apellido: '', razonSocial: '', ci_ruc: '', direccion: '', telefono: '', email: '' },
    tipoDocumento: 'DNI',
    tipoComprobante: 'Factura'
  });
  const [clientMatches, setClientMatches] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [saveToClient, setSaveToClient] = useState(false);
  const [clientLookupLoading, setClientLookupLoading] = useState(false);

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


  // Generar factura. Si invoiceData está presente, se envía al backend para incluir datos fiscales
  const generarFactura = async (id, invoiceData = null) => {
    try {
      const body = invoiceData ? { invoiceData } : undefined;
      const res = await api.post('/ventas/' + id + '/factura', body);
      const archivoUrl = res.data.archivoUrl || res.data.archivoUrl;
      if (!archivoUrl) return toast.error('No se recibió URL de la factura');

      // Construir URL absoluta si el backend devolvió ruta relativa
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api$/, '');
      const fileUrl = archivoUrl.startsWith('http') ? archivoUrl : (apiUrl || '') + archivoUrl;

      // Abrir en nueva pestaña
      window.open(fileUrl, '_blank');
      toast.success('Factura generada');
      return { success: true };
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al generar factura');
      return { success: false };
    }
  };

  // Buscar cliente por RUC/CI (usa /api/clientes/buscar-rapido?q=)
  const buscarClientePorDocumento = async (q) => {
    if (!q || q.length < 2) { setClientMatches([]); return; }
    setClientLookupLoading(true);
    try {
      const res = await api.get('/clientes/buscar-rapido?q=' + encodeURIComponent(q));
      setClientMatches(res.data.clientes || []);
    } catch (e) {
      setClientMatches([]);
    } finally { setClientLookupLoading(false); }
  };

  const usarCliente = async (cliente) => {
    try {
      // Obtener cliente completo
      const res = await api.get('/clientes/' + cliente._id);
      const full = res.data.cliente;
      setInvoiceForm(s => ({ ...s, cliente: { nombre: full.nombre || '', apellido: full.apellido || '', razonSocial: full.razonSocial || '', ci_ruc: full.ci_ruc || '', direccion: full.direccion || '', telefono: full.telefono || '', email: full.email || '' } }));
      setSelectedClientId(full._id);
      setClientMatches([]);
    } catch (e) { toast.error('No se pudo cargar cliente'); }
  };

  const submitInvoice = async () => {
    if (!invoiceModal) return;
    try {
      let clientIdToUse = selectedClientId;
      // Si el usuario quiere guardar/actualizar datos en cliente
      if (saveToClient) {
        const payload = { ...invoiceForm.cliente };
        if (clientIdToUse) {
          // actualizar
          const res = await api.put('/clientes/' + clientIdToUse, payload);
          clientIdToUse = res.data.cliente._id;
        } else {
          // crear nuevo cliente
          try {
            const res = await api.post('/clientes', payload);
            clientIdToUse = res.data.cliente._id;
          } catch (err) {
            // si ya existe (dup key), intentar buscar por ci_ruc
            if (err.response?.status === 400) {
              // buscar por ci_ruc
              const q = invoiceForm.cliente.ci_ruc;
              if (q) {
                const search = await api.get('/clientes/buscar-rapido?q=' + encodeURIComponent(q));
                if ((search.data.clientes || []).length) {
                  clientIdToUse = search.data.clientes[0]._id;
                }
              }
            }
          }
        }
      }

      // Construir invoiceData a enviar
      const invoiceData = { cliente: invoiceForm.cliente };
      if (clientIdToUse) invoiceData.clienteId = clientIdToUse;

      await generarFactura(invoiceModal._id, invoiceData);
      toast.success('Factura generada');
      setInvoiceModal(null);
      // refrescar lista
      cargar();
    } catch (err) {
      console.error(err);
      toast.error('Error al generar factura');
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
                        <button onClick={() => { setInvoiceModal(v); setInvoiceForm({ cliente: { nombre: v.cliente?.nombre || v.cliente?.razonSocial || '', apellido: v.cliente?.apellido || '', razonSocial: v.cliente?.razonSocial || '', ci_ruc: v.cliente?.ci_ruc || v.cliente?.ruc || '', direccion: v.cliente?.direccion || '', telefono: v.cliente?.telefono || '', email: v.cliente?.email || '' }, tipoDocumento: 'DNI', tipoComprobante: 'Factura' }); }}
                          className="p-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200" title="Generar factura">F</button>
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

        {invoiceModal && (
          <div className="fixed inset-0 bg-cafe-900/60 flex items-center justify-center z-50 p-4" onClick={() => setInvoiceModal(null)}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-cafe-lg"
              onClick={e => e.stopPropagation()}>
              <h2 className="font-display font-bold text-cafe-800 mb-4">Generar factura</h2>
              <p className="text-sm text-cafe-500 mb-3">Factura para {invoiceModal.numeroTicket} · {GS(invoiceModal.total)}</p>

              <label className="label">Razón social / Nombre *</label>
              <input className="input" value={invoiceForm.cliente.razonSocial || invoiceForm.cliente.nombre} onChange={e => setInvoiceForm(s => ({...s, cliente: {...s.cliente, razonSocial: e.target.value, nombre: e.target.value}}))} />

              <label className="label">CI / RUC *</label>
              <input className="input" value={invoiceForm.cliente.ci_ruc} onChange={e => { setInvoiceForm(s => ({...s, cliente: {...s.cliente, ci_ruc: e.target.value}})); }} onBlur={e => buscarClientePorDocumento(e.target.value)} />
              <div className="text-xs text-cafe-500 mt-1">{clientLookupLoading ? 'Buscando...' : ''}</div>
              {clientMatches.length > 0 && (
                <div className="mt-2 space-y-1">
                  {clientMatches.map(c => (
                    <div key={c._id} className="flex items-center justify-between bg-crema-50 p-2 rounded">
                      <div className="text-sm">{c.nombre} {c.apellido} · {c.ci_ruc || '—'}</div>
                      <button className="btn-secondary text-xs" onClick={() => usarCliente(c)}>Usar datos</button>
                    </div>
                  ))}
                </div>
              )}

              <label className="label">Dirección</label>
              <input className="input" value={invoiceForm.cliente.direccion} onChange={e => setInvoiceForm(s => ({...s, cliente: {...s.cliente, direccion: e.target.value}}))} />

              <label className="label">Teléfono</label>
              <input className="input" value={invoiceForm.cliente.telefono} onChange={e => setInvoiceForm(s => ({...s, cliente: {...s.cliente, telefono: e.target.value}}))} />

              <label className="label">Email</label>
              <input className="input" value={invoiceForm.cliente.email} onChange={e => setInvoiceForm(s => ({...s, cliente: {...s.cliente, email: e.target.value}}))} />

              <label className="label mt-2"><input type="checkbox" className="mr-2" checked={saveToClient} onChange={e => setSaveToClient(e.target.checked)} /> Guardar/actualizar datos en cliente</label>

              <div className="flex gap-3 mt-4">
                <button onClick={() => setInvoiceModal(null)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={submitInvoice} className="btn-primary flex-1">Generar factura</button>
              </div>
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
