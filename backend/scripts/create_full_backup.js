const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function normalizeDoc(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const out = Array.isArray(doc) ? [] : {};
  for (const key of Object.keys(doc)) {
    const val = doc[key];
    if (val && typeof val === 'object') {
      // ObjectId -> string
      if (val._bsontype === 'ObjectID' && typeof val.toString === 'function') {
        out[key] = val.toString();
        continue;
      }
      // Date
      if (val instanceof Date) {
        out[key] = val.toISOString();
        continue;
      }
      out[key] = normalizeDoc(val);
      continue;
    }
    out[key] = val;
  }
  return out;
}

(async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI not set in backend/.env');
      process.exit(2);
    }

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;

    const cols = await db.listCollections().toArray();
    const collectionNames = cols.map(c => c.name);

    const datos = {};
    for (const name of collectionNames) {
      try {
        const docs = await db.collection(name).find({}).toArray();
        datos[name] = docs.map(d => normalizeDoc(d));
        console.log(`Exported ${name}: ${datos[name].length} docs`);
      } catch (e) {
        console.error(`Error exporting ${name}: ${e.message}`);
        datos[name] = [];
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outFile = path.join(__dirname, '..', 'backups', `backup_gatocafee_${timestamp}.json`);
    const out = { meta: { createdAt: new Date().toISOString(), source: process.env.MONGODB_URI }, datos };
    fs.writeFileSync(outFile, JSON.stringify(out, null, 2), 'utf8');
    console.log('Full backup written to', outFile);

    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Backup error:', e.message);
    try { await mongoose.disconnect(); } catch (e2) {}
    process.exit(1);
  }
})();
