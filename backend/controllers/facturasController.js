const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
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

async function buildPdfBuffer(venta, cliente, archivoUrl, invoiceData) {
  // Compact, spreadsheet-like A4 invoice
  const doc = new PDFDocument({ size: 'A4', margin: 28, bufferPages: true });
  const currency = (v) => `Gs. ${Number(v || 0).toLocaleString('es-PY')}`;
  const fechaStr = new Date(venta.createdAt).toLocaleString();

  const companyName = process.env.COMPANY_NAME || 'Gatocafee';
  const companyAddress = process.env.COMPANY_ADDRESS || 'Av. Principal 123, Ciudad';
  const companyPhone = process.env.COMPANY_PHONE || '+595 123 456';
  const companyRUC = process.env.COMPANY_RUC || '';
  const companyEmail = process.env.COMPANY_EMAIL || '';

  // Header (compact)
  const logoPath = path.join(__dirname, '..', 'frontend', 'public', 'images', 'logo.png');
  if (fs.existsSync(logoPath)) {
    try { doc.image(logoPath, 28, 28, { width: 60 }); } catch (e) {}
  }
  doc.font('Helvetica-Bold').fontSize(12).text(companyName, 96, 30);
  doc.font('Helvetica').fontSize(8).fillColor('#222').text(companyAddress, 96, 46);
  doc.text(`Tel: ${companyPhone} ${companyEmail ? ' · ' + companyEmail : ''}`, 96, 58);
  if (companyRUC) doc.text(`RUC: ${companyRUC}`, 96, 70);

  // Invoice meta on the right
  doc.font('Helvetica-Bold').fontSize(10).text('FACTURA', 420, 30);
  doc.font('Helvetica').fontSize(8).text(`Ticket: ${venta.numeroTicket}`, 420, 46, { width: 150 });
  doc.text(`Fecha: ${fechaStr}`, 420, 60);

  // Cliente block (compact, including direccion, telefono, email)
  const clienteInfo = (invoiceData && invoiceData.cliente) ? invoiceData.cliente : (cliente ? cliente : null);
  const clienteY = 96;
  doc.font('Helvetica-Bold').fontSize(9).text('Cliente', 28, clienteY);
  doc.font('Helvetica').fontSize(8).text(clienteInfo ? (clienteInfo.razonSocial || `${clienteInfo.nombre || ''} ${clienteInfo.apellido || ''}`).trim() : 'Consumidor Final', 28, clienteY + 12);
  if (clienteInfo) {
    if (clienteInfo.ci_ruc || clienteInfo.ruc) doc.text(`CI/RUC: ${clienteInfo.ci_ruc || clienteInfo.ruc}`, 28, clienteY + 26);
    if (clienteInfo.direccion) doc.text(`Dirección: ${clienteInfo.direccion}`, 220, clienteY + 12);
    if (clienteInfo.telefono) doc.text(`Tel: ${clienteInfo.telefono}`, 220, clienteY + 26);
    if (clienteInfo.email) doc.text(`Email: ${clienteInfo.email}`, 220, clienteY + 40);
  }

  // Table headers (spreadsheet-like)
  const tableTop = clienteY + 64;
  const col = { desc: 28, qty: 320, price: 380, subtotal: 460 };
  doc.moveTo(24, tableTop - 4).lineTo(568, tableTop - 4).stroke('#999').lineWidth(0.5);
  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Descripción', col.desc, tableTop, { width: 280 });
  doc.text('Cant.', col.qty, tableTop, { width: 40, align: 'right' });
  doc.text('Precio', col.price, tableTop, { width: 60, align: 'right' });
  doc.text('Subtotal', col.subtotal, tableTop, { width: 60, align: 'right' });
  doc.moveTo(24, tableTop + 14).lineTo(568, tableTop + 14).stroke('#ddd').lineWidth(0.5);

  // Items (compact rows)
  let y = tableTop + 22;
  doc.font('Helvetica').fontSize(8).fillColor('#111');
  for (const it of venta.items) {
    const name = it.nombreProducto || it.nombre || 'Producto';
    doc.text(name, col.desc, y, { width: 280 });
    doc.text(String(it.cantidad), col.qty, y, { width: 40, align: 'right' });
    doc.text(String(it.precioUnitario), col.price, y, { width: 60, align: 'right' });
    doc.text(String(it.subtotal), col.subtotal, y, { width: 60, align: 'right' });
    y += 16;
    if (y > 750) { doc.addPage(); y = 48; }
  }

  // Totals in a compact table on the right
  const totalsY = y + 8;
  doc.font('Helvetica-Bold').fontSize(9).text('Subtotal:', 380, totalsY, { width: 120, align: 'right' });
  doc.font('Helvetica').fontSize(9).text(currency(venta.subtotalSinIVA), 460, totalsY, { width: 80, align: 'right' });
  doc.font('Helvetica-Bold').text('IVA:', 380, totalsY + 14, { width: 120, align: 'right' });
  doc.font('Helvetica').text(currency(venta.totalIVA), 460, totalsY + 14, { width: 80, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(11).text('TOTAL:', 380, totalsY + 30, { width: 120, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(11).text(currency(venta.total), 460, totalsY + 30, { width: 80, align: 'right' });

  // QR (small) if archivoUrl
  if (archivoUrl) {
    try {
      const svgApi = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(archivoUrl)}&format=svg`;
      const svgText = await fetchText(svgApi);
      try {
        const SVGtoPDF = require('svg-to-pdfkit');
        SVGtoPDF(doc, svgText, 28, totalsY + 60, { assumePt: true });
      } catch (e) {
        const pngApi = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(archivoUrl)}&format=png`;
        const qrBuffer = await fetchImageBuffer(pngApi);
        doc.image(qrBuffer, 28, totalsY + 60, { width: 80, height: 80 });
      }
    } catch (e) { /* ignore QR errors */ }
  }

  // Footer small note
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.height - 36;
    doc.font('Helvetica').fontSize(7).fillColor('#666').text('Factura generada por Gatocafee', 28, bottom, { align: 'left' });
    doc.font('Helvetica').fontSize(7).text(`Página ${i + 1} de ${range.count}`, 28, bottom, { align: 'right' });
  }

  return await new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));
    doc.end();
  });
}

