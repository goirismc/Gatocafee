// ============================================
// controllers/reportesController.js
// Generación de PDFs y Excel con reportes
// ============================================

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Venta = require('../models/Venta');
const Producto = require('../models/Producto');
const mongoose = require('mongoose');

// ============================================
// GET /api/reportes/factura/:ventaId
// Generar factura en PDF
// ============================================
exports.generarFacturaPDF = async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.ventaId)
      .populate('usuario', 'nombre apellido')
      .populate('cliente', 'nombre apellido email telefono');

    if (!venta) return res.status(404).json({ success: false, mensaje: 'Venta no encontrada' });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Headers para descarga del PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura-${venta.numeroTicket}.pdf`);
    doc.pipe(res);

    // ── PALETA DE COLORES ──
    const CAFE = '#4A2C2A';
    const CREMA = '#F5E6D3';
    const GRIS = '#555555';
    const NEGRO = '#1A1A1A';

    // ── ENCABEZADO ──
    doc.rect(0, 0, doc.page.width, 120).fill(CAFE);
    doc.fillColor('white').fontSize(28).font('Helvetica-Bold')
      .text('☕ GATOCAFEE', 50, 30);
    doc.fontSize(11).font('Helvetica')
      .text('Sistema de Gestión de Cafetería', 50, 65)
      .text(`${process.env.BUSINESS_ADDRESS || 'Villarrica, Paraguay'}  |  RUC: ${process.env.BUSINESS_RUC || '12345678-9'}`, 50, 82)
      .text(`Tel: ${process.env.BUSINESS_PHONE || '+595 981 000 000'}`, 50, 99);

    // FACTURA label
    doc.fillColor(CREMA).fontSize(20).font('Helvetica-Bold')
      .text('FACTURA', 400, 40, { align: 'right' });
    doc.fontSize(11).font('Helvetica')
      .text(`N° ${venta.numeroTicket}`, 400, 68, { align: 'right' })
      .text(new Date(venta.createdAt).toLocaleDateString('es-PY', { day: '2-digit', month: 'long', year: 'numeric' }), 400, 86, { align: 'right' });

    doc.moveDown(3);

    // ── DATOS DEL CLIENTE Y CAJERO ──
    doc.fillColor(NEGRO).fontSize(10).font('Helvetica-Bold').text('DATOS DEL CLIENTE', 50, 140);
    doc.moveTo(50, 153).lineTo(270, 153).stroke(CAFE);
    doc.fillColor(GRIS).font('Helvetica').fontSize(10);
    const cliente = venta.cliente
      ? `${venta.cliente.nombre} ${venta.cliente.apellido || ''}`
      : venta.nombreClienteRapido || 'Consumidor Final';
    doc.text(`Cliente: ${cliente}`, 50, 160);
    if (venta.cliente?.email) doc.text(`Email: ${venta.cliente.email}`, 50, 175);
    if (venta.cliente?.telefono) doc.text(`Tel: ${venta.cliente.telefono}`, 50, 190);

    doc.fillColor(NEGRO).font('Helvetica-Bold').text('INFORMACIÓN DE VENTA', 320, 140);
    doc.moveTo(320, 153).lineTo(540, 153).stroke(CAFE);
    doc.fillColor(GRIS).font('Helvetica');
    const cajeroNombre = venta.usuario ? `${venta.usuario.nombre} ${venta.usuario.apellido || ''}` : 'Sistema';
    doc.text(`Cajero: ${cajeroNombre}`, 320, 160)
      .text(`Canal: ${venta.canal?.toUpperCase()}`, 320, 175)
      .text(`Método pago: ${venta.metodoPago?.toUpperCase()}`, 320, 190)
      .text(`Turno: ${venta.turno?.toUpperCase()}`, 320, 205);

    // ── TABLA DE PRODUCTOS ──
    const tablaY = 230;
    doc.rect(50, tablaY, 495, 24).fill(CAFE);
    doc.fillColor('white').fontSize(10).font('Helvetica-Bold');
    doc.text('PRODUCTO', 60, tablaY + 7)
      .text('CANT.', 290, tablaY + 7)
      .text('P. UNIT.', 340, tablaY + 7)
      .text('IVA', 410, tablaY + 7)
      .text('SUBTOTAL', 455, tablaY + 7);

    let filaY = tablaY + 30;
    let filaIndex = 0;

    for (const item of venta.items) {
      // Alternar color de filas
      if (filaIndex % 2 === 0) {
        doc.rect(50, filaY - 5, 495, 20).fill(CREMA);
      }

      const ivaPorItem = (item.subtotal / (1 + item.tasaIVA)) * item.tasaIVA;

      doc.fillColor(NEGRO).font('Helvetica').fontSize(9);
      doc.text(item.nombreProducto.substring(0, 35), 60, filaY)
        .text(String(item.cantidad), 300, filaY)
        .text(`Gs. ${item.precioUnitario.toLocaleString()}`, 330, filaY)
        .text(`Gs. ${Math.round(ivaPorItem).toLocaleString()}`, 400, filaY)
        .text(`Gs. ${Math.round(item.subtotal).toLocaleString()}`, 455, filaY);

      filaY += 22;
      filaIndex++;
    }

    // ── TOTALES ──
    filaY += 10;
    doc.moveTo(350, filaY).lineTo(545, filaY).stroke('#CCCCCC');
    filaY += 10;

    const formatGs = (n) => `Gs. ${Math.round(n).toLocaleString()}`;

    doc.fillColor(GRIS).fontSize(10).font('Helvetica');
    doc.text('Subtotal (sin IVA):', 350, filaY).text(formatGs(venta.subtotalSinIVA), 455, filaY);
    filaY += 18;
    doc.text('IVA (10%):', 350, filaY).text(formatGs(venta.totalIVA), 455, filaY);

    if (venta.totalDescuentos > 0) {
      filaY += 18;
      doc.fillColor('red').text('Descuentos:', 350, filaY).text(`-${formatGs(venta.totalDescuentos)}`, 455, filaY);
    }

    filaY += 10;
    doc.rect(350, filaY, 195, 28).fill(CAFE);
    doc.fillColor('white').fontSize(13).font('Helvetica-Bold');
    doc.text('TOTAL:', 360, filaY + 8).text(formatGs(venta.total), 455, filaY + 8);

    // ── PIE DE PÁGINA ──
    const pieY = doc.page.height - 80;
    doc.moveTo(50, pieY).lineTo(545, pieY).stroke(CAFE);
    doc.fillColor(GRIS).fontSize(9).font('Helvetica');
    doc.text('Esta factura es un comprobante válido de su compra en Gatocafee.', 50, pieY + 10, { align: 'center', width: 495 });
    doc.text('¡Gracias por elegirnos! Vuelve pronto ☕', 50, pieY + 25, { align: 'center', width: 495 });

    doc.end();

  } catch (error) {
    console.error('Error generando PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, mensaje: 'Error al generar PDF', error: error.message });
    }
  }
};


// ============================================
// GET /api/reportes/ventas/excel
// Exportar reporte de ventas a Excel
// ============================================
exports.exportarVentasExcel = async (req, res) => {
  try {
    const { desde, hasta } = req.query;

    const filtro = { estado: 'completada' };
    if (desde || hasta) {
      filtro.createdAt = {};
      if (desde) filtro.createdAt.$gte = new Date(desde);
      if (hasta) {
        const h = new Date(hasta); h.setHours(23, 59, 59, 999);
        filtro.createdAt.$lte = h;
      }
    }

    const ventas = await Venta.find(filtro)
      .populate('usuario', 'nombre apellido')
      .populate('cliente', 'nombre apellido')
      .sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Gatocafee Sistema';
    workbook.created = new Date();

    // ── HOJA 1: RESUMEN GENERAL ──
    const hoja1 = workbook.addWorksheet('Resumen General');
    hoja1.columns = [
      { header: 'N° Ticket', key: 'ticket', width: 20 },
      { header: 'Fecha', key: 'fecha', width: 18 },
      { header: 'Hora', key: 'hora', width: 10 },
      { header: 'Cajero', key: 'cajero', width: 20 },
      { header: 'Cliente', key: 'cliente', width: 20 },
      { header: 'Canal', key: 'canal', width: 12 },
      { header: 'Turno', key: 'turno', width: 12 },
      { header: 'Método Pago', key: 'metodoPago', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'IVA', key: 'iva', width: 12 },
      { header: 'Total (Gs.)', key: 'total', width: 15 },
      { header: 'Ganancia (Gs.)', key: 'ganancia', width: 15 },
    ];

    // Estilo encabezado
    hoja1.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A2C2A' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { horizontal: 'center' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFD4A88A' } } };
    });

    let filaIndex = 2;
    let totalGeneral = 0, ivaGeneral = 0, gananciaGeneral = 0;

    for (const v of ventas) {
      const fecha = new Date(v.createdAt);
      const cajero = v.usuario ? `${v.usuario.nombre} ${v.usuario.apellido || ''}` : 'Sistema';
      const cliente = v.cliente ? `${v.cliente.nombre}` : v.nombreClienteRapido;

      hoja1.addRow({
        ticket: v.numeroTicket,
        fecha: fecha.toLocaleDateString('es-PY'),
        hora: fecha.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }),
        cajero,
        cliente,
        canal: v.canal,
        turno: v.turno,
        metodoPago: v.metodoPago,
        subtotal: v.subtotalSinIVA,
        iva: v.totalIVA,
        total: v.total,
        ganancia: v.gananciaTotal,
      });

      // Alternar color de filas
      if (filaIndex % 2 === 0) {
        hoja1.getRow(filaIndex).eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5E6D3' } };
        });
      }

      totalGeneral += v.total;
      ivaGeneral += v.totalIVA;
      gananciaGeneral += v.gananciaTotal;
      filaIndex++;
    }

    // Fila de totales
    const filaTotales = hoja1.addRow({
      ticket: 'TOTALES',
      subtotal: ventas.reduce((a, v) => a + v.subtotalSinIVA, 0),
      iva: ivaGeneral,
      total: totalGeneral,
      ganancia: gananciaGeneral,
    });
    filaTotales.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A2C2A' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    // ── HOJA 2: PRODUCTOS MÁS VENDIDOS ──
    const hoja2 = workbook.addWorksheet('Productos Top');
    hoja2.columns = [
      { header: 'Posición', key: 'pos', width: 10 },
      { header: 'Producto', key: 'nombre', width: 30 },
      { header: 'Categoría', key: 'categoria', width: 20 },
      { header: 'Unidades Vendidas', key: 'unidades', width: 20 },
      { header: 'Ingresos (Gs.)', key: 'ingresos', width: 18 },
      { header: 'Precio Venta', key: 'precio', width: 15 },
      { header: 'Costo', key: 'costo', width: 12 },
      { header: 'Margen (Gs.)', key: 'margen', width: 15 },
    ];

    hoja2.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A2C2A' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center' };
    });

    const topProductos = await Producto.find({ totalVendido: { $gt: 0 } })
      .sort({ totalVendido: -1 }).limit(20);

    topProductos.forEach((p, i) => {
      hoja2.addRow({
        pos: i + 1,
        nombre: p.nombre,
        categoria: p.categoria,
        unidades: p.totalVendido,
        ingresos: p.ingresoTotal,
        precio: p.precioVenta,
        costo: p.costoProduccion,
        margen: p.precioVenta - p.costoProduccion,
      });
    });

    // ── HOJA 3: IVA MENSUAL ──
    const hoja3 = workbook.addWorksheet('IVA Mensual');
    hoja3.addRow(['REPORTE DE IVA — GATOCAFEE']).font = { bold: true, size: 14, color: { argb: 'FF4A2C2A' } };
    hoja3.addRow([]);
    hoja3.addRow(['Total IVA del período:', ivaGeneral]);
    hoja3.addRow(['Total ventas:', totalGeneral]);
    hoja3.addRow(['Período:', `${desde || 'inicio'} al ${hasta || 'hoy'}`]);

    // Enviar archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=reporte-ventas-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error generando Excel:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, mensaje: 'Error al generar Excel' });
    }
  }
};


// ============================================
// GET /api/reportes/turno/:turno
// Reporte de ventas por turno (mañana/tarde/noche)
// ============================================
exports.getReporteTurno = async (req, res) => {
  try {
    const { turno } = req.params;
    const { fecha } = req.query;

    if (!['mañana', 'tarde', 'noche'].includes(turno)) {
      return res.status(400).json({ success: false, mensaje: 'Turno inválido. Use: mañana, tarde, noche' });
    }

    const fechaFiltro = fecha ? new Date(fecha) : new Date();
    const inicio = new Date(fechaFiltro); inicio.setHours(0, 0, 0, 0);
    const fin = new Date(fechaFiltro); fin.setHours(23, 59, 59, 999);

    const ventas = await Venta.find({
      turno,
      createdAt: { $gte: inicio, $lte: fin },
      estado: 'completada',
    }).populate('usuario', 'nombre apellido');

    const resumen = {
      turno,
      fecha: fechaFiltro.toLocaleDateString('es-PY'),
      cantidadVentas: ventas.length,
      totalIngresos: ventas.reduce((a, v) => a + v.total, 0),
      totalIVA: ventas.reduce((a, v) => a + v.totalIVA, 0),
      totalGanancia: ventas.reduce((a, v) => a + v.gananciaTotal, 0),
      ticketPromedio: ventas.length > 0
        ? Math.round(ventas.reduce((a, v) => a + v.total, 0) / ventas.length)
        : 0,
      porCanal: {
        mostrador: ventas.filter((v) => v.canal === 'mostrador').length,
        delivery: ventas.filter((v) => v.canal === 'delivery').length,
        online: ventas.filter((v) => v.canal === 'online').length,
      },
      ventas: ventas.map((v) => ({
        ticket: v.numeroTicket,
        hora: new Date(v.createdAt).toLocaleTimeString('es-PY'),
        total: v.total,
        metodoPago: v.metodoPago,
        cajero: v.usuario ? `${v.usuario.nombre}` : 'N/A',
      })),
    };

    res.json({ success: true, reporte: resumen });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al generar reporte de turno' });
  }
};
