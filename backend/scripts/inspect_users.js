const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
(async () => {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;
    const users = await db.collection('usuarios').find({}).toArray();
    console.log('Usuarios encontrados:', users.length);
    users.forEach(u => console.log(JSON.stringify(u, null, 2)));
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    try { await mongoose.disconnect(); } catch (e2) {}
    process.exit(1);
  }
})();
