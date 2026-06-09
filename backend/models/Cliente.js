// ============================================
// models/Cliente.js
// Re-exporta el modelo Cliente registrado en index.js
// ============================================

const mongoose = require('mongoose');

// Si el modelo ya fue registrado por index.js, lo reutilizamos.
// Si no, lo definimos aquí directamente.

const clienteSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del cliente es obligatorio'],
      trim: true,
    },
    apellido: { type: String, trim: true },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    telefono: { type: String, trim: true },
    fechaNacimiento: { type: Date },
    // Documento nacional / RUC (CI o RUC según país)
    ci_ruc: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    // --- Fidelización ---
    puntos: { type: Number, default: 0 },
    nivel: {
      type: String,
      enum: ['bronce', 'plata', 'oro', 'platinum'],
      default: 'bronce',
    },

    // --- Estadísticas automáticas ---
    totalCompras: { type: Number, default: 0 },
    totalGastado: { type: Number, default: 0 },
    ultimaCompra: { type: Date },
    primeraCompra: { type: Date },

    activo: { type: Boolean, default: true },
    notas: { type: String },
  },
  { timestamps: true, versionKey: false, toJSON: { virtuals: true } }
);

clienteSchema.virtual('nombreCompleto').get(function () {
  return this.apellido ? `${this.nombre} ${this.apellido}` : this.nombre;
});

clienteSchema.index({ email: 1 });
clienteSchema.index({ totalGastado: -1 });

// mongoose.model() lanza error si intentás registrar el mismo modelo dos veces.
// Esta línea lo reutiliza si ya existe, o lo crea si no.
module.exports = mongoose.models.Cliente || mongoose.model('Cliente', clienteSchema);
