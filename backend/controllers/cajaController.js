// ============================================
// controllers/cajaController.js
// Arqueo de caja: apertura, cierre y diferencias
// ============================================

const mongoose = require('mongoose');
const ArqueoCaja = mongoose.model('ArqueoCaja');
const Venta = require('../models/Venta');
const { registrarAuditoria } = require('../utils/auditoria');

// ============================================
// POST /api/caja/abrir
// Apertura de turno de caja
// ============================================
exports.abrirCaja = async (req, res) => {
  try {
    const { montoApertura, turno, observaciones } = req.body;

    if (montoApertura === undefined || montoApertura < 0) {
      return res.status(400).json({ success: false, mensaje: 'El monto de apertura es obligatorio (puede ser 0)' });
    }

    // Verificar si ya hay una caja abierta para este turno hoy
    const hoy = new Date();
    const inicioDia = new Date(hoy.setHours(0, 0, 0, 0));
    const cajaAbierta = await ArqueoCaja.findOne({
      estado: 'abierto',
      fecha: { $gte: inicioDia },
    });

    if (cajaAbierta) {
      return res.status(400).json({
        success: false,
        mensaje: 'Ya existe una caja abierta para hoy. Ciérrala primero.',
        cajaId: cajaAbierta._id,
      });
    }

    // Calcular turno automático si no se especifica
    let turnoCalculado = turno;
    if (!turnoCalculado) {
      const hora = new Date().getHours();
      if (hora >= 6 && hora < 13) turnoCalculado = 'mañana';
      else if (hora >= 13 && hora < 19) turnoCalculado = 'tarde';
      else turnoCalculado = 'noche';
    }

    const caja = await ArqueoCaja.create({
      fecha: new Date(),
      turno: turnoCalculado,
      usuarioApertura: req.usuario._id,
      montoApertura: parseFloat(montoApertura),
      horaApertura: new Date(),
      observacionesApertura: observaciones,
      estado: 'abierto',
    });

    await registrarAuditoria({
      usuarioId: req.usuario._id,
      accion: 'APERTURA_CAJA',
      modulo: 'caja',
      descripcion: `Caja abierta con Gs. ${montoApertura.toLocaleString()} — Turno: ${turnoCalculado}`,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      mensaje: `✅ Caja abierta correctamente — Turno ${turnoCalculado}`,
      caja,
    });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al abrir caja', error: error.message });
  }
};


