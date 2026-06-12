// ============================================
// controllers/financieroController.js
// Punto de Equilibrio, Metas y Promociones
// ============================================

const mongoose = require('mongoose');
const CostoFijo = mongoose.model('CostoFijo');
const MetaMensual = mongoose.model('MetaMensual');
const Venta = require('../models/Venta');
const Producto = require('../models/Producto');

// ============================================
// GET /api/financiero/punto-equilibrio
// Calcular PE = Costos Fijos / (Precio Venta - Costo Variable)
// ============================================
exports.getPuntoEquilibrio = async (req, res) => {
  try {
    const { mes, año } = req.query;
    const mesActual = parseInt(mes) || new Date().getMonth() + 1;
    const añoActual = parseInt(año) || new Date().getFullYear();

    // 1. Obtener costos fijos activos del mes
    const costosFijos = await CostoFijo.find({ activo: true });
    let totalCostosFijos = 0;
    for (const cf of costosFijos) {
      let montoMensual = cf.monto;
      if (cf.frecuencia === 'diario') montoMensual *= 30;
      else if (cf.frecuencia === 'semanal') montoMensual *= 4.33;
      else if (cf.frecuencia === 'anual') montoMensual /= 12;
      totalCostosFijos += montoMensual;
    }

    // 2. Calcular precio de venta promedio y costo variable promedio
    //    usando los productos disponibles
    const productos = await Producto.find({ disponible: true });
    if (productos.length === 0) {
      return res.status(400).json({ success: false, mensaje: 'No hay productos activos para calcular el PE' });
    }

    const precioPromedioVenta = productos.reduce((acc, p) => acc + p.precioVenta, 0) / productos.length;
    const costoVariablePromedio = productos.reduce((acc, p) => acc + p.costoProduccion, 0) / productos.length;
    const margenContribucion = precioPromedioVenta - costoVariablePromedio;

    if (margenContribucion <= 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'El costo variable supera el precio de venta. Revisa los costos.',
      });
    }

    // 3. Fórmula del Punto de Equilibrio
    // PE (unidades) = Costos Fijos / Margen de Contribución
    // PE (ingresos) = Costos Fijos / (1 - Costo Variable / Precio Venta)
    const peUnidades = Math.ceil(totalCostosFijos / margenContribucion);
    const peIngresos = Math.ceil(totalCostosFijos / (1 - costoVariablePromedio / precioPromedioVenta));

    // 4. Ventas reales del mes para comparar
    const inicioMes = new Date(añoActual, mesActual - 1, 1);
    const finMes = new Date(añoActual, mesActual, 0, 23, 59, 59);

    const ventasMes = await Venta.aggregate([
      { $match: { createdAt: { $gte: inicioMes, $lte: finMes }, estado: 'completada' } },
      { $group: { _id: null, totalIngresos: { $sum: '$total' }, cantidad: { $sum: 1 } } },
    ]);

    const ingresosReales = ventasMes[0]?.totalIngresos || 0;
    const unidadesVendidas = ventasMes[0]?.cantidad || 0;

    // 5. Interpretación de zona
    let zona, mensaje;
    if (ingresosReales < peIngresos * 0.8) {
      zona = 'perdida';
      mensaje = `Zona de pérdida. Necesitas Gs. ${(peIngresos - ingresosReales).toLocaleString()} más para alcanzar el equilibrio.`;
    } else if (ingresosReales < peIngresos) {
      zona = 'equilibrio';
      mensaje = `Cerca del equilibrio. Faltan Gs. ${(peIngresos - ingresosReales).toLocaleString()}.`;
    } else {
      zona = 'ganancia';
      mensaje = `Zona de ganancia. Superaste el PE por Gs. ${(ingresosReales - peIngresos).toLocaleString()}.`;
    }

    // 6. PE diario y semanal
    const diasMes = new Date(añoActual, mesActual, 0).getDate();
    const peDiario = Math.ceil(peIngresos / diasMes);
    const peSemanal = Math.ceil(peIngresos / 4.33);

    res.json({
      success: true,
      periodo: { mes: mesActual, año: añoActual },
      costosFijos: {
        total: Math.round(totalCostosFijos),
        detalle: costosFijos.map((cf) => ({ nombre: cf.nombre, monto: cf.monto, frecuencia: cf.frecuencia })),
      },
      promedios: {
        precioVentaPromedio: Math.round(precioPromedioVenta),
        costoVariablePromedio: Math.round(costoVariablePromedio),
        margenContribucion: Math.round(margenContribucion),
        porcentajeMargen: ((margenContribucion / precioPromedioVenta) * 100).toFixed(1) + '%',
      },
      puntoEquilibrio: {
        unidades: peUnidades,
        ingresosMensual: peIngresos,
        ingresosDiario: peDiario,
        ingresosSemanal: peSemanal,
      },
      realMes: {
        ingresos: ingresosReales,
        unidades: unidadesVendidas,
        porcentajeAlcanzado: peIngresos > 0 ? ((ingresosReales / peIngresos) * 100).toFixed(1) + '%' : '0%',
      },
      zona,
      mensaje,
    });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al calcular punto de equilibrio', error: error.message });
  }
};


