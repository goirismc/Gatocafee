// ============================================
// controllers/ventasController.js
// Registro de ventas, tickets, IVA y devoluciones
// ============================================

const mongoose = require('mongoose');
const Venta = require('../models/Venta');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const { registrarAuditoria } = require('../utils/auditoria');
const { generarTicketTexto } = require('../utils/ticket');

// ============================================
// POST /api/ventas
// Registrar nueva venta (corazón del sistema)
// ============================================
exports.crearVenta = async (req, res) => {
  // Usamos sesión de Mongoose para transacción atómica
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      items,          // [{ productoId, cantidad, descuento }]
      clienteId,
      nombreClienteRapido,
      metodoPago,
      montoPagado,
      canal,
      codigoCupon,
      arqueoCajaId,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, mensaje: 'La venta debe tener al menos un producto' });
    }

    // ── PASO 1: Validar y enriquecer cada ítem ──
    let itemsCompletos = [];
    let subtotalSinIVA = 0;
    let totalIVA = 0;
    let totalDescuentos = 0;
    let costoTotal = 0;

    for (const item of items) {
      const producto = await Producto.findById(item.productoId).session(session);

      if (!producto) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, mensaje: `Producto ${item.productoId} no encontrado` });
      }

      if (!producto.disponible) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, mensaje: `"${producto.nombre}" no está disponible` });
      }

      const cantidad = parseInt(item.cantidad) || 1;
      const descuentoItem = item.descuento || 0;
      const subtotalItem = (producto.precioVenta * cantidad) - descuentoItem;

      // Calcular IVA por ítem (precio ya incluye IVA en Paraguay)
      // IVA incluido = Precio / (1 + tasa) * tasa
      const ivaItem = (subtotalItem / (1 + producto.tasaIVA)) * producto.tasaIVA;
      const precioSinIVA = subtotalItem - ivaItem;

      subtotalSinIVA += precioSinIVA;
      totalIVA += ivaItem;
      totalDescuentos += descuentoItem;
      costoTotal += producto.costoProduccion * cantidad;

      itemsCompletos.push({
        producto: producto._id,
        nombreProducto: producto.nombre,
        categoria: producto.categoria,
        cantidad,
        precioUnitario: producto.precioVenta,
        costoUnitario: producto.costoProduccion,
        tasaIVA: producto.tasaIVA,
        descuento: descuentoItem,
        subtotal: subtotalItem,
      });
    }

    const total = subtotalSinIVA + totalIVA; // = suma de subtotales
    const gananciaTotal = total - costoTotal;

    // ── PASO 2: Calcular cambio si es efectivo ──
    let cambio = 0;
    if (metodoPago === 'efectivo' && montoPagado) {
      cambio = montoPagado - total;
      if (cambio < 0) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, mensaje: 'El monto pagado es insuficiente' });
      }
    }

    // ── PASO 3: Crear la venta ──
    const [venta] = await Venta.create(
      [
        {
          usuario: req.usuario._id,
          cliente: clienteId || null,
          nombreClienteRapido: nombreClienteRapido || 'Consumidor Final',
          items: itemsCompletos,
          subtotalSinIVA: Math.round(subtotalSinIVA),
          totalIVA: Math.round(totalIVA),
          totalDescuentos,
          total: Math.round(total),
          costoTotal: Math.round(costoTotal),
          gananciaTotal: Math.round(gananciaTotal),
          metodoPago,
          montoPagado: montoPagado || total,
          cambio: Math.round(cambio),
          canal: canal || 'mostrador',
          codigoCupon,
          arqueoCaja: arqueoCajaId || null,
        },
      ],
      { session }
    );

    // ── PASO 4: Actualizar estadísticas de productos ──
    for (const item of itemsCompletos) {
      await Producto.findByIdAndUpdate(
        item.producto,
        {
          $inc: {
            totalVendido: item.cantidad,
            ingresoTotal: item.subtotal,
          },
        },
        { session }
      );
    }

    // ── PASO 5: Actualizar cliente si existe ──
    if (clienteId) {
      await Cliente.findByIdAndUpdate(
        clienteId,
        {
          $inc: { totalCompras: 1, totalGastado: total, puntos: Math.floor(total / 1000) },
          $set: { ultimaCompra: new Date() },
        },
        { session }
      );
    }

    // ── PASO 6: Confirmar transacción ──
    await session.commitTransaction();

    // Auditoría (fuera de transacción)
    await registrarAuditoria({
      usuarioId: req.usuario._id,
      accion: 'CREAR_VENTA',
      modulo: 'ventas',
      descripcion: `Venta ${venta.numeroTicket} por Gs. ${total.toLocaleString()}`,
      datosDespues: { ticket: venta.numeroTicket, total, items: items.length },
      ip: req.ip,
    });

    // Generar texto del ticket
    const ventaPopulada = await Venta.findById(venta._id).populate('usuario', 'nombre apellido').populate('cliente', 'nombre apellido');
    const ticket = generarTicketTexto(ventaPopulada);

    res.status(201).json({
      success: true,
      mensaje: 'Venta registrada correctamente',
      venta: {
        id: venta._id,
        numeroTicket: venta.numeroTicket,
        total: venta.total,
        totalIVA: venta.totalIVA,
        cambio: venta.cambio,
        turno: venta.turno,
        createdAt: venta.createdAt,
      },
      ticket, // Texto del ticket para imprimir
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error al crear venta:', error);
    res.status(500).json({ success: false, mensaje: 'Error al registrar venta', error: error.message });
  } finally {
    session.endSession();
  }
};


