// ============================================
// controllers/inventarioController.js
// Gestión de stock con alertas automáticas
// ============================================

const mongoose = require('mongoose');
const Inventario = mongoose.model('Inventario');
const { registrarAuditoria } = require('../utils/auditoria');

// ============================================
// GET /api/inventario
// Listar todo el inventario con estados de alerta
// ============================================
exports.getInventario = async (req, res) => {
  try {
    const { estado, categoria } = req.query;
    const filtro = {};
    if (estado) filtro.estado = estado;
    if (categoria) filtro.categoria = categoria;

    const items = await Inventario.find(filtro).sort({ estado: 1, nombre: 1 });

    // Resumen de alertas
    const alertas = {
      agotado: items.filter((i) => i.estado === 'agotado').length,
      critico: items.filter((i) => i.estado === 'critico').length,
      bajo: items.filter((i) => i.estado === 'bajo').length,
      ok: items.filter((i) => i.estado === 'ok').length,
    };

    res.json({ success: true, total: items.length, alertas, inventario: items });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener inventario' });
  }
};


// ============================================
// GET /api/inventario/alertas
// Solo ítems con stock bajo o crítico
// ============================================
exports.getAlertas = async (req, res) => {
  try {
    const alertas = await Inventario.find({
      estado: { $in: ['bajo', 'critico', 'agotado'] },
    }).sort({ estado: 1, stockActual: 1 });

    res.json({
      success: true,
      hayAlertas: alertas.length > 0,
      total: alertas.length,
      alertas,
    });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener alertas' });
  }
};


// ============================================
// POST /api/inventario
// Agregar nuevo ítem al inventario
// ============================================
exports.crearItem = async (req, res) => {
  try {
    const item = await Inventario.create(req.body);

    await registrarAuditoria({
      usuarioId: req.usuario._id,
      accion: 'CREAR_INVENTARIO',
      modulo: 'inventario',
      descripcion: `Insumo creado: ${item.nombre} (${item.stockActual} ${item.unidadMedida})`,
      ip: req.ip,
    });

    res.status(201).json({ success: true, mensaje: 'Insumo agregado al inventario', item });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, mensaje: 'Ya existe un insumo con ese nombre' });
    }
    res.status(500).json({ success: false, mensaje: 'Error al crear insumo' });
  }
};


// ============================================
// PUT /api/inventario/:id
// Actualizar datos del ítem
// ============================================
exports.actualizarItem = async (req, res) => {
  try {
    const item = await Inventario.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!item) return res.status(404).json({ success: false, mensaje: 'Insumo no encontrado' });

    res.json({ success: true, mensaje: 'Insumo actualizado', item });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al actualizar insumo' });
  }
};


// ============================================
// POST /api/inventario/:id/movimiento
// Registrar entrada, salida o ajuste de stock
// ============================================
exports.registrarMovimiento = async (req, res) => {
  try {
    const { tipo, cantidad, motivo } = req.body;

    if (!tipo || !cantidad) {
      return res.status(400).json({ success: false, mensaje: 'Tipo y cantidad son obligatorios' });
    }

    const item = await Inventario.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, mensaje: 'Insumo no encontrado' });

    // Calcular nuevo stock
    let nuevoStock = item.stockActual;
    if (tipo === 'entrada') nuevoStock += parseFloat(cantidad);
    else if (tipo === 'salida') {
      if (parseFloat(cantidad) > item.stockActual) {
        return res.status(400).json({ success: false, mensaje: 'Stock insuficiente para la salida' });
      }
      nuevoStock -= parseFloat(cantidad);
    } else if (tipo === 'ajuste') {
      nuevoStock = parseFloat(cantidad); // Reemplaza el stock
    }

    // Registrar movimiento en el historial
    item.stockActual = nuevoStock;
    item.movimientos.push({
      tipo,
      cantidad: parseFloat(cantidad),
      motivo: motivo || `${tipo} manual`,
      fecha: new Date(),
      usuario: req.usuario._id,
    });
    if (tipo === 'entrada') item.ultimaReposicion = new Date();

    await item.save(); // El pre-save actualiza el estado automáticamente

    await registrarAuditoria({
      usuarioId: req.usuario._id,
      accion: 'MOVIMIENTO_INVENTARIO',
      modulo: 'inventario',
      descripcion: `${tipo.toUpperCase()} de ${cantidad} ${item.unidadMedida} de "${item.nombre}". Nuevo stock: ${nuevoStock}`,
      ip: req.ip,
    });

    res.json({
      success: true,
      mensaje: `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} registrada correctamente`,
      item,
      estadoAlerta: item.estado !== 'ok' ? `⚠️ Stock ${item.estado}: ${nuevoStock} ${item.unidadMedida}` : null,
    });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al registrar movimiento' });
  }
};


// ============================================
// GET /api/inventario/:id/historial
// Ver historial de movimientos de un insumo
// ============================================
exports.getHistorial = async (req, res) => {
  try {
    const item = await Inventario.findById(req.params.id)
      .populate('movimientos.usuario', 'nombre apellido');

    if (!item) return res.status(404).json({ success: false, mensaje: 'Insumo no encontrado' });

    // Ordenar movimientos del más reciente al más antiguo
    const historial = item.movimientos.sort((a, b) => b.fecha - a.fecha);

    res.json({ success: true, nombre: item.nombre, stockActual: item.stockActual, historial });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener historial' });
  }
};


// ============================================
// DELETE /api/inventario/:id
// Eliminar un insumo (hard delete) - requiere admin/gerente
// ============================================
exports.eliminarItem = async (req, res) => {
  try {
    const item = await Inventario.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, mensaje: 'Insumo no encontrado' });

    await Inventario.findByIdAndDelete(req.params.id);

    try {
      await registrarAuditoria({
        usuarioId: req.usuario?._id || null,
        accion: 'ELIMINAR_INVENTARIO',
        modulo: 'inventario',
        descripcion: `Insumo eliminado: ${item.nombre} (id: ${item._id})`,
        ip: req.ip,
      });
    } catch (e) {
      // No bloquear la operación si falla la auditoría
      console.error('Error registrando auditoría eliminarItem:', e && e.message);
    }

    res.json({ success: true, mensaje: 'Insumo eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al eliminar insumo' });
  }
};
