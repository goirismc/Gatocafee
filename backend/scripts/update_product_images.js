// Script: actualizar imágenes de productos desde frontend/public/images
// Ejecutar desde la raíz del repo: node backend/scripts/update_product_images.js

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', 'backend', '.env') });
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const connectDB = require('../config/database');

function slugify(str) {
  return str
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()
    .replace(/^-+|-+$/g, '');
}

const IMAGES_DIR = path.join(__dirname, '..', '..', 'frontend', 'public', 'images');

(async () => {
  try {
    await connectDB();
    console.log(' Conectado a DB');

    const Producto = require('../models/Producto');
    const files = fs.readdirSync(IMAGES_DIR).filter(f => !f.startsWith('.'));
    const fileSlugs = files.map(f => ({ file: f, slug: slugify(f.replace(/\.[^.]+$/, '')) }));

    const productos = await Producto.find();
    let updated = 0;

    for (const p of productos) {
      const nameSlug = slugify(p.nombre);
      // Buscar archivo cuya slug contenga nameSlug o viceversa
      const match = fileSlugs.find(fsObj => fsObj.slug.includes(nameSlug) || nameSlug.includes(fsObj.slug));
      if (match) {
        const imagenPath = `/images/${match.file}`;
        if (p.imagen !== imagenPath) {
          p.imagen = imagenPath;
          await p.save();
          updated++;
          console.log(` Actualizado: ${p.nombre} -> ${imagenPath}`);
        }
      }
    }

    console.log(`Hecho. Productos actualizados: ${updated}`);
    process.exit(0);
  } catch (err) {
    console.error('Error actualizando imágenes:', err);
    process.exit(1);
  }
})();
