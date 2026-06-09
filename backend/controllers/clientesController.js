// ============================================
// controllers/clientesController.js
// Clientes frecuentes y sistema de fidelización
// ============================================

const mongoose = require('mongoose');
const Cliente = mongoose.model('Cliente');
const Venta = require('../models/Venta');

// ============================================
// GET /api/clientes
// Listar clientes con búsqueda
// ============================================
exports.getClientes = async (req, res) => {
  try {
    const { search, nivel, page = 1, limit = 20 } = req.query;

    const filtro = { activo: true };
    if (nivel) filtro.nivel = nivel;
    if (search) {
      filtro.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { telefono: { $regex: search, $options: 'i' } },
        { ci_ruc: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Cliente.countDocuments(filtro);
    const clientes = await Cliente.find(filtro)
      .sort({ totalGastado: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, total, pagina: parseInt(page), clientes });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener clientes' });
  }
};


// ============================================
// POST /api/clientes
// Registrar nuevo cliente
// ============================================
exports.crearCliente = async (req, res) => {
  try {
    const cliente = await Cliente.create({
      ...req.body,
      primeraCompra: new Date(),
    });

    res.status(201).json({
      success: true,
      mensaje: `Cliente ${cliente.nombre} registrado en el sistema de fidelización`,
      cliente,
    });
  } catch (error) {
    if (error.code === 11000) {
      // Obtener el campo duplicado y generar mensaje claro
      const campo = error.keyValue ? Object.keys(error.keyValue)[0] : 'campo';
      return res.status(400).json({ success: false, mensaje: `Ya existe un cliente con ese ${campo}` });
    }
    res.status(500).json({ success: false, mensaje: 'Error al crear cliente' });
  }
};


// ============================================
// GET /api/clientes/:id
// Perfil completo del cliente con historial
// ============================================
exports.getCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) return res.status(404).json({ success: false, mensaje: 'Cliente no encontrado' });

    // Últimas 10 compras del cliente
    const ultimasCompras = await Venta.find({
      cliente: cliente._id,
      estado: 'completada',
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('numeroTicket total metodoPago canal createdAt items');

    res.json({ success: true, cliente, ultimasCompras });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener cliente' });
  }
};


// ============================================
// PUT /api/clientes/:id
// Actualizar datos del cliente
// ============================================
exports.actualizarCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!cliente) return res.status(404).json({ success: false, mensaje: 'Cliente no encontrado' });

    res.json({ success: true, mensaje: 'Cliente actualizado', cliente });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al actualizar cliente' });
  }
};


// ============================================
// GET /api/clientes/frecuentes/top
// Top clientes más frecuentes
// ============================================
exports.getClientesFrecuentes = async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 10;

    const clientes = await Cliente.find({ activo: true, totalCompras: { $gt: 0 } })
      .sort({ totalGastado: -1 })
      .limit(limite)
      .select('nombre apellido email telefono totalCompras totalGastado puntos nivel ultimaCompra');

    // Actualizar nivel de fidelización automáticamente
    for (const cliente of clientes) {
      let nivelNuevo = 'bronce';
      if (cliente.totalGastado >= 5000000) nivelNuevo = 'platinum';
      else if (cliente.totalGastado >= 2000000) nivelNuevo = 'oro';
      else if (cliente.totalGastado >= 500000) nivelNuevo = 'plata';

      if (cliente.nivel !== nivelNuevo) {
        await Cliente.findByIdAndUpdate(cliente._id, { nivel: nivelNuevo });
        cliente.nivel = nivelNuevo;
      }
    }

    res.json({ success: true, total: clientes.length, clientes });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener clientes frecuentes' });
  }
};


// ============================================
// GET /api/clientes/buscar-rapido
// Búsqueda rápida para el POS (por nombre o teléfono)
// ============================================
exports.buscarRapido = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ success: true, clientes: [] });
    }

    const clientes = await Cliente.find({
      activo: true,
      $or: [
        { nombre: { $regex: q, $options: 'i' } },
        { apellido: { $regex: q, $options: 'i' } },
        { telefono: { $regex: q, $options: 'i' } },
      ],
    })
      .limit(5)
      .select('nombre apellido telefono puntos nivel');

    res.json({ success: true, clientes });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error en búsqueda' });
  }
};