// Helper: descargar una imagen como Buffer (http/https)
function fetchImageBuffer(url) {
  const lib = url.startsWith('https') ? require('https') : require('http');
  return new Promise((resolve, reject) => {
    lib.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', (err) => reject(err));
    }).on('error', (err) => reject(err));
  });
}

function fetchText(url) {
  const lib = url.startsWith('https') ? require('https') : require('http');
  return new Promise((resolve, reject) => {
    lib.get(url, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
      res.on('error', (err) => reject(err));
    }).on('error', (err) => reject(err));
  });
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
    let venta = await Venta.findById(ventaId).populate('cliente');
    const invoiceData = req.body?.invoiceData || null;
    if (!venta) return res.status(404).json({ success: false, mensaje: 'Venta no encontrada' });

    let cliente = venta.cliente ? venta.cliente : null;

    // Generar PDF
    // Generar PDF preliminar (sin QR)
    const buffer = await buildPdfBuffer(venta, cliente, null, invoiceData);
    const filename = `factura_${venta.numeroTicket}_${randomUUID()}.pdf`;
    let archivoUrl = null;

    // Intentar subir a Cloudinary si estÃ¡ configurado
    if (cloudinary) {
      try {
        // Use server-generated public_id to avoid relying on filename parsing
        const publicId = `invoices/${filename.replace(/\.[^/.]+$/, '')}-${crypto.randomUUID()}`;
        archivoUrl = await uploadBufferToCloudinary(buffer, publicId + '.pdf');
      } catch (err) {
        console.warn('Cloudinary upload failed, will attempt local save:', err.message);
      }
    }

    // Si no se subiÃ³ a Cloudinary, guardar preliminar localmente
    if (!archivoUrl) {
      const outDir = path.join(__dirname, '..', 'public', 'invoices');
      try { fs.mkdirSync(outDir, { recursive: true }); } catch (e) {}
      const outPath = path.join(outDir, filename);
      fs.writeFileSync(outPath, buffer);
      archivoUrl = `/invoices/${filename}`;
    }

    // Regenerar PDF incluyendo QR apuntando a archivoUrl (si es URL completa o ruta relativa)
    try {
      const finalBuffer = await buildPdfBuffer(venta, cliente, archivoUrl, invoiceData);
      // volver a subir / guardar la versión final
      if (cloudinary) {
        try {
          // re-subir la versiÃ³n final (mismo public_id)
          const publicId2 = `invoices/${filename.replace(/\.[^/.]+$/, '')}-${crypto.randomUUID()}`;
          archivoUrl = await uploadBufferToCloudinary(finalBuffer, publicId2 + '.pdf');
        } catch (e) {
          console.warn('Reupload final PDF failed:', e.message);
        }
      } else {
        const outDir = path.join(__dirname, '..', 'public', 'invoices');
        const outPath = path.join(outDir, filename);
        fs.writeFileSync(outPath, finalBuffer);
        archivoUrl = `/invoices/${filename}`;
      }
    } catch (e) {
      console.warn('Could not regenerate final PDF with QR:', e.message);
    }

    // Crear registro de Factura
    const numeroFactura = `F-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Date.now().toString().slice(-5)}`;
    const factura = await Factura.create({ venta: venta._id, cliente: cliente?._id || (invoiceData && invoiceData.clienteId) || null, numeroFactura, fecha: new Date(), total: venta.total, archivoUrl, datos: invoiceData || {} });

    // Vincular a la venta
    venta.factura = factura._id;
    await venta.save();

    res.json({ success: true, factura, archivoUrl });
  } catch (error) {
    console.error('Error generando factura:', error);
    res.status(500).json({ success: false, mensaje: 'Error al generar factura' });
  }
};

// Helper: descargar una imagen como Buffer (http/https)
function fetchImageBuffer(url) {
  const lib = url.startsWith('https') ? require('https') : require('http');
  return new Promise((resolve, reject) => {
    lib.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', (err) => reject(err));
    }).on('error', (err) => reject(err));
  });
}

function fetchText(url) {
  const lib = url.startsWith('https') ? require('https') : require('http');
  return new Promise((resolve, reject) => {
    lib.get(url, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
      res.on('error', (err) => reject(err));
    }).on('error', (err) => reject(err));
  });
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

;