// ============================================
// GET /api/ventas
// Listar ventas con filtros y paginación
// ============================================
exports.getVentas = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      desde,
      hasta,
      canal,
      metodoPago,
      turno,
      estado,
      usuarioId,
    } = req.query;

    const filtro = {};
    if (canal) filtro.canal = canal;
    if (metodoPago) filtro.metodoPago = metodoPago;
    if (turno) filtro.turno = turno;
    if (estado) filtro.estado = estado;
    if (usuarioId) filtro.usuario = usuarioId;

    // Filtro por rango de fechas
    if (desde || hasta) {
      filtro.createdAt = {};
      if (desde) filtro.createdAt.$gte = new Date(desde);
      if (hasta) {
        const hastaFin = new Date(hasta);
        hastaFin.setHours(23, 59, 59, 999);
        filtro.createdAt.$lte = hastaFin;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Venta.countDocuments(filtro);

    const ventas = await Venta.find(filtro)
      .populate('usuario', 'nombre apellido')
      .populate('cliente', 'nombre apellido email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      total,
      pagina: parseInt(page),
      totalPaginas: Math.ceil(total / parseInt(limit)),
      ventas,
    });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener ventas' });
  }
};


// ============================================
// GET /api/ventas/:id
// Obtener venta con detalle completo
// ============================================
exports.getVenta = async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id)
      .populate('usuario', 'nombre apellido')
      .populate('cliente', 'nombre apellido email telefono')
      .populate('items.producto', 'nombre categoria imagen');

    if (!venta) return res.status(404).json({ success: false, mensaje: 'Venta no encontrada' });

    const ticket = generarTicketTexto(venta);
    res.json({ success: true, venta, ticket });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener venta' });
  }
};


