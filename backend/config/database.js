// ============================================
// config/database.js
// Conexión a MongoDB Atlas
// ============================================

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Opciones modernas de Mongoose 8.x
      serverSelectionTimeoutMS: 5000, // Timeout de 5 segundos
    });

    console.log(` MongoDB Atlas conectado: ${conn.connection.host}`);
    console.log(` Base de datos: ${conn.connection.name}`);
    try {
      // Mostrar opciones de cliente para depuración (no sensible)
      const clientOpts = conn.connection.client && conn.connection.client.s && conn.connection.client.s.options;
      if (clientOpts) console.log(' Mongo client options:', { retryWrites: clientOpts.retryWrites, replicaSet: clientOpts.replicaSet });
    } catch (e) { /* ignore */ }

    // Eventos de conexión
    mongoose.connection.on('disconnected', () => {
      console.log(' MongoDB desconectado. Intentando reconectar...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log(' MongoDB reconectado');
    });

  } catch (error) {
    console.error('Error conectando a MongoDB Atlas:', error.message);
    console.error('Verifica tu MONGODB_URI en el archivo .env');
    process.exit(1); // Detiene el servidor si no hay conexión
  }
};

module.exports = connectDB;
