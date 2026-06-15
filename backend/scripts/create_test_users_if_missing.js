const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI no definido en .env');

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    // Cargar modelo
    const Usuario = require('../models/Usuario');

    const users = [
      { nombre: 'Admin', apellido: 'Gatocafee', email: 'admin@gatocafee.com', password: 'admin123', rol: 'administrador', turno: 'mañana' },
      { nombre: 'María', apellido: 'González', email: 'gerente@gatocafee.com', password: 'gerente123', rol: 'gerente', turno: 'mañana' },
      { nombre: 'Juan', apellido: 'López', email: 'cajero@gatocafee.com', password: 'cajero123', rol: 'cajero', turno: 'mañana' },
    ];

    for (const u of users) {
      const exists = await Usuario.findOne({ email: u.email });
      if (exists) {
        console.log(`Usuario ya existe: ${u.email}`);
        continue;
      }
      const newUser = new Usuario(u);
      await newUser.save();
      console.log(`Creado usuario: ${u.email}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error creando usuarios de prueba:', err);
    process.exit(1);
  }
})();
