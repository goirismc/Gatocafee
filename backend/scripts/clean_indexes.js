const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

(async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI not set in .env');
      process.exit(2);
    }

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;
    const collections = ['clientes', 'usuarios', 'facturas'];

    for (const name of collections) {
      try {
        const coll = db.collection(name);
        if (!coll) { console.log(`Collection ${name} not found, skipping`); continue; }
        const indexes = await coll.indexes();
        console.log(`Collection: ${name} - indexes found: ${indexes.length}`);
        const groups = {};
        for (const idx of indexes) {
          const keyStr = JSON.stringify(idx.key);
          groups[keyStr] = groups[keyStr] || [];
          groups[keyStr].push(idx);
        }
        for (const keyStr of Object.keys(groups)) {
          const arr = groups[keyStr];
          if (arr.length > 1) {
            console.log(` Duplicate index pattern ${keyStr} - keeping first, dropping others: ${arr.map(i=>i.name).join(', ')}`);
            for (let i = 1; i < arr.length; i++) {
              try {
                await coll.dropIndex(arr[i].name);
                console.log(` Dropped index ${arr[i].name}`);
              } catch (e) {
                console.error(` Failed dropping ${arr[i].name}: ${e.message}`);
              }
            }
          }
        }
      } catch (e) {
        console.error(` Error processing collection ${name}: ${e.message}`);
      }
    }

    await mongoose.disconnect();
    console.log('Index cleanup completed');
    process.exit(0);
  } catch (e) {
    console.error('Error during index cleanup:', e.message);
    try { await mongoose.disconnect(); } catch (e2) {}
    process.exit(1);
  }
})();