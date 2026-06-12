const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set'); process.exit(2);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const Usuario = require('../models/Usuario');

  const mapping = {
    'admin@gatocafee.com': 'admin123',
    'gerente@gatocafee.com': 'gerente123',
    'cajero@gatocafee.com': 'cajero123',
  };

  for (const [email, pwd] of Object.entries(mapping)) {
    const u = await Usuario.findOne({ email }).select('+password');
    if (!u) {
      console.warn('Usuario no encontrado:', email);
      continue;
    }
    u.password = pwd;
    try {
      await u.save();
      console.log(`Contraseña actualizada para ${email}`);
    } catch (e) {
      console.error('Fallo al guardar usuario', email, e.message);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
