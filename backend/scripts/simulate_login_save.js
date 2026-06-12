const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const Usuario = require('../models/Usuario');
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    const usuario = await Usuario.findOne({ email: 'admin@gatocafee.com' }).select('+password');
    console.log('Before compararPassword, _id type:', usuario._id.constructor.name);
    const ok = await usuario.compararPassword('admin123');
    console.log('Password match?', ok);
    usuario.intentosFallidos = 0;
    usuario.bloqueadoHasta = undefined;
    usuario.ultimoLogin = new Date();
    await usuario.save({ validateBeforeSave: false });
    console.log('Saved successfully');
    await mongoose.disconnect();
  } catch (e) { console.error('Simulate error:', e); try{ await mongoose.disconnect(); } catch(e2){} }
})();
