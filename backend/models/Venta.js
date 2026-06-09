// ============================================
// models/Venta.js
// Modelo principal de Ventas
// ============================================

const mongoose = require('mongoose');

// --- Sub-esquema para cada ítem de la venta ---
const itemVentaSchema = new mongoose.Schema(
  {
    producto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Producto',
      required: true,
    },
    // Guardamos snapshot del producto al momento de vender
    // (por si el precio cambia después)
    nombreProducto: { type: String, required: true },
    categoria: { type: String },
    cantidad: {
      type: Number,
      required: true,
      min: [1, 'La cantidad mínima es 1'],
    },
    precioUnitario: {
      type: Number,
      required: true,
    },
    costoUnitario: {
      type: Number,
      required: true,
    },
    tasaIVA: {
      type: Number,
      default: 0.10,
    },
    descuento: {
      type: Number,
      default: 0, // Descuento en Gs por ítem
    },
    subtotal: {
      type: Number,
      required: true, // (precioUnitario * cantidad) - descuento
    },
  },
  { _id: false }
);

// --- Esquema principal de Venta ---
const ventaSchema = new mongoose.Schema(
  {
    // --- Número de ticket (legible) ---
    numeroTicket: {
      type: String,
      unique: true,
      // Se genera automáticamente: GC-20240115-001
    },

    // --- Relaciones ---
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El usuario cajero es obligatorio'],
    },
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cliente',
      default: null, // null = cliente anónimo
    },
    nombreClienteRapido: {
      type: String,
      default: 'Consumidor Final', // Para ventas sin cliente registrado
    },

    // --- Ítems vendidos ---
    items: {
      type: [itemVentaSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'La venta debe tener al menos un producto',
      },
    },

    // --- Totales ---
    subtotalSinIVA: { type: Number, required: true },
    totalIVA: { type: Number, required: true },
    totalDescuentos: { type: Number, default: 0 },
    total: { type: Number, required: true }, // Total final a cobrar

    // --- Costos y ganancia ---
    costoTotal: { type: Number, required: true },
    gananciaTotal: { type: Number, required: true },

    // --- Método de pago ---
    metodoPago: {
      type: String,
      required: [true, 'El método de pago es obligatorio'],
      enum: {
        values: ['efectivo', 'tarjeta', 'transferencia', 'qr'],
        message: 'Método de pago inválido',
      },
    },
    montoPagado: { type: Number }, // Para efectivo
    cambio: { type: Number, default: 0 },

    // --- Canal de venta ---
    canal: {
      type: String,
      enum: ['mostrador', 'delivery', 'online'],
      default: 'mostrador',
    },

    // --- Turno ---
    turno: {
      type: String,
      enum: ['mañana', 'tarde', 'noche'],
      // Se calcula automáticamente por la hora
    },

    // --- Promoción aplicada ---
    promocion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Promocion',
      default: null,
    },
    codigoCupon: { type: String },

    // --- Estado ---
    estado: {
      type: String,
      enum: ['completada', 'anulada', 'devuelta'],
      default: 'completada',
    },

    // --- Si fue devuelta ---
    motivoDevolucion: { type: String },
    fechaDevolucion: { type: Date },
    usuarioDevolucion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
    },

    // --- Arqueo de caja ---
    arqueoCaja: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArqueoCaja',
    },

    // --- Factura generada ---
    factura: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Factura',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ============================================
// MIDDLEWARE: Calcular turno y ticket antes de guardar
// ============================================
ventaSchema.pre('save', async function (next) {
  // Calcular turno según la hora
  if (!this.turno) {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 13) this.turno = 'mañana';
    else if (hora >= 13 && hora < 19) this.turno = 'tarde';
    else this.turno = 'noche';
  }

  // Generar número de ticket único si es nuevo
  if (this.isNew && !this.numeroTicket) {
    const fecha = new Date();
    const fechaStr = fecha.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Contar ventas del día para el correlativo
    const Venta = mongoose.model('Venta');
    const inicioDia = new Date(fecha.setHours(0, 0, 0, 0));
    const finDia = new Date(fecha.setHours(23, 59, 59, 999));
    const count = await Venta.countDocuments({
      createdAt: { $gte: inicioDia, $lte: finDia },
    });

    this.numeroTicket = `GC-${fechaStr}-${String(count + 1).padStart(3, '0')}`;
  }

  next();
});

// Índices para reportes rápidos
ventaSchema.index({ createdAt: -1 });
ventaSchema.index({ usuario: 1, createdAt: -1 });
ventaSchema.index({ canal: 1 });
ventaSchema.index({ turno: 1 });
ventaSchema.index({ estado: 1 });
ventaSchema.index({ metodoPago: 1 });

const Venta = mongoose.model('Venta', ventaSchema);
module.exports = Venta;
