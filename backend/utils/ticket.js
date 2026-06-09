// ============================================
// utils/ticket.js
// Generador de tickets de venta en texto
// ============================================

/**
 * Genera el texto de un ticket de venta
 * Compatible con impresoras térmicas (formato 40 chars de ancho)
 */
const generarTicketTexto = (venta) => {
  const ANCHO = 42;
  const linea = '─'.repeat(ANCHO);
  const dobleLinea = '═'.repeat(ANCHO);

  const centrar = (texto) => {
    const espacios = Math.max(0, Math.floor((ANCHO - texto.length) / 2));
    return ' '.repeat(espacios) + texto;
  };

  const formatGS = (monto) => `Gs. ${Math.round(monto).toLocaleString('es-PY')}`;

  const formatFecha = (fecha) => {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) + ' ' + d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
  };

  const cajeroNombre = venta.usuario
    ? `${venta.usuario.nombre} ${venta.usuario.apellido || ''}`
    : 'Sistema';

  const clienteNombre = venta.cliente
    ? `${venta.cliente.nombre} ${venta.cliente.apellido || ''}`
    : venta.nombreClienteRapido || 'Consumidor Final';

  // ─── ENCABEZADO ───
  let ticket = '\n';
  ticket += centrar(' GATOCAFEE') + '\n';
  ticket += centrar('Sistema de Gestión de Cafetería') + '\n';
  ticket += centrar(process.env.BUSINESS_ADDRESS || 'Villarrica, Paraguay') + '\n';
  ticket += centrar(process.env.BUSINESS_PHONE || '+595 981 000 000') + '\n';
  ticket += centrar(`RUC: ${process.env.BUSINESS_RUC || '12345678-9'}`) + '\n';
  ticket += dobleLinea + '\n';

  // ─── DATOS DEL TICKET ───
  ticket += `Ticket N°: ${venta.numeroTicket}\n`;
  ticket += `Fecha:     ${formatFecha(venta.createdAt)}\n`;
  ticket += `Cajero:    ${cajeroNombre}\n`;
  ticket += `Cliente:   ${clienteNombre}\n`;
  ticket += `Canal:     ${venta.canal?.toUpperCase()}\n`;
  ticket += `Turno:     ${venta.turno?.toUpperCase()}\n`;
  ticket += linea + '\n';

  // ─── ÍTEMS ───
  ticket += `${'PRODUCTO'.padEnd(22)} ${'CANT'.padStart(4)} ${'PRECIO'.padStart(8)} ${'TOTAL'.padStart(9)}\n`;
  ticket += linea + '\n';

  for (const item of venta.items) {
    const nombre = item.nombreProducto.substring(0, 22).padEnd(22);
    const cant = String(item.cantidad).padStart(4);
    const precio = formatGS(item.precioUnitario).padStart(8);
    const subtotal = formatGS(item.subtotal).padStart(9);
    ticket += `${nombre} ${cant} ${precio} ${subtotal}\n`;

    if (item.descuento > 0) {
      ticket += `  Descuento: -${formatGS(item.descuento)}\n`;
    }
  }

  ticket += linea + '\n';

  // ─── TOTALES ───
  const subtotalSinIVA = formatGS(venta.subtotalSinIVA).padStart(ANCHO - 15);
  const totalIVA = formatGS(venta.totalIVA).padStart(ANCHO - 15);
  const total = formatGS(venta.total).padStart(ANCHO - 15);

  ticket += `${'Subtotal (sin IVA):'.padEnd(15)}${subtotalSinIVA}\n`;
  ticket += `${'IVA (10%):'.padEnd(15)}${totalIVA}\n`;

  if (venta.totalDescuentos > 0) {
    ticket += `${'Descuentos:'.padEnd(15)}${formatGS(-venta.totalDescuentos).padStart(ANCHO - 15)}\n`;
  }

  ticket += dobleLinea + '\n';
  ticket += `${'TOTAL A PAGAR:'.padEnd(15)}${total}\n`;
  ticket += dobleLinea + '\n';

  // ─── PAGO ───
  const metodosPago = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', qr: 'QR' };
  ticket += `Método de pago: ${metodosPago[venta.metodoPago] || venta.metodoPago}\n`;

  if (venta.metodoPago === 'efectivo' && venta.montoPagado) {
    ticket += `Monto recibido: ${formatGS(venta.montoPagado)}\n`;
    ticket += `Cambio:         ${formatGS(venta.cambio)}\n`;
  }

  ticket += linea + '\n';

  // ─── PIE ───
  ticket += centrar('¡Gracias por tu visita!') + '\n';
  ticket += centrar('Vuelve pronto ') + '\n';
  ticket += centrar('www.gatocafee.com') + '\n';
  ticket += '\n\n\n'; // Espacio para corte de papel

  return ticket;
};

module.exports = { generarTicketTexto };
