require('dotenv').config();
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

// Configuración desde .env (CLOUDINARY_URL o vars separadas)
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

(async () => {
  try {
    const sample = path.resolve(__dirname, '..', '..', 'frontend', 'public', 'images', 'default-product.svg');
    if (!fs.existsSync(sample)) {
      console.error('No se encontró imagen de prueba en:', sample);
      process.exit(1);
    }

    console.log('Usando cloud_name:', cloudinary.config().cloud_name ? cloudinary.config().cloud_name : '(no configurado)');

    console.log('Subiendo imagen de prueba a Cloudinary (carpeta gatocafee/products)...');
    const uploaded = await cloudinary.uploader.upload(sample, {
      folder: 'gatocafee/products',
      use_filename: true,
      unique_filename: true,
      eager: [{ width: 300, height: 300, crop: 'fill' }]
    });

    console.log('Upload OK');
    console.log('secure_url:', uploaded.secure_url);
    if (uploaded.eager && uploaded.eager[0]) {
      console.log('thumbnail:', uploaded.eager[0].secure_url);
    }
  } catch (err) {
    console.error('Error en prueba Cloudinary:', err && err.message ? err.message : err);
    if (err && err.http_code) console.error('http_code:', err.http_code);
    process.exit(1);
  }
})();