// ============================================
// CRUD /api/financiero/costos-fijos
// ============================================
exports.getCostosFijos = async (req, res) => {
  try {
    const costos = await CostoFijo.find().sort({ nombre: 1 });
    const totalMensual = costos
      .filter((c) => c.activo)
      .reduce((acc, c) => {
        let m = c.monto;
        if (c.frecuencia === 'diario') m *= 30;
        else if (c.frecuencia === 'semanal') m *= 4.33;
        else if (c.frecuencia === 'anual') m /= 12;
        return acc + m;
      }, 0);

    res.json({ success: true, costos, totalMensualEstimado: Math.round(totalMensual) });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener costos fijos' });
  }
};

exports.crearCostoFijo = async (req, res) => {
  try {
    const costo = await CostoFijo.create(req.body);
    res.status(201).json({ success: true, mensaje: 'Costo fijo registrado', costo });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al crear costo fijo' });
  }
};

exports.actualizarCostoFijo = async (req, res) => {
  try {
    const costo = await CostoFijo.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!costo) return res.status(404).json({ success: false, mensaje: 'Costo no encontrado' });
    res.json({ success: true, costo });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al actualizar costo' });
  }
};

exports.eliminarCostoFijo = async (req, res) => {
  try {
    await CostoFijo.findByIdAndUpdate(req.params.id, { activo: false });
    res.json({ success: true, mensaje: 'Costo desactivado' });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al eliminar costo' });
  }
};


// ============================================
// GET/POST /api/financiero/metas
// Metas mensuales de ventas
// ============================================
exports.getMetas = async (req, res) => {
  try {
    // Asegurar que el _id esté incluido en la serialización
    const metas = await MetaMensual.find().sort({ año: -1, mes: -1 }).limit(12).select('+_id');
    // Mongoose incluye _id por defecto, pero en algunos flujos de restore el objeto puede perderlo
    // Normalizar para asegurar que cada meta tenga el campo `_id` y también `id` para compatibilidad frontend
    const metasNormalized = metas.map((m) => {
      const obj = m.toObject({ getters: true, virtuals: false });
      if (!obj._id && obj.id) obj._id = obj.id;
      if (!obj.id && obj._id) obj.id = String(obj._id);
      return obj;
    });
    res.json({ success: true, metas: metasNormalized });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener metas' });
  }
};

