const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { uploadProductImage } = require('../controllers/uploadsController');

// Guardar en ../frontend/public/images
const imagesDir = path.resolve(__dirname, '..', '..', 'frontend', 'public', 'images');
if (!require('fs').existsSync(imagesDir)) {
  require('fs').mkdirSync(imagesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imagesDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-z0-9\-]/gi, '_').toLowerCase();
    const unique = Date.now();
    cb(null, `${name}-${unique}${ext}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/uploads/product-image
router.post('/product-image', upload.single('file'), uploadProductImage);

module.exports = router;
