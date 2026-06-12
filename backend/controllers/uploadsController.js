const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Jimp = require('jimp');
let cloudinary;
if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary = require('cloudinary').v2;
  // Allow CONFIG via CLOUDINARY_URL or explicit vars
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
}

// POST /api/uploads/product-image
exports.uploadProductImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, mensaje: 'No se recibió archivo' });

    const filePath = req.file.path;
    const filename = req.file.filename;

    // Validar tipo MIME básico
    const mimetype = req.file.mimetype || '';
    if (!mimetype.startsWith('image/')) {
      // eliminar archivo no válido
      fs.unlinkSync(filePath);
      return res.status(400).json({ success: false, mensaje: 'El archivo debe ser una imagen' });
    }

    // Detección por magic-bytes para evitar confusiones de extensión/MIME
    function detectImageMimeFromPath(p) {
      try {
        const fd = fs.openSync(p, 'r');
        const buf = Buffer.alloc(512);
        const bytes = fs.readSync(fd, buf, 0, buf.length, 0);
        fs.closeSync(fd);
        const b = buf.slice(0, bytes);
        if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
        if (b.length >= 8 && b.slice(0,8).equals(Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]))) return 'image/png';
        if (b.length >= 6 && (b.slice(0,6).toString('ascii') === 'GIF87a' || b.slice(0,6).toString('ascii') === 'GIF89a')) return 'image/gif';
        if (b.length >= 12 && b.slice(0,4).toString('ascii') === 'RIFF' && b.slice(8,12).toString('ascii') === 'WEBP') return 'image/webp';
        const head = b.toString('utf8', 0, Math.min(b.length, 256)).toLowerCase();
        if (head.includes('<svg') || head.includes('<?xml') || head.includes('<!doctype svg')) return 'image/svg+xml';
        return 'unknown';
      } catch (e) {
        return 'unknown';
      }
    }

    const detected = detectImageMimeFromPath(filePath);
    if (!detected || detected === 'unknown') {
      try { fs.unlinkSync(filePath); } catch (e) {}
      return res.status(400).json({ success: false, mensaje: 'Tipo de archivo no reconocido o no permitido' });
    }
    // Bloquear explicitamente SVG por seguridad (no se requiere funcionalmente)
    if (detected === 'image/svg+xml' || path.extname(req.file.originalname).toLowerCase() === '.svg') {
      try { fs.unlinkSync(filePath); } catch (e) {}
      return res.status(400).json({ success: false, mensaje: 'SVG no permitido' });
    }
    // Rechazar si el MIME comunicado por el cliente no coincide con la detección por contenido
    if (!mimetype.toLowerCase().includes(detected.split('/')[1])) {
      try { fs.unlinkSync(filePath); } catch (e) {}
      return res.status(400).json({ success: false, mensaje: 'El tipo MIME del archivo no coincide con su contenido' });
    }

    // Redimensionar si es muy grande (max 1024px en el lado mayor)
    try {
      const image = await Jimp.read(filePath);
      const MAX = 1024;
      if (image.bitmap.width > MAX || image.bitmap.height > MAX) {
        if (image.bitmap.width >= image.bitmap.height) {
          image.resize(MAX, Jimp.AUTO);
        } else {
          image.resize(Jimp.AUTO, MAX);
        }
      }
      // Ajuste de calidad y sobreescribir archivo
      await image.quality(80).writeAsync(filePath);
    } catch (procErr) {
      console.warn('No se pudo procesar la imagen, se conservará la original:', procErr.message);
    }

    // Si Cloudinary está configurado, subir y devolver la URL segura
    if (cloudinary) {
      try {
        // Generar public_id seguro y controlado por servidor
        const safeId = `products/${crypto.randomUUID()}`;
        const uploaded = await cloudinary.uploader.upload(filePath, {
          folder: 'gatocafee/products',
          public_id: safeId,
          use_filename: false,
          overwrite: false,
        });
        // Eliminar archivo local
        try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
        return res.json({ success: true, url: uploaded.secure_url });
      } catch (upErr) {
        console.error('Cloudinary upload failed, falling back to local file:', upErr.message);
        // continue to return local path
      }
    }

    const url = `/images/${filename}`;
    res.json({ success: true, url });
  } catch (error) {
    console.error('Error subiendo imagen:', error);
    res.status(500).json({ success: false, mensaje: 'Error al subir imagen' });
  }
};