// ============================================
// POST /api/ventas/:id/devolucion
// Registrar devolución de venta
// ============================================
exports.registrarDevolucion = async (req, res) => {
  try {
    const { motivo } = req.body;

    if (!motivo) {
      return res.status(400).json({ success: false, mensaje: 'El motivo de devolución es obligatorio' });
    }

    const venta = await Venta.findById(req.params.id);

    if (!venta) return res.status(404).json({ success: false, mensaje: 'Venta no encontrada' });
    if (venta.estado !== 'completada') {
      return res.status(400).json({ success: false, mensaje: 'Solo se pueden devolver ventas completadas' });
    }

    // Actualizar estado de la venta
    venta.estado = 'devuelta';
    venta.motivoDevolucion = motivo;
    venta.fechaDevolucion = new Date();
    venta.usuarioDevolucion = req.usuario._id;
    await venta.save();

    // Revertir estadísticas de productos
    for (const item of venta.items) {
      await Producto.findByIdAndUpdate(item.producto, {
        $inc: {
          totalVendido: -item.cantidad,
          ingresoTotal: -item.subtotal,
        },
      });
    }

    // Revertir puntos del cliente
    if (venta.cliente) {
      await Cliente.findByIdAndUpdate(venta.cliente, {
        $inc: {
          totalCompras: -1,
          totalGastado: -venta.total,
          puntos: -Math.floor(venta.total / 1000),
        },
      });
    }

    await registrarAuditoria({
      usuarioId: req.usuario._id,
      accion: 'DEVOLUCION_VENTA',
      modulo: 'ventas',
      descripcion: `Devolución de ${venta.numeroTicket}: ${motivo}`,
      ip: req.ip,
    });

    res.json({ success: true, mensaje: 'Devolución registrada. Inventario e historial actualizados.', venta });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al registrar devolución' });
  }
};


// ============================================
// GET /api/ventas/resumen/hoy
// Resumen de ventas del día actual
// ============================================
exports.getResumenHoy = async (req, res) => {
  try {
    const hoy = new Date();
    const inicioDia = new Date(hoy.setHours(0, 0, 0, 0));
    const finDia = new Date(hoy.setHours(23, 59, 59, 999));

    const ventas = await Venta.find({
      createdAt: { $gte: inicioDia, $lte: finDia },
      estado: 'completada',
    });

    const resumen = {
      totalVentas: ventas.length,
      totalIngresos: ventas.reduce((acc, v) => acc + v.total, 0),
      totalIVA: ventas.reduce((acc, v) => acc + v.totalIVA, 0),
      totalGanancia: ventas.reduce((acc, v) => acc + v.gananciaTotal, 0),
      ticketPromedio: ventas.length > 0
        ? Math.round(ventas.reduce((acc, v) => acc + v.total, 0) / ventas.length)
        : 0,
      // Por canal
      porCanal: {
        mostrador: ventas.filter((v) => v.canal === 'mostrador').reduce((acc, v) => acc + v.total, 0),
        delivery: ventas.filter((v) => v.canal === 'delivery').reduce((acc, v) => acc + v.total, 0),
        online: ventas.filter((v) => v.canal === 'online').reduce((acc, v) => acc + v.total, 0),
      },
      // Por método de pago
      porMetodoPago: {
        efectivo: ventas.filter((v) => v.metodoPago === 'efectivo').reduce((acc, v) => acc + v.total, 0),
        tarjeta: ventas.filter((v) => v.metodoPago === 'tarjeta').reduce((acc, v) => acc + v.total, 0),
        transferencia: ventas.filter((v) => v.metodoPago === 'transferencia').reduce((acc, v) => acc + v.total, 0),
        qr: ventas.filter((v) => v.metodoPago === 'qr').reduce((acc, v) => acc + v.total, 0),
      },
      // Por turno
      porTurno: {
        mañana: ventas.filter((v) => v.turno === 'mañana').reduce((acc, v) => acc + v.total, 0),
        tarde: ventas.filter((v) => v.turno === 'tarde').reduce((acc, v) => acc + v.total, 0),
        noche: ventas.filter((v) => v.turno === 'noche').reduce((acc, v) => acc + v.total, 0),
      },
    };

    res.json({ success: true, fecha: new Date().toISOString().slice(0, 10), resumen });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener resumen' });
  }
};


