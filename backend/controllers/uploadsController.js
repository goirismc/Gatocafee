const path = require('path');
const fs = require('fs');
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
        const uploaded = await cloudinary.uploader.upload(filePath, {
          folder: 'gatocafee/products',
          use_filename: true,
          unique_filename: true,
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
