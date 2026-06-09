const PDFDocument = require('pdfkit');
const getStream = require('get-stream');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
let cloudinary;
if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary = require('cloudinary').v2;
  if (process.env.CLOUDINARY_URL) cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });
  else
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

const mongoose = require('mongoose');
const Venta = mongoose.model('Venta');
const Cliente = mongoose.model('Cliente');
const Factura = require('../models/Factura');

async function buildPdfBuffer(venta, cliente) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.fontSize(12);

  doc.text('Gatocafee', { align: 'left', continued: false, underline: true });
  doc.moveDown(0.5);

  doc.fontSize(10).text(`Factura: ${venta.numeroTicket}`, { align: 'left' });
  doc.text(`Fecha: ${new Date(venta.createdAt).toLocaleString()}`);
  doc.moveDown(0.5);

  if (cliente) {
    doc.text(`Cliente: ${cliente.nombre} ${cliente.apellido || ''}`);
    if (cliente.ci_ruc) doc.text(`CI/RUC: ${cliente.ci_ruc}`);
    if (cliente.telefono) doc.text(`Teléfono: ${cliente.telefono}`);
    doc.moveDown(0.5);
  }

  doc.text('Items:', { underline: true });
  venta.items.forEach((it) => {
    doc.text(`${it.nombreProducto} x${it.cantidad}  -  Gs. ${it.precioUnitario.toLocaleString('es-PY')}  subtotal: Gs. ${it.subtotal.toLocaleString('es-PY')}`);
  });

  doc.moveDown(0.5);
  doc.text(`Subtotal: Gs. ${venta.subtotalSinIVA.toLocaleString('es-PY')}`);
  doc.text(`IVA: Gs. ${venta.totalIVA.toLocaleString('es-PY')}`);
  doc.text(`Total: Gs. ${venta.total.toLocaleString('es-PY')}`);

  doc.end();

  // Convert stream to buffer
  const buffer = await getStream.buffer(doc);
  return buffer;
}

async function uploadBufferToCloudinary(buffer, filename) {
  return new Promise((resolve, reject) => {
    if (!cloudinary) return reject(new Error('Cloudinary not configured'));
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'gatocafee/invoices', resource_type: 'raw', public_id: filename.replace(/\.[^/.]+$/, '') },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}

exports.generarFactura = async (req, res) => {
  try {
    const ventaId = req.params.id;
    const venta = await Venta.findById(ventaId).populate('cliente');
    if (!venta) return res.status(404).json({ success: false, mensaje: 'Venta no encontrada' });

    const cliente = venta.cliente ? venta.cliente : null;

    // Generar PDF
    const buffer = await buildPdfBuffer(venta, cliente);

    const filename = `factura_${venta.numeroTicket}_${uuidv4()}.pdf`;
    let archivoUrl = null;

    // Intentar subir a Cloudinary si está configurado
    if (cloudinary) {
      try {
        archivoUrl = await uploadBufferToCloudinary(buffer, filename);
      } catch (err) {
        console.warn('Cloudinary upload failed, will attempt local save:', err.message);
      }
    }

    // Si no se subió a Cloudinary, guardar localmente en ./public/invoices
    if (!archivoUrl) {
      const outDir = path.join(__dirname, '..', 'public', 'invoices');
      try { fs.mkdirSync(outDir, { recursive: true }); } catch (e) {}
      const outPath = path.join(outDir, filename);
      fs.writeFileSync(outPath, buffer);
      archivoUrl = `/invoices/${filename}`;
    }

    // Crear registro de Factura
    const numeroFactura = `F-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Date.now().toString().slice(-5)}`;
    const factura = await Factura.create({ venta: venta._id, cliente: cliente?._id || null, numeroFactura, fecha: new Date(), total: venta.total, archivoUrl });

    // Vincular a la venta
    venta.factura = factura._id;
    await venta.save();

    res.json({ success: true, factura, archivoUrl });
  } catch (error) {
    console.error('Error generando factura:', error);
    res.status(500).json({ success: false, mensaje: 'Error al generar factura' });
  }
};
