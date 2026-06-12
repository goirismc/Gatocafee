const mongoose = require('mongoose');

const facturaSchema = new mongoose.Schema(
  {
    venta: { type: mongoose.Schema.Types.ObjectId, ref: 'Venta', required: true },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' },
    numeroFactura: { type: String, required: true, unique: true },
    fecha: { type: Date, default: Date.now },
    total: { type: Number, required: true },
    archivoUrl: { type: String },
    tipo: { type: String, enum: ['electronica', 'nota'], default: 'electronica' },
    datos: { type: mongoose.Schema.Types.Mixed }, // campos adicionales de factura (razon social, ruc, direccion, etc.)
  },
  { timestamps: true }
);


module.exports = mongoose.models.Factura || mongoose.model('Factura', facturaSchema);
