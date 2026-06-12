const mongoose = require('mongoose');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function isObjectIdInstance(val) {
  return val && val._bsontype === 'ObjectID';
}

function bufferFromMaybeObj(bufObj) {
  if (!bufObj) return null;
  // If it's already a Buffer
  if (Buffer.isBuffer(bufObj)) return bufObj;
  // If it has 'buffer' property with numeric keys
  if (bufObj && typeof bufObj === 'object' && bufObj.buffer) {
    const inner = bufObj.buffer;
    const arr = Object.keys(inner).map(k => inner[k]);
    return Buffer.from(arr);
  }
  // If it's array-like
  if (Array.isArray(bufObj)) return Buffer.from(bufObj);
  return null;
}

async function deepReplace(obj, targetOldIdObj, newId) {
  let changed = false;
  function recurse(node) {
    if (!node || typeof node !== 'object') return node;
    // If node equals the old id object (by structure), replace
    if (deepEqual(node, targetOldIdObj)) {
      changed = true;
      return newId;
    }
    if (Array.isArray(node)) {
      return node.map(item => recurse(item));
    }
    const out = {};
    for (const k of Object.keys(node)) {
      out[k] = recurse(node[k]);
    }
    return out;
  }
  const res = recurse(obj);
  return { changed, doc: res };
}

function deepEqual(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (e) {
    return false;
  }
}

(async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI not set'); process.exit(2);
    }

    console.log('Creating backup before migration...');
    try {
      execSync('node backend/scripts/create_full_backup.js', { stdio: 'inherit' });
    } catch (e) {
      console.warn('Backup script failed (non-fatal):', e.message);
    }

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    const db = mongoose.connection.db;

    const users = await db.collection('usuarios').find({}).toArray();
    const toMigrate = users.filter(u => !isObjectIdInstance(u._id));
    console.log('Usuarios totales:', users.length, 'A migrar:', toMigrate.length);

    const allCollections = (await db.listCollections().toArray()).map(c => c.name);

    for (const user of toMigrate) {
      console.log('Migrating user email:', user.email);
      const oldIdObj = user._id;
      const buf = bufferFromMaybeObj(oldIdObj) || bufferFromMaybeObj(oldIdObj && oldIdObj.buffer) || null;
      if (!buf || buf.length !== 12) {
        console.error('Cannot build ObjectId from _id for user', user.email, 'skipping');
        continue;
      }
      const newId = new mongoose.Types.ObjectId(buf);

      // Prepare new document (clone and set new _id)
      const newDoc = { ...user, _id: newId };

      // Update references in other collections first
      for (const collName of allCollections) {
        if (collName === 'usuarios') continue;
        const docs = await db.collection(collName).find({}).toArray();
        for (const d of docs) {
          const { changed, doc: replaced } = await deepReplace(d, oldIdObj, newId);
          if (changed) {
            try {
              await db.collection(collName).replaceOne({ _id: d._id }, replaced);
              console.log(`Updated refs in ${collName} doc ${d._id}`);
            } catch (e) {
              console.error(`Failed updating ${collName} ${d._id}:`, e.message);
            }
          }
        }
      }

      // Delete old user doc
      try {
        await db.collection('usuarios').deleteOne({ _id: oldIdObj });
        console.log('Deleted old user doc for', user.email);
      } catch (e) {
        console.error('Failed to delete old user doc for', user.email, e.message);
      }

      // Insert new user doc (now no duplicate email)
      try {
        await db.collection('usuarios').insertOne(newDoc);
        console.log('Inserted new user with _id', newId.toString());
      } catch (e) {
        console.error('Insert failed for user', user.email, e.message);
        // Attempt to rollback is complex; continue
        continue;
      }
    }

    // Final check
    const remaining = await db.collection('usuarios').find({}).toArray();
    console.log('Migration complete. Usuarios now:', remaining.length);

    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Migration error:', e.message);
    try { await mongoose.disconnect(); } catch (e2) {}
    process.exit(1);
  }
})();