exports.crearOMeta = async (req, res) => {
  try {
    const { mes, año, metaVentas, metaCantidadVentas, notas } = req.body;

    // Calcular ventas actuales del mes
    const inicioMes = new Date(año, mes - 1, 1);
    const finMes = new Date(año, mes, 0, 23, 59, 59);
    const ventasMes = await Venta.aggregate([
      { $match: { createdAt: { $gte: inicioMes, $lte: finMes }, estado: 'completada' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    const ventasActuales = ventasMes[0]?.total || 0;
    const porcentajeCumplido = metaVentas > 0 ? (ventasActuales / metaVentas) * 100 : 0;

    // Upsert: crear o actualizar si ya existe para ese mes/año
    const meta = await MetaMensual.findOneAndUpdate(
      { mes, año },
      {
        mes, año, metaVentas, metaCantidadVentas, notas,
        ventasActuales, porcentajeCumplido,
        creadoPor: req.usuario._id,
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json({
      success: true,
      mensaje: 'Meta guardada correctamente',
      meta,
      progreso: {
        ventasActuales,
        metaVentas,
        porcentajeCumplido: porcentajeCumplido.toFixed(1) + '%',
        restante: Math.max(0, metaVentas - ventasActuales),
        estado: porcentajeCumplido >= 100 ? '🏆 Meta alcanzada' : porcentajeCumplido >= 75 ? '🔥 Muy cerca' : '📈 En progreso',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al guardar meta', error: error.message });
  }
};

// PUT /api/financiero/metas/:id
exports.actualizarMeta = async (req, res) => {
  try {
    const { id } = req.params;
    const { mes, año, metaVentas, metaCantidadVentas, notas } = req.body;

    // Recalcular ventas actuales del mes indicado
    const inicioMes = new Date(año, mes - 1, 1);
    const finMes = new Date(año, mes, 0, 23, 59, 59);
    const ventasMes = await Venta.aggregate([
      { $match: { createdAt: { $gte: inicioMes, $lte: finMes }, estado: 'completada' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    const ventasActuales = ventasMes[0]?.total || 0;
    const porcentajeCumplido = metaVentas > 0 ? (ventasActuales / metaVentas) * 100 : 0;

    const meta = await MetaMensual.findByIdAndUpdate(
      id,
      { mes, año, metaVentas, metaCantidadVentas, notas, ventasActuales, porcentajeCumplido, creadoPor: req.usuario._id },
      { new: true, runValidators: true }
    );

    if (!meta) return res.status(404).json({ success: false, mensaje: 'Meta no encontrada' });

    res.json({ success: true, mensaje: 'Meta actualizada', meta, progreso: { ventasActuales, metaVentas, porcentajeCumplido: porcentajeCumplido.toFixed(1) + '%' } });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al actualizar meta', error: error.message });
  }
};

// DELETE /api/financiero/metas/:id
exports.eliminarMeta = async (req, res) => {
  try {
    const { id } = req.params;
    const meta = await MetaMensual.findByIdAndDelete(id);
    if (!meta) return res.status(404).json({ success: false, mensaje: 'Meta no encontrada' });
    res.json({ success: true, mensaje: 'Meta eliminada' });
  } catch (error) {
    console.error('Error en eliminarMeta:', error);
    res.status(500).json({ success: false, mensaje: 'Error al eliminar meta', error: error.message });
  }
};

// DELETE /api/financiero/metas/por-mes
// Elimina una meta identificada por mes+año (fallback cuando _id no está presente)
exports.eliminarMetaPorMes = async (req, res) => {
  try {
    console.log('eliminarMetaPorMes req.body:', req.body);
    console.log('Authorization header present:', !!req.headers && !!req.headers.authorization);
    console.log('req.usuario:', req.usuario ? { id: req.usuario._id, rol: req.usuario.rol } : null);

    const body = req.body || {};
    const mesRaw = body.mes ?? body.month ?? req.query?.mes;
    const añoRaw = body['año'] ?? body.anio ?? body.year ?? req.query?.['año'] ?? req.query?.anio ?? req.query?.year;

    if (!mesRaw || !añoRaw) {
      return res.status(400).json({ success: false, mensaje: 'mes y año son requeridos' });
    }

    const mesNum = parseInt(mesRaw, 10);
    const añoNum = parseInt(añoRaw, 10);

    if (isNaN(mesNum) || isNaN(añoNum)) {
      return res.status(400).json({ success: false, mensaje: 'mes y año deben ser números válidos' });
    }

    console.log('eliminarMetaPorMes parsed:', { mes: mesNum, año: añoNum });

    const meta = await MetaMensual.findOneAndDelete({ mes: mesNum, año: añoNum });
    if (!meta) {
      console.log('eliminarMetaPorMes: no se encontró meta para', { mes: mesNum, año: añoNum });
      return res.json({ success: true, mensaje: 'Meta no encontrada (ninguna acción requerida)' });
    }
    res.json({ success: true, mensaje: 'Meta eliminada', meta });
  } catch (error) {
    console.error('Error en eliminarMetaPorMes:', error.stack || error);
    res.status(500).json({ success: false, mensaje: 'Error al eliminar meta', error: error.message });
  }
};

// GET /api/financiero/metas/:id (público, permite comprobar existencia desde frontend sin auth)
exports.getMetaPublic = async (req, res) => {
  try {
    const { id } = req.params;
    const meta = await MetaMensual.findById(id).select('mes año metaVentas ventasActuales porcentajeCumplido notas');
    if (!meta) return res.status(404).json({ success: false, mensaje: 'Meta no encontrada' });
    res.json({ success: true, meta });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener meta', error: error.message });
  }
};


// ============================================
// GET /api/financiero/dashboard
// KPIs para el dashboard ejecutivo
// ============================================
exports.getDashboard = async (req, res) => {
  try {
    const hoy = new Date();
    const inicioDia = new Date(hoy); inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(hoy); finDia.setHours(23, 59, 59, 999);
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const [ventasHoy, ventasMes, productoEstrella, clienteFrecuente] = await Promise.all([
      // Ventas del día
      Venta.aggregate([
        { $match: { createdAt: { $gte: inicioDia, $lte: finDia }, estado: 'completada' } },
        { $group: { _id: null, total: { $sum: '$total' }, ganancia: { $sum: '$gananciaTotal' }, cantidad: { $sum: 1 } } },
      ]),

      // Ventas del mes
      Venta.aggregate([
        { $match: { createdAt: { $gte: inicioMes }, estado: 'completada' } },
        { $group: { _id: null, total: { $sum: '$total' }, ganancia: { $sum: '$gananciaTotal' }, cantidad: { $sum: 1 } } },
      ]),

      // Producto estrella del mes
      Producto.findOne({ totalVendido: { $gt: 0 } }).sort({ totalVendido: -1 }).select('nombre totalVendido'),

      // Cliente más frecuente
      mongoose.model('Cliente').findOne({ totalCompras: { $gt: 0 } }).sort({ totalGastado: -1 }).select('nombre apellido totalCompras totalGastado'),
    ]);

    // Stock crítico
    const Inventario = mongoose.model('Inventario');
    const stockCritico = await Inventario.countDocuments({ estado: { $in: ['critico', 'agotado'] } });

    // Meta del mes actual
    const meta = await MetaMensual.findOne({ mes: hoy.getMonth() + 1, año: hoy.getFullYear() });
    const totalMes = ventasMes[0]?.total || 0;
    const ticketPromedioMes = ventasMes[0]?.cantidad > 0 ? Math.round(totalMes / ventasMes[0].cantidad) : 0;

    res.json({
      success: true,
      kpis: {
        ventasHoy: {
          total: ventasHoy[0]?.total || 0,
          cantidad: ventasHoy[0]?.cantidad || 0,
          ganancia: ventasHoy[0]?.ganancia || 0,
        },
        ventasMes: {
          total: totalMes,
          cantidad: ventasMes[0]?.cantidad || 0,
          ganancia: ventasMes[0]?.ganancia || 0,
        },
        ticketPromedio: ticketPromedioMes,
        productoEstrella: productoEstrella
          ? { nombre: productoEstrella.nombre, unidadesVendidas: productoEstrella.totalVendido }
          : null,
        clienteFrecuente: clienteFrecuente
          ? { nombre: `${clienteFrecuente.nombre} ${clienteFrecuente.apellido || ''}`, totalGastado: clienteFrecuente.totalGastado }
          : null,
        stockCritico,
        meta: meta
          ? { metaVentas: meta.metaVentas, porcentajeCumplido: ((totalMes / meta.metaVentas) * 100).toFixed(1) }
          : null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener dashboard', error: error.message });
  }
};
