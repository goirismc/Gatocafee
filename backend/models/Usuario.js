// ============================================
// models/Usuario.js
// Modelo de Usuario con roles y seguridad
// ============================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema(
  {
    // --- Datos personales ---
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      maxlength: [50, 'El nombre no puede superar 50 caracteres'],
    },
    apellido: {
      type: String,
      required: [true, 'El apellido es obligatorio'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
      select: false, // Nunca devuelve el password en queries
    },

    // --- Rol del sistema ---
    // administrador: acceso total
    // gerente: reportes y configuración (sin usuarios)
    // cajero: solo punto de venta y caja
    rol: {
      type: String,
      enum: {
        values: ['administrador', 'gerente', 'cajero'],
        message: 'Rol inválido. Use: administrador, gerente, cajero',
      },
      default: 'cajero',
    },

    // --- Estado ---
    activo: {
      type: Boolean,
      default: true,
    },
    turno: {
      type: String,
      enum: ['mañana', 'tarde', 'noche'],
      default: 'mañana',
    },

    // --- Seguridad ---
    ultimoLogin: {
      type: Date,
    },
    intentosFallidos: {
      type: Number,
      default: 0,
    },
    bloqueadoHasta: {
      type: Date,
    },
    tokenResetPassword: String,
    tokenResetExpira: Date,
  },
  {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
    versionKey: false,
  }
);

// ============================================
// MIDDLEWARE: Hashear password antes de guardar
// ============================================
usuarioSchema.pre('save', async function (next) {
  // Solo hashea si el password fue modificado
  if (!this.isModified('password')) return next();

  // bcrypt con 12 rondas de salt (más seguro que 10)
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ============================================
// MÉTODO: Comparar passwords
// ============================================
usuarioSchema.methods.compararPassword = async function (passwordIngresado) {
  return await bcrypt.compare(passwordIngresado, this.password);
};

// ============================================
// MÉTODO: Obtener nombre completo
// ============================================
usuarioSchema.methods.getNombreCompleto = function () {
  return `${this.nombre} ${this.apellido}`;
};

// ============================================
// MÉTODO: Verificar si está bloqueado
// ============================================
usuarioSchema.methods.estaBloqueado = function () {
  return this.bloqueadoHasta && this.bloqueadoHasta > Date.now();
};

// Índice para búsquedas rápidas por email
usuarioSchema.index({ email: 1 });

const Usuario = mongoose.model('Usuario', usuarioSchema);
module.exports = Usuario;
