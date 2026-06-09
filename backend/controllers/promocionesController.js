// ============================================
// controllers/promocionesController.js
// Cupones, descuentos y promociones temporales
// ============================================

const mongoose = require('mongoose');

// ── Modelo de Promoción (definido aquí para mantener todo junto) ──
const promocionSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  descripcion: { type: String },
  tipo: {
    type: String,
    enum: ['porcentaje', 'monto_fijo', 'cupon', '2x1'],
    required: true,
  },
  valor: { type: Number, required: true, min: 0 }, // % o Gs según tipo
  codigo: { type: String, uppercase: true, sparse: true, unique: true }, // Para cupones
  
  // Vigencia
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  
  // Restricciones
  minimoCompra: { type: Number, default: 0 },
  usoMaximo: { type: Number }, // null = ilimitado
  usosActuales: { type: Number, default: 0 },
  soloNuevosClientes: { type: Boolean, default: false },
  
  // Aplicación
  aplicaA: {
    type: String,
    enum: ['todos', 'categoria', 'producto'],
    default: 'todos',
  },
  categoriaAplica: { type: String },
  productosAplican: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Producto' }],

  activo: { type: Boolean, default: true },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
}, { timestamps: true, versionKey: false });

const Promocion = mongoose.models.Promocion || mongoose.model('Promocion', promocionSchema);


// ============================================
// GET /api/promociones
// Listar promociones activas y vigentes
// ============================================
exports.getPromociones = async (req, res) => {
  try {
    const { soloActivas } = req.query;
    const filtro = {};

    if (soloActivas !== 'false') {
      const ahora = new Date();
      filtro.activo = true;
      filtro.fechaInicio = { $lte: ahora };
      filtro.fechaFin = { $gte: ahora };
    }

    const promociones = await Promocion.find(filtro)
      .populate('creadoPor', 'nombre')
      .sort({ createdAt: -1 });

    res.json({ success: true, total: promociones.length, promociones });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener promociones' });
  }
};


// ============================================
// POST /api/promociones
// Crear nueva promoción o cupón
// ============================================
exports.crearPromocion = async (req, res) => {
  try {
    const promo = await Promocion.create({
      ...req.body,
      creadoPor: req.usuario._id,
    });

    res.status(201).json({
      success: true,
      mensaje: `Promoción "${promo.nombre}" creada correctamente`,
      promocion: promo,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, mensaje: 'Ya existe un cupón con ese código' });
    }
    res.status(500).json({ success: false, mensaje: 'Error al crear promoción', error: error.message });
  }
};


// ============================================
// POST /api/promociones/validar-cupon
// Validar un código de cupón antes de aplicar
// ============================================
exports.validarCupon = async (req, res) => {
  try {
    const { codigo, montoCompra } = req.body;

    const ahora = new Date();
    const promo = await Promocion.findOne({
      codigo: codigo.toUpperCase(),
      activo: true,
      fechaInicio: { $lte: ahora },
      fechaFin: { $gte: ahora },
    });

    if (!promo) {
      return res.status(404).json({ success: false, mensaje: 'Cupón inválido o expirado' });
    }

    if (promo.usoMaximo && promo.usosActuales >= promo.usoMaximo) {
      return res.status(400).json({ success: false, mensaje: 'Este cupón ya alcanzó su límite de usos' });
    }

    if (montoCompra < promo.minimoCompra) {
      return res.status(400).json({
        success: false,
        mensaje: `Monto mínimo para este cupón: Gs. ${promo.minimoCompra.toLocaleString()}`,
      });
    }

    // Calcular el descuento
    let descuento = 0;
    if (promo.tipo === 'porcentaje') {
      descuento = Math.round(montoCompra * (promo.valor / 100));
    } else if (promo.tipo === 'monto_fijo') {
      descuento = Math.min(promo.valor, montoCompra); // No puede superar el monto
    }

    res.json({
      success: true,
      mensaje: `✅ Cupón válido: ${promo.nombre}`,
      promocion: {
        id: promo._id,
        nombre: promo.nombre,
        tipo: promo.tipo,
        valor: promo.valor,
      },
      descuento,
      totalConDescuento: montoCompra - descuento,
    });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al validar cupón' });
  }
};


// ============================================
// PUT /api/promociones/:id
// Actualizar o desactivar promoción
// ============================================
exports.actualizarPromocion = async (req, res) => {
  try {
    const promo = await Promocion.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!promo) return res.status(404).json({ success: false, mensaje: 'Promoción no encontrada' });
    res.json({ success: true, mensaje: 'Promoción actualizada', promocion: promo });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al actualizar promoción' });
  }
};
