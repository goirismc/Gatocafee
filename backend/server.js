// ============================================
// server.js
// Servidor principal de Gatocafee API
// ============================================

require('dotenv').config(); // SIEMPRE primero: carga variables de entorno
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');

// Cargar todos los modelos
require('./models/index');

const app = express();
const { productosRouter, ventasRouter } = require('./routes/productosVentas');
const { inventarioRouter, clientesRouter } = require('./routes/inventarioClientes');
// ============================================
// CONEXIÓN A MONGODB
// ============================================
connectDB();

// ============================================
// MIDDLEWARES DE SEGURIDAD
// ============================================

// Helmet: headers HTTP seguros
app.use(helmet());

// CORS: permitir peticiones del frontend
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting: máximo 100 peticiones por IP cada 15 minutos
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: {
    success: false,
    mensaje: 'Demasiadas peticiones. Intenta en 15 minutos.',
  },
});
app.use('/api/', limiter);

// Rate limiting más estricto para login (proteger contra brute force)
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 intentos
  message: {
    success: false,
    mensaje: 'Demasiados intentos de login. Intenta en 1 hora.',
  },
});
app.use('/api/auth/login', loginLimiter);

// ============================================
// MIDDLEWARES GENERALES
// ============================================
app.use(express.json({ limit: '10mb' }));          // Parsear JSON
app.use(express.urlencoded({ extended: true }));    // Parsear form data
app.use(morgan('dev'));                             // Logs de peticiones

// ============================================
// RUTAS
// ============================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos',   productosRouter);
app.use('/api/ventas',      ventasRouter);
app.use('/api/inventario',  inventarioRouter);
app.use('/api/clientes',    clientesRouter);
app.use('/api/uploads',     require('./routes/uploads'));

// PARTE 3 — Caja, Financiero, Reportes, Promociones
try {
  const { cajaRouter, financieroRouter, reportesRouter, promocionesRouter } = require('./routes/parte3');
  app.use('/api/caja',        cajaRouter);
  app.use('/api/financiero',  financieroRouter);
  app.use('/api/reportes',    reportesRouter);
  app.use('/api/promociones', promocionesRouter);
  console.log(' Rutas Parte 3 cargadas');
} catch (e) {
  console.log('  Rutas Parte 3 no disponibles aún:', e.message);
}


// Ruta de salud del servidor
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    mensaje: ' Gatocafee API funcionando correctamente',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    ambiente: process.env.NODE_ENV,
  });
});

// ============================================
// MANEJO DE RUTAS NO ENCONTRADAS
// ============================================
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    mensaje: `Ruta ${req.originalUrl} no encontrada`,
    rutasDisponibles: [
      'GET  /api/health',
      'POST /api/auth/login',
      'GET  /api/auth/perfil',
      'GET  /api/productos',
      'POST /api/ventas',
      'GET  /api/inventario',
      'GET  /api/clientes',
    ],
  });
});

// ============================================
// MANEJO GLOBAL DE ERRORES
// ============================================
app.use((err, req, res, next) => {
  console.error(' Error no manejado:', err);

  // Errores de MongoDB
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      mensaje: 'ID inválido',
    });
  }

  if (err.code === 11000) {
    const campo = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      mensaje: `Ya existe un registro con ese ${campo}`,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    mensaje: err.message || 'Error interno del servidor',
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' GATOCAFEE API - Sistema de Gestión');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Servidor:     http://localhost:${PORT}`);
  console.log(`API Base:     http://localhost:${PORT}/api`);
  console.log(`Health:       http://localhost:${PORT}/api/health`);
  console.log(`Ambiente:     ${process.env.NODE_ENV || 'development'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

module.exports = app;
