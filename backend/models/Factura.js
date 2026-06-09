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
  },
  { timestamps: true }
);

facturaSchema.index({ numeroFactura: 1 });

module.exports = mongoose.models.Factura || mongoose.model('Factura', facturaSchema);
