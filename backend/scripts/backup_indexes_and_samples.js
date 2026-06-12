const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI not found in .env');
      process.exit(2);
    }

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outDir = path.join(__dirname, '..', 'backups', `backup-${timestamp}`);
    fs.mkdirSync(outDir, { recursive: true });

    const collections = ['clientes', 'usuarios', 'facturas'];

    for (const name of collections) {
      try {
        const coll = db.collection(name);
        if (!coll) { console.warn(`Collection ${name} not found, skipping`); continue; }
        const indexes = await coll.indexes();
        fs.writeFileSync(path.join(outDir, `${name}-indexes.json`), JSON.stringify(indexes, null, 2));

        // Export a sample of documents (first 200)
        const sample = await coll.find({}).limit(200).toArray();
        fs.writeFileSync(path.join(outDir, `${name}-sample.json`), JSON.stringify(sample, null, 2));

        console.log(`Saved ${name} indexes (${indexes.length}) and ${sample.length} sample docs`);
      } catch (e) {
        console.error(`Error exporting ${name}: ${e.message}`);
      }
    }

    await mongoose.disconnect();
    console.log('Backup of indexes and samples completed. Output dir:', outDir);
    process.exit(0);
  } catch (e) {
    console.error('Unexpected error during backup:', e.message);
    try { await mongoose.disconnect(); } catch (e2) {}
    process.exit(1);
  }
})();