// ============================================
// POST /api/caja/:id/cerrar
// Cierre de turno con cálculo de diferencias
// ============================================
exports.cerrarCaja = async (req, res) => {
  try {
    const { montoCierre, observaciones } = req.body;

    if (montoCierre === undefined || montoCierre < 0) {
      return res.status(400).json({ success: false, mensaje: 'El monto de cierre es obligatorio' });
    }

    const caja = await ArqueoCaja.findById(req.params.id);
    if (!caja) return res.status(404).json({ success: false, mensaje: 'Caja no encontrada' });
    if (caja.estado === 'cerrado') {
      return res.status(400).json({ success: false, mensaje: 'Esta caja ya fue cerrada' });
    }

    // Calcular ventas del turno desde la apertura
    const ventas = await Venta.find({
      arqueoCaja: caja._id,
      estado: 'completada',
    });

    // Si no se asignó arqueoCaja en ventas, buscar por rango de tiempo
    const ventasPorHora = ventas.length > 0 ? ventas : await Venta.find({
      createdAt: { $gte: caja.horaApertura, $lte: new Date() },
      estado: 'completada',
    });

    const totalesVentas = ventasPorHora.reduce((acc, v) => {
      acc.total += v.total;
      acc.efectivo += v.metodoPago === 'efectivo' ? v.total : 0;
      acc.tarjeta += v.metodoPago === 'tarjeta' ? v.total : 0;
      acc.transferencia += v.metodoPago === 'transferencia' ? v.total : 0;
      acc.qr += v.metodoPago === 'qr' ? v.total : 0;
      acc.cantidad += 1;
      return acc;
    }, { total: 0, efectivo: 0, tarjeta: 0, transferencia: 0, qr: 0, cantidad: 0 });

    // Diferencia: lo que debería haber en caja vs lo que hay físicamente
    // Caja esperada = Apertura + Ventas en efectivo
    const cajaEsperada = caja.montoApertura + totalesVentas.efectivo;
    const diferencia = parseFloat(montoCierre) - cajaEsperada;

    // Actualizar el arqueo
    caja.usuarioCierre = req.usuario._id;
    caja.montoCierre = parseFloat(montoCierre);
    caja.horaCierre = new Date();
    caja.observacionesCierre = observaciones;
    caja.totalVentasEfectivo = totalesVentas.efectivo;
    caja.totalVentasTarjeta = totalesVentas.tarjeta;
    caja.totalVentasTransferencia = totalesVentas.transferencia;
    caja.totalVentasQR = totalesVentas.qr;
    caja.totalVentas = totalesVentas.total;
    caja.cantidadVentas = totalesVentas.cantidad;
    caja.diferencia = diferencia;
    caja.estado = 'cerrado';
    await caja.save();

    await registrarAuditoria({
      usuarioId: req.usuario._id,
      accion: 'CIERRE_CAJA',
      modulo: 'caja',
      descripcion: `Caja cerrada. Total ventas: Gs. ${totalesVentas.total.toLocaleString()}. Diferencia: Gs. ${diferencia.toLocaleString()}`,
      ip: req.ip,
    });

    res.json({
      success: true,
      mensaje: 'Caja cerrada correctamente',
      resumen: {
        turno: caja.turno,
        apertura: { monto: caja.montoApertura, hora: caja.horaApertura },
        cierre: { monto: parseFloat(montoCierre), hora: caja.horaCierre },
        ventas: {
          cantidad: totalesVentas.cantidad,
          total: totalesVentas.total,
          porMetodo: {
            efectivo: totalesVentas.efectivo,
            tarjeta: totalesVentas.tarjeta,
            transferencia: totalesVentas.transferencia,
            qr: totalesVentas.qr,
          },
        },
        cajaEsperada: Math.round(cajaEsperada),
        diferencia: Math.round(diferencia),
        estadoDiferencia:
          diferencia === 0 ? '✅ Sin diferencia'
          : diferencia > 0 ? `⬆️ Sobrante: Gs. ${Math.abs(diferencia).toLocaleString()}`
          : `⬇️ Faltante: Gs. ${Math.abs(diferencia).toLocaleString()}`,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al cerrar caja', error: error.message });
  }
};


// ============================================
// GET /api/caja/actual
// Obtener la caja abierta actual
// ============================================
exports.getCajaActual = async (req, res) => {
  try {
    const hoy = new Date();
    const inicioDia = new Date(hoy.setHours(0, 0, 0, 0));

    const caja = await ArqueoCaja.findOne({
      estado: 'abierto',
      fecha: { $gte: inicioDia },
    }).populate('usuarioApertura', 'nombre apellido');

    if (!caja) {
      return res.json({ success: true, cajaAbierta: false, mensaje: 'No hay caja abierta. Debes abrir una.' });
    }

    // Ventas parciales del turno actual
    const ventasParciales = await Venta.aggregate([
      { $match: { createdAt: { $gte: caja.horaApertura }, estado: 'completada' } },
      { $group: { _id: null, total: { $sum: '$total' }, cantidad: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      cajaAbierta: true,
      caja,
      ventasParciales: {
        total: ventasParciales[0]?.total || 0,
        cantidad: ventasParciales[0]?.cantidad || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener estado de caja' });
  }
};


// ============================================
// GET /api/caja/historial
// Historial de cierres de caja
// ============================================
exports.getHistorial = async (req, res) => {
  try {
    const { desde, hasta, page = 1, limit = 10 } = req.query;
    const filtro = { estado: 'cerrado' };

    if (desde || hasta) {
      filtro.fecha = {};
      if (desde) filtro.fecha.$gte = new Date(desde);
      if (hasta) filtro.fecha.$lte = new Date(hasta);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await ArqueoCaja.countDocuments(filtro);
    const arqueos = await ArqueoCaja.find(filtro)
      .populate('usuarioApertura', 'nombre apellido')
      .populate('usuarioCierre', 'nombre apellido')
      .sort({ fecha: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, total, pagina: parseInt(page), arqueos });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener historial de caja' });
  }
};
