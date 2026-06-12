const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function toObjectIdIfPossible(val) {
  const { Types } = mongoose;
  if (typeof val !== 'string') return val;
  if (/^[0-9a-fA-F]{24}$/.test(val)) return new Types.ObjectId(val);
  return val;
}

(async () => {
  try {
    const fileArg = process.argv[2];
    if (!fileArg) {
      console.error('Usage: node restore_backup.js <path-to-backup.json>');
      process.exit(2);
    }

    const backupPath = path.isAbsolute(fileArg) ? fileArg : path.join(__dirname, '..', fileArg);
    if (!fs.existsSync(backupPath)) {
      console.error('Backup file not found:', backupPath);
      process.exit(2);
    }

    const raw = fs.readFileSync(backupPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.datos) {
      console.error('Backup file has no `datos` root object');
      process.exit(2);
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI not set in backend/.env');
      process.exit(2);
    }

    console.log('Conectando a MongoDB...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    const db = mongoose.connection.db;

    // Collections present in backup
    const collections = Object.keys(parsed.datos);
    console.log('Colecciones en backup:', collections.join(', '));

    for (const collName of collections) {
      const docs = parsed.datos[collName] || [];
      console.log(`Restaurando colección \'${collName}\' — ${docs.length} docs`);

      const coll = db.collection(collName);
      // Eliminar documentos actuales
      await coll.deleteMany({});

      if (docs.length === 0) continue;

      // Convertir _id strings a ObjectId cuando corresponda
      const transformed = docs.map(doc => {
        const clone = { ...doc };
        if (clone._id) clone._id = toObjectIdIfPossible(clone._id);
        return clone;
      });

      // Insertar en lotes de 1000
      const batchSize = 1000;
      for (let i = 0; i < transformed.length; i += batchSize) {
        const chunk = transformed.slice(i, i + batchSize);
        await coll.insertMany(chunk);
      }

      console.log(`Colección \'${collName}\' restaurada.`);
    }

    await mongoose.disconnect();
    console.log('Restauración completada. Desconectado de MongoDB.');
    process.exit(0);
  } catch (e) {
    console.error('Error durante restauración:', e.message);
    try { await mongoose.disconnect(); } catch (e2) {}
    process.exit(1);
  }
})();