// ============================================
// GET /api/ventas/horas-pico
// Análisis de ventas por hora del día
// ============================================
exports.getHorasPico = async (req, res) => {
  try {
    const { dias = 7 } = req.query;
    const desde = new Date();
    desde.setDate(desde.getDate() - parseInt(dias));

    const resultado = await Venta.aggregate([
      {
        $match: {
          createdAt: { $gte: desde },
          estado: 'completada',
        },
      },
      {
        $group: {
          _id: { $hour: { date: '$createdAt', timezone: 'America/Asuncion' } },
          totalVentas: { $sum: 1 },
          totalIngresos: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Llenar horas vacías con 0
    const horasPico = Array.from({ length: 24 }, (_, hora) => {
      const encontrado = resultado.find((r) => r._id === hora);
      return {
        hora: `${String(hora).padStart(2, '0')}:00`,
        ventas: encontrado ? encontrado.totalVentas : 0,
        ingresos: encontrado ? encontrado.totalIngresos : 0,
      };
    });

    res.json({ success: true, periodo: `Últimos ${dias} días`, horasPico });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener horas pico' });
  }
};


// ============================================
// GET /api/ventas/comparacion
// Comparación semanal y mensual
// ============================================
exports.getComparacion = async (req, res) => {
  try {
    const ahora = new Date();

    // Esta semana vs semana anterior
    const inicioEstaSemana = new Date(ahora);
    inicioEstaSemana.setDate(ahora.getDate() - ahora.getDay());
    inicioEstaSemana.setHours(0, 0, 0, 0);

    const inicioSemanaAnterior = new Date(inicioEstaSemana);
    inicioSemanaAnterior.setDate(inicioEstaSemana.getDate() - 7);
    const finSemanaAnterior = new Date(inicioEstaSemana);
    finSemanaAnterior.setMilliseconds(-1);

    // Este mes vs mes anterior
    const inicioEsteMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59);

    const [estaSemana, semanaAnterior, esteMes, mesAnterior] = await Promise.all([
      Venta.aggregate([
        { $match: { createdAt: { $gte: inicioEstaSemana }, estado: 'completada' } },
        { $group: { _id: null, total: { $sum: '$total' }, cantidad: { $sum: 1 } } },
      ]),
      Venta.aggregate([
        { $match: { createdAt: { $gte: inicioSemanaAnterior, $lte: finSemanaAnterior }, estado: 'completada' } },
        { $group: { _id: null, total: { $sum: '$total' }, cantidad: { $sum: 1 } } },
      ]),
      Venta.aggregate([
        { $match: { createdAt: { $gte: inicioEsteMes }, estado: 'completada' } },
        { $group: { _id: null, total: { $sum: '$total' }, cantidad: { $sum: 1 } } },
      ]),
      Venta.aggregate([
        { $match: { createdAt: { $gte: inicioMesAnterior, $lte: finMesAnterior }, estado: 'completada' } },
        { $group: { _id: null, total: { $sum: '$total' }, cantidad: { $sum: 1 } } },
      ]),
    ]);

    const calcCrecimiento = (actual, anterior) => {
      if (!anterior || anterior === 0) return 100;
      return (((actual - anterior) / anterior) * 100).toFixed(1);
    };

    const totalEstaSemana = estaSemana[0]?.total || 0;
    const totalSemanaAnterior = semanaAnterior[0]?.total || 0;
    const totalEsteMes = esteMes[0]?.total || 0;
    const totalMesAnterior = mesAnterior[0]?.total || 0;

    res.json({
      success: true,
      semanal: {
        estaSemana: { total: totalEstaSemana, cantidad: estaSemana[0]?.cantidad || 0 },
        semanaAnterior: { total: totalSemanaAnterior, cantidad: semanaAnterior[0]?.cantidad || 0 },
        crecimiento: calcCrecimiento(totalEstaSemana, totalSemanaAnterior),
        tendencia: totalEstaSemana >= totalSemanaAnterior ? 'positiva' : 'negativa',
      },
      mensual: {
        esteMes: { total: totalEsteMes, cantidad: esteMes[0]?.cantidad || 0 },
        mesAnterior: { total: totalMesAnterior, cantidad: mesAnterior[0]?.cantidad || 0 },
        crecimiento: calcCrecimiento(totalEsteMes, totalMesAnterior),
        tendencia: totalEsteMes >= totalMesAnterior ? 'positiva' : 'negativa',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al calcular comparación' });
  }
};
