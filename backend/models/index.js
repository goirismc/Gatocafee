// ============================================
// models/Cliente.js
// Clientes frecuentes y fidelización
// ============================================

const mongoose = require('mongoose');

// Delegar definición de `Cliente` al archivo dedicado para evitar duplicación.
// `models/Cliente.js` contiene la definición completa (incluye `toJSON: { virtuals: true }`).
require('./Cliente');


// ============================================
// models/Inventario.js
// Stock de insumos con alertas
// ============================================

const inventarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    descripcion: { type: String },
    categoria: {
      type: String,
      enum: ['materia_prima', 'insumo', 'packaging', 'limpieza', 'otros'],
      default: 'insumo',
    },
    unidadMedida: {
      type: String,
      enum: ['kg', 'g', 'litro', 'ml', 'unidad', 'caja', 'rollo'],
      required: true,
    },
    stockActual: {
      type: Number,
      required: true,
      min: [0, 'El stock no puede ser negativo'],
    },
    stockMinimo: {
      type: Number,
      required: true,
      default: 10,
    },
    stockOptimo: { type: Number },

    precioUnitario: { type: Number }, // Costo por unidad
    proveedor: { type: String },

    // Estado de alerta automático
    estado: {
      type: String,
      enum: ['ok', 'bajo', 'critico', 'agotado'],
      default: 'ok',
    },

    ultimaReposicion: { type: Date },
    movimientos: [
      {
        tipo: { type: String, enum: ['entrada', 'salida', 'ajuste'] },
        cantidad: Number,
        motivo: String,
        fecha: { type: Date, default: Date.now },
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

// Middleware: actualizar estado según stock
inventarioSchema.pre('save', function (next) {
  if (this.stockActual <= 0) this.estado = 'agotado';
  else if (this.stockActual <= this.stockMinimo * 0.5) this.estado = 'critico';
  else if (this.stockActual <= this.stockMinimo) this.estado = 'bajo';
  else this.estado = 'ok';
  next();
});

mongoose.model('Inventario', inventarioSchema);


// ============================================
// models/ArqueoCaja.js
// Control de apertura y cierre de caja
// ============================================

const arqueoCajaSchema = new mongoose.Schema(
  {
    fecha: { type: Date, required: true },
    turno: {
      type: String,
      enum: ['mañana', 'tarde', 'noche'],
      required: true,
    },
    usuarioApertura: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    usuarioCierre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
    },

    // --- Apertura ---
    montoApertura: {
      type: Number,
      required: true,
      min: 0,
    },
    horaApertura: { type: Date, default: Date.now },
    observacionesApertura: { type: String },

    // --- Cierre ---
    montoCierre: { type: Number },
    horaCierre: { type: Date },
    observacionesCierre: { type: String },

    // --- Totales del turno (calculados automáticamente) ---
    totalVentasEfectivo: { type: Number, default: 0 },
    totalVentasTarjeta: { type: Number, default: 0 },
    totalVentasTransferencia: { type: Number, default: 0 },
    totalVentasQR: { type: Number, default: 0 },
    totalVentas: { type: Number, default: 0 },
    cantidadVentas: { type: Number, default: 0 },

    // --- Diferencia ---
    diferencia: { type: Number }, // montoCierre - (montoApertura + totalVentasEfectivo)
    
    estado: {
      type: String,
      enum: ['abierto', 'cerrado'],
      default: 'abierto',
    },
  },
  { timestamps: true, versionKey: false }
);

mongoose.model('ArqueoCaja', arqueoCajaSchema);


// ============================================
// models/Auditoria.js
// Registro de todas las acciones del sistema
// ============================================

const auditoriaSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    accion: {
      type: String,
      required: true,
      // Ejemplos: 'LOGIN', 'CREAR_VENTA', 'EDITAR_PRODUCTO', 'ELIMINAR_CLIENTE'
    },
    modulo: {
      type: String,
      required: true,
      enum: ['auth', 'ventas', 'productos', 'inventario', 'clientes', 'caja', 'reportes', 'usuarios', 'sistema'],
    },
    descripcion: { type: String },
    datosAntes: { type: mongoose.Schema.Types.Mixed }, // Estado antes del cambio
    datosDespues: { type: mongoose.Schema.Types.Mixed }, // Estado después del cambio
    ip: { type: String },
    userAgent: { type: String },
    exitoso: { type: Boolean, default: true },
    error: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Índice TTL: eliminar auditorías de más de 1 año automáticamente
auditoriaSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });
auditoriaSchema.index({ usuario: 1, createdAt: -1 });
auditoriaSchema.index({ modulo: 1 });

mongoose.model('Auditoria', auditoriaSchema);


// ============================================
// models/CostoFijo.js
// Para cálculo de Punto de Equilibrio
// ============================================

const costoFijoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      // Ejemplos: "Alquiler", "Salarios", "Servicios básicos"
    },
    descripcion: { type: String },
    monto: {
      type: Number,
      required: true,
      min: 0,
    },
    frecuencia: {
      type: String,
      enum: ['diario', 'semanal', 'mensual', 'anual'],
      default: 'mensual',
    },
    activo: { type: Boolean, default: true },
    mes: { type: Number }, // 1-12
    año: { type: Number },
  },
  { timestamps: true, versionKey: false }
);

mongoose.model('CostoFijo', costoFijoSchema);


// ============================================
// models/MetaMensual.js
// Objetivos de ventas mensuales
// ============================================

const metaMensualSchema = new mongoose.Schema(
  {
    mes: { type: Number, required: true, min: 1, max: 12 },
    año: { type: Number, required: true },
    metaVentas: {
      type: Number,
      required: true,
      min: 0,
    },
    metaCantidadVentas: { type: Number },
    metaNuevosClientes: { type: Number },

    // Se calculan automáticamente
    ventasActuales: { type: Number, default: 0 },
    porcentajeCumplido: { type: Number, default: 0 },

    notas: { type: String },
    creadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
    },
  },
  { timestamps: true, versionKey: false }
);

// Índice único por mes/año
metaMensualSchema.index({ mes: 1, año: 1 }, { unique: true });

mongoose.model('MetaMensual', metaMensualSchema);

console.log(' Todos los modelos cargados correctamente');
