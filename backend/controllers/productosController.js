// ============================================
// controllers/productosController.js
// CRUD de Productos con margen de ganancia e IVA
// ============================================

const Producto = require('../models/Producto');
const { registrarAuditoria } = require('../utils/auditoria');

// ============================================
// GET /api/productos
// Listar todos los productos (con filtros)
// ============================================
exports.getProductos = async (req, res) => {
  try {
    const { categoria, disponible, destacado, search } = req.query;

    // Construir filtro dinámico
    const filtro = {};
    if (categoria) filtro.categoria = categoria;
    if (disponible !== undefined) filtro.disponible = disponible === 'true';
    if (destacado !== undefined) filtro.destacado = destacado === 'true';
    if (search) {
      filtro.nombre = { $regex: search, $options: 'i' }; // Búsqueda insensible a mayúsculas
    }

    const productos = await Producto.find(filtro).sort({ categoria: 1, nombre: 1 });

    // Enriquecer con datos calculados
    const productosConDatos = productos.map((p) => {
      const obj = p.toJSON(); // Incluye virtuals (margenGanancia, etc.)
      return obj;
    });

    res.json({
      success: true,
      total: productos.length,
      productos: productosConDatos,
    });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener productos', error: error.message });
  }
};


// ============================================
// GET /api/productos/:id
// Obtener un producto por ID
// ============================================
exports.getProducto = async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);

    if (!producto) {
      return res.status(404).json({ success: false, mensaje: 'Producto no encontrado' });
    }

    res.json({ success: true, producto: producto.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener producto' });
  }
};


// ============================================
// POST /api/productos
// Crear nuevo producto
// ============================================
exports.crearProducto = async (req, res) => {
  try {
    const producto = await Producto.create(req.body);

    await registrarAuditoria({
      usuarioId: req.usuario._id,
      accion: 'CREAR_PRODUCTO',
      modulo: 'productos',
      descripcion: `Producto creado: ${producto.nombre}`,
      datosDespues: producto.toObject(),
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      mensaje: `Producto "${producto.nombre}" creado correctamente`,
      producto: producto.toJSON(),
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        mensaje: 'Error de validación',
        errores: Object.values(error.errors).map((e) => e.message),
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({ success: false, mensaje: 'Ya existe un producto con ese nombre' });
    }
    res.status(500).json({ success: false, mensaje: 'Error al crear producto' });
  }
};


// ============================================
// PUT /api/productos/:id
// Actualizar producto
// ============================================
exports.actualizarProducto = async (req, res) => {
  try {
    const productoAntes = await Producto.findById(req.params.id);
    if (!productoAntes) {
      return res.status(404).json({ success: false, mensaje: 'Producto no encontrado' });
    }

    const producto = await Producto.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    await registrarAuditoria({
      usuarioId: req.usuario._id,
      accion: 'EDITAR_PRODUCTO',
      modulo: 'productos',
      descripcion: `Producto editado: ${producto.nombre}`,
      datosAntes: productoAntes.toObject(),
      datosDespues: producto.toObject(),
      ip: req.ip,
    });

    res.json({
      success: true,
      mensaje: 'Producto actualizado correctamente',
      producto: producto.toJSON(),
    });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al actualizar producto' });
  }
};


// ============================================
// DELETE /api/productos/:id
// Desactivar producto (soft delete)
// ============================================
exports.eliminarProducto = async (req, res) => {
  try {
    const producto = await Producto.findByIdAndUpdate(
      req.params.id,
      { disponible: false },
      { new: true }
    );

    if (!producto) {
      return res.status(404).json({ success: false, mensaje: 'Producto no encontrado' });
    }

    await registrarAuditoria({
      usuarioId: req.usuario._id,
      accion: 'DESACTIVAR_PRODUCTO',
      modulo: 'productos',
      descripcion: `Producto desactivado: ${producto.nombre}`,
      ip: req.ip,
    });

    res.json({ success: true, mensaje: `Producto "${producto.nombre}" desactivado` });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al eliminar producto' });
  }
};


// ============================================
// GET /api/productos/ranking/top
// Top productos más vendidos
// ============================================
exports.getTopProductos = async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 10;

    const top = await Producto.find({ totalVendido: { $gt: 0 } })
      .sort({ totalVendido: -1 })
      .limit(limite)
      .select('nombre categoria totalVendido ingresoTotal costoProduccion precioVenta');

    const productosConMargen = top.map((p) => ({
      id: p._id,
      nombre: p.nombre,
      categoria: p.categoria,
      totalVendido: p.totalVendido,
      ingresoTotal: p.ingresoTotal,
      gananciaTotal: (p.precioVenta - p.costoProduccion) * p.totalVendido,
    }));

    res.json({ success: true, top: productosConMargen });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener ranking' });
  }
};


// ============================================
// GET /api/productos/margenes
// Análisis de márgenes de ganancia por producto
// ============================================
exports.getMargenes = async (req, res) => {
  try {
    const productos = await Producto.find({ disponible: true });

    const analisis = productos.map((p) => ({
      id: p._id,
      nombre: p.nombre,
      categoria: p.categoria,
      precioVenta: p.precioVenta,
      costoProduccion: p.costoProduccion,
      margenGanancia: p.precioVenta - p.costoProduccion,
      porcentajeMargen: (((p.precioVenta - p.costoProduccion) / p.precioVenta) * 100).toFixed(2),
      montoIVA: ((p.precioVenta / (1 + p.tasaIVA)) * p.tasaIVA).toFixed(0),
      tasaIVA: p.tasaIVA * 100,
    }));

    // Ordenar por mayor margen
    analisis.sort((a, b) => b.margenGanancia - a.margenGanancia);

    res.json({ success: true, analisis });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al calcular márgenes' });
  }
};
