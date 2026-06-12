const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  try {
    const fileArg = process.argv[2];
    if (!fileArg) {
      console.error('Usage: node check_counts.js <path-to-backup.json>');
      process.exit(2);
    }

    const backupPath = path.isAbsolute(fileArg) ? fileArg : path.join(__dirname, '..', fileArg);
    if (!fs.existsSync(backupPath)) { console.error('Backup not found', backupPath); process.exit(2); }

    const raw = fs.readFileSync(backupPath, 'utf8');
    const parsed = JSON.parse(raw);
    const backupCollections = Object.keys(parsed.datos || {});

    const uri = process.env.MONGODB_URI;
    if (!uri) { console.error('MONGODB_URI not set'); process.exit(2); }

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;

    console.log('Comparando recuentos entre backup y DB:');
    for (const coll of backupCollections) {
      const backupCount = (parsed.datos[coll] || []).length;
      const realCount = await db.collection(coll).countDocuments();
      const ok = backupCount === realCount ? 'OK' : 'MISMATCH';
      console.log(`${coll}: backup=${backupCount} db=${realCount} => ${ok}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Error checking counts:', e.message);
    try { await mongoose.disconnect(); } catch (e2) {}
    process.exit(1);
  }
})();
