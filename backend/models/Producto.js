// ============================================
// models/Producto.js
// Modelo de Productos con precios y costos
// ============================================

const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del producto es obligatorio'],
      trim: true,
      unique: true,
    },
    descripcion: {
      type: String,
      trim: true,
    },

    // --- Categoría ---
    categoria: {
      type: String,
      required: [true, 'La categoría es obligatoria'],
      enum: {
        values: ['bebidas_calientes', 'bebidas_frias', 'comidas', 'postres', 'otros'],
        message: 'Categoría inválida',
      },
    },
    subcategoria: {
      type: String,
      trim: true, // Ej: "café", "té", "sandwich"
    },

    // --- Precios y costos (en Guaraníes) ---
    precioVenta: {
      type: Number,
      required: [true, 'El precio de venta es obligatorio'],
      min: [0, 'El precio no puede ser negativo'],
    },
    costoProduccion: {
      type: Number,
      required: [true, 'El costo de producción es obligatorio'],
      min: [0, 'El costo no puede ser negativo'],
    },

    // --- IVA ---
    // En Paraguay: 10% para la mayoría, 5% para algunos alimentos
    tasaIVA: {
      type: Number,
      default: 0.10, // 10%
      enum: [0, 0.05, 0.10],
    },

    // --- Imagen ---
    imagen: {
      type: String,
      default: '/images/default-product.svg',
    },

    // --- Estado ---
    disponible: {
      type: Boolean,
      default: true,
    },
    destacado: {
      type: Boolean,
      default: false,
    },

    // --- Estadísticas (se actualiza con cada venta) ---
    totalVendido: {
      type: Number,
      default: 0,
    },
    ingresoTotal: {
      type: Number,
      default: 0,
    },

    // --- Canales donde se vende ---
    canales: {
      type: [String],
      enum: ['mostrador', 'delivery', 'online'],
      default: ['mostrador'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true }, // Incluir virtuales al serializar
  }
);

// ============================================
// VIRTUAL: Margen de ganancia
// ============================================
productoSchema.virtual('margenGanancia').get(function () {
  return this.precioVenta - this.costoProduccion;
});

// ============================================
// VIRTUAL: Porcentaje de margen
// ============================================
productoSchema.virtual('porcentajeMargen').get(function () {
  if (this.precioVenta === 0) return 0;
  return ((this.margenGanancia / this.precioVenta) * 100).toFixed(2);
});

// ============================================
// VIRTUAL: Precio con IVA incluido
// ============================================
productoSchema.virtual('precioConIVA').get(function () {
  return this.precioVenta; // En Paraguay el precio ya incluye IVA
});

// ============================================
// VIRTUAL: Monto IVA por producto
// ============================================
productoSchema.virtual('montoIVA').get(function () {
  // Fórmula: Precio / (1 + tasa) * tasa
  return (this.precioVenta / (1 + this.tasaIVA)) * this.tasaIVA;
});

// Índices para búsquedas
productoSchema.index({ categoria: 1 });
productoSchema.index({ disponible: 1 });
productoSchema.index({ totalVendido: -1 }); // Para ranking de más vendidos

const Producto = mongoose.model('Producto', productoSchema);
module.exports = Producto;
